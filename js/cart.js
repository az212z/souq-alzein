// ===== Cart System =====
const Cart = {
  items: [],

  init() {
    const saved = localStorage.getItem('souq-alzein-cart');
    if (saved) {
      try { this.items = JSON.parse(saved); } catch(e) { this.items = []; }
    }
    this.updateUI();
  },

  save() {
    localStorage.setItem('souq-alzein-cart', JSON.stringify(this.items));
    this.updateUI();
  },

  add(productId, qty = 1) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const existing = this.items.find(i => i.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({ id: productId, qty });
    }
    this.save();
    showToast(`تمت إضافة "${product.name}" للسلة ✅`);
  },

  remove(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.save();
  },

  updateQty(productId, qty) {
    if (qty <= 0) { this.remove(productId); return; }
    const item = this.items.find(i => i.id === productId);
    if (item) { item.qty = qty; this.save(); }
  },

  clear() {
    this.items = [];
    this.save();
  },

  getCount() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  getSubtotal() {
    return this.items.reduce((sum, item) => {
      const product = PRODUCTS.find(p => p.id === item.id);
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
  },

  getTax() {
    return Math.round(this.getSubtotal() * 0.15);
  },

  getShipping() {
    return this.getSubtotal() >= 200 ? 0 : 25;
  },

  getTotal() {
    return this.getSubtotal() + this.getTax() + this.getShipping();
  },

  updateUI() {
    const countEls = document.querySelectorAll('#cartCount');
    countEls.forEach(el => {
      el.textContent = this.getCount();
      el.style.display = this.getCount() > 0 ? 'flex' : 'none';
    });
  }
};