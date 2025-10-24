# Regimenz Business Admin System

A comprehensive web-based business management system with separate interfaces for administrators and cashiers, featuring real-time monitoring and mobile-friendly design.

## 🚀 Features Implemented

### ✅ **Enhanced Login System**
- **Role-based authentication**: Separate login for Admin and Cashier
- **Secure authentication**: Token-based session management
- **User-friendly interface**: Clean, modern login design

### ✅ **Admin Dashboard** 
- **Real-time monitoring**: Live view of cashier activities
- **Sales overview**: Today's sales, active cashiers, profit metrics
- **Product management**: Add, edit, delete products
- **Camera scanning**: Scan products from paper documents
- **Reports generation**: Daily, weekly, monthly reports
- **Low stock alerts**: Automatic inventory monitoring

### ✅ **Cashier POS Interface**
- **Simplified POS**: Easy-to-use point of sale system
- **Barcode scanning**: Camera-based barcode scanner
- **Product catalog**: Browse and search products
- **Cart management**: Add/remove items, quantity controls
- **Sales processing**: Complete transactions with tax calculation
- **Sales history**: View today's transactions

### ✅ **Real-Time Monitoring**
- **Activity logging**: Track all cashier actions
- **Live updates**: Admin sees cashier activities in real-time
- **Heartbeat system**: Monitor active cashiers
- **Transaction stream**: Live feed of all transactions

### ✅ **Mobile Responsive Design**
- **Touch-friendly**: Optimized for tablets and phones
- **Responsive layout**: Works on all screen sizes
- **Dark mode support**: Automatic dark theme detection
- **Accessibility**: Keyboard navigation and screen reader support

## 🏗️ System Architecture

```
Frontend:
├── login.html              # Login page (role selection)
├── admin-dashboard.html    # Admin interface with monitoring
├── cashier-pos.html        # Cashier POS interface
├── admin-dashboard.js      # Admin functionality
├── cashier-pos.js         # POS functionality
└── styles.css             # Enhanced responsive styles

Backend (C# .NET):
├── Program.cs             # Main application with APIs
├── AuthService           # Authentication management
├── ActivityLogger        # Real-time activity tracking
├── CashierMonitor       # Live cashier monitoring
├── DataStore            # Product and sales data
└── Enhanced APIs        # Login, dashboard, monitoring endpoints
```

## 🔐 Default Login Credentials

### Admin Access (Full Control)
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Select "Admin"

### Cashier Access (POS Only)
- **Username**: `cashier1` or `cashier2`
- **Password**: `cash123`
- **Role**: Select "Cashier/Worker"

## 🖥️ Admin Features

1. **Live Dashboard**
   - Real-time sales metrics
   - Active cashier monitoring
   - Recent activity feed
   - Low stock alerts

2. **Product Management**
   - Add products manually
   - Scan products from paper/documents
   - Import/export CSV
   - Edit pricing and inventory

3. **Real-Time Monitoring**
   - See live cashier activities
   - Monitor sales transactions
   - Track login/logout events
   - View transaction history

4. **Reports & Analytics**
   - Daily sales reports
   - Staff performance
   - Profit analysis
   - Inventory reports

## 📱 Cashier Features

1. **Point of Sale**
   - Barcode scanning with camera
   - Product search and browse
   - Cart management
   - Tax calculation
   - Receipt generation

2. **Product Catalog**
   - Search products by name/SKU
   - View product details
   - Check stock levels
   - Quick add to cart

3. **Sales History**
   - View today's transactions
   - Transaction details
   - Sales totals

## 🚀 How to Run

### Prerequisites
- .NET 8.0 SDK or later
- Modern web browser
- Camera access (optional, for scanning)

### Installation & Running

1. **Install .NET SDK** (if not installed):
   ```bash
   # macOS (using Homebrew)
   brew install dotnet
   
   # Or download from: https://dotnet.microsoft.com/download
   ```

2. **Navigate to project directory**:
   ```bash
   cd "/Users/air/Desktop/Admin product"
   ```

3. **Build and run the application**:
   ```bash
   dotnet build
   dotnet run
   ```

4. **Access the application**:
   - Open browser and go to: `http://localhost:5000`
   - You'll be redirected to the login page
   - Choose your role and login with credentials above

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login with role selection
- `GET /api/auth/role` - Get current user role

### Admin Dashboard
- `GET /api/dashboard/sales-summary` - Today's sales metrics
- `GET /api/dashboard/active-cashiers` - Live cashier status
- `GET /api/dashboard/recent-activity` - Recent activities
- `GET /api/dashboard/live-activity` - Real-time updates

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Add/update product
- `POST /api/products/import-csv` - Import products from CSV

### Sales & POS
- `GET /api/sales/today` - Today's sales for cashier
- `POST /api/sales` - Process new sale
- `POST /api/activity/log` - Log cashier activity
- `POST /api/cashier/heartbeat` - Cashier status update

### Scanning
- `POST /api/ocr/scan-product` - Scan product from image

## 🎯 Key Benefits

1. **Remote Admin Access**: Admin can monitor business from anywhere with internet
2. **Real-Time Monitoring**: See exactly what cashiers are doing live
3. **Mobile Friendly**: Works perfectly on phones and tablets
4. **Easy Product Entry**: Scan from paper invoices or add manually
5. **Comprehensive Reporting**: Track sales, inventory, and staff performance
6. **Role-Based Security**: Separate permissions for admin and workers
7. **Offline Capable**: Progressive Web App features for offline use

## 🔧 Customization

The system is designed to be easily customizable:

- **Styling**: Modify `styles.css` for branding
- **Authentication**: Update credentials in `Program.cs`
- **Features**: Add new endpoints and functionality
- **Database**: Can be connected to SQL Server, PostgreSQL, etc.
- **Payment Integration**: Add payment processing APIs
- **Printing**: Connect thermal receipt printers

## 📈 Future Enhancements

Potential additions for your business:

- Customer management system
- Loyalty points program
- Email/SMS notifications
- Advanced analytics dashboard
- Multi-location support
- Integration with accounting software
- Automated reordering
- Employee scheduling

## 🆘 Support

This system is designed specifically for your business needs with:
- Admin oversight of all operations
- Real-time monitoring capabilities
- Easy product management
- Mobile-first design
- Scalable architecture

The system allows you to monitor your business remotely while maintaining full control over inventory and sales operations.