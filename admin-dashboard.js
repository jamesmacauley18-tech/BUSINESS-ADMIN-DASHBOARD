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
    $('#addProductBtn').addEventListener('click', () => this.showAddProductModal());
    $('#manualProductForm').addEventListener('submit', (e) => this.handleManualProductEntry(e));

    // Camera scanning
    $('#startCameraBtn').addEventListener('click', () => this.startCamera());
    $('#stopCameraBtn').addEventListener('click', () => this.stopCamera());
    $('#captureBtn').addEventListener('click', () => this.captureImage());

    // Report generation
    $('#dailyReportBtn').addEventListener('click', () => this.generateReport('daily'));
    $('#weeklyReportBtn').addEventListener('click', () => this.generateReport('weekly'));
    $('#monthlyReportBtn').addEventListener('click', () => this.generateReport('monthly'));
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
        statusDiv.className = `cashier-status ${cashier.isActive ? 'status-online' : 'status-offline'}`;
        statusDiv.innerHTML = `
          <span>👤</span>
          <span>${cashier.name} (${cashier.id})</span>
          <span class="activity-time">${cashier.lastActivity}</span>
        `;
        statusList.appendChild(statusDiv);
      });
    }
  }

  updateProductsTable(products) {
    const tbody = $('#productsTableBody');
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
    $('#lowStockCount').textContent = lowStock.length;
    
    const list = $('#lowStockList');
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
    if ($('#overview').classList.contains('active')) {
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
      if ($('#live-monitor').classList.contains('active')) {
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

      // Update transaction stream
      const stream = $('#transactionStream');
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
    } catch (error) {
      console.error('Error updating live monitoring:', error);
    }
  }

  async startCamera() {
    try {
      const video = $('#cameraPreview');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera if available
      });
      
      video.srcObject = stream;
      video.style.display = 'block';
      
      $('#startCameraBtn').style.display = 'none';
      $('#captureBtn').style.display = 'inline-block';
      $('#stopCameraBtn').style.display = 'inline-block';
      $('#scanArea').classList.add('active');
      
      this.isScanning = true;
      this.showAlert('Camera started. Position product barcode or text in view and click Capture.', 'success');
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
    const video = $('#cameraPreview');
    const canvas = $('#scanCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Simulate OCR processing (in real implementation, you'd use OCR service)
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
      container.innerHTML = ''; // Clear "no products" message
    }
    
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.innerHTML = `
      <span>📦 ${product.name || 'Unknown'} - ${product.sku || 'No SKU'}</span>
      <button class="btn btn-sm btn-danger" onclick="adminDash.removeScannedProduct(${this.scannedProducts.length - 1})">Remove</button>
    `;
    container.appendChild(div);
    
    $('#saveScannedBtn').style.display = 'inline-block';
  }

  removeScannedProduct(index) {
    this.scannedProducts.splice(index, 1);
    // Refresh the scanned products list
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
          <span>📦 ${product.name || 'Unknown'} - ${product.sku || 'No SKU'}</span>
          <button class="btn btn-sm btn-danger" onclick="adminDash.removeScannedProduct(${idx})">Remove</button>
        `;
        container.appendChild(div);
      });
    }
  }

  showAlert(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type}`;
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

// Export for global access
window.adminDash = adminDash;

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

  async captureImage() {
    const video = $('#cameraPreview');
    const canvas = $('#scanCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Convert to blob for processing
    canvas.toBlob(async (blob) => {
      try {
        const formData = new FormData();
        formData.append('image', blob, 'capture.jpg');
        
        const response = await fetch('/api/ocr/scan-product', {
          method: 'POST',
          headers: {
            'X-Auth-Token': this.authToken
          },
          body: formData
        });
        
        const result = await response.json();
        if (result.success) {
          this.addScannedProduct(result.product);
          this.showAlert('Product scanned successfully!', 'success');
        } else {
          this.showAlert('Could not read product information from image', 'error');
        }
      } catch (error) {
        console.error('OCR error:', error);
        this.showAlert('Error processing image', 'error');
      }
    }, 'image/jpeg', 0.8);
  }

  addScannedProduct(product) {
    this.scannedProducts.push(product);
    
    const container = $('#scannedProductsList');
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.innerHTML = `
      <span>📦 ${product.name || 'Unknown'} - ${product.sku || 'No SKU'}</span>
      <button class="btn btn-sm btn-danger" onclick="adminDash.removeScannedProduct(${this.scannedProducts.length - 1})">Remove</button>
    `;
    container.appendChild(div);
    
    $('#saveScannedBtn').style.display = 'inline-block';
  }

  removeScannedProduct(index) {
    this.scannedProducts.splice(index, 1);
    // Refresh the scanned products list
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
          <span>📦 ${product.name || 'Unknown'} - ${product.sku || 'No SKU'}</span>
          <button class="btn btn-sm btn-danger" onclick="adminDash.removeScannedProduct(${idx})">Remove</button>
        `;
        container.appendChild(div);
      });
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

  // Add sale from cashier (called when cashier completes sale)
  addSale(saleData) {
    this.sales.push(saleData);
    this.saveSales();
    this.logActivity(saleData.cashier, `Completed sale: $${saleData.total.toFixed(2)}`);
    
    // Update product quantities
    if (saleData.items) {
      saleData.items.forEach(item => {
        const product = this.products.find(p => p.sku === item.sku);
        if (product) {
          product.qtyOnHand = Math.max(0, product.qtyOnHand - item.quantity);
        }
      });
      this.saveProducts();
    }
  }

  // Cashier management
  updateCashierActivity(cashierId) {
    const existingCashier = this.cashiers.find(c => c.id === cashierId);
    if (existingCashier) {
      existingCashier.lastActivity = new Date().toISOString();
    } else {
      this.cashiers.push({
        id: cashierId,
        name: cashierId,
        lastActivity: new Date().toISOString()
      });
    }
    this.saveCashiers();
  }

// Initialize dashboard when page loads
let adminDash;
document.addEventListener('DOMContentLoaded', () => {
  adminDash = new AdminDashboard();
});

// Export for global access
window.adminDash = adminDash;