// ===== سوق الزين — نظام الطلبات والأتمتة =====
// Orders + WhatsApp + Dropshipping Automation

const StoreConfig = {
  name: 'سوق الزين',
  whatsapp: '966505989304',
  email: 'ali212@icloud.com',
  currency: 'SAR',
  shippingFreeThreshold: 200,
  shippingCost: 25,
  taxRate: 0.15,
  supplier: 'ksadrop',
  supplierUrl: 'https://ksadrop.com',
  orderPrefix: 'SZ'
};

// ===== Order Manager =====
const Orders = {
  STORAGE_KEY: 'souq-alzein-orders',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch { return []; }
  },

  save(orders) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
  },

  create(customerData, items, totals, paymentMethod = 'cod') {
    const order = {
      id: StoreConfig.orderPrefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
      date: new Date().toISOString(),
      status: 'pending',
      paymentMethod,
      customer: customerData,
      items: items,
      totals: totals,
      tracking: [],
      supplierOrderId: null,
      notes: ''
    };
    const orders = this.getAll();
    orders.unshift(order);
    this.save(orders);
    return order;
  },

  getById(orderId) {
    return this.getAll().find(o => o.id === orderId);
  },

  updateStatus(orderId, status, note = '') {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      order.tracking.push({
        status,
        date: new Date().toISOString(),
        note
      });
      this.save(orders);
    }
    return order;
  },

  getStatusArabic(status) {
    const map = {
      'pending': '⏳ قيد الانتظار',
      'confirmed': '✅ تم التأكيد',
      'processing': '🔄 جاري التحضير',
      'shipped': '🚚 تم الشحن',
      'delivered': '📦 تم التسليم',
      'cancelled': '❌ ملغي',
      'returned': '🔄 مرتجع'
    };
    return map[status] || status;
  }
};

// ===== WhatsApp Order Sender =====
const WhatsAppOrder = {
  // Generate order summary text for WhatsApp
  generateMessage(order) {
    let msg = `🛒 *طلب جديد — ${StoreConfig.name}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *رقم الطلب:* ${order.id}\n`;
    msg += `📅 *التاريخ:* ${new Date(order.date).toLocaleDateString('ar-SA')}\n`;
    msg += `💵 *طريقة الدفع:* ${order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'بطاقة/مدى'}\n`;
    msg += `\n👤 *بيانات العميل:*\n`;
    msg += `  الاسم: ${order.customer.name}\n`;
    msg += `  الجوال: ${order.customer.phone}\n`;
    msg += `  الإيميل: ${order.customer.email}\n`;
    msg += `  المدينة: ${order.customer.city}\n`;
    msg += `  العنوان: ${order.customer.address}\n`;
    msg += `\n📦 *المنتجات:*\n`;
    order.items.forEach(item => {
      const p = PRODUCTS.find(pr => pr.id === item.id);
      if (p) {
        msg += `  • ${p.name} × ${item.qty} = ${(p.price * item.qty).toLocaleString()} ر.س\n`;
      }
    });
    msg += `\n💰 *المجموع:*\n`;
    msg += `  المبلغ: ${order.totals.subtotal.toLocaleString()} ر.س\n`;
    msg += `  الشحن: ${order.totals.shipping === 0 ? 'مجاني 🎉' : order.totals.shipping + ' ر.س'}\n`;
    msg += `  الضريبة (15%): ${order.totals.tax.toLocaleString()} ر.س\n`;
    msg += `  ━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `  *الإجمالي: ${order.totals.total.toLocaleString()} ر.س*\n`;
    msg += `\n🔗 *رابط الطلب:* https://az212z.github.io/souq-alzein/track.html?id=${order.id}`;
    return msg;
  },

  // Generate dropshipping order message for KSA Drop
  generateSupplierMessage(order) {
    let msg = `📋 *طلب دروب شيبينغ — ${StoreConfig.name}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 رقم الطلب: ${order.id}\n`;
    msg += `\n📦 *المنتجات المطلوبة من KSA Drop:*\n`;
    order.items.forEach(item => {
      const p = PRODUCTS.find(pr => pr.id === item.id);
      if (p) {
        msg += `\n🔹 ${p.name}\n`;
        msg += `   الكمية: ${item.qty}\n`;
        msg += `   رابط المنتج: https://ksadrop.com/products/${p.slug || p.id}\n`;
        msg += `   سعر الجملة: ${p.cost} ر.س × ${item.qty} = ${(p.cost * item.qty).toLocaleString()} ر.س\n`;
      }
    });
    const totalCost = order.items.reduce((sum, item) => {
      const p = PRODUCTS.find(pr => pr.id === item.id);
      return sum + (p ? p.cost * item.qty : 0);
    }, 0);
    msg += `\n💰 *إجمالي التكلفة:* ${totalCost.toLocaleString()} ر.س\n`;
    msg += `💰 *إجمالي البيع:* ${order.totals.total.toLocaleString()} ر.س\n`;
    msg += `💰 *الربح:* ${(order.totals.total - totalCost).toLocaleString()} ر.س\n`;
    msg += `\n👤 *عنوان الشحن:*\n`;
    msg += `  ${order.customer.name}\n`;
    msg += `  ${order.customer.phone}\n`;
    msg += `  ${order.customer.city} — ${order.customer.address}\n`;
    msg += `\n💵 الدفع: عند الاستلام (COD)`;
    return msg;
  },

  // Open WhatsApp with order message
  sendToOwner(order) {
    const msg = this.generateMessage(order);
    const url = `https://wa.me/${StoreConfig.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    return url;
  },

  // Send supplier order to KSA Drop WhatsApp
  sendToSupplier(order) {
    const msg = this.generateSupplierMessage(order);
    // KSA Drop WhatsApp number (from their website)
    const url = `https://wa.me/966555550555?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    return url;
  },

  // Generate direct order link (for sharing)
  generateOrderLink(order) {
    return `https://az212z.github.io/souq-alzein/track.html?id=${order.id}`;
  }
};

// ===== Coupon System =====
const Coupons = {
  STORAGE_KEY: 'souq-alzein-coupons',

  // Active coupons — can be updated
  list: [
    { code: 'WELCOME10', discount: 10, type: 'percent', minOrder: 100, maxUses: 1000, desc: 'خصم 10% على أول طلب' },
    { code: 'FREE50', discount: 50, type: 'fixed', minOrder: 200, maxUses: 500, desc: 'خصم 50 ر.س على الطلبات فوق 200' },
    { code: 'LAUNCH20', discount: 20, type: 'percent', minOrder: 150, maxUses: 200, desc: 'خصم 20% بمناسبة الإطلاق' },
    { code: 'VIP100', discount: 100, type: 'fixed', minOrder: 500, maxUses: 50, desc: 'خصم 100 ر.س للعملاء المميزين' },
  ],

  validate(code, subtotal) {
    const coupon = this.list.find(c => c.code === code.toUpperCase());
    if (!coupon) return { valid: false, error: 'كود الخصم غير صحيح' };
    if (subtotal < coupon.minOrder) return { valid: false, error: `الحد الأدنى للطلب ${coupon.minOrder} ر.س` };

    const discount = coupon.type === 'percent'
      ? Math.round(subtotal * coupon.discount / 100)
      : coupon.discount;

    return { valid: true, coupon, discount, desc: coupon.desc };
  },

  apply(code, subtotal) {
    const result = this.validate(code, subtotal);
    if (!result.valid) return result;
    return result;
  }
};

// ===== Enhanced Cart with Coupons =====
const EnhancedCart = {
  ...Cart,

  couponCode: null,
  couponDiscount: 0,

  getSubtotalAfterDiscount() {
    return Math.max(0, this.getSubtotal() - this.couponDiscount);
  },

  getTax() {
    return Math.round(this.getSubtotalAfterDiscount() * StoreConfig.taxRate * 100) / 100;
  },

  getTotal() {
    return this.getSubtotalAfterDiscount() + this.getTax() + this.getShipping();
  },

  applyCoupon(code) {
    const result = Coupons.apply(code, this.getSubtotal());
    if (result.valid) {
      this.couponCode = code.toUpperCase();
      this.couponDiscount = result.discount;
      localStorage.setItem('souq-alzein-coupon', JSON.stringify({ code: this.couponCode, discount: this.couponDiscount }));
    }
    return result;
  },

  removeCoupon() {
    this.couponCode = null;
    this.couponDiscount = 0;
    localStorage.removeItem('souq-alzein-coupon');
  },

  init() {
    Cart.init.call(this);
    // Restore coupon
    try {
      const saved = JSON.parse(localStorage.getItem('souq-alzein-coupon'));
      if (saved) {
        this.couponCode = saved.code;
        this.couponDiscount = saved.discount;
      }
    } catch {}
  }
};

// ===== Product Auto-Link (Dropshipping) =====
const DropshipLink = {
  // Generate KSA Drop product URL
  getProductUrl(product) {
    if (product.supplier === 'ksadrop') {
      // Convert product name to URL slug
      const slug = product.name
        .replace(/\s+/g, '-')
        .replace(/[^\w\u0600-\u06FF-]/g, '');
      return `https://ksadrop.com/products/${product.slug || slug}`;
    }
    return '#';
  },

  // One-click order: redirect to KSA Drop for fulfillment
  directOrder(product, qty = 1) {
    const url = this.getProductUrl(product);
    window.open(url, '_blank');
  }
};