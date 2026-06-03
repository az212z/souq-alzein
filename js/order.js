// ===== سوق الزين — نظام الطلبات الموحد =====
// يربط السلة (cart) مع لوحة التحكم (admin)
// Storage Key: souq-alzein-orders (مشترك بين كل الصفحات)

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

// ===== Order Manager — موحد مع admin.html =====
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

  // إنشاء طلب جديد — يدعم format السلة و format الأدمين
  create(customerData, items, totals, paymentMethod = 'cod') {
    // إضافة حقول cost وربح لكل منتج
    const enrichedItems = items.map(item => {
      const product = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.find(p => p.id === (item.id || item.productId)) : null;
      return {
        id: item.id || item.productId,
        name: item.name || (product ? product.name : 'منتج'),
        price: item.price || (product ? product.price : 0),
        cost: item.cost || (product ? product.cost : 0),
        qty: item.qty || item.quantity || 1,
        img: item.img || (product ? product.img : ''),
      };
    });

    const subtotal = totals ? totals.subtotal : enrichedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const shipping = totals ? (totals.shipping === 0 ? 0 : totals.shipping) : (subtotal >= StoreConfig.shippingFreeThreshold ? 0 : StoreConfig.shippingCost);
    const tax = totals ? totals.tax : Math.round(subtotal * StoreConfig.taxRate);
    const total = totals ? totals.total : (subtotal + shipping + tax);
    const totalCost = enrichedItems.reduce((sum, item) => sum + (item.cost * item.qty), 0);
    const profit = total - totalCost;

    const orderId = this.generateOrderId();

    const order = {
      id: orderId,
      date: new Date().toISOString(),
      status: 'pending',
      paymentMethod,
      customer: customerData,
      items: enrichedItems,
      // الحسابات المالية
      subtotal: subtotal,
      shipping: shipping,
      tax: tax,
      total: total,
      totalCost: totalCost,
      profit: profit,
      // التوافق مع format السلة القديم
      totals: totals || { subtotal, shipping, tax, total },
      // الكوبون
      coupon: null,
      discount: 0,
      // التتبع
      tracking: [{ status: 'pending', date: new Date().toISOString(), note: 'طلب جديد — بانتظار التأكيد' }],
      supplierOrderId: null,
      trackingNumber: null,
      notes: ''
    };

    const orders = this.getAll();
    orders.unshift(order);
    this.save(orders);
    return order;
  },

  generateOrderId() {
    const count = parseInt(localStorage.getItem('sz_order_count') || '0') + 1;
    localStorage.setItem('sz_order_count', count.toString());
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    return `${StoreConfig.orderPrefix}-${dateStr}-${String(count).padStart(4,'0')}`;
  },

  getById(orderId) {
    return this.getAll().find(o => o.id === orderId);
  },

  updateStatus(orderId, status, note = '') {
    const orders = this.getAll();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      if (!order.tracking) order.tracking = [];
      order.tracking.push({
        status,
        date: new Date().toISOString(),
        note
      });
      // تحديث timeline للأدمين أيضاً
      if (!order.timeline) order.timeline = [];
      order.timeline.push({ status, date: new Date().toISOString(), note });
      this.save(orders);
    }
    return order;
  },

  getStatusArabic(status) {
    const map = {
      'pending': '⏳ قيد الانتظار',
      'confirmed': '✅ تم التأكيد',
      'ordered_from_supplier': '📦 تم الطلب من المورد',
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
  // Generate order summary text for WhatsApp — للعميل/علي
  generateMessage(order) {
    const items = order.items.map(item => {
      const p = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.find(pr => pr.id === item.id) : null;
      const name = item.name || (p ? p.name : 'منتج');
      const price = item.price || (p ? p.price : 0);
      return `• ${name} × ${item.qty || item.quantity} = ${(price * (item.qty || item.quantity)).toLocaleString()} ر.س`;
    }).join('\n');

    let msg = `🛍️ *طلب جديد — ${StoreConfig.name}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *رقم الطلب:* ${order.id}\n`;
    msg += `📅 *التاريخ:* ${new Date(order.date).toLocaleDateString('ar-SA')}\n`;
    msg += `💵 *طريقة الدفع:* الدفع عند الاستلام\n`;
    msg += `\n👤 *بيانات العميل:*\n`;
    msg += `  الاسم: ${order.customer.name}\n`;
    msg += `  الجوال: ${order.customer.phone}\n`;
    if (order.customer.email) msg += `  الإيميل: ${order.customer.email}\n`;
    msg += `  المدينة: ${order.customer.city}\n`;
    msg += `  العنوان: ${order.customer.address}\n`;
    msg += `\n📦 *المنتجات:*\n${items}\n\n`;
    msg += `💰 *المجموع:*\n`;
    msg += `  المبلغ: ${(order.subtotal || order.totals?.subtotal || 0).toLocaleString()} ر.س\n`;
    if (order.discount > 0) msg += `  الخصم: -${order.discount.toLocaleString()} ر.س${order.coupon ? ` (${order.coupon})` : ''}\n`;
    const shipping = order.shipping ?? order.totals?.shipping ?? 0;
    msg += `  الشحن: ${shipping === 0 ? 'مجاني 🎉' : shipping + ' ر.س'}\n`;
    msg += `  الضريبة (15%): ${(order.tax || order.totals?.tax || 0).toLocaleString()} ر.س\n`;
    msg += `  ━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `  *الإجمالي: ${(order.total || order.totals?.total || 0).toLocaleString()} ر.س*\n\n`;
    msg += `🔗 تتبع الطلب:\n`;
    msg += `https://az212z.github.io/souq-alzein/track.html?id=${order.id}`;
    return msg;
  },

  // Generate dropshipping order message for KSA Drop
  generateSupplierMessage(order) {
    let msg = `📋 *طلب دروب شيبينغ — ${StoreConfig.name}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 رقم الطلب: ${order.id}\n\n`;
    msg += `📦 *المنتجات المطلوبة من KSA Drop:*\n`;
    order.items.forEach(item => {
      const p = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.find(pr => pr.id === item.id) : null;
      const name = item.name || (p ? p.name : 'منتج');
      const cost = item.cost || (p ? p.cost : 0);
      const slug = item.slug || (p ? p.slug : '');
      msg += `\n🔹 ${name}\n`;
      msg += `   الكمية: ${item.qty || item.quantity}\n`;
      if (slug) msg += `   رابط: https://ksadrop.com/products/${slug}\n`;
      msg += `   سعر الجملة: ${cost} ر.س × ${item.qty || item.quantity} = ${(cost * (item.qty || item.quantity)).toLocaleString()} ر.س\n`;
    });
    const totalCost = order.items.reduce((sum, item) => {
      const p = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.find(pr => pr.id === item.id) : null;
      return sum + ((item.cost || (p ? p.cost : 0)) * (item.qty || item.quantity));
    }, 0);
    msg += `\n💰 *إجمالي التكلفة:* ${totalCost.toLocaleString()} ر.س\n`;
    msg += `💰 *إجمالي البيع:* ${(order.total || order.totals?.total || 0).toLocaleString()} ر.س\n`;
    msg += `💰 *الربح:* ${((order.total || order.totals?.total || 0) - totalCost).toLocaleString()} ر.س\n`;
    msg += `\n👤 *عنوان الشحن:*\n`;
    msg += `  ${order.customer.name}\n`;
    msg += `  ${order.customer.phone}\n`;
    msg += `  ${order.customer.city} — ${order.customer.address}\n`;
    msg += `\n💵 الدفع: عند الاستلام (COD)`;
    return msg;
  },

  // Open WhatsApp with order message for owner (علي)
  sendToOwner(order) {
    const msg = this.generateMessage(order);
    const url = `https://wa.me/${StoreConfig.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    return url;
  },

  // Send supplier order to KSA Drop WhatsApp
  sendToSupplier(order) {
    const msg = this.generateSupplierMessage(order);
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
  getProductUrl(product) {
    if (product.supplier === 'ksadrop') {
      return `https://ksadrop.com/products/${product.slug || product.id}`;
    }
    return '#';
  },

  directOrder(product, qty = 1) {
    const url = this.getProductUrl(product);
    window.open(url, '_blank');
  }
};