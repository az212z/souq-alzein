/**
 * نظام الطلبات الأوتوماتيكي — سوق الزين
 * 
 * يعمل مع localStorage ويرسل الطلبات عبر واتساب
 * كل طلب يتضمن: بيانات العميل + المنتجات + تكلفة ksadrop + ربحنا
 */

const OrderSystem = {
  // ===== إعدادات =====
  config: {
    storeName: 'سوق الزين',
    whatsapp: '966505989304',      // واتساب علي
    ksadropWhatsapp: '966500000000', // واتساب KSA Drop (يتم تحديثه)
    email: 'ali212@icloud.com',
    currency: 'SAR',
    shippingFreeThreshold: 200,
    shippingCost: 25,
    taxRate: 0.15,
    orderPrefix: 'SZ',
    profitMargin: 2.5, // متوسط هامش الربح
  },

  // ===== إنشاء طلب جديد =====
  createOrder(customerData, items) {
    const orderId = this.generateOrderId();
    const subtotal = this.calculateSubtotal(items);
    const shipping = subtotal >= this.config.shippingFreeThreshold ? 0 : this.config.shippingCost;
    const tax = Math.round(subtotal * this.config.taxRate);
    const total = subtotal + shipping + tax;
    const totalCost = items.reduce((sum, item) => sum + (item.cost * item.qty), 0);
    const profit = total - totalCost - shipping;

    const order = {
      id: orderId,
      date: new Date().toISOString(),
      status: 'pending', // pending → confirmed → ordered_from_supplier → shipped → delivered
      customer: customerData,
      items: items,
      subtotal: subtotal,
      shipping: shipping,
      tax: tax,
      total: total,
      totalCost: totalCost,
      profit: profit,
      coupon: null,
      discount: 0,
      notes: '',
      timeline: [
        { status: 'pending', date: new Date().toISOString(), note: 'طلب جديد — بانتظار التأكيد' }
      ],
      supplierOrder: null, // رقم طلب ksadrop
      trackingNumber: null,
    };

    // حفظ في localStorage
    this.saveOrder(order);

    return order;
  },

  // ===== حساب المجموع =====
  calculateSubtotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  },

  // ===== تطبيق كوبون =====
  applyCoupon(order, couponCode) {
    const coupons = {
      'WELCOME10': { type: 'percent', value: 10, minOrder: 0, description: 'خصم 10% للعملاء الجدد' },
      'LAUNCH20': { type: 'percent', value: 20, minOrder: 0, description: 'خصم 20% عرض الإطلاق' },
      'FREE50': { type: 'fixed', value: 50, minOrder: 200, description: 'خصم 50 ر.س للطلبات فوق 200 ر.س' },
      'VIP100': { type: 'fixed', value: 100, minOrder: 300, description: 'خصم 100 ر.س للطلبات الكبيرة' },
    };

    const coupon = coupons[couponCode.toUpperCase()];
    if (!coupon) return { success: false, message: 'كوبون غير صالح' };

    if (order.subtotal < coupon.minOrder) {
      return { success: false, message: `الحد الأدنى للطلب ${coupon.minOrder} ر.س` };
    }

    let discount = 0;
    if (coupon.type === 'percent') {
      discount = Math.round(order.subtotal * coupon.value / 100);
    } else {
      discount = coupon.value;
    }

    order.discount = discount;
    order.coupon = couponCode.toUpperCase();
    order.total = order.subtotal - discount + order.shipping + order.tax;

    // إعادة حساب الربح
    order.profit = order.total - order.totalCost - order.shipping;

    this.saveOrder(order);
    return { success: true, discount: discount, message: coupon.description };
  },

  // ===== إنشاء رقم طلب =====
  generateOrderId() {
    const count = parseInt(localStorage.getItem('sz_order_count') || '0') + 1;
    localStorage.setItem('sz_order_count', count.toString());
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    return `${this.config.orderPrefix}-${dateStr}-${String(count).padStart(4,'0')}`;
  },

  // ===== حفظ طلب =====
  saveOrder(order) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.push(order);
    }
    localStorage.setItem('sz_orders', JSON.stringify(orders));
  },

  // ===== جلب كل الطلبات =====
  getOrders() {
    try {
      return JSON.parse(localStorage.getItem('sz_orders') || '[]');
    } catch { return []; }
  },

  // ===== جلب طلب محدد =====
  getOrder(orderId) {
    return this.getOrders().find(o => o.id === orderId);
  },

  // ===== تحديث حالة الطلب =====
  updateStatus(orderId, status, note = '') {
    const order = this.getOrder(orderId);
    if (!order) return null;

    order.status = status;
    order.timeline.push({
      status: status,
      date: new Date().toISOString(),
      note: note
    });

    this.saveOrder(order);
    return order;
  },

  // ===== تنسيق رسالة واتساب للعميل =====
  formatCustomerWhatsApp(order) {
    const items = order.items.map(item => 
      `• ${item.name} × ${item.qty} = ${(item.price * item.qty).toLocaleString('ar-SA')} ر.س`
    ).join('\n');

    let msg = `🛍️ *طلب جديد من سوق الزين*\n\n`;
    msg += `📋 *رقم الطلب:* ${order.id}\n`;
    msg += `📅 *التاريخ:* ${new Date(order.date).toLocaleDateString('ar-SA')}\n\n`;
    msg += `👤 *بيانات العميل:*\n`;
    msg += `الاسم: ${order.customer.name}\n`;
    msg += `الجوال: ${order.customer.phone}\n`;
    msg += `المدينة: ${order.customer.city}\n`;
    msg += `العنوان: ${order.customer.address}\n\n`;
    msg += `📦 *المنتجات:*\n${items}\n\n`;
    msg += `---\n`;
    msg += `المجموع: ${order.subtotal.toLocaleString('ar-SA')} ر.س\n`;
    if (order.discount > 0) msg += `الخصم: -${order.discount.toLocaleString('ar-SA')} ر.س (${order.coupon})\n`;
    msg += `الشحن: ${order.shipping === 0 ? 'مجاني ✅' : order.shipping + ' ر.س'}\n`;
    msg += `ضريبة القيمة المضافة (15%): ${order.tax.toLocaleString('ar-SA')} ر.س\n`;
    msg += `*الإجمالي: ${order.total.toLocaleString('ar-SA')} ر.س*\n\n`;
    msg += `💰 *طريقة الدفع:* الدفع عند الاستلام\n\n`;
    msg += `شكراً لطلبك! 🙏\n`;
    msg += `سنتواصل معك قريباً لتأكيد الطلب.`;

    return encodeURIComponent(msg);
  },

  // ===== تنسيق رسالة واتساب لـ KSA Drop =====
  formatSupplierWhatsApp(order) {
    const items = order.items.map(item => 
      `• ${item.name} (SKU: ${item.id}) × ${item.qty} — تكلفة: ${(item.cost * item.qty).toLocaleString('ar-SA')} ر.س`
    ).join('\n');

    let msg = `📝 *طلب جديد — دروب شيبينغ*\n\n`;
    msg += `📋 *رقم الطلب:* ${order.id}\n\n`;
    msg += `📦 *عنوان الشحن:*\n`;
    msg += `الاسم: ${order.customer.name}\n`;
    msg += `الجوال: ${order.customer.phone}\n`;
    msg += `المدينة: ${order.customer.city}\n`;
    msg += `العنوان: ${order.customer.address}\n\n`;
    msg += `📦 *المنتجات:*\n${items}\n\n`;
    msg += `💰 *تكلفة الجملة:* ${order.totalCost.toLocaleString('ar-SA')} ر.س\n`;
    msg += `💵 *طريقة الدفع:* COD (الدفع عند الاستلام)\n\n`;
    msg += `⚠️ يرجى تأكيد الطلب والتوصيل.`;

    return encodeURIComponent(msg);
  },

  // ===== تنسيق رسالة تأكيد للعميل =====
  formatConfirmationMessage(order) {
    let msg = `✅ *تم تأكيد طلبك!* — سوق الزين\n\n`;
    msg += `📋 رقم الطلب: ${order.id}\n`;
    msg += `📦 الحالة: قيد التجهيز\n`;
    msg += `🚚 التوصيل المتوقع: 2-5 أيام عمل\n\n`;
    msg += `يمكنك تتبع طلبك من:\n`;
    msg += `https://az212z.github.io/souq-alzein/track.html\n\n`;
    msg += `للاستفسار راسلنا:\n`;
    msg += `https://wa.me/966505989304`;

    return encodeURIComponent(msg);
  },

  // ===== تنسيق رسالة شحن =====
  formatShippingMessage(order) {
    let msg = `🚚 *تم شحن طلبك!* — سوق الزين\n\n`;
    msg += `📋 رقم الطلب: ${order.id}\n`;
    if (order.trackingNumber) {
      msg += `📦 رقم التتبع: ${order.trackingNumber}\n`;
    }
    msg += `📅 التوصيل المتوقع: خلال 2-3 أيام\n\n`;
    msg += `شكراً لتسوقك معنا! 🙏`;

    return encodeURIComponent(msg);
  },

  // ===== إرسال واتساب =====
  sendWhatsApp(phone, message) {
    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, '_blank');
    return url;
  },

  // ===== إرسال طلب للعميل (علي) =====
  sendOrderToOwner(order) {
    const msg = this.formatCustomerWhatsApp(order);
    return this.sendWhatsApp(this.config.whatsapp, msg);
  },

  // ===== إرسال طلب لـ KSA Drop =====
  sendOrderToSupplier(order) {
    const msg = this.formatSupplierWhatsApp(order);
    return this.sendWhatsApp(this.config.ksadropWhatsapp, msg);
  },

  // ===== تتبع الطلب =====
  trackOrder(orderId) {
    const order = this.getOrder(orderId);
    if (!order) return null;

    const statusMap = {
      'pending': { label: '⏳ بانتظار التأكيد', color: '#f0ad4e', percent: 10 },
      'confirmed': { label: '✅ تم التأكيد', color: '#5bc0de', percent: 30 },
      'ordered_from_supplier': { label: '📦 تم الطلب من المورد', color: '#5bc0de', percent: 50 },
      'shipped': { label: '🚚 تم الشحن', color: '#0275d8', percent: 75 },
      'delivered': { label: '🎉 تم التسليم', color: '#5cb85c', percent: 100 },
      'cancelled': { label: '❌ ملغي', color: '#d9534f', percent: 0 },
      'returned': { label: '🔄 مرتجع', color: '#f0ad4e', percent: 0 },
    };

    return {
      order: order,
      status: statusMap[order.status] || statusMap['pending'],
      timeline: order.timeline
    };
  },

  // ===== إحصائيات الطلبات =====
  getStats() {
    const orders = this.getOrders();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);
    const totalCost = orders.reduce((sum, o) => sum + o.totalCost, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    return {
      totalOrders,
      totalRevenue,
      totalProfit,
      totalCost,
      pendingOrders,
      deliveredOrders,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      profitMargin: totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0,
    };
  }
};

// تصدير للاستخدام
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrderSystem;
}