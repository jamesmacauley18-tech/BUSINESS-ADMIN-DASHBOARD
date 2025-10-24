using System.Text;
using System.Text.Json;
using System.Net;
using System.Net.Mail;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddSingleton<DataStore>();
builder.Services.AddSingleton<ProfitAdvisor>();
builder.Services.AddSingleton<PdfMaker>();
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<Emailer>();
builder.Services.AddSingleton<ActivityLogger>();
builder.Services.AddSingleton<CashierMonitor>();

var app = builder.Build();

app.UseCors(p => p.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
app.UseDefaultFiles();
app.UseStaticFiles();

// ====== Simple API-key auth + Token auth ======
bool IsAuthorized(HttpRequest req, IConfiguration cfg, AuthService auth, string roleNeeded, out string role)
{
    role = "";
    var token = req.Headers["X-Auth-Token"].ToString();
    if (!string.IsNullOrWhiteSpace(token))
    {
        var tok = auth.CheckToken(token, roleNeeded);
        if (tok.ok) { role = tok.role; return true; }
    }
    var key = req.Headers["X-Auth-Key"].ToString();
    if (!string.IsNullOrWhiteSpace(key))
    {
        var res = auth.CheckKey(key, roleNeeded);
        if (res.ok) { role = res.role; return true; }
    }
    return false;
}

// ====== Helpers ======
decimal FxUsdToNLe(IConfiguration cfg) => cfg.GetSection("Fx").GetValue<decimal>("UsdToNLe", 25m);
decimal FxCnyToUsd(IConfiguration cfg) => cfg.GetSection("Fx").GetValue<decimal>("CnyToUsd", 0.14m);
int DefaultReorder(IConfiguration cfg) => cfg.GetValue<int>("LowStockDefault", 5);

// ====== Services ======
public class AuthService
{
    private readonly IConfiguration _cfg;
    // token -> role
    private readonly Dictionary<string, string> _sessions = new();
    public AuthService(IConfiguration cfg) { _cfg = cfg; }

    public (bool ok, string role) CheckKey(string key, string roleNeeded)
    {
        var auth = _cfg.GetSection("Auth");
        bool pass = roleNeeded switch
        {
            "Admin" => key == auth["AdminKey"],
            "Cashier" => key == auth["AdminKey"] || key == auth["CashierKey"],
            "Technician" => key == auth["AdminKey"] || key == auth["TechnicianKey"] || key == auth["CashierKey"],
            _ => false
        };
        var role = (key == auth["AdminKey"]) ? "Admin" :
                   (key == auth["CashierKey"]) ? "Cashier" :
                   (key == auth["TechnicianKey"]) ? "Technician" : "";
        return (pass, role);
    }

    public (bool ok, string token, string role) Login(string username, string password)
    {
        var users = _cfg.GetSection("Users").Get<List<User>>() ?? new();
        var u = users.FirstOrDefault(x => x.Username == username && x.Password == password);
        if (u is null) return (false, "", "");
        var token = Guid.NewGuid().ToString("N");
        _sessions[token] = u.Role;
        return (true, token, u.Role);
    }

    public (bool ok, string role) CheckToken(string token, string roleNeeded)
    {
        if (string.IsNullOrWhiteSpace(token)) return (false, "");
        if (!_sessions.TryGetValue(token, out var role)) return (false, "");
        bool pass = roleNeeded switch
        {
            "Admin" => role == "Admin",
            "Cashier" => role == "Admin" || role == "Cashier",
            "Technician" => role == "Admin" || role == "Technician" || role == "Cashier",
            _ => false
        };
        return (pass, role);
    }

    public record User(string Username, string Password, string Role);
}

public class Emailer
{
    private readonly IConfiguration _cfg;
    public Emailer(IConfiguration cfg) { _cfg = cfg; }

    public async Task SendAsync(string subject, string body)
    {
        var smtp = _cfg.GetSection("Email");
        var msg = new MailMessage(smtp["From"], smtp["To"], subject, body);
        var client = new SmtpClient(smtp["Host"], int.Parse(smtp["Port"]))
        {
            Credentials = new NetworkCredential(smtp["Username"], smtp["Password"]),
            EnableSsl = bool.Parse(smtp["EnableSsl"] ?? "true")
        };
        await client.SendMailAsync(msg);
    }
}

// ====== Models ======
public record Product(string Id, string Sku, string Name, string Category,
    int QtyOnHand, decimal CostCny, decimal CostUsd, decimal PriceUsd, decimal PriceLeone,
    int ReorderThreshold, string Barcode);

public record Staff(string StaffId, string FullName, string Role, string PinHash);

public record Attendance(string Id, string StaffId, DateTime Time, string Action, string WorkstationId, string Method, string Notes);

public record Sale(string Id, DateTime Date, string CashierId, decimal TotalUsd, decimal TotalLeone, decimal FxUsdToNLe, List<SaleLine> Lines);
public record SaleLine(string ProductId, string Sku, string Name, int Qty, decimal UnitPriceUsd, decimal UnitPriceLeone, decimal CostUsdAtSale);

public record StockMovement(string Id, string ProductId, int Change, string Reason, string ReferenceId, DateTime Timestamp, string UserId);

// ====== Data Store ======
public class DataStore
{
    private readonly string dataDir;
    private readonly IConfiguration cfg;
    public List<Product> Products { get; private set; } = new();
    public List<Staff> Staff { get; private set; } = new();
    public List<Attendance> Attendance { get; private set; } = new();
    public List<Sale> Sales { get; private set; } = new();
    public List<StockMovement> Movements { get; private set; } = new();

    public DataStore(IConfiguration cfg, IWebHostEnvironment env)
    {
        this.cfg = cfg;
        dataDir = Path.Combine(env.ContentRootPath, "Data");
        Directory.CreateDirectory(dataDir);
        Products = Load<List<Product>>("products.json") ?? new List<Product>();
        Staff = Load<List<Staff>>("staff.json") ?? new List<Staff>();
        Attendance = Load<List<Attendance>>("attendance.json") ?? new List<Attendance>();
        Sales = Load<List<Sale>>("sales.json") ?? new List<Sale>();
        Movements = Load<List<StockMovement>>("movements.json") ?? new List<StockMovement>();

        if (!Products.Any())
        {
            Products = new List<Product> {
                new(Guid.NewGuid().ToString(),"PBK-10000","Power Bank 10,000mAh","Accessories",40, 70m, 9.80m, 14.99m, 0m, 10,"1234567890123"),
                new(Guid.NewGuid().ToString(),"SCR-TECNO-S10","Tecno Spark 10 Screen Assembly","Spare Parts",12, 125m, 17.50m, 29.99m, 0m, 5,"1234567890456"),
                new(Guid.NewGuid().ToString(),"EAR-TWS-01","TWS Earbuds","Audio",25, 45m, 6.30m, 12.00m, 0m, 8,"1234567890789"),
            };
            Save("products.json", Products);
        }
        if (!Staff.Any())
        {
            Staff = new List<Staff> {
                new("EMP-001","Aisha Kamara","Cashier", "4321"),
                new("EMP-002","Mohamed Conteh","Technician", "9876"),
            };
            Save("staff.json", Staff);
        }
    }

    T? Load<T>(string file)
    {
        var path = Path.Combine(dataDir, file);
        if (!File.Exists(path)) return default;
        return JsonSerializer.Deserialize<T>(File.ReadAllText(path));
    }
    void Save<T>(string file, T obj)
    {
        var path = Path.Combine(dataDir, file);
        File.WriteAllText(path, JsonSerializer.Serialize(obj, new JsonSerializerOptions { WriteIndented = true }));
    }

    public void SaveAll()
    {
        Save("products.json", Products);
        Save("staff.json", Staff);
        Save("attendance.json", Attendance);
        Save("sales.json", Sales);
        Save("movements.json", Movements);
    }

    public Product? FindProduct(string id) => Products.FirstOrDefault(p => p.Id == id);
    public Product? FindProductBySku(string sku) => Products.FirstOrDefault(p => p.Sku == sku);
}

// ====== Advisors & PDF (same as v2) ======
public class ProfitAdvisor
{
    public record Verdict(bool Profitable, decimal ProfitUsd, decimal MarginPct, string Message);
    public Verdict Evaluate(Sale sale)
    {
        var cogs = sale.Lines.Sum(l => l.CostUsdAtSale * l.Qty);
        var profit = sale.TotalUsd - cogs;
        var margin = sale.TotalUsd == 0 ? 0 : (profit / sale.TotalUsd) * 100m;
        var msg = profit > 0 ? (margin < 10 ? "Low margin—consider price review." : "Healthy profit.") : "Loss—check pricing and FX rate.";
        return new Verdict(profit > 0, Math.Round(profit, 2), Math.Round(margin, 2), msg);
    }
    public decimal SuggestPriceUsd(decimal costUsd, decimal targetMarginPct)
    {
        var m = targetMarginPct / 100m;
        if (m >= 0.95m) m = 0.95m;
        if (m <= 0) m = 0.05m;
        return Math.Round(costUsd / (1m - m), 2);
    }
}

public class PdfMaker
{
    public byte[] MakeSimplePdf(string title, IEnumerable<string> lines)
    {
        var sb = new StringBuilder();
        var objects = new List<string>();
        objects.Add("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj");
        objects.Add("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj");
        objects.Add("3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj");
        objects.Add("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>endobj");
        var content = new StringBuilder();
        content.Append("BT /F1 12 Tf 50 800 Td (").Append(Escape(title)).Append(") Tj T* ");
        foreach (var line in lines.Take(60)) content.Append("(").Append(Escape(line)).Append(") Tj T* ");
        content.Append("ET");
        var contentBytes = Encoding.ASCII.GetBytes(content.ToString());
        var stream = $"4 0 obj<< /Length {contentBytes.Length} >>stream\n{content}\nendstream\nendobj";
        objects.Add(stream);
        var pdf = new StringBuilder();
        pdf.Append("%PDF-1.4\n");
        var xref = new List<int>();
        foreach (var obj in objects) { xref.Add(pdf.Length); pdf.Append(obj).Append("\n"); }
        var xrefStart = pdf.Length;
        pdf.Append("xref\n0 ").Append(objects.Count + 1).Append("\n");
        pdf.Append("0000000000 65535 f \n");
        foreach (var offset in xref) pdf.Append($"{offset:D10} 00000 n \n");
        pdf.Append($"trailer<< /Size {objects.Count + 1} /Root 1 0 R >>\nstartxref\n{xrefStart}\n%%EOF");
        return Encoding.ASCII.GetBytes(pdf.ToString());
    }

    private string Escape(string text) => text.Replace("(", "\\(").Replace(")", "\\)");
}

// ====== API ======
// Role probe (token or key)
app.MapGet("/api/auth/role", (HttpRequest req, IConfiguration cfg, AuthService auth) =>
{
    if (IsAuthorized(req, cfg, auth, "Admin", out var role1)) return Results.Ok(new { role = role1 });
    if (IsAuthorized(req, cfg, auth, "Cashier", out var role2)) return Results.Ok(new { role = role2 });
    if (IsAuthorized(req, cfg, auth, "Technician", out var role3)) return Results.Ok(new { role = role3 });
    return Results.Unauthorized();
});

// Products
app.MapGet("/api/products", (DataStore db) => db.Products);

app.MapPost("/api/products", (HttpRequest req, Product p, DataStore db, IConfiguration cfg, AuthService auth) =>
{
    if (!IsAuthorized(req, cfg, auth, "Admin", out _)) return Results.Unauthorized();
    var cny2usd = FxCnyToUsd(cfg);
    var costUsd = p.CostUsd == 0 ? Math.Round(p.CostCny * cny2usd, 2) : p.CostUsd;
    var prod = p with
    {
        Id = string.IsNullOrWhiteSpace(p.Id) ? Guid.NewGuid().ToString() : p.Id,
        CostUsd = costUsd,
        ReorderThreshold = p.ReorderThreshold == 0 ? DefaultReorder(cfg) : p.ReorderThreshold
    };
    db.Products.RemoveAll(x => x.Id == prod.Id || x.Sku == prod.Sku);
    db.Products.Add(prod);
    db.SaveAll();
    return Results.Ok(prod);
});

app.MapPost("/api/products/import-csv", async (HttpRequest req, DataStore db, IConfiguration cfg, AuthService auth) =>
{
    if (!IsAuthorized(req, cfg, auth, "Admin", out _)) return Results.Unauthorized();
    using var reader = new StreamReader(req.Body);
    var text = await reader.ReadToEndAsync();
    var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries);
    if (lines.Length <= 1) return Results.BadRequest("No rows");
    for (int i = 1; i < lines.Length; i++)
    {
        var line = lines[i].Trim();
        if (string.IsNullOrWhiteSpace(line)) continue;
        var cols = line.Split(',');
        if (cols.Length < 10) continue;
        var p = new Product(
            Guid.NewGuid().ToString(),
            cols[0], cols[1], cols[2],
            int.Parse(cols[3]),
            decimal.Parse(cols[4]),
            decimal.Parse(cols[5]),
            decimal.Parse(cols[6]),
            decimal.Parse(cols[7]),
            int.Parse(cols[8]),
            cols[9]
        );
        var cny2usd = FxCnyToUsd(cfg);
        if (p.CostUsd == 0) p = p with { CostUsd = Math.Round(p.CostCny * cny2usd, 2) };
        db.Products.RemoveAll(x => x.Sku == p.Sku);
        db.Products.Add(p);
    }
    db.SaveAll();
    return Results.Ok(new { count = db.Products.Count });
});

// Attendance
app.MapPost("/api/attendance/clock", (HttpRequest req, DataStore db, IConfiguration cfg, AuthService auth, string staffId, string pin, string action, string workstationId) =>
{
    if (!IsAuthorized(req, cfg, auth, "Technician", out _)) return Results.Unauthorized();
    var s = db.Staff.FirstOrDefault(x => x.StaffId == staffId);
    if (s is null) return Results.BadRequest("Unknown staff");
    if (s.PinHash != pin) return Results.BadRequest("Wrong PIN");
    var a = new Attendance(Guid.NewGuid().ToString(), staffId, DateTime.UtcNow, action, workstationId, "pin", "");
    db.Attendance.Add(a);
    db.SaveAll();
    return Results.Ok(a);
});

app.MapGet("/api/attendance/today", (DataStore db) =>
{
    var today = DateTime.UtcNow.Date;
    return db.Attendance.Where(a => a.Time.Date == today).OrderByDescending(a => a.Time);
});

// Sales
app.MapPost("/api/sales", (HttpRequest req, DataStore db, IConfiguration cfg, AuthService auth, ProfitAdvisor advisor, Sale sale) =>
{
    if (!IsAuthorized(req, cfg, auth, "Cashier", out _)) return Results.Unauthorized();
    decimal totalUsd = 0;
    foreach (var line in sale.Lines)
    {
        var p = db.FindProduct(line.ProductId) ?? db.FindProductBySku(line.Sku);
        if (p is null) return Results.BadRequest($"Missing product for {line.Sku}");
        if (p.QtyOnHand < line.Qty) return Results.BadRequest($"Not enough stock for {p.Name}");
        var newQty = p.QtyOnHand - line.Qty;
        var updated = p with { QtyOnHand = newQty };
        db.Products.RemoveAll(x => x.Id == p.Id);
        db.Products.Add(updated);
        db.Movements.Add(new StockMovement(Guid.NewGuid().ToString(), updated.Id, -line.Qty, "sale", "", DateTime.UtcNow, sale.CashierId));
        totalUsd += line.UnitPriceUsd * line.Qty;
    }

    var fx = sale.FxUsdToNLe == 0 ? FxUsdToNLe(cfg) : sale.FxUsdToNLe;
    var totalLeone = totalUsd * fx;

    var saved = sale with { Id = Guid.NewGuid().ToString(), Date = DateTime.UtcNow, TotalUsd = totalUsd, TotalLeone = totalLeone, FxUsdToNLe = fx };
    db.Sales.Add(saved);
    db.SaveAll();

    var verdict = advisor.Evaluate(saved);
    var alerts = db.Products
        .Where(p => p.QtyOnHand <= (p.ReorderThreshold == 0 ? DefaultReorder(cfg) : p.ReorderThreshold))
        .Select(p => new { p.Sku, p.Name, p.QtyOnHand, p.ReorderThreshold }).ToList();

    return Results.Ok(new { sale = saved, verdict, lowStockAlerts = alerts });
});

app.MapGet("/api/alerts/low-stock", (DataStore db, IConfiguration cfg) =>
    db.Products.Where(p => p.QtyOnHand <= (p.ReorderThreshold == 0 ? DefaultReorder(cfg) : p.ReorderThreshold))
        .Select(p => new { p.Sku, p.Name, p.QtyOnHand, p.ReorderThreshold }));

// ====== Pricing AI ======
app.MapGet("/api/pricing/ai", (HttpRequest req, DataStore db, IConfiguration cfg, AuthService auth, ProfitAdvisor advisor, decimal targetMarginPct) =>
{
    if (!IsAuthorized(req, cfg, auth, "Admin", out _)) return Results.Unauthorized();
    var fx = FxUsdToNLe(cfg);
    var list = db.Products.Select(p =>
    {
        var suggestUsd = advisor.SuggestPriceUsd(p.CostUsd, targetMarginPct);
        var suggestNLe = Math.Round(suggestUsd * fx, 2);
        return new
        {
            p.Sku,
            p.Name,
            p.CostUsd,
            TargetMarginPct = targetMarginPct,
            SuggestPriceUsd = suggestUsd,
            SuggestPriceNLe = suggestNLe
        };
    });
    return Results.Ok(list);
});

// ====== PDF Reports ======
app.MapGet("/api/reports/daily-sales.pdf", (HttpRequest req, DataStore db, PdfMaker pdf, IConfiguration cfg, AuthService auth, DateTime? date) =>
{
    if (!IsAuthorized(req, cfg, auth, "Cashier", out _)) return Results.Unauthorized();
    var d = (date ?? DateTime.UtcNow).Date;
    var sales = db.Sales.Where(s => s.Date.Date == d).OrderBy(s => s.Date).ToList();
    var lines = new List<string> { $"Daily Sales Report — {d:yyyy-MM-dd}", "----------------------------------------" };
    decimal totalUsd = 0, totalNLe = 0;
    foreach (var s in sales)
    {
        lines.Add($"{s.Date:HH:mm}  Items:{s.Lines.Sum(x => x.Qty)}  USD:{s.TotalUsd:F2}  NLe:{s.TotalLeone:F2}");
        foreach (var l in s.Lines)
        {
            lines.Add($"  - {l.Sku} x{l.Qty} @ {l.UnitPriceUsd:F2} USD");
        }
        totalUsd += s.TotalUsd;
        totalNLe += s.TotalLeone;
    }
    lines.Add("----------------------------------------");
    lines.Add($"TOTAL  USD:{totalUsd:F2}   NLe:{totalNLe:F2}");
    var bytes = pdf.MakeSimplePdf("Regimenz — Daily Sales", lines);
    return Results.File(bytes, "application/pdf", $"daily-sales-{d:yyyyMMdd}.pdf");
});

app.MapGet("/api/reports/attendance.pdf", (HttpRequest req, DataStore db, PdfMaker pdf, IConfiguration cfg, AuthService auth, DateTime? date) =>
{
    if (!IsAuthorized(req, cfg, auth, "Technician", out _)) return Results.Unauthorized();
    var d = (date ?? DateTime.UtcNow).Date;
    var att = db.Attendance.Where(a => a.Time.Date == d).OrderBy(a => a.Time).ToList();
    var lines = new List<string> { $"Attendance — {d:yyyy-MM-dd}", "----------------------------------------" };
    foreach (var a in att)
    {
        lines.Add($"{a.Time:HH:mm}  {a.StaffId}  {a.Action}");
    }
    var bytes = pdf.MakeSimplePdf("Regimenz — Attendance", lines);
    return Results.File(bytes, "application/pdf", $"attendance-{d:yyyyMMdd}.pdf");
});

app.MapGet("/api/reports/low-stock.pdf", (HttpRequest req, DataStore db, IConfiguration cfg, AuthService auth, PdfMaker pdf) =>
{
    if (!IsAuthorized(req, cfg, auth, "Admin", out _)) return Results.Unauthorized();
    var lines = new List<string> { "Low-stock Alerts", "----------------------------------------" };
    foreach (var p in db.Products.Where(p => p.QtyOnHand <= (p.ReorderThreshold == 0 ? DefaultReorder(cfg) : p.ReorderThreshold)))
    {
        lines.Add($"{p.Sku}  {p.Name}  Qty:{p.QtyOnHand}  Reorder≤{p.ReorderThreshold}");
    }
    var bytes = pdf.MakeSimplePdf("Regimenz — Low Stock", lines);
    return Results.File(bytes, "application/pdf", "low-stock.pdf");
});

// ====== Email endpoint ======
app.MapPost("/api/alerts/send-low-stock-email", async (HttpRequest req, DataStore db, IConfiguration cfg, AuthService auth, Emailer emailer) =>
{
    if (!IsAuthorized(req, cfg, auth, "Admin", out _)) return Results.Unauthorized();
    var items = db.Products.Where(p => p.QtyOnHand <= (p.ReorderThreshold == 0 ? DefaultReorder(cfg) : p.ReorderThreshold)).ToList();
    if (!items.Any()) return Results.Ok(new { sent = false, message = "No low-stock items." });
    var body = new StringBuilder();
    body.AppendLine("Low-stock items:");
    foreach (var p in items) body.AppendLine($"{p.Sku}  {p.Name}  Qty:{p.QtyOnHand}  Reorder≤{p.ReorderThreshold}");
    await emailer.SendAsync("Regimenz — Low-stock Alert", body.ToString());
    return Results.Ok(new { sent = true, count = items.Count });
});

// ====== New Enhanced API Endpoints ======

// Enhanced login endpoint for the new frontend
app.MapPost("/api/auth/login", async (HttpRequest req) =>
{
    var body = await new StreamReader(req.Body).ReadToEndAsync();
    var loginData = JsonSerializer.Deserialize<JsonElement>(body);
    
    if (!loginData.TryGetProperty("username", out var usernameElement) ||
        !loginData.TryGetProperty("password", out var passwordElement) ||
        !loginData.TryGetProperty("role", out var roleElement))
    {
        return Results.BadRequest(new { success = false, message = "Missing credentials" });
    }
    
    var username = usernameElement.GetString();
    var password = passwordElement.GetString();
    var requestedRole = roleElement.GetString();
    
    // Simple authentication - in production, use proper password hashing
    var validLogins = new Dictionary<string, (string password, string role)>
    {
        { "admin", ("admin123", "admin") },
        { "cashier1", ("cash123", "cashier") },
        { "cashier2", ("cash123", "cashier") }
    };
    
    if (validLogins.TryGetValue(username, out var userInfo) && 
        userInfo.password == password && 
        userInfo.role == requestedRole)
    {
        var token = Guid.NewGuid().ToString("N");
        return Results.Ok(new { 
            success = true, 
            token = token, 
            role = userInfo.role, 
            username = username 
        });
    }
    
    return Results.BadRequest(new { success = false, message = "Invalid credentials" });
});

// Dashboard endpoints for admin
app.MapGet("/api/dashboard/sales-summary", (HttpRequest req, DataStore db, IConfiguration cfg, AuthService auth) =>
{
    if (!IsAuthorized(req, cfg, auth, "Admin", out _)) return Results.Unauthorized();
    
    var today = DateTime.Today;
    var todaySales = db.Sales.Where(s => s.Date.Date == today).ToList();
    
    return Results.Ok(new {
        totalRevenue = todaySales.Sum(s => s.TotalUsd),
        itemsSold = todaySales.Sum(s => s.Lines.Sum(l => l.Qty)),
        avgMargin = todaySales.Any() ? todaySales.Average(s => 
            s.Lines.Sum(l => (l.UnitPriceUsd - l.CostUsdAtSale) * l.Qty) / s.TotalUsd * 100) : 0
    });
});

app.MapGet("/api/dashboard/active-cashiers", (HttpRequest req, IConfiguration cfg, AuthService auth, CashierMonitor monitor) =>
{
    if (!IsAuthorized(req, cfg, auth, "Admin", out _)) return Results.Unauthorized();
    return Results.Ok(monitor.GetActiveCashiers());
});

app.MapGet("/api/dashboard/recent-activity", (HttpRequest req, IConfiguration cfg, AuthService auth, ActivityLogger logger) =>
{
    if (!IsAuthorized(req, cfg, auth, "Admin", out _)) return Results.Unauthorized();
    return Results.Ok(logger.GetRecentActivity(20));
});

app.MapGet("/api/dashboard/live-activity", (HttpRequest req, IConfiguration cfg, AuthService auth, ActivityLogger logger) =>
{
    if (!IsAuthorized(req, cfg, auth, "Admin", out _)) return Results.Unauthorized();
    return Results.Ok(new {
        recentSales = logger.GetRecentSales(10),
        transactions = logger.GetRecentTransactions(15)
    });
});

// Activity logging
app.MapPost("/api/activity/log", async (HttpRequest req, ActivityLogger logger) =>
{
    var body = await new StreamReader(req.Body).ReadToEndAsync();
    var activityData = JsonSerializer.Deserialize<JsonElement>(body);
    
    if (activityData.TryGetProperty("cashierId", out var cashierElement) &&
        activityData.TryGetProperty("description", out var descElement))
    {
        logger.LogActivity(cashierElement.GetString(), descElement.GetString());
        return Results.Ok();
    }
    
    return Results.BadRequest();
});

// Cashier heartbeat
app.MapPost("/api/cashier/heartbeat", async (HttpRequest req, CashierMonitor monitor) =>
{
    var body = await new StreamReader(req.Body).ReadToEndAsync();
    var heartbeatData = JsonSerializer.Deserialize<JsonElement>(body);
    
    if (heartbeatData.TryGetProperty("cashierId", out var cashierElement))
    {
        monitor.UpdateCashierActivity(cashierElement.GetString());
        return Results.Ok();
    }
    
    return Results.BadRequest();
});

// Enhanced sales endpoint for cashier
app.MapGet("/api/sales/today", (HttpRequest req, DataStore db, IConfiguration cfg, AuthService auth) =>
{
    if (!IsAuthorized(req, cfg, auth, "Cashier", out _)) return Results.Unauthorized();
    
    var today = DateTime.Today;
    var todaySales = db.Sales.Where(s => s.Date.Date == today).ToList();
    
    return Results.Ok(todaySales.Select(s => new {
        id = s.Id,
        timestamp = s.Date,
        total = s.TotalUsd,
        items = s.Lines?.Count ?? 0
    }));
});

// OCR endpoint for scanning (placeholder)
app.MapPost("/api/ocr/scan-product", async (HttpRequest req) =>
{
    // This is a placeholder - in a real implementation, you'd use OCR services
    // like Azure Cognitive Services, Google Vision API, or Tesseract
    return Results.Ok(new { 
        success = true, 
        product = new { 
            sku = "SCANNED-" + DateTime.Now.Ticks,
            name = "Scanned Product",
            price = 10.00
        } 
    });
});

// ====== Additional Services ======

public class ActivityLogger
{
    private readonly List<ActivityLog> _activities = new();
    private readonly List<SaleLog> _recentSales = new();
    private readonly List<TransactionLog> _recentTransactions = new();

    public void LogActivity(string cashierId, string description)
    {
        var activity = new ActivityLog
        {
            CashierId = cashierId,
            Description = description,
            Timestamp = DateTime.Now
        };
        
        _activities.Add(activity);
        
        // Keep only last 100 activities
        if (_activities.Count > 100)
        {
            _activities.RemoveAt(0);
        }
        
        // Also add to transactions
        _recentTransactions.Add(new TransactionLog
        {
            Description = $"{cashierId}: {description}",
            Timestamp = DateTime.Now
        });
        
        if (_recentTransactions.Count > 50)
        {
            _recentTransactions.RemoveAt(0);
        }
    }

    public void LogSale(string cashierId, decimal total)
    {
        _recentSales.Add(new SaleLog
        {
            Cashier = cashierId,
            Total = total,
            Timestamp = DateTime.Now
        });
        
        if (_recentSales.Count > 20)
        {
            _recentSales.RemoveAt(0);
        }
    }

    public List<ActivityLog> GetRecentActivity(int count)
    {
        return _activities.TakeLast(count).Reverse().ToList();
    }

    public List<SaleLog> GetRecentSales(int count)
    {
        return _recentSales.TakeLast(count).Reverse().ToList();
    }

    public List<TransactionLog> GetRecentTransactions(int count)
    {
        return _recentTransactions.TakeLast(count).Reverse().ToList();
    }

    public record ActivityLog(string CashierId, string Description, DateTime Timestamp);
    public record SaleLog(string Cashier, decimal Total, DateTime Timestamp);
    public record TransactionLog(string Description, DateTime Timestamp);
}

public class CashierMonitor
{
    private readonly Dictionary<string, DateTime> _activeCashiers = new();

    public void UpdateCashierActivity(string cashierId)
    {
        _activeCashiers[cashierId] = DateTime.Now;
    }

    public List<object> GetActiveCashiers()
    {
        var cutoff = DateTime.Now.AddMinutes(-5); // Consider active if seen in last 5 minutes
        
        return _activeCashiers
            .Where(kvp => kvp.Value > cutoff)
            .Select(kvp => new {
                id = kvp.Key,
                name = kvp.Key,
                isActive = true,
                lastActivity = kvp.Value.ToString("HH:mm:ss")
            })
            .ToList<object>();
    }
}

app.Run();
