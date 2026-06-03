/**
 * وكيل الطلبات الأوتوماتيكي — سوق الزين
 * 
 * يراقب الطلبات الجديدة ويتولى عملية الطلب من المورد
 * ويرسل إشعارات للعميل وعلي
 */

const OrderAgent = {
  
  // ===== فحص الطلبات الجديدة كل 30 ثانية =====
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

  // ===== فحص الطلبات الجديدة =====
  checkNewOrders() {
    if (typeof OrderSystem === 'undefined') return;

    const orders = OrderSystem.getOrders();
    const pendingOrders = orders.filter(o => o.status === 'pending');

    if (pendingOrders.length > 0) {
      console.log(`🤖 وكيل الطلبات: ${pendingOrders.length} طلب جديد بانتظار المعالجة`);
      pendingOrders.forEach(order => {
        this.processNewOrder(order);
      });
    }
  },

  // ===== معالجة طلب جديد =====
  processNewOrder(order) {
    // 1. إرسال إشعار لعلي (واتساب)
    const ownerMsg = OrderSystem.formatCustomerWhatsApp(order);
    const ownerUrl = `https://wa.me/${OrderSystem.config.whatsapp}?text=${ownerMsg}`;
    
    // 2. إنشاء إشعار في الصفحة
    this.showNotification(order);

    // 3. تحديث الحالة
    OrderSystem.updateStatus(order.id, 'confirmed', 'تم تأكيد الطلب — بانتظار الطلب من المورد');

    console.log(`✅ طلب ${order.id} تم تأكيده`);
  },

  // ===== إظهار إشعار في الصفحة =====
  showNotification(order) {
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.id = `order-notification-${order.id}`;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      left: 20px;
      right: 20px;
      background: linear-gradient(135deg, #00d68f, #00b894);
      color: white;
      padding: 16px 20px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.3);
      z-index: 10000;
      font-family: 'Tajawal', sans-serif;
      direction: rtl;
      max-width: 400px;
      margin: 0 auto;
      animation: slideIn 0.5s ease;
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
        ${order.customer.name} — ${order.items.length} منتج — ${order.total} ر.س
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

    // إضافة CSS animation
    if (!document.getElementById('order-agent-styles')) {
      const style = document.createElement('style');
      style.id = 'order-agent-styles';
      style.textContent = `
        @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // إخفاء بعد 30 ثانية
    setTimeout(() => {
      if (document.getElementById(`order-notification-${order.id}`)) {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 30000);
  },

  // ===== تأكيد الطلب وطلبه من المورد =====
  approveAndOrder(orderId) {
    const order = OrderSystem.getOrder(orderId);
    if (!order) return;

    // 1. تحديث الحالة
    OrderSystem.updateStatus(orderId, 'ordered_from_supplier', 'تم الطلب من المورد — قيد الشحن');

    // 2. إزالة الإشعار
    const notif = document.getElementById(`order-notification-${orderId}`);
    if (notif) notif.remove();

    // 3. فتح واتساب لعلي ليرسل الطلب لـ KSA Drop
    const supplierMsg = OrderSystem.formatSupplierWhatsApp(order);
    window.open(`https://wa.me/${OrderSystem.config.ksadropWhatsapp}?text=${supplierMsg}`, '_blank');

    // 4. إرسال تأكيد للعميل
    const confirmMsg = OrderSystem.formatConfirmationMessage(order);
    window.open(`https://wa.me/${order.customer.phone}?text=${confirmMsg}`, '_blank');

    console.log(`📦 طلب ${orderId} تم إرساله للمورد`);
  },

  // ===== تحديث حالة الشحن =====
  markAsShipped(orderId, trackingNumber) {
    const order = OrderSystem.getOrder(orderId);
    if (!order) return;

    order.trackingNumber = trackingNumber;
    OrderSystem.updateStatus(orderId, 'shipped', `تم الشحن — رقم التتبع: ${trackingNumber}`);

    // إرسال رسالة شحن للعميل
    const shippingMsg = OrderSystem.formatShippingMessage(order);
    window.open(`https://wa.me/${order.customer.phone}?text=${shippingMsg}`, '_blank');

    console.log(`🚚 طلب ${orderId} تم شحنه — تتبع: ${trackingNumber}`);
  },

  // ===== تأكيد التسليم =====
  markAsDelivered(orderId) {
    OrderSystem.updateStatus(orderId, 'delivered', 'تم التسليم بنجاح');
    console.log(`🎉 طلب ${orderId} تم تسليمه`);
  },

  // ===== إلغاء طلب =====
  cancelOrder(orderId, reason) {
    OrderSystem.updateStatus(orderId, 'cancelled', reason || 'تم إلغاء الطلب');
    console.log(`❌ طلب ${orderId} تم إلغاؤه`);
  },

  // ===== لوحة تحكم الطلبات =====
  renderDashboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const orders = OrderSystem.getOrders();
    const stats = OrderSystem.getStats();

    container.innerHTML = `
      <div style="font-family:'Tajawal',sans-serif;direction:rtl;padding:20px;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
          <div style="background:#12122a;border-radius:12px;padding:16px;text-align:center;border:1px solid #2a2a4a;">
            <div style="font-size:1.5rem;font-weight:900;color:#00d68f;">${stats.totalOrders}</div>
            <div style="font-size:.8rem;color:#7a7a9a;">إجمالي الطلبات</div>
          </div>
          <div style="background:#12122a;border-radius:12px;padding:16px;text-align:center;border:1px solid #2a2a4a;">
            <div style="font-size:1.5rem;font-weight:900;color:#448aff;">${stats.totalRevenue.toLocaleString('ar-SA')} ر.س</div>
            <div style="font-size:.8rem;color:#7a7a9a;">إجمالي المبيعات</div>
          </div>
          <div style="background:#12122a;border-radius:12px;padding:16px;text-align:center;border:1px solid #2a2a4a;">
            <div style="font-size:1.5rem;font-weight:900;color:#ffd700;">${stats.totalProfit.toLocaleString('ar-SA')} ر.س</div>
            <div style="font-size:.8rem;color:#7a7a9a;">صافي الربح</div>
          </div>
          <div style="background:#12122a;border-radius:12px;padding:16px;text-align:center;border:1px solid #2a2a4a;">
            <div style="font-size:1.5rem;font-weight:900;color:#a855f7;">${stats.pendingOrders}</div>
            <div style="font-size:.8rem;color:#7a7a9a;">طلبات معلقة</div>
          </div>
        </div>
        
        <h3 style="margin-bottom:12px;">📋 الطلبات الأخيرة</h3>
        ${orders.length === 0 ? '<div style="text-align:center;padding:40px;color:#7a7a9a;">لا توجد طلبات بعد</div>' : ''}
        ${orders.slice().reverse().map(order => `
          <div style="background:#12122a;border-radius:12px;padding:16px;margin-bottom:8px;border:1px solid #2a2a4a;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:700;">${order.id}</div>
                <div style="font-size:.8rem;color:#7a7a9a;">${order.customer.name} — ${new Date(order.date).toLocaleDateString('ar-SA')}</div>
              </div>
              <div style="text-align:left;">
                <div style="font-weight:900;color:#00d68f;">${order.total.toLocaleString('ar-SA')} ر.س</div>
                <div style="font-size:.75rem;color:#7a7a9a;">ربح: ${order.profit.toLocaleString('ar-SA')} ر.س</div>
              </div>
            </div>
            <div style="margin-top:8px;display:flex;gap:8px;">
              ${order.status === 'pending' ? `<button onclick="OrderAgent.approveAndOrder('${order.id}')" style="padding:6px 12px;background:#00d68f;color:white;border:none;border-radius:6px;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:.8rem;">✅ تأكيد وطلب</button>` : ''}
              ${order.status === 'ordered_from_supplier' ? `<button onclick="OrderAgent.markAsShipped('${order.id}',prompt('رقم التتبع:'))" style="padding:6px 12px;background:#448aff;color:white;border:none;border-radius:6px;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:.8rem;">🚚 شحن</button>` : ''}
              ${order.status === 'shipped' ? `<button onclick="OrderAgent.markAsDelivered('${order.id}')" style="padding:6px 12px;background:#ffd700;color:#000;border:none;border-radius:6px;cursor:pointer;font-family:'Tajawal',sans-serif;font-size:.8rem;">🎉 تم التسليم</button>` : ''}
              ${order.status === 'delivered' ? '<span style="color:#00d68f;font-size:.8rem;">✅ تم التسليم</span>' : ''}
              ${order.status === 'cancelled' ? '<span style="color:#d9534f;font-size:.8rem;">❌ ملغي</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};

// تشغيل تلقائي
document.addEventListener('DOMContentLoaded', () => {
  OrderAgent.start();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrderAgent;
}