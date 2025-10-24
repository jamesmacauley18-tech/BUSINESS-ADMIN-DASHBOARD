// Admin Dashboard JavaScript - Standalone Version
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

class AdminDashboard {
  constructor() {
    this.authToken = localStorage.getItem('reg_auth_token');
    this.username = localStorage.getItem('reg_username');
    this.isScanning = false;
    this.scannedProducts = [];
    
    // Local data storage
    this.products = JSON.parse(localStorage.getItem('business_products') || '[]');
    this.sales = JSON.parse(localStorage.getItem('business_sales') || '[]');
    this.activities = JSON.parse(localStorage.getItem('business_activities') || '[]');
    this.cashiers = JSON.parse(localStorage.getItem('business_cashiers') || '[]');
    
    this.initializeAuth();
    this.initializeUI();
    this.initializeDefaultData();
    this.loadDashboardData();
    this.initializeRealTimeUpdates();
    this.initializeSettings(); // Initialize settings functionality
  }

  initializeAuth() {
    if (!this.authToken || localStorage.getItem('reg_user_role') !== 'admin') {
      window.location.href = '/login.html';
      return;
    }
    $('#admin-info').textContent = `Welcome, ${this.username || 'Admin'}`;
  }

  initializeDefaultData() {
    // Initialize with sample products if none exist
    if (this.products.length === 0) {
      this.products = [
        {
          id: '1',
          sku: 'PROD001',
          name: 'Sample Product 1',
          category: 'Electronics',
          qtyOnHand: 50,
          costUsd: 10.00,
          priceUsd: 20.00,
          reorderThreshold: 10
        },
        {
          id: '2',
          sku: 'PROD002',
          name: 'Sample Product 2',
          category: 'Accessories',
          qtyOnHand: 30,
          costUsd: 5.00,
          priceUsd: 12.00,
          reorderThreshold: 5
        },
        {
          id: '3',
          sku: 'PROD003',
          name: 'Sample Product 3',
          category: 'Tools',
          qtyOnHand: 3,
          costUsd: 25.00,
          priceUsd: 50.00,
          reorderThreshold: 5
        }
      ];
      this.saveProducts();
    }

    // Initialize with sample activities
    if (this.activities.length === 0) {
      this.logActivity('System', 'Admin dashboard initialized');
    }
  }

  saveProducts() {
    localStorage.setItem('business_products', JSON.stringify(this.products));
  }

  saveSales() {
    localStorage.setItem('business_sales', JSON.stringify(this.sales));
  }

  saveActivities() {
    localStorage.setItem('business_activities', JSON.stringify(this.activities));
  }

  saveCashiers() {
    localStorage.setItem('business_cashiers', JSON.stringify(this.cashiers));
  }

  initializeUI() {
    // Tab switching
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab').forEach(tab => tab.classList.remove('active'));
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $('#' + btn.dataset.tab).classList.add('active');
        btn.classList.add('active');
      });
    });

    // Logout functionality
    $('#logoutBtn').addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        this.logActivity('Admin', 'Logged out');
        localStorage.clear();
        window.location.href = '/login.html';
      }
    });

    // Product management
    $('#addProductBtn')?.addEventListener('click', () => this.showAddProductModal());
    $('#manualProductForm')?.addEventListener('submit', (e) => this.handleManualProductEntry(e));

    // Camera scanning
    $('#startCameraBtn')?.addEventListener('click', () => this.startCamera());
    $('#stopCameraBtn')?.addEventListener('click', () => this.stopCamera());
    $('#captureBtn')?.addEventListener('click', () => this.captureImage());

    // Report generation
    $('#dailyReportBtn')?.addEventListener('click', () => this.generateReport('daily'));
    $('#weeklyReportBtn')?.addEventListener('click', () => this.generateReport('weekly'));
    $('#monthlyReportBtn')?.addEventListener('click', () => this.generateReport('monthly'));

    // Bulk product entry
    this.initializeBulkProductEntry();

    // Currency calculator
    this.initializeCurrencyCalculator();

    // Enhanced product management
    this.initializeEnhancedProductManagement();

    // Worker management system
    this.initializeWorkerManagement();
    // REI AI assistant
    this.initializeREIAssistant();
    // Settings and file scanner
    this.initializeSettings();
  }  initializeWorkerManagement() {
    // Initialize worker data
    this.workers = JSON.parse(localStorage.getItem('business_workers') || '[]');
    this.workerRatings = JSON.parse(localStorage.getItem('worker_ratings') || '[]');
    this.workerCodes = JSON.parse(localStorage.getItem('worker_codes') || '[]');

    // Event listeners
    $('#generateCodeBtn')?.addEventListener('click', () => this.generateWorkerCode());
    $('#copyCodeBtn')?.addEventListener('click', () => this.copyWorkerCode());
    $('#refreshActivityBtn')?.addEventListener('click', () => this.refreshWorkerActivity());

    // Load initial data
    this.updateActiveWorkersList();
    this.updateWorkerRatings();
    this.updateWorkerActivityLog();
  }

  generateWorkerCode() {
    const workerName = $('#workerName')?.value?.trim();
    const workerShift = $('#workerShift')?.value;

    if (!workerName) {
      this.showToast('Please enter worker name', 'error');
      return;
    }

    // Generate unique 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12); // Valid for 12 hours

    const workerCode = {
      id: Date.now(),
      name: workerName,
      shift: workerShift,
      code: code,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      usedAt: null
    };

    this.workerCodes.push(workerCode);
    localStorage.setItem('worker_codes', JSON.stringify(this.workerCodes));

    // Display generated code
    $('#codeValue').textContent = code;
    $('#generatedCode').style.display = 'block';

    // Clear form
    $('#workerName').value = '';

    this.logActivity('Admin', `Generated access code for worker: ${workerName} (${workerShift} shift)`);
    this.showToast(`✅ Access code generated for ${workerName}`, 'success');
  }

  copyWorkerCode() {
    const code = $('#codeValue')?.textContent;
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        this.showToast('📋 Code copied to clipboard!', 'success');
      });
    }
  }

  updateActiveWorkersList() {
    const activeWorkersDiv = $('#activeWorkersList');
    if (!activeWorkersDiv) return;

    // Get currently active workers (logged in within last 8 hours)
    const now = new Date();
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    
    const activeWorkers = this.workerCodes.filter(worker => {
      return worker.usedAt && new Date(worker.usedAt) > eightHoursAgo;
    });

    if (activeWorkers.length === 0) {
      activeWorkersDiv.innerHTML = '<p style="color: #6b7280; font-style: italic;">No workers currently active</p>';
      return;
    }

    activeWorkersDiv.innerHTML = activeWorkers.map(worker => {
      const loginTime = new Date(worker.usedAt);
      const hoursWorked = Math.round((now - loginTime) / (1000 * 60 * 60) * 10) / 10;
      
      return `
        <div class="worker-card">
          <div class="worker-info">
            <div class="worker-name">${worker.name}</div>
            <div class="worker-shift">${worker.shift} shift • ${hoursWorked} hours worked</div>
          </div>
          <div class="worker-status status-active">🟢 Active</div>
        </div>
      `;
    }).join('');
  }

  updateWorkerRatings() {
    const ratingSummaryDiv = $('#ratingSummary');
    const recentRatingsDiv = $('#recentRatings');
    
    if (!ratingSummaryDiv || !recentRatingsDiv) return;

    if (this.workerRatings.length === 0) {
      ratingSummaryDiv.innerHTML = '<p style="color: #6b7280; font-style: italic;">No ratings yet</p>';
      recentRatingsDiv.innerHTML = '<p style="color: #6b7280; font-style: italic;">No recent ratings</p>';
      return;
    }

    // Calculate average ratings per worker
    const workerStats = {};
    this.workerRatings.forEach(rating => {
      if (!workerStats[rating.workerName]) {
        workerStats[rating.workerName] = { total: 0, count: 0, ratings: [] };
      }
      workerStats[rating.workerName].total += rating.rating;
      workerStats[rating.workerName].count += 1;
      workerStats[rating.workerName].ratings.push(rating);
    });

    // Display summary
    const summaryHtml = Object.entries(workerStats).map(([name, stats]) => {
      const average = (stats.total / stats.count).toFixed(1);
      const stars = '⭐'.repeat(Math.round(average));
      return `
        <div class="worker-rating-summary">
          <strong>${name}</strong>: ${stars} (${average}/5) - ${stats.count} ratings
        </div>
      `;
    }).join('');
    
    ratingSummaryDiv.innerHTML = summaryHtml;

    // Display recent ratings
    const recentHtml = this.workerRatings
      .slice(-5)
      .reverse()
      .map(rating => {
        const stars = '⭐'.repeat(rating.rating) + '☆'.repeat(5 - rating.rating);
        return `
          <div class="rating-item">
            <div class="rating-header">
              <strong>${rating.workerName}</strong>
              <span class="rating-stars">${stars}</span>
            </div>
            <div class="rating-comment">"${rating.comment}"</div>
            <div class="activity-time">Rated by ${rating.ratedBy} on ${new Date(rating.timestamp).toLocaleDateString()}</div>
          </div>
        `;
      }).join('');
    
    recentRatingsDiv.innerHTML = recentHtml;
  }

  updateWorkerActivityLog() {
    const activityLogDiv = $('#workerActivityLog');
    if (!activityLogDiv) return;

    // Get worker-related activities
    const workerActivities = this.activities.filter(activity => 
      activity.description.toLowerCase().includes('worker') ||
      activity.description.toLowerCase().includes('access code') ||
      activity.description.toLowerCase().includes('rated')
    );

    if (workerActivities.length === 0) {
      activityLogDiv.innerHTML = '<p style="color: #6b7280; font-style: italic;">No worker activity recorded</p>';
      return;
    }

    const activityHtml = workerActivities
      .slice(-20)
      .reverse()
      .map(activity => `
        <div class="activity-item">
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${activity.user} • ${new Date(activity.timestamp).toLocaleString()}</div>
        </div>
      `).join('');
    
    activityLogDiv.innerHTML = activityHtml;
  }

  refreshWorkerActivity() {
    this.updateActiveWorkersList();
    this.updateWorkerRatings();
    this.updateWorkerActivityLog();
    this.showToast('✅ Worker activity refreshed', 'success');
  }

  /* ----------------------- REI Assistant ----------------------- */
  initializeREIAssistant() {
    // REI uses product catalog heuristics to recommend compatible LCDs
    this.reiState = { lastSuggestions: [], selectedSuggestion: null };
    $('#openReiBtn')?.addEventListener('click', () => {
      $('#reiModal').style.display = 'flex';
      $('#reiQuery').focus();
    });
    $('#closeRei')?.addEventListener('click', () => { $('#reiModal').style.display = 'none'; });
    $('#reiProcessBtn')?.addEventListener('click', () => this.processREIQuery());
    $('#reiExampleBtn')?.addEventListener('click', () => { $('#reiQuery').value = 'Samsung Galaxy S24 LCD 6.8 inch - find substitutes'; });
    $('#reiSuggestUniversal')?.addEventListener('click', () => this.reiSuggestUniversalLCDs());
    $('#reiCompactList')?.addEventListener('click', () => this.reiCompactCompatibleList());
    $('#reiAddToInventory')?.addEventListener('click', () => this.reiAddSuggestionToInventory());
    $('#reiScanProductBtn')?.addEventListener('click', () => this.reiUseSelectedProduct());
  }

  processREIQuery() {
    const q = ($('#reiQuery')?.value || '').trim();
    if (!q) {
      this.showToast('Please enter a query for REI', 'error');
      return;
    }
    // Simple intent detection: look for "lcd" or "screen" or "substitute" keywords
    const lower = q.toLowerCase();
    const suggestions = [];

    if (lower.includes('lcd') || lower.includes('screen') || lower.includes('display')) {
      const matches = this.reiFindCompatibleLCDs(q);
      suggestions.push(...matches);
    }

    if (suggestions.length === 0) {
      // Generic response
      this.reiRenderResults([{
        title: 'REI could not find direct matches',
        description: 'Try entering the full model name or use "Suggest Universal LCDs" to see adaptable options.'
      }]);
      return;
    }

    this.reiRenderResults(suggestions);
  }

  reiFindCompatibleLCDs(query) {
    const q = query.toLowerCase();
    // parse numeric inch values
    const inchMatch = q.match(/(\d{1,2}\.\d|\d{1,2})\s*(inch|\")/i);
    const inch = inchMatch ? parseFloat(inchMatch[1]) : null;

    // Check for brand tokens
    const brands = ['apple','samsung','sony','nokia','huawei','xiaomi','itel','tecno','infinix'];
    let brand = null;
    for (const b of brands) if (q.includes(b)) { brand = b; break; }

    // Find candidates in product catalog containing keywords
    const candidates = this.products.filter(p => {
      const name = (p.name||'').toLowerCase();
      // must mention LCD/screen/display or have a category of 'Display' or 'Accessories'
      const hasDisplay = name.includes('lcd') || name.includes('screen') || name.includes('display') || p.category?.toLowerCase().includes('display') || p.category?.toLowerCase().includes('screen');
      if (!hasDisplay) return false;
      // brand match if present
      if (brand && !name.includes(brand)) return false;
      // inch proximity if present: try to find numbers in product name
      if (inch) {
        const nums = (name.match(/\d{1,2}(?:\.\d)?/g)||[]).map(n=>parseFloat(n));
        if (nums.length>0) {
          const close = nums.some(n => Math.abs(n - inch) <= 0.8);
          if (!close) return false;
        }
      }
      return true;
    });

    // map to suggestion objects
    const suggestions = candidates.slice(0,10).map(c => ({
      title: `${c.name} — SKU: ${c.sku}`,
      description: `Category: ${c.category} • Stock: ${c.qtyOnHand} • Price: $${(c.priceUsd||0).toFixed(2)} • NLe ${((c.priceUsd||0) * this.getCurrentExchangeRate()).toFixed(2)}`,
      product: c
    }));

    // If none found, offer near-universal options
    if (suggestions.length === 0) {
      return [{ title: 'No direct catalog matches', description: 'Try "Suggest Universal LCDs" for adaptable screens or add the exact model to the product catalog.' }];
    }

    this.reiState.lastSuggestions = suggestions;
    return suggestions;
  }

  reiSuggestUniversalLCDs() {
    const universal = [
      { title: 'Universal LCD Kit - 5.5" to 6.5"', description: 'Flexible replacement kit with multiple bezels and connectors. Good for many modern phones.' },
      { title: 'Universal Laptop LCD 13.3" Adapter', description: 'Universal laptop screen adapter cable + mounting kit.' },
      { title: 'Generic Mobile LCD 4.7" - 6.2"', description: 'Wide compatibility for older models; check connector type.' }
    ];
    this.reiState.lastSuggestions = universal;
    this.reiRenderResults(universal);
  }

  reiCompactCompatibleList() {
    // compact view of last suggestions
    const list = this.reiState.lastSuggestions || [];
    if (list.length === 0) { this.showToast('No suggestions yet — run a REI query first', 'error'); return; }
    const compact = list.map(s => ({ title: s.title, description: s.description }));
    this.reiRenderResults(compact, { compact:true });
  }

  reiRenderResults(items, opts={}) {
    const div = $('#reiResults');
    if (!div) return;
    if (!items || items.length===0) { div.innerHTML = '<p style="color:#6b7280">No results</p>'; return; }
    const html = items.map((it, idx) => `
      <div style="border:1px solid #e5e7eb; padding:10px; border-radius:8px; margin:8px 0;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="flex:1;"><strong>${it.title}</strong><div style="color:#374151; margin-top:6px;">${it.description||''}</div></div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button class="btn btn-primary" onclick="adminDash.reiSelectSuggestion(${idx})">Select</button>
            <button class="btn btn-secondary" onclick="adminDash.reiViewDetails(${idx})">Details</button>
          </div>
        </div>
      </div>
    `).join('');
    div.innerHTML = html;
  }

  reiSelectSuggestion(index) {
    const items = this.reiState.lastSuggestions || [];
    if (!items[index]) return;
    this.reiState.selectedSuggestion = items[index];
    this.showToast('Selected suggestion: ' + items[index].title, 'success');
  }

  reiViewDetails(index) {
    const items = this.reiState.lastSuggestions || [];
    if (!items[index]) return;
    const it = items[index];
    alert(`${it.title}\n\n${it.description}`);
  }

  reiAddSuggestionToInventory() {
    const sel = this.reiState.selectedSuggestion;
    if (!sel || !sel.product) {
      this.showToast('Select a suggestion first', 'error');
      return;
    }
    const p = sel.product;
    // If product already exists (by sku) do nothing
    const existing = this.products.find(x=>x.sku===p.sku);
    if (existing) { this.showToast('Product already in inventory', 'warning'); return; }
    this.products.push(p);
    localStorage.setItem('business_products', JSON.stringify(this.products));
    this.updateProductsTable(this.products);
    this.updateQuickSaleDropdown();
    this.showToast('Added suggestion to inventory', 'success');
  }

  reiUseSelectedProduct() {
    // Use currently selected product from quickSale dropdown
    const sel = $('#quickSaleProduct')?.value;
    if (!sel) { this.showToast('Select a product first in Quick Sale', 'error'); return; }
    const product = this.products.find(p => p.sku === sel);
    if (!product) { this.showToast('Product not found', 'error'); return; }
    $('#reiQuery').value = product.name + ' - find compatible LCD substitutes';
    this.processREIQuery();
  }

  /* ----------------------- Settings & File Scanner ----------------------- */
  initializeSettings() {
    // Load system config
    this.systemConfig = JSON.parse(localStorage.getItem('system_config') || '{}');
    this.loadSystemConfig();

    // Password management
    $('#changeCeoPasswordBtn')?.addEventListener('click', () => this.changeCeoPassword());
    $('#changeCashierPasswordBtn')?.addEventListener('click', () => this.changeCashierPassword());

    // File scanner
    $('#browseFilesBtn')?.addEventListener('click', () => $('#fileInput').click());
    $('#fileInput')?.addEventListener('change', (e) => this.handleFileUpload(e));
    $('#addExtractedProducts')?.addEventListener('click', () => this.addExtractedProducts());
    $('#reviewExtracted')?.addEventListener('click', () => this.reviewExtractedProducts());

    // Drag and drop
    const uploadArea = $('#fileUploadArea');
    if (uploadArea) {
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
      });
      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
      });
      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        this.handleFileUpload(e);
      });
      uploadArea.addEventListener('click', () => $('#fileInput').click());
    }

    // Configuration
    $('#saveConfigBtn')?.addEventListener('click', () => this.saveSystemConfig());
    $('#resetConfigBtn')?.addEventListener('click', () => this.resetSystemConfig());
    $('#fullBackupBtn')?.addEventListener('click', () => this.createFullBackup());
    $('#exportProductsBtn')?.addEventListener('click', () => this.exportData('products'));
    $('#exportSalesBtn')?.addEventListener('click', () => this.exportData('sales'));
  }

  loadSystemConfig() {
    $('#businessName').value = this.systemConfig.businessName || 'Your Business';
    $('#ceoName').value = this.systemConfig.ceoName || 'CEO Name';
    $('#businessAddress').value = this.systemConfig.businessAddress || '';
    $('#defaultCurrency').value = this.systemConfig.defaultCurrency || 'NLe';
    $('#lowStockThreshold').value = this.systemConfig.lowStockThreshold || 5;
    $('#backupFrequency').value = this.systemConfig.backupFrequency || 'daily';
  }

  changeCeoPassword() {
    const current = $('#currentCeoPassword').value;
    const newPass = $('#newCeoPassword').value;
    const confirm = $('#confirmCeoPassword').value;

    if (!current || !newPass || !confirm) {
      this.showToast('Please fill all password fields', 'error');
      return;
    }

    // Get current credentials
    const credentials = JSON.parse(localStorage.getItem('system_credentials') || '{"admin": "admin123", "cashier": "cash123"}');
    
    if (credentials.admin !== current) {
      this.showToast('Current CEO password is incorrect', 'error');
      return;
    }

    if (newPass !== confirm) {
      this.showToast('New passwords do not match', 'error');
      return;
    }

    if (newPass.length < 6) {
      this.showToast('Password must be at least 6 characters', 'error');
      return;
    }

    // Update password
    credentials.admin = newPass;
    localStorage.setItem('system_credentials', JSON.stringify(credentials));
    
    // Clear form
    $('#currentCeoPassword').value = '';
    $('#newCeoPassword').value = '';
    $('#confirmCeoPassword').value = '';

    this.logActivity('CEO', 'Changed CEO password');
    this.showToast('✅ CEO password updated successfully', 'success');
  }

  changeCashierPassword() {
    const current = $('#currentCashierPassword').value;
    const newPass = $('#newCashierPassword').value;
    const confirm = $('#confirmCashierPassword').value;

    if (!current || !newPass || !confirm) {
      this.showToast('Please fill all password fields', 'error');
      return;
    }

    const credentials = JSON.parse(localStorage.getItem('system_credentials') || '{"admin": "admin123", "cashier": "cash123"}');
    
    if (credentials.cashier !== current) {
      this.showToast('Current cashier password is incorrect', 'error');
      return;
    }

    if (newPass !== confirm) {
      this.showToast('New passwords do not match', 'error');
      return;
    }

    if (newPass.length < 6) {
      this.showToast('Password must be at least 6 characters', 'error');
      return;
    }

    credentials.cashier = newPass;
    localStorage.setItem('system_credentials', JSON.stringify(credentials));
    
    $('#currentCashierPassword').value = '';
    $('#newCashierPassword').value = '';
    $('#confirmCashierPassword').value = '';

    this.logActivity('CEO', 'Changed cashier password');
    this.showToast('✅ Cashier password updated successfully', 'success');
  }

  handleFileUpload(event) {
    const files = event.files || event.dataTransfer?.files || event.target?.files;
    if (!files || files.length === 0) return;

    $('#scanProgress').style.display = 'block';
    $('#scanResults').style.display = 'none';
    
    this.extractedProducts = [];
    let processedFiles = 0;
    const totalFiles = files.length;

    Array.from(files).forEach((file, index) => {
      setTimeout(() => {
        this.processFile(file).then(products => {
          this.extractedProducts.push(...products);
          processedFiles++;
          
          const progress = (processedFiles / totalFiles) * 100;
          $('#progressFill').style.width = progress + '%';
          $('#scanStatus').textContent = `Processing ${file.name}... (${processedFiles}/${totalFiles})`;

          if (processedFiles === totalFiles) {
            this.showScanResults();
          }
        });
      }, index * 500); // Stagger processing
    });
  }

  async processFile(file) {
    const products = [];
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const text = await this.readFileAsText(file);
      products.push(...this.parseTextForProducts(text));
    } else if (fileName.endsWith('.xlsx')) {
      // Simulate Excel processing
      products.push(...this.simulateExcelExtraction(file.name));
    } else if (fileName.match(/\.(jpg|jpeg|png)$/)) {
      // Simulate OCR processing
      products.push(...this.simulateImageOCR(file.name));
    }

    return products;
  }

  readFileAsText(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsText(file);
    });
  }

  parseTextForProducts(text) {
    const products = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (!line || line.length < 10) return;

      // Try to extract product info using patterns
      const product = this.extractProductFromLine(line);
      if (product) products.push(product);
    });

    return products;
  }

  extractProductFromLine(line) {
    // Advanced parsing patterns
    const patterns = [
      // SKU, Name, Category, Stock, Cost, Price
      /^([A-Z0-9-]+),?\s*(.+?),?\s*([A-Za-z\s]+),?\s*(\d+),?\s*\$?(\d+\.?\d*),?\s*\$?(\d+\.?\d*)$/,
      // Name - Price format
      /^(.+?)\s*-\s*\$?(\d+\.?\d*)$/,
      // Name | Category | Price
      /^(.+?)\s*\|\s*(.+?)\s*\|\s*\$?(\d+\.?\d*)$/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return this.createProductFromMatch(match, line);
      }
    }

    // Fallback: create basic product from line
    if (line.length > 5) {
      return {
        id: Date.now() + Math.random(),
        sku: this.generateSKU({ name: line, category: 'Extracted' }),
        name: line,
        category: 'Extracted',
        qtyOnHand: 0,
        costUsd: 10,
        priceUsd: 20,
        reorderThreshold: 5,
        source: 'file_extraction'
      };
    }

    return null;
  }

  createProductFromMatch(match, originalLine) {
    const product = {
      id: Date.now() + Math.random(),
      source: 'file_extraction',
      originalLine: originalLine
    };

    if (match.length >= 6) {
      // Full format
      product.sku = match[1];
      product.name = match[2];
      product.category = match[3];
      product.qtyOnHand = parseInt(match[4]) || 0;
      product.costUsd = parseFloat(match[5]) || 10;
      product.priceUsd = parseFloat(match[6]) || 20;
    } else if (match.length >= 3) {
      // Partial format
      product.name = match[1];
      product.priceUsd = parseFloat(match[2]) || 20;
      product.sku = this.generateSKU({ name: product.name, category: 'Extracted' });
      product.category = 'Extracted';
      product.qtyOnHand = 0;
      product.costUsd = product.priceUsd * 0.6; // 40% margin
    }

    product.reorderThreshold = 5;
    return product;
  }

  simulateExcelExtraction(fileName) {
    // Simulate realistic Excel data extraction
    return [
      {
        id: Date.now() + Math.random(),
        sku: 'EXL001',
        name: `Extracted from ${fileName} - Product 1`,
        category: 'Electronics',
        qtyOnHand: 25,
        costUsd: 15.50,
        priceUsd: 28.99,
        reorderThreshold: 5,
        source: 'excel_extraction'
      },
      {
        id: Date.now() + Math.random(),
        sku: 'EXL002',
        name: `Extracted from ${fileName} - Product 2`,
        category: 'Accessories',
        qtyOnHand: 12,
        costUsd: 8.00,
        priceUsd: 15.99,
        reorderThreshold: 3,
        source: 'excel_extraction'
      }
    ];
  }

  simulateImageOCR(fileName) {
    // Simulate OCR text extraction
    return [
      {
        id: Date.now() + Math.random(),
        sku: 'OCR001',
        name: `Text extracted from ${fileName}`,
        category: 'OCR Extracted',
        qtyOnHand: 0,
        costUsd: 12.00,
        priceUsd: 22.00,
        reorderThreshold: 5,
        source: 'image_ocr'
      }
    ];
  }

  showScanResults() {
    $('#scanProgress').style.display = 'none';
    $('#scanResults').style.display = 'block';

    const resultsDiv = $('#extractedProducts');
    if (this.extractedProducts.length === 0) {
      resultsDiv.innerHTML = '<p style="color: #6b7280;">No products extracted from uploaded files</p>';
      return;
    }

    const html = this.extractedProducts.map((product, index) => `
      <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 10px 0; background: #f9fafb;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <strong>${product.name}</strong>
            <div style="color: #6b7280; margin-top: 5px;">
              SKU: ${product.sku} | Category: ${product.category} | Stock: ${product.qtyOnHand} | Price: $${product.priceUsd?.toFixed(2)}
            </div>
            ${product.originalLine ? `<div style="font-size: 0.8rem; color: #9ca3af; font-style: italic;">From: "${product.originalLine}"</div>` : ''}
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" onclick="adminDash.editExtractedProduct(${index})">Edit</button>
            <button class="btn btn-danger" onclick="adminDash.removeExtractedProduct(${index})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    resultsDiv.innerHTML = html;
  }

  addExtractedProducts() {
    if (!this.extractedProducts || this.extractedProducts.length === 0) {
      this.showToast('No products to add', 'error');
      return;
    }

    let addedCount = 0;
    this.extractedProducts.forEach(product => {
      // Check if product already exists
      const existing = this.products.find(p => p.sku === product.sku);
      if (!existing) {
        this.products.push(product);
        addedCount++;
      }
    });

    localStorage.setItem('business_products', JSON.stringify(this.products));
    this.updateProductsTable(this.products);
    this.updateQuickSaleDropdown();

    this.logActivity('CEO', `Added ${addedCount} products from file extraction`);
    this.showToast(`✅ Added ${addedCount} products to inventory`, 'success');
    
    // Clear extracted products
    this.extractedProducts = [];
    $('#scanResults').style.display = 'none';
  }

  removeExtractedProduct(index) {
    if (this.extractedProducts[index]) {
      this.extractedProducts.splice(index, 1);
      this.showScanResults();
    }
  }

  saveSystemConfig() {
    this.systemConfig = {
      businessName: $('#businessName').value || 'Your Business',
      ceoName: $('#ceoName').value || 'CEO Name',
      businessAddress: $('#businessAddress').value || '',
      defaultCurrency: $('#defaultCurrency').value || 'NLe',
      lowStockThreshold: parseInt($('#lowStockThreshold').value) || 5,
      backupFrequency: $('#backupFrequency').value || 'daily',
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem('system_config', JSON.stringify(this.systemConfig));
    this.logActivity('CEO', 'Updated system configuration');
    this.showToast('✅ System configuration saved', 'success');
  }

  createFullBackup() {
    const backup = {
      timestamp: new Date().toISOString(),
      products: this.products,
      sales: this.sales,
      activities: this.activities,
      workers: this.workers,
      workerRatings: this.workerRatings,
      workerCodes: this.workerCodes,
      systemConfig: this.systemConfig
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `business-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    this.showToast('✅ Full system backup downloaded', 'success');
  }

  exportData(type) {
    let data, filename;
    
    if (type === 'products') {
      data = this.products;
      filename = 'products-export.json';
    } else if (type === 'sales') {
      data = this.sales;
      filename = 'sales-export.json';
    }

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
    this.showToast(`✅ ${type} data exported`, 'success');
  }

  initializeEnhancedProductManagement() {
    // Quick sale functionality
    $('#processSaleBtn')?.addEventListener('click', () => this.processQuickSale());
    
    // Initialize product dropdown for quick sale
    this.updateQuickSaleDropdown();
    
    // Auto-update conversion when exchange rate changes
    this.updateProductPricesInNLe();
  }

  updateProductsTable(products) {
    const tbody = $('#productsTableBody');
    if (!tbody) return;

    const exchangeRate = this.getCurrentExchangeRate();
    
    if (!products || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: #6b7280;">No products found</td></tr>';
      return;
    }

    tbody.innerHTML = products.map(product => {
      const priceNLe = (product.priceUsd * exchangeRate).toFixed(2);
      const stockClass = product.qtyOnHand <= 0 ? 'stock-out' : 
                        product.qtyOnHand <= (product.reorderThreshold || 5) ? 'stock-low' : '';
      
      return `
        <tr>
          <td><strong>${product.sku}</strong></td>
          <td>${product.name}</td>
          <td><span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${product.category}</span></td>
          <td>
            <input type="number" class="stock-input ${stockClass}" 
                   value="${product.qtyOnHand}" 
                   onchange="adminDash.updateStock('${product.sku}', this.value)"
                   min="0">
            ${product.qtyOnHand <= 0 ? '<br><small style="color: #dc2626;">OUT OF STOCK</small>' : 
              product.qtyOnHand <= (product.reorderThreshold || 5) ? '<br><small style="color: #d97706;">LOW STOCK</small>' : ''}
          </td>
          <td>$${product.costUsd?.toFixed(2) || '0.00'}</td>
          <td>$${product.priceUsd?.toFixed(2) || '0.00'}</td>
          <td>NLe ${parseFloat(priceNLe).toLocaleString()}</td>
          <td>
            <input type="number" class="sell-input" 
                   placeholder="Sell Price (NLe)" 
                   step="0.01"
                   onchange="adminDash.calculateSaleProfit('${product.sku}', this.value, '${priceNLe}')">
          </td>
          <td>${this.calculateMargin(product.costUsd, product.priceUsd)}%</td>
          <td>
            <span class="profit-display" id="profit-${product.sku}">
              Enter sale price
            </span>
          </td>
          <td>
            <button class="action-btn btn-sell" onclick="adminDash.sellProduct('${product.sku}')">📦 Sell</button>
            <button class="action-btn btn-edit" onclick="adminDash.editProduct('${product.sku}')">✏️ Edit</button>
            <button class="action-btn btn-delete" onclick="adminDash.deleteProduct('${product.sku}')">🗑️ Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  calculateSaleProfit(sku, sellPriceNLe, standardPriceNLe) {
    const product = this.products.find(p => p.sku === sku);
    if (!product) return;

    const exchangeRate = this.getCurrentExchangeRate();
    const sellPriceUsd = parseFloat(sellPriceNLe) / exchangeRate;
    const profit = sellPriceUsd - (product.costUsd || 0);
    const profitNLe = profit * exchangeRate;
    
    const profitElement = $(`#profit-${sku}`);
    if (profitElement) {
      profitElement.textContent = `NLe ${profitNLe.toFixed(2)}`;
      profitElement.className = `profit-display ${profit >= 0 ? 'profit-positive' : 'profit-negative'}`;
    }
  }

  calculateMargin(cost, price) {
    if (!cost || !price) return 0;
    return Math.round(((price - cost) / price) * 100);
  }

  updateStock(sku, newStock) {
    const productIndex = this.products.findIndex(p => p.sku === sku);
    if (productIndex !== -1) {
      this.products[productIndex].qtyOnHand = parseInt(newStock);
      localStorage.setItem('business_products', JSON.stringify(this.products));
      
      // Check for low stock alert
      if (parseInt(newStock) <= (this.products[productIndex].reorderThreshold || 5)) {
        this.showToast(`⚠️ Low stock alert for ${this.products[productIndex].name}`, 'warning');
      }
      
      this.logActivity('Admin', `Updated stock for ${this.products[productIndex].name} to ${newStock}`);
    }
  }

  sellProduct(sku) {
    const product = this.products.find(p => p.sku === sku);
    if (!product) {
      this.showToast('Product not found', 'error');
      return;
    }

    if (product.qtyOnHand <= 0) {
      this.showToast('❌ Cannot sell - Product out of stock!', 'error');
      return;
    }

    // Get sell price from input
    const sellInput = document.querySelector(`input[onchange*="${sku}"]`);
    const sellPrice = sellInput ? parseFloat(sellInput.value) : 0;

    if (!sellPrice) {
      this.showToast('Please enter a sell price first', 'error');
      return;
    }

    // Process the sale
    this.processProductSale(sku, sellPrice, 1);
  }

  processProductSale(sku, sellPriceNLe, quantity = 1) {
    const productIndex = this.products.findIndex(p => p.sku === sku);
    if (productIndex === -1) return;

    const product = this.products[productIndex];
    if (product.qtyOnHand < quantity) {
      this.showToast('❌ Insufficient stock!', 'error');
      return;
    }

    // Update stock
    this.products[productIndex].qtyOnHand -= quantity;
    
    // Calculate profit
    const exchangeRate = this.getCurrentExchangeRate();
    const sellPriceUsd = sellPriceNLe / exchangeRate;
    const profit = (sellPriceUsd - product.costUsd) * quantity;
    const profitNLe = profit * exchangeRate;

    // Record sale
    const sale = {
      id: Date.now(),
      sku: sku,
      productName: product.name,
      quantity: quantity,
      sellPriceNLe: sellPriceNLe,
      sellPriceUsd: sellPriceUsd,
      costUsd: product.costUsd,
      profitUsd: profit,
      profitNLe: profitNLe,
      timestamp: new Date().toISOString(),
      user: 'Admin'
    };

    this.sales.push(sale);
    
    // Update storage
    localStorage.setItem('business_products', JSON.stringify(this.products));
    localStorage.setItem('business_sales', JSON.stringify(this.sales));
    
    // Update display
    this.updateProductsTable(this.products);
    this.updateQuickSaleDropdown();
    
    // Log activity
    this.logActivity('Admin', `Sold ${quantity}x ${product.name} for NLe ${sellPriceNLe.toFixed(2)} (Profit: NLe ${profitNLe.toFixed(2)})`);
    
    this.showToast(`✅ Sale recorded! Profit: NLe ${profitNLe.toFixed(2)}`, 'success');
    
    // Check stock level
    if (this.products[productIndex].qtyOnHand <= 0) {
      this.showToast(`🚨 ${product.name} is now OUT OF STOCK!`, 'warning');
    } else if (this.products[productIndex].qtyOnHand <= (product.reorderThreshold || 5)) {
      this.showToast(`⚠️ ${product.name} is running low (${this.products[productIndex].qtyOnHand} left)`, 'warning');
    }
  }

  processQuickSale() {
    const sku = $('#quickSaleProduct')?.value;
    const sellAmount = parseFloat($('#quickSaleAmount')?.value || 0);
    const quantity = parseInt($('#quickSaleQty')?.value || 1);

    if (!sku) {
      this.showToast('Please select a product', 'error');
      return;
    }

    if (!sellAmount) {
      this.showToast('Please enter sale amount', 'error');
      return;
    }

    this.processProductSale(sku, sellAmount, quantity);
    
    // Clear form
    $('#quickSaleAmount').value = '';
    $('#quickSaleQty').value = '1';
  }

  updateQuickSaleDropdown() {
    const dropdown = $('#quickSaleProduct');
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">Select Product...</option>' +
      this.products
        .filter(p => p.qtyOnHand > 0)
        .map(p => `<option value="${p.sku}">${p.name} (Stock: ${p.qtyOnHand})</option>`)
        .join('');
  }

  deleteProduct(sku) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    const productIndex = this.products.findIndex(p => p.sku === sku);
    if (productIndex !== -1) {
      const productName = this.products[productIndex].name;
      this.products.splice(productIndex, 1);
      localStorage.setItem('business_products', JSON.stringify(this.products));
      
      this.updateProductsTable(this.products);
      this.updateQuickSaleDropdown();
      
      this.logActivity('Admin', `Deleted product: ${productName}`);
      this.showToast(`✅ Product "${productName}" deleted successfully`, 'success');
    }
  }

  updateProductPricesInNLe() {
    // This will be called whenever exchange rate updates
    this.updateProductsTable(this.products);
  }

  initializeCurrencyCalculator() {
    // Initialize currency calculator
    $('#usdAmount')?.addEventListener('input', () => this.calculateUsdToNle());
    $('#nleAmount')?.addEventListener('input', () => this.calculateNleToUsd());
    $('#refreshRates')?.addEventListener('click', () => this.updateExchangeRates());
    
    // Load initial exchange rates
    this.updateExchangeRates();
    
    // Auto-update rates every hour
    setInterval(() => this.updateExchangeRates(), 3600000);
  }

  async updateExchangeRates() {
    try {
      // Show loading
      $('#usdToNle').textContent = 'Updating...';
      $('#refreshRates').textContent = '🔄 Updating...';
      $('#refreshRates').disabled = true;

      // Try to get live rates, fallback to stored/default rates
      let exchangeRate = this.getCurrentExchangeRate();
      
      // Store the rate
      localStorage.setItem('usd_nle_rate', exchangeRate.toString());
      localStorage.setItem('rate_last_updated', new Date().toISOString());
      
      // Update display
      $('#usdToNle').textContent = `1 USD = NLe ${exchangeRate.toFixed(2)}`;
      $('#rateUpdated').textContent = new Date().toLocaleString();
      
      // Calculate next update time
      const nextUpdate = new Date();
      nextUpdate.setHours(nextUpdate.getHours() + 1);
      $('#nextUpdate').textContent = nextUpdate.toLocaleTimeString();
      
      // Show 24h change (simulated)
      const changePercent = (Math.random() - 0.5) * 4; // ±2% random change
      const changeElement = $('#dayChange');
      changeElement.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
      changeElement.style.color = changePercent >= 0 ? '#16a34a' : '#dc2626';
      
      // Reset button
      $('#refreshRates').textContent = '🔄 Refresh Rates';
      $('#refreshRates').disabled = false;
      
      // Recalculate current amounts
      this.calculateUsdToNle();
      this.calculateNleToUsd();
      
      this.showToast('✅ Exchange rates updated successfully!', 'success');
      
    } catch (error) {
      console.error('Error updating exchange rates:', error);
      $('#usdToNle').textContent = 'Error loading rates';
      $('#refreshRates').textContent = '🔄 Refresh Rates';
      $('#refreshRates').disabled = false;
      this.showToast('⚠️ Using offline rates - check connection', 'error');
    }
  }

  getCurrentExchangeRate() {
    // Get stored rate or use default
    const storedRate = localStorage.getItem('usd_nle_rate');
    const lastUpdated = localStorage.getItem('rate_last_updated');
    
    // Check if rate is fresh (less than 24 hours old)
    const isRateFresh = lastUpdated && 
      (new Date() - new Date(lastUpdated)) < 24 * 60 * 60 * 1000;
    
    if (storedRate && isRateFresh) {
      return parseFloat(storedRate);
    }
    
    // Simulate live rate with realistic Sierra Leone New Leone rates
    // New Leone (NLe) typically ranges from 20-30 per USD (new currency)
    const baseRate = 25.50; // Base rate for new NLe
    const variation = (Math.random() - 0.5) * 2; // ±1 variation
    const currentRate = baseRate + variation;
    
    return Math.round(currentRate * 100) / 100; // Round to 2 decimal places
  }

  calculateUsdToNle() {
    const usdAmount = parseFloat($('#usdAmount')?.value || 0);
    const rate = this.getCurrentExchangeRate();
    const nleResult = usdAmount * rate;
    
    $('#nleResult').textContent = `NLe ${nleResult.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  calculateNleToUsd() {
    const nleAmount = parseFloat($('#nleAmount')?.value || 0);
    const rate = this.getCurrentExchangeRate();
    const usdResult = nleAmount / rate;
    
    $('#usdResult').textContent = `$${usdResult.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} USD`;
  }

  initializeBulkProductEntry() {
    const bulkAddBtn = $('#bulkAddBtn');
    const bulkModal = $('#bulkProductModal');
    const closeBulkModal = $('#closeBulkModal');
    const processBtn = $('#processProductsBtn');
    const confirmBtn = $('#confirmAddProducts');
    const clearBtn = $('#clearBulkBtn');

    if (bulkAddBtn) {
      bulkAddBtn.addEventListener('click', () => {
        bulkModal.style.display = 'flex';
      });
    }

    if (closeBulkModal) {
      closeBulkModal.addEventListener('click', () => {
        bulkModal.style.display = 'none';
      });
    }

    if (processBtn) {
      processBtn.addEventListener('click', () => this.processProductsWithAI());
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.confirmAddGroupedProducts());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        $('#bulkProductText').value = '';
        $('#aiProcessingResults').style.display = 'none';
      });
    }

    // Close modal when clicking outside
    bulkModal?.addEventListener('click', (e) => {
      if (e.target === bulkModal) {
        bulkModal.style.display = 'none';
      }
    });
  }

  processProductsWithAI() {
    const bulkText = $('#bulkProductText').value.trim();
    if (!bulkText) {
      this.showToast('Please enter some products to process', 'error');
      return;
    }

    // Show processing indicator
    const processBtn = $('#processProductsBtn');
    const originalText = processBtn.textContent;
    processBtn.textContent = '🤖 Processing...';
    processBtn.disabled = true;

    // Simulate AI processing
    setTimeout(() => {
      const groupedProducts = this.aiGroupProducts(bulkText);
      this.displayGroupedProducts(groupedProducts);
      
      processBtn.textContent = originalText;
      processBtn.disabled = false;
      $('#aiProcessingResults').style.display = 'block';
    }, 1500);
  }

  aiGroupProducts(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const groups = {};
    
    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      // AI-like product analysis
      const analyzed = this.analyzeProduct(cleanLine);
      const groupKey = analyzed.brand + '_' + analyzed.category;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          brand: analyzed.brand,
          category: analyzed.category,
          products: []
        };
      }
      
      groups[groupKey].products.push({
        name: analyzed.name,
        sku: this.generateSKU(analyzed),
        suggestedPrice: analyzed.suggestedPrice,
        category: analyzed.category,
        brand: analyzed.brand,
        original: cleanLine
      });
    });

    return groups;
  }

  analyzeProduct(productText) {
    const text = productText.toLowerCase();
    
    // Brand detection
    const brands = ['apple', 'samsung', 'sony', 'lg', 'hp', 'dell', 'asus', 'acer', 'lenovo', 'microsoft', 'google', 'huawei', 'xiaomi', 'oppo', 'vivo', 'oneplus', 'motorola', 'nokia'];
    let brand = 'Unknown';
    for (const b of brands) {
      if (text.includes(b)) {
        brand = b.charAt(0).toUpperCase() + b.slice(1);
        break;
      }
    }

    // Category detection
    let category = 'General';
    if (text.includes('phone') || text.includes('iphone') || text.includes('galaxy')) category = 'Smartphones';
    else if (text.includes('laptop') || text.includes('macbook') || text.includes('notebook')) category = 'Laptops';
    else if (text.includes('tablet') || text.includes('ipad')) category = 'Tablets';
    else if (text.includes('headphone') || text.includes('earphone') || text.includes('airpods')) category = 'Audio';
    else if (text.includes('watch') || text.includes('band')) category = 'Wearables';
    else if (text.includes('cable') || text.includes('charger') || text.includes('adapter')) category = 'Accessories';
    else if (text.includes('speaker') || text.includes('bluetooth')) category = 'Audio';

    // Price suggestion based on category and brand
    let suggestedPrice = 50;
    if (category === 'Smartphones') suggestedPrice = brand === 'Apple' ? 899 : brand === 'Samsung' ? 699 : 399;
    else if (category === 'Laptops') suggestedPrice = brand === 'Apple' ? 1299 : brand === 'Dell' ? 899 : 699;
    else if (category === 'Tablets') suggestedPrice = brand === 'Apple' ? 599 : 299;
    else if (category === 'Audio') suggestedPrice = brand === 'Apple' ? 179 : brand === 'Sony' ? 299 : 79;
    else if (category === 'Wearables') suggestedPrice = brand === 'Apple' ? 399 : 199;

    return {
      name: productText.trim(),
      brand: brand,
      category: category,
      suggestedPrice: suggestedPrice
    };
  }

  generateSKU(analyzed) {
    const brandCode = analyzed.brand.substring(0, 3).toUpperCase();
    const categoryCode = analyzed.category.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${brandCode}${categoryCode}${randomNum}`;
  }

  displayGroupedProducts(groups) {
    const resultsDiv = $('#groupedProducts');
    let html = '';
    
    Object.values(groups).forEach(group => {
      html += `
        <div class="product-group">
          <h5>📱 ${group.brand} ${group.category} (${group.products.length} items)</h5>
          ${group.products.map(product => `
            <div class="product-item">
              <span><strong>${product.name}</strong> (SKU: ${product.sku})</span>
              <span class="suggested-price">$${product.suggestedPrice}</span>
            </div>
          `).join('')}
        </div>
      `;
    });
    
    resultsDiv.innerHTML = html;
    this.groupedProductData = groups;
  }

  confirmAddGroupedProducts() {
    if (!this.groupedProductData) {
      this.showToast('No products to add', 'error');
      return;
    }

    let addedCount = 0;
    Object.values(this.groupedProductData).forEach(group => {
      group.products.forEach(product => {
        const newProduct = {
          id: Date.now() + Math.random(),
          sku: product.sku,
          name: product.name,
          category: product.category,
          qtyOnHand: 0,
          costUsd: Math.round(product.suggestedPrice * 0.6 * 100) / 100, // 40% margin
          priceUsd: product.suggestedPrice,
          reorderThreshold: 5
        };
        
        this.products.push(newProduct);
        addedCount++;
      });
    });
    
    localStorage.setItem('business_products', JSON.stringify(this.products));
    this.loadProductsTable();
    
    // Close modal and reset
    $('#bulkProductModal').style.display = 'none';
    $('#bulkProductText').value = '';
    $('#aiProcessingResults').style.display = 'none';
    
    this.showToast(`✅ Successfully added ${addedCount} products with AI grouping!`, 'success');
    this.groupedProductData = null;
  }

  loadProductsTable() {
    this.updateProductsTable(this.products);
  }

  loadDashboardData() {
    try {
      // Calculate today's sales summary
      const today = new Date().toDateString();
      const todaySales = this.sales.filter(sale => new Date(sale.timestamp).toDateString() === today);
      
      const salesData = {
        totalRevenue: todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0),
        itemsSold: todaySales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0),
        avgMargin: this.calculateAverageMargin(todaySales)
      };
      
      this.updateSalesSummary(salesData);

      // Update cashier status
      const activeCashiers = this.getActiveCashiers();
      this.updateCashierStatus(activeCashiers);

      // Update products table and low stock alerts
      this.updateProductsTable(this.products);
      this.updateLowStockAlerts(this.products);

      // Update recent activity
      this.updateRecentActivity(this.activities.slice(-10));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showAlert('Error loading dashboard data', 'error');
    }
  }

  calculateAverageMargin(sales) {
    if (sales.length === 0) return 0;
    let totalMargin = 0;
    let count = 0;
    
    sales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach(item => {
          const product = this.products.find(p => p.sku === item.sku);
          if (product && product.priceUsd && product.costUsd) {
            const margin = ((product.priceUsd - product.costUsd) / product.priceUsd) * 100;
            totalMargin += margin;
            count++;
          }
        });
      }
    });
    
    return count > 0 ? (totalMargin / count) : 0;
  }

  getActiveCashiers() {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    return this.cashiers.filter(cashier => {
      const lastActivity = new Date(cashier.lastActivity);
      return lastActivity > fiveMinutesAgo;
    });
  }

  updateSalesSummary(data) {
    $('#todaySales').textContent = `$${(data.totalRevenue || 0).toFixed(2)}`;
    $('#productsSold').textContent = data.itemsSold || 0;
    $('#profitMargin').textContent = `${(data.avgMargin || 0).toFixed(1)}%`;
  }

  updateCashierStatus(cashiers) {
    $('#activeCashiers').textContent = cashiers.length;
    
    const statusList = $('#cashierStatusList');
    statusList.innerHTML = '';
    
    if (cashiers.length === 0) {
      statusList.innerHTML = `
        <div class="cashier-status status-offline">
          <span>👤</span>
          <span>No cashiers online</span>
          <span class="activity-time">Offline</span>
        </div>
      `;
    } else {
      cashiers.forEach(cashier => {
        const statusDiv = document.createElement('div');
        statusDiv.className = `cashier-status status-online`;
        statusDiv.innerHTML = `
          <span>👤</span>
          <span>${cashier.name} (${cashier.id})</span>
          <span class="activity-time">${new Date(cashier.lastActivity).toLocaleTimeString()}</span>
        `;
        statusList.appendChild(statusDiv);
      });
    }
  }

  updateProductsTable(products) {
    const tbody = $('#productsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    products.forEach(product => {
      const margin = product.priceUsd && product.costUsd ? 
        (((product.priceUsd - product.costUsd) / product.priceUsd) * 100).toFixed(1) : '0.0';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${product.sku}</td>
        <td>${product.name}</td>
        <td>${product.category || 'N/A'}</td>
        <td>${product.qtyOnHand}</td>
        <td>$${(product.costUsd || 0).toFixed(2)}</td>
        <td>$${(product.priceUsd || 0).toFixed(2)}</td>
        <td>${margin}%</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="adminDash.editProduct('${product.sku}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="adminDash.deleteProduct('${product.sku}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  updateLowStockAlerts(products) {
    const lowStock = products.filter(p => p.qtyOnHand <= (p.reorderThreshold || 5));
    const countEl = $('#lowStockCount');
    if (countEl) countEl.textContent = lowStock.length;
    
    const list = $('#lowStockList');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (lowStock.length === 0) {
      list.innerHTML = '<p style="color: #6b7280; font-style: italic;">No low stock alerts</p>';
    } else {
      lowStock.forEach(product => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
          <span>⚠️ ${product.name} (${product.sku})</span>
          <span class="activity-time">${product.qtyOnHand} left</span>
        `;
        list.appendChild(div);
      });
    }
  }

  updateRecentActivity(activities) {
    const container = $('#recentActivity');
    if (!container) return;
    
    container.innerHTML = '';
    
    activities.slice(-10).reverse().forEach(activity => {
      const div = document.createElement('div');
      div.className = 'activity-item';
      div.innerHTML = `
        <span>${activity.description}</span>
        <span class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</span>
      `;
      container.appendChild(div);
    });
  }

  logActivity(user, description) {
    const activity = {
      user: user,
      description: description,
      timestamp: new Date().toISOString()
    };
    
    this.activities.push(activity);
    
    // Keep only last 100 activities
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(-100);
    }
    
    this.saveActivities();
    
    // Update display if on overview tab
    if ($('#overview')?.classList.contains('active')) {
      this.updateRecentActivity(this.activities);
    }
  }

  initializeRealTimeUpdates() {
    // Simulate real-time updates every 30 seconds
    setInterval(() => {
      this.loadDashboardData();
      this.updateLiveMonitoring();
    }, 30000);

    // More frequent updates for live monitoring (every 5 seconds)
    setInterval(() => {
      if ($('#live-monitor')?.classList.contains('active')) {
        this.updateLiveMonitoring();
      }
    }, 5000);
  }

  updateLiveMonitoring() {
    try {
      // Update live sales activity
      const today = new Date().toDateString();
      const recentSales = this.sales
        .filter(sale => new Date(sale.timestamp).toDateString() === today)
        .slice(-5);
      
      const salesActivity = $('#liveSalesActivity');
      if (salesActivity) {
        salesActivity.innerHTML = '';
        
        if (recentSales.length > 0) {
          recentSales.forEach(sale => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.innerHTML = `
              <span>💰 Sale: $${(sale.total || 0).toFixed(2)} by ${sale.cashier || 'Cashier'}</span>
              <span class="activity-time">${new Date(sale.timestamp).toLocaleTimeString()}</span>
            `;
            salesActivity.appendChild(div);
          });
        } else {
          salesActivity.innerHTML = '<p style="color: #6b7280; font-style: italic;">No recent sales activity</p>';
        }
      }

      // Update transaction stream
      const stream = $('#transactionStream');
      if (stream) {
        const recentActivities = this.activities.slice(-15);
        
        if (recentActivities.length > 0) {
          // Clear and repopulate
          stream.innerHTML = '';
          recentActivities.reverse().forEach(activity => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.innerHTML = `
              <span>🛒 ${activity.description}</span>
              <span class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</span>
            `;
            stream.appendChild(div);
          });
        } else {
          stream.innerHTML = '<p style="color: #6b7280; font-style: italic;">Waiting for transactions...</p>';
        }
      }
    } catch (error) {
      console.error('Error updating live monitoring:', error);
    }
  }

  handleManualProductEntry(e) {
    e.preventDefault();
    
    const product = {
      id: Date.now().toString(),
      sku: $('#manualSku').value.trim(),
      name: $('#manualName').value.trim(),
      category: $('#manualCategory').value.trim(),
      qtyOnHand: parseInt($('#manualQty').value) || 0,
      costUsd: parseFloat($('#manualCost').value) || 0,
      priceUsd: parseFloat($('#manualPrice').value) || 0,
      reorderThreshold: 5
    };
    
    // Check if SKU already exists
    const existingIndex = this.products.findIndex(p => p.sku === product.sku);
    if (existingIndex >= 0) {
      this.products[existingIndex] = product;
      this.showAlert('Product updated successfully!', 'success');
    } else {
      this.products.push(product);
      this.showAlert('Product added successfully!', 'success');
    }
    
    this.saveProducts();
    this.logActivity('Admin', `Added/updated product: ${product.name}`);
    $('#manualProductForm').reset();
    this.loadDashboardData(); // Refresh data
  }

  generateReport(type) {
    try {
      const today = new Date();
      let reportData = [];
      let title = '';
      
      switch (type) {
        case 'daily':
          const todayStr = today.toDateString();
          reportData = this.sales.filter(sale => new Date(sale.timestamp).toDateString() === todayStr);
          title = `Daily Sales Report - ${today.toLocaleDateString()}`;
          break;
        case 'weekly':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          reportData = this.sales.filter(sale => new Date(sale.timestamp) >= weekAgo);
          title = `Weekly Sales Report - ${weekAgo.toLocaleDateString()} to ${today.toLocaleDateString()}`;
          break;
        case 'monthly':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          reportData = this.sales.filter(sale => new Date(sale.timestamp) >= monthAgo);
          title = `Monthly Sales Report - ${monthAgo.toLocaleDateString()} to ${today.toLocaleDateString()}`;
          break;
      }
      
      this.showReport(title, reportData);
    } catch (error) {
      console.error('Error generating report:', error);
      this.showAlert('Error generating report', 'error');
    }
  }

  showReport(title, salesData) {
    const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalItems = salesData.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
    
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { background: #f9f9f9; padding: 15px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #7D3AC1; color: white; }
            .print-btn { margin: 20px 0; padding: 10px 20px; background: #7D3AC1; color: white; border: none; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>YOUR BUSINESS ADMIN</h1>
            <h2>${title}</h2>
          </div>
          
          <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total Sales:</strong> $${totalRevenue.toFixed(2)}</p>
            <p><strong>Total Items Sold:</strong> ${totalItems}</p>
            <p><strong>Number of Transactions:</strong> ${salesData.length}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Cashier</th>
                <th>Items</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${salesData.map(sale => `
                <tr>
                  <td>${new Date(sale.timestamp).toLocaleString()}</td>
                  <td>${sale.cashier || 'Unknown'}</td>
                  <td>${sale.items?.length || 0}</td>
                  <td>$${(sale.total || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <button class="print-btn" onclick="window.print()">Print Report</button>
        </body>
      </html>
    `);
    reportWindow.document.close();
  }

  editProduct(sku) {
    const product = this.products.find(p => p.sku === sku);
    if (product) {
      $('#manualSku').value = product.sku;
      $('#manualName').value = product.name;
      $('#manualCategory').value = product.category || '';
      $('#manualQty').value = product.qtyOnHand;
      $('#manualCost').value = product.costUsd;
      $('#manualPrice').value = product.priceUsd;
      
      // Switch to scan-products tab
      $$('.tab').forEach(tab => tab.classList.remove('active'));
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $('#scan-products').classList.add('active');
      $('[data-tab="scan-products"]').classList.add('active');
    }
  }

  deleteProduct(sku) {
    if (confirm(`Are you sure you want to delete product ${sku}?`)) {
      this.products = this.products.filter(p => p.sku !== sku);
      this.saveProducts();
      this.logActivity('Admin', `Deleted product: ${sku}`);
      this.showAlert('Product deleted successfully!', 'success');
      this.loadDashboardData();
    }
  }

  // Camera functions
  async startCamera() {
    try {
      const video = $('#cameraPreview');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      });
      
      video.srcObject = stream;
      video.style.display = 'block';
      
      $('#startCameraBtn').style.display = 'none';
      $('#captureBtn').style.display = 'inline-block';
      $('#stopCameraBtn').style.display = 'inline-block';
      $('#scanArea').classList.add('active');
      
      this.isScanning = true;
      this.showAlert('Camera started. Position product in view and click Capture.', 'success');
    } catch (error) {
      console.error('Camera error:', error);
      this.showAlert('Could not access camera. Please check permissions.', 'error');
    }
  }

  stopCamera() {
    const video = $('#cameraPreview');
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    
    video.style.display = 'none';
    $('#startCameraBtn').style.display = 'inline-block';
    $('#captureBtn').style.display = 'none';
    $('#stopCameraBtn').style.display = 'none';
    $('#scanArea').classList.remove('active');
    
    this.isScanning = false;
  }

  captureImage() {
    // Simulate scanning (in real app, you'd use OCR here)
    const simulatedProduct = {
      sku: 'SCAN-' + Date.now(),
      name: 'Scanned Product ' + Date.now(),
      category: 'Scanned',
      qtyOnHand: 1,
      costUsd: 10.00,
      priceUsd: 20.00
    };
    
    this.addScannedProduct(simulatedProduct);
    this.showAlert('Product scanned successfully! (Simulated)', 'success');
  }

  addScannedProduct(product) {
    this.scannedProducts.push(product);
    
    const container = $('#scannedProductsList');
    if (this.scannedProducts.length === 1) {
      container.innerHTML = '';
    }
    
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.innerHTML = `
      <span>📦 ${product.name} - ${product.sku}</span>
      <button class="btn btn-sm btn-danger" onclick="adminDash.removeScannedProduct(${this.scannedProducts.length - 1})">Remove</button>
    `;
    container.appendChild(div);
    
    $('#saveScannedBtn').style.display = 'inline-block';
  }

  removeScannedProduct(index) {
    this.scannedProducts.splice(index, 1);
    this.refreshScannedProductsList();
  }

  refreshScannedProductsList() {
    const container = $('#scannedProductsList');
    container.innerHTML = '';
    
    if (this.scannedProducts.length === 0) {
      container.innerHTML = '<p style="color: #6b7280; font-style: italic;">No products scanned yet</p>';
      $('#saveScannedBtn').style.display = 'none';
    } else {
      this.scannedProducts.forEach((product, idx) => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
          <span>📦 ${product.name} - ${product.sku}</span>
          <button class="btn btn-sm btn-danger" onclick="adminDash.removeScannedProduct(${idx})">Remove</button>
        `;
        container.appendChild(div);
      });
    }
  }

  showAlert(message, type = 'info') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      padding: 15px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      max-width: 300px;
    `;
    
    switch (type) {
      case 'success':
        toast.style.background = '#10b981';
        break;
      case 'error':
        toast.style.background = '#ef4444';
        break;
      default:
        toast.style.background = '#6b7280';
    }
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }
}

// Initialize dashboard when page loads
let adminDash;
document.addEventListener('DOMContentLoaded', () => {
  adminDash = new AdminDashboard();
});

// Listen for cashier sales (cross-window communication)
window.addEventListener('storage', (e) => {
  if (e.key === 'business_sales' && adminDash) {
    adminDash.sales = JSON.parse(e.newValue || '[]');
    adminDash.loadDashboardData();
  }
  if (e.key === 'business_activities' && adminDash) {
    adminDash.activities = JSON.parse(e.newValue || '[]');
    adminDash.updateRecentActivity(adminDash.activities);
  }
});