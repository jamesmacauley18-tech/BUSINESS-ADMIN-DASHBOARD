// Cashier POS JavaScript - Standalone Version
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

class CashierPOS {
  constructor() {
    this.authToken = localStorage.getItem('reg_auth_token');
    this.username = localStorage.getItem('reg_username');
    this.cart = [];
    this.taxRate = 0.08; // 8% tax rate
    
    // Local data storage
    this.products = JSON.parse(localStorage.getItem('business_products') || '[]');
    this.sales = JSON.parse(localStorage.getItem('business_sales') || '[]');
    this.activities = JSON.parse(localStorage.getItem('business_activities') || '[]');
    
    this.initializeAuth();
    this.initializeUI();
    this.loadData();
    this.startHeartbeat();
  }

  initializeAuth() {
    if (!this.authToken || localStorage.getItem('reg_user_role') !== 'cashier') {
      window.location.href = '/login.html';
      return;
    }
    $('#cashierName').textContent = this.username || 'Cashier';
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
        this.logActivity('Cashier logged out');
        localStorage.removeItem('reg_auth_token');
        localStorage.removeItem('reg_user_role');
        localStorage.removeItem('reg_username');
        window.location.href = '/login.html';
      }
    });

    // Barcode input
    $('#barcodeInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addItemToCart($('#barcodeInput').value.trim());
      }
    });

    $('#addItemBtn').addEventListener('click', () => {
      this.addItemToCart($('#barcodeInput').value.trim());
    });

    $('#clearCartBtn').addEventListener('click', () => {
      if (confirm('Clear entire cart?')) {
        this.clearCart();
      }
    });

    $('#checkoutBtn').addEventListener('click', () => {
      this.processCheckout();
    });

    // Camera scanner
    $('#startScannerBtn').addEventListener('click', () => {
      this.openCameraScanner();
    });

    $('#closeCameraBtn').addEventListener('click', () => {
      this.closeCameraScanner();
    });

    // Product search
    $('#productSearch').addEventListener('input', (e) => {
      this.searchProducts(e.target.value);
    });

    // Update time display
    this.updateTimeDisplay();
    setInterval(() => this.updateTimeDisplay(), 1000);
  }

  loadData() {
    try {
      // Load products from local storage
      this.renderProductGrid();
      this.renderProductCatalog();

      // Load today's sales history
      const today = new Date().toDateString();
      const todaySales = this.sales.filter(sale => 
        new Date(sale.timestamp).toDateString() === today
      );
      this.renderSalesHistory(todaySales);

      this.logActivity('POS system initialized');
    } catch (error) {
      console.error('Error loading data:', error);
      this.showAlert('Error loading data', 'error');
    }
  }

  renderProductGrid() {
    const grid = $('#productGrid');
    if (!grid) return;
    
    grid.innerHTML = '';

    // Show top 20 products for quick access
    const quickProducts = this.products.slice(0, 20);
    
    if (quickProducts.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 40px;">No products available. Please contact admin to add products.</div>';
      return;
    }
    
    quickProducts.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.onclick = () => this.addItemToCart(product.sku);
      
      card.innerHTML = `
        <h4>${product.name}</h4>
        <div class="price">$${(product.priceUsd || 0).toFixed(2)}</div>
        <div class="stock">${product.qtyOnHand} in stock</div>
      `;
      
      grid.appendChild(card);
    });
  }

  renderProductCatalog() {
    const catalog = $('#productCatalog');
    if (!catalog) return;
    
    catalog.innerHTML = '';

    if (this.products.length === 0) {
      catalog.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 40px;">No products available</div>';
      return;
    }

    this.products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.onclick = () => this.addItemToCart(product.sku);
      
      card.innerHTML = `
        <h4>${product.name}</h4>
        <div style="font-size: 12px; color: #6b7280;">${product.sku}</div>
        <div class="price">$${(product.priceUsd || 0).toFixed(2)}</div>
        <div class="stock">${product.qtyOnHand} in stock</div>
      `;
      
      catalog.appendChild(card);
    });
  }

  searchProducts(query) {
    const catalog = $('#productCatalog');
    if (!catalog) return;
    
    catalog.innerHTML = '';

    if (!query.trim()) {
      this.renderProductCatalog();
      return;
    }

    const filtered = this.products.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.sku.toLowerCase().includes(query.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(query.toLowerCase()))
    );

    if (filtered.length === 0) {
      catalog.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 40px;">No products found</div>';
      return;
    }

    filtered.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.onclick = () => this.addItemToCart(product.sku);
      
      card.innerHTML = `
        <h4>${product.name}</h4>
        <div style="font-size: 12px; color: #6b7280;">${product.sku}</div>
        <div class="price">$${(product.priceUsd || 0).toFixed(2)}</div>
        <div class="stock">${product.qtyOnHand} in stock</div>
      `;
      
      catalog.appendChild(card);
    });
  }

  addItemToCart(sku) {
    if (!sku) {
      this.showAlert('Please enter a SKU or barcode', 'error');
      return;
    }

    const product = this.products.find(p => 
      p.sku.toLowerCase() === sku.toLowerCase() || 
      (p.barcode && p.barcode === sku)
    );

    if (!product) {
      this.showAlert(`Product not found: ${sku}`, 'error');
      $('#barcodeInput').value = '';
      return;
    }

    if (product.qtyOnHand <= 0) {
      this.showAlert(`${product.name} is out of stock`, 'error');
      $('#barcodeInput').value = '';
      return;
    }

    // Check if item already in cart
    const existingItem = this.cart.find(item => item.sku === product.sku);
    
    if (existingItem) {
      if (existingItem.quantity >= product.qtyOnHand) {
        this.showAlert(`Cannot add more ${product.name} - insufficient stock`, 'error');
        $('#barcodeInput').value = '';
        return;
      }
      existingItem.quantity++;
    } else {
      this.cart.push({
        sku: product.sku,
        name: product.name,
        price: product.priceUsd || 0,
        quantity: 1,
        maxStock: product.qtyOnHand
      });
    }

    this.renderCart();
    this.logActivity(`Added ${product.name} to cart`);
    $('#barcodeInput').value = '';
    $('#barcodeInput').focus();
  }

  removeItemFromCart(sku) {
    this.cart = this.cart.filter(item => item.sku !== sku);
    this.renderCart();
    this.logActivity(`Removed item from cart`);
  }

  updateCartItemQuantity(sku, change) {
    const item = this.cart.find(item => item.sku === sku);
    if (item) {
      const newQty = item.quantity + change;
      if (newQty <= 0) {
        this.removeItemFromCart(sku);
      } else if (newQty <= item.maxStock) {
        item.quantity = newQty;
        this.renderCart();
      } else {
        this.showAlert('Insufficient stock', 'error');
      }
    }
  }

  renderCart() {
    const cartContainer = $('#cartItems');
    if (!cartContainer) return;
    
    cartContainer.innerHTML = '';

    if (this.cart.length === 0) {
      cartContainer.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">Cart is empty</div>';
      this.updateTotals();
      return;
    }

    this.cart.forEach(item => {
      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
      
      cartItem.innerHTML = `
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-sku">${item.sku} • $${item.price.toFixed(2)} each</div>
        </div>
        <div class="cart-item-controls">
          <div class="qty-control">
            <button class="qty-btn" onclick="cashierPOS.updateCartItemQuantity('${item.sku}', -1)">−</button>
            <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
            <button class="qty-btn" onclick="cashierPOS.updateCartItemQuantity('${item.sku}', 1)">+</button>
          </div>
          <div style="font-weight: 600; min-width: 60px; text-align: right;">
            $${(item.price * item.quantity).toFixed(2)}
          </div>
          <button class="btn btn-sm btn-danger" onclick="cashierPOS.removeItemFromCart('${item.sku}')" style="margin-left: 10px;">×</button>
        </div>
      `;
      
      cartContainer.appendChild(cartItem);
    });

    this.updateTotals();
  }

  updateTotals() {
    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * this.taxRate;
    const total = subtotal + tax;

    $('#subtotal').textContent = `$${subtotal.toFixed(2)}`;
    $('#tax').textContent = `$${tax.toFixed(2)}`;
    $('#grandTotal').textContent = `$${total.toFixed(2)}`;

    const checkoutBtn = $('#checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.disabled = this.cart.length === 0;
    }
  }

  clearCart() {
    this.cart = [];
    this.renderCart();
    this.logActivity('Cart cleared');
  }

  processCheckout() {
    if (this.cart.length === 0) {
      this.showAlert('Cart is empty', 'error');
      return;
    }

    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * this.taxRate;
    const total = subtotal + tax;

    const saleData = {
      id: Date.now().toString(),
      cashier: this.username || 'Cashier',
      items: this.cart.map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity
      })),
      subtotal: subtotal,
      tax: tax,
      total: total,
      timestamp: new Date().toISOString()
    };

    try {
      $('#checkoutBtn').disabled = true;
      $('#checkoutBtn').textContent = 'Processing...';

      // Save sale to local storage
      this.sales.push(saleData);
      localStorage.setItem('business_sales', JSON.stringify(this.sales));

      // Update product quantities
      this.cart.forEach(cartItem => {
        const product = this.products.find(p => p.sku === cartItem.sku);
        if (product) {
          product.qtyOnHand = Math.max(0, product.qtyOnHand - cartItem.quantity);
        }
      });
      localStorage.setItem('business_products', JSON.stringify(this.products));

      this.showAlert(`Sale completed! Total: $${total.toFixed(2)}`, 'success');
      this.logActivity(`Sale completed - $${total.toFixed(2)}`);
      
      // Clear cart and refresh data
      this.clearCart();
      this.loadData();

    } catch (error) {
      console.error('Checkout error:', error);
      this.showAlert('Error processing sale', 'error');
    } finally {
      $('#checkoutBtn').disabled = false;
      $('#checkoutBtn').textContent = 'Complete Sale';
    }
  }

  renderSalesHistory(salesData) {
    const container = $('#salesHistory');
    if (!container) return;
    
    container.innerHTML = '';

    if (salesData.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 40px;">No sales today</div>';
      return;
    }

    salesData.slice(-10).reverse().forEach(sale => {
      const saleDiv = document.createElement('div');
      saleDiv.className = 'activity-item';
      saleDiv.innerHTML = `
        <div>
          <div style="font-weight: 600;">Sale #${sale.id}</div>
          <div style="font-size: 12px; color: #6b7280;">${sale.items?.length || 0} items • ${new Date(sale.timestamp).toLocaleTimeString()}</div>
        </div>
        <div style="font-weight: 600; color: #10b981;">$${(sale.total || 0).toFixed(2)}</div>
      `;
      container.appendChild(saleDiv);
    });
  }

  openCameraScanner() {
    const modal = $('#cameraModal');
    const video = $('#cameraVideo');
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        video.srcObject = stream;
        modal.style.display = 'block';
        $('#cameraScanner').classList.add('active');
      })
      .catch(error => {
        console.error('Camera error:', error);
        this.showAlert('Could not access camera', 'error');
      });
  }

  closeCameraScanner() {
    const modal = $('#cameraModal');
    const video = $('#cameraVideo');
    
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }
    
    modal.style.display = 'none';
    $('#cameraScanner').classList.remove('active');
  }

  updateTimeDisplay() {
    const now = new Date();
    const timeEl = $('#currentTime');
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString();
    }
  }

  logActivity(description) {
    const activity = {
      user: this.username,
      description: description,
      timestamp: new Date().toISOString()
    };
    
    this.activities.push(activity);
    
    // Keep only last 100 activities
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(-100);
    }
    
    localStorage.setItem('business_activities', JSON.stringify(this.activities));
  }

  startHeartbeat() {
    // Update cashier activity every 30 seconds
    setInterval(() => {
      const cashiers = JSON.parse(localStorage.getItem('business_cashiers') || '[]');
      const existingCashier = cashiers.find(c => c.id === this.username);
      
      if (existingCashier) {
        existingCashier.lastActivity = new Date().toISOString();
      } else {
        cashiers.push({
          id: this.username,
          name: this.username,
          lastActivity: new Date().toISOString()
        });
      }
      
      localStorage.setItem('business_cashiers', JSON.stringify(cashiers));
    }, 30000);
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

// Initialize POS when page loads
let cashierPOS;
document.addEventListener('DOMContentLoaded', () => {
  cashierPOS = new CashierPOS();
});

// Export for global access
window.cashierPOS = cashierPOS;