/**
 * نظام الطلبات الأوتوماتيكي — سوق الزين (لوحة التحكم)
 * 
 * يستخدم نفس مفتاح التخزين: souq-alzein-orders
 * متوافق تماماً مع order.js
 */

const OrderSystem = {
  config: {
    storeName: 'سوق الزين',
    whatsapp: '966505989304',
    ksadropWhatsapp: '966555550555',
    email: 'ali212@icloud.com',
    currency: 'SAR',
    shippingFreeThreshold: 200,
    shippingCost: 25,
    taxRate: 0.15,
    supplier: 'ksadrop',
    orderPrefix: 'SZ',
  },

  STORAGE_KEY: 'souq-alzein-orders',

  getOrders() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch { return []; }
  },

  saveOrder(order) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.push(order);
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
  },

  getOrder(orderId) {
    return this.getOrders().find(o => o.id === orderId);
  },

  updateStatus(orderId, status, note = '') {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    order.status = status;
    if (!order.tracking) order.tracking = [];
    order.tracking.push({ status, date: new Date().toISOString(), note });
    if (!order.timeline) order.timeline = [];
    order.timeline.push({ status, date: new Date().toISOString(), note });

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
    return order;
  },

  calculateSubtotal(items) {
    return items.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || item.quantity || 1)), 0);
  },

  applyCoupon(order, couponCode) {
    const coupons = {
      'WELCOME10': { type: 'percent', value: 10, minOrder: 0 },
      'LAUNCH20': { type: 'percent', value: 20, minOrder: 0 },
      'FREE50': { type: 'fixed', value: 50, minOrder: 200 },
      'VIP100': { type: 'fixed', value: 100, minOrder: 300 },
    };
    const coupon = coupons[couponCode.toUpperCase()];
    if (!coupon) return { success: false, message: 'كوبون غير صالح' };
    if (order.subtotal < coupon.minOrder) return { success: false, message: `الحد الأدنى ${coupon.minOrder} ر.س` };

    let discount = 0;
    if (coupon.type === 'percent') discount = Math.round(order.subtotal * coupon.value / 100);
    else discount = coupon.value;

    order.discount = discount;
    order.coupon = couponCode.toUpperCase();
    order.total = order.subtotal - discount + order.shipping + order.tax;
    order.profit = order.total - (order.totalCost || 0);

    this.saveOrder(order);
    return { success: true, discount };
  },

  generateOrderId() {
    const count = parseInt(localStorage.getItem('sz_order_count') || '0') + 1;
    localStorage.setItem('sz_order_count', count.toString());
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    return `${this.config.orderPrefix}-${dateStr}-${String(count).padStart(4,'0')}`;
  },

  // تنسيق رسالة واتساب للعميل
  formatCustomerWhatsApp(order) {
    const items = order.items.map(item => 
      `• ${item.name} × ${item.qty || item.quantity} = ${((item.price || 0) * (item.qty || item.quantity || 1)).toLocaleString('ar-SA')} ر.س`
    ).join('\n');

    let msg = `🛍️ *طلب جديد من ${this.config.storeName}*\n\n`;
    msg += `📋 *رقم الطلب:* ${order.id}\n`;
    msg += `📅 *التاريخ:* ${new Date(order.date).toLocaleDateString('ar-SA')}\n\n`;
    msg += `👤 *بيانات العميل:*\n`;
    msg += `الاسم: ${order.customer.name}\n`;
    msg += `الجوال: ${order.customer.phone}\n`;
    msg += `المدينة: ${order.customer.city}\n`;
    msg += `العنوان: ${order.customer.address}\n\n`;
    msg += `📦 *المنتجات:*\n${items}\n\n`;
    msg += `---\n`;
    msg += `المجموع: ${(order.subtotal || 0).toLocaleString('ar-SA')} ر.س\n`;
    if (order.discount > 0) msg += `الخصم: -${order.discount.toLocaleString('ar-SA')} ر.س (${order.coupon})\n`;
    const shipping = order.shipping ?? order.totals?.shipping ?? 0;
    msg += `الشحن: ${shipping === 0 ? 'مجاني ✅' : shipping + ' ر.س'}\n`;
    msg += `ضريبة القيمة المضافة (15%): ${(order.tax || 0).toLocaleString('ar-SA')} ر.س\n`;
    msg += `*الإجمالي: ${(order.total || 0).toLocaleString('ar-SA')} ر.س*\n\n`;
    msg += `💰 *طريقة الدفع:* الدفع عند الاستلام\n\n`;
    msg += `شكراً لطلبك! 🙏\n`;
    msg += `سنتواصل معك قريباً لتأكيد الطلب.`;

    return encodeURIComponent(msg);
  },

  // تنسيق رسالة واتساب لـ KSA Drop
  formatSupplierWhatsApp(order) {
    const items = order.items.map(item => {
      const p = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.find(pr => pr.id === item.id) : null;
      const slug = item.slug || (p ? p.slug : '');
      return `• ${item.name} (${item.id}) × ${item.qty || item.quantity} — تكلفة: ${((item.cost || (p ? p.cost : 0)) * (item.qty || item.quantity || 1)).toLocaleString('ar-SA')} ر.س${slug ? '\n  رابط: https://ksadrop.com/products/' + slug : ''}`;
    }).join('\n');

    let msg = `📝 *طلب جديد — دروب شيبينغ*\n\n`;
    msg += `📋 *رقم الطلب:* ${order.id}\n\n`;
    msg += `📦 *عنوان الشحن:*\n`;
    msg += `الاسم: ${order.customer.name}\n`;
    msg += `الجوال: ${order.customer.phone}\n`;
    msg += `المدينة: ${order.customer.city}\n`;
    msg += `العنوان: ${order.customer.address}\n\n`;
    msg += `📦 *المنتجات:*\n${items}\n\n`;
    msg += `💰 *تكلفة الجملة:* ${(order.totalCost || 0).toLocaleString('ar-SA')} ر.س\n`;
    msg += `💵 *طريقة الدفع:* COD (الدفع عند الاستلام)\n\n`;
    msg += `⚠️ يرجى تأكيد الطلب والتوصيل.`;

    return encodeURIComponent(msg);
  },

  // تنسيق رسالة تأكيد للعميل
  formatConfirmationMessage(order) {
    let msg = `✅ *تم تأكيد طلبك!* — ${this.config.storeName}\n\n`;
    msg += `📋 رقم الطلب: ${order.id}\n`;
    msg += `📦 الحالة: قيد التجهيز\n`;
    msg += `🚚 التوصيل المتوقع: 2-5 أيام عمل\n\n`;
    msg += `يمكنك تتبع طلبك من:\n`;
    msg += `https://az212z.github.io/souq-alzein/track.html\n\n`;
    msg += `للاستفسار راسلنا:\n`;
    msg += `https://wa.me/${this.config.whatsapp}`;

    return encodeURIComponent(msg);
  },

  // تنسيق رسالة شحن
  formatShippingMessage(order) {
    let msg = `🚚 *تم شحن طلبك!* — ${this.config.storeName}\n\n`;
    msg += `📋 رقم الطلب: ${order.id}\n`;
    if (order.trackingNumber) msg += `📦 رقم التتبع: ${order.trackingNumber}\n`;
    msg += `📅 التوصيل المتوقع: خلال 2-3 أيام\n\n`;
    msg += `شكراً لتسوقك معنا! 🙏`;

    return encodeURIComponent(msg);
  },

  // إحصائيات
  getStats() {
    const orders = this.getOrders();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || o.totals?.total || 0), 0);
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit || ((o.total || o.totals?.total || 0) - (o.totalCost || 0))), 0);
    const totalCost = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
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

// ===== Order Agent — الوكيل الأوتوماتيكي =====
const OrderAgent = {
  checkInterval: null,
  
  start() {
    console.log('🤖 وكيل الطلبات بدأ العمل...');
    this.checkNewOrders();
    this.checkInterval = setInterval(() => this.checkNewOrders(), 30000);
  },

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  },

  checkNewOrders() {
    if (typeof OrderSystem === 'undefined') return;
    const orders = OrderSystem.getOrders();
    const pendingOrders = orders.filter(o => o.status === 'pending');

    if (pendingOrders.length > 0) {
      console.log(`🤖 وكيل الطلبات: ${pendingOrders.length} طلب جديد`);
      pendingOrders.forEach(order => {
        this.showNotification(order);
      });
    }
  },

  showNotification(order) {
    const existing = document.getElementById(`order-notification-${order.id}`);
    if (existing) return; // لا تكرر الإشعار

    const notification = document.createElement('div');
    notification.id = `order-notification-${order.id}`;
    notification.style.cssText = `
      position: fixed; top: 80px; left: 20px; right: 20px;
      background: linear-gradient(135deg, #00d68f, #00b894);
      color: white; padding: 16px 20px; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.3); z-index: 10000;
      font-family: 'Tajawal', sans-serif; direction: rtl;
      max-width: 400px; margin: 0 auto;
      animation: slideInNotif 0.5s ease;
    `;

    notification.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <span style="font-size:1.5rem;">✅</span>
        <div>
          <div style="font-weight:700;font-size:1rem;">طلب جديد!</div>
          <div style="font-size:.8rem;opacity:.9;">${order.id}</div>
        </div>
      </div>
      <div style="font-size:.85rem;margin-bottom:8px;">
        ${order.customer?.name || 'عميل'} — ${order.items?.length || 0} منتج — ${(order.total || 0).toLocaleString()} ر.س
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="OrderAgent.approveAndOrder('${order.id}')" 
          style="flex:1;padding:10px;background:white;color:#00b894;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:'Tajawal',sans-serif;">
          ✅ تأكيد وطلب من المورد
        </button>
        <button onclick="document.getElementById('order-notification-${order.id}').remove()" 
          style="padding:10px 16px;background:rgba(255,255,255,.2);color:white;border:none;border-radius:8px;cursor:pointer;font-family:'Tajawal',sans-serif;">
          ✕
        </button>
      </div>
    `;

    if (!document.getElementById('order-agent-styles')) {
      const style = document.createElement('style');
      style.id = 'order-agent-styles';
      style.textContent = `@keyframes slideInNotif { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.getElementById(`order-notification-${order.id}`)) {
        notification.style.animation = 'slideInNotif 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 30000);
  },

  approveAndOrder(orderId) {
    const order = OrderSystem.getOrder(orderId);
    if (!order) return;

    OrderSystem.updateStatus(orderId, 'ordered_from_supplier', 'تم الطلب من المورد — قيد الشحن');

    const notif = document.getElementById(`order-notification-${orderId}`);
    if (notif) notif.remove();

    // فتح واتساب لـ KSA Drop
    const supplierMsg = OrderSystem.formatSupplierWhatsApp(order);
    window.open(`https://wa.me/${OrderSystem.config.ksadropWhatsapp}?text=${supplierMsg}`, '_blank');

    // فتح واتساب لتأكيد العميل
    const confirmMsg = OrderSystem.formatConfirmationMessage(order);
    window.open(`https://wa.me/${order.customer.phone}?text=${confirmMsg}`, '_blank');

    if (typeof refreshData === 'function') refreshData();
  },

  markAsShipped(orderId, trackingNumber) {
    const order = OrderSystem.getOrder(orderId);
    if (!order) return;

    order.trackingNumber = trackingNumber;
    OrderSystem.updateStatus(orderId, 'shipped', trackingNumber ? `تم الشحن — رقم التتبع: ${trackingNumber}` : 'تم الشحن');

    const shippingMsg = OrderSystem.formatShippingMessage(order);
    window.open(`https://wa.me/${order.customer.phone}?text=${shippingMsg}`, '_blank');

    if (typeof refreshData === 'function') refreshData();
  },

  markAsDelivered(orderId) {
    OrderSystem.updateStatus(orderId, 'delivered', 'تم التسليم بنجاح 🎉');
    if (typeof refreshData === 'function') refreshData();
  },

  cancelOrder(orderId, reason) {
    OrderSystem.updateStatus(orderId, 'cancelled', reason || 'تم إلغاء الطلب');
    if (typeof refreshData === 'function') refreshData();
  }
};

// تشغيل تلقائي
document.addEventListener('DOMContentLoaded', () => {
  OrderAgent.start();
});