/**
 * سوق الزين — نظام الإشعارات والإبلاغ التلقائي
 * 
 * كل طلب جديد:
 * 1. يُرسل واتساب لعلي (صاحب المتجر) تلقائياً
 * 2. يعرض إشعار في المتجر للعميل
 * 3. يُحفظ في localStorage للإدارة
 */

const OrderNotifier = {
  config: {
    ownerWhatsapp: '966505989304',  // واتساب علي
    storeName: 'سوق الزين',
    storeUrl: 'https://az212z.github.io/souq-alzein/',
    adminUrl: 'https://az212z.github.io/souq-alzein/admin.html',
  },

  /**
   * الإبلاغ عن طلب جديد — يُستدعى لما العميل يكمل الطلب
   * 1. يحفظ الطلب في localStorage
   * 2. يفتح واتساب لعلي برسالة مفصلة
   * 3. يعرض تأكيد للعميل
   * 4. يعرض خيار تأكيد العميل عبر واتساب
   */
  processNewOrder(orderData) {
    // حفظ الطلب
    const order = this.saveOrder(orderData);

    // فتح واتساب لعلي تلقائياً
    this.notifyOwner(order);

    // عرض تأكيد للعميل
    this.showCustomerConfirmation(order);

    return order;
  },

  /**
   * حفظ الطلب في localStorage
   */
  saveOrder(orderData) {
    const orders = JSON.parse(localStorage.getItem('souq-alzein-orders') || '[]');
    const count = parseInt(localStorage.getItem('sz_order_count') || '0') + 1;
    localStorage.setItem('sz_order_count', count.toString());

    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    const orderId = `SZ-${dateStr}-${String(count).padStart(4,'0')}`;

    const order = {
      id: orderId,
      date: date.toISOString(),
      status: 'pending',
      paymentMethod: 'cod',
      ...orderData,
      tracking: [{ status: 'pending', date: date.toISOString(), note: 'طلب جديد — بانتظار التأكيد' }],
    };

    orders.unshift(order);
    localStorage.setItem('souq-alzein-orders', JSON.stringify(orders));

    console.log(`✅ طلب جديد: ${orderId}`);
    return order;
  },

  /**
   * إرسال إشعار لعلي عبر واتساب
   * هذا يفتح واتساب ويب/تطبيق برسالة جاهزة
   */
  notifyOwner(order) {
    const items = order.items.map(item => {
      return `• ${item.name} × ${item.qty || item.quantity || 1} = ${((item.price || 0) * (item.qty || item.quantity || 1)).toLocaleString('ar-SA')} ر.س`;
    }).join('\n');

    const subtotal = order.subtotal || order.totals?.subtotal || 0;
    const shipping = order.shipping ?? order.totals?.shipping ?? (subtotal >= 200 ? 0 : 25);
    const tax = order.tax || order.totals?.tax || Math.round(subtotal * 0.15);
    const total = order.total || order.totals?.total || (subtotal + shipping + tax);
    const discount = order.discount || 0;

    let msg = `🛒 *طلب جديد من ${this.config.storeName}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `📋 *رقم الطلب:* ${order.id}\n`;
    msg += `📅 *التاريخ:* ${new Date(order.date).toLocaleDateString('ar-SA')} — ${new Date(order.date).toLocaleTimeString('ar-SA')}\n`;
    msg += `💵 *طريقة الدفع:* الدفع عند الاستلام\n\n`;
    msg += `👤 *بيانات العميل:*\n`;
    msg += `  الاسم: ${order.customer?.name || '—'}\n`;
    msg += `  الجوال: ${order.customer?.phone || '—'}\n`;
    msg += `  المدينة: ${order.customer?.city || '—'}\n`;
    msg += `  العنوان: ${order.customer?.address || '—'}\n\n`;
    msg += `📦 *المنتجات:*\n${items}\n\n`;
    msg += `💰 *المجموع:*\n`;
    msg += `  المبلغ: ${subtotal.toLocaleString('ar-SA')} ر.س\n`;
    if (discount > 0) msg += `  الخصم: -${discount.toLocaleString('ar-SA')} ر.س${order.coupon ? ` (${order.coupon})` : ''}\n`;
    msg += `  الشحن: ${shipping === 0 ? 'مجاني ✅' : shipping + ' ر.س'}\n`;
    msg += `  الضريبة (15%): ${tax.toLocaleString('ar-SA')} ر.س\n`;
    msg += `  ━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `  *الإجمالي: ${total.toLocaleString('ar-SA')} ر.س*\n\n`;
    msg += `🔗 إدارة الطلب:\n`;
    msg += `${this.config.adminUrl}\n\n`;
    msg += `⚡ اضغط تأكيد لإرسال طلب المورد للعميل`;

    const url = `https://wa.me/${this.config.ownerWhatsapp}?text=${encodeURIComponent(msg)}`;
    
    // فتح واتساب في نافذة جديدة
    window.open(url, '_blank');
    
    return url;
  },

  /**
   * عرض تأكيد للعميل بعد الطلب
   * يشمل: رقم الطلب، خيار تتبع، واتساب
   */
  showCustomerConfirmation(order) {
    const total = order.total || order.totals?.total || 0;
    const shipping = order.shipping ?? order.totals?.shipping ?? 0;

    // رسالة تأكيد للعميل عبر واتساب
    const customerMsg = `✅ *تم استلام طلبك!* — ${this.config.storeName}\n\n` +
      `📋 رقم الطلب: ${order.id}\n` +
      `📦 الحالة: قيد المراجرة\n` +
      `💰 الإجمالي: ${total.toLocaleString('ar-SA')} ر.س\n` +
      `🚚 الشحن: ${shipping === 0 ? 'مجاني ✅' : shipping + ' ر.س'}\n\n` +
      `سنتواصل معك خلال ساعة لتأكيد الطلب 📱\n\n` +
      `📍 تتبع طلبك:\n` +
      `${this.config.storeUrl}track.html?id=${order.id}\n\n` +
      `💬 للاستفسار:\n` +
      `https://wa.me/${this.config.ownerWhatsapp}`;

    // إنشاء نافذة تأكيد جميلة
    const overlay = document.createElement('div');
    overlay.id = 'order-confirmation';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999; font-family: 'Tajawal', sans-serif; direction: rtl;
      animation: fadeInOverlay .3s ease;
    `;

    overlay.innerHTML = `
      <style>
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .confirm-card { background: #151530; border-radius: 24px; padding: 32px 24px; max-width: 420px; width: 90%; text-align: center; color: #e0e0f0; animation: slideUp .4s ease; }
        .confirm-icon { font-size: 4rem; margin-bottom: 12px; }
        .confirm-title { font-size: 1.4rem; font-weight: 900; margin-bottom: 8px; }
        .confirm-order-id { font-size: 1.1rem; color: #ffd700; font-weight: 800; margin-bottom: 16px; direction: ltr; }
        .confirm-details { background: rgba(255,255,255,.05); border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: right; font-size: .9rem; line-height: 2; }
        .confirm-btns { display: flex; flex-direction: column; gap: 10px; }
        .confirm-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 14px; font-weight: 700; font-size: .95rem; text-decoration: none; transition: all .2s; font-family: 'Tajawal', sans-serif; border: none; cursor: pointer; }
        .btn-wa { background: #25D366; color: #fff; }
        .btn-wa:hover { background: #128C7E; }
        .btn-track { background: #0f3460; color: #e0e0f0; }
        .btn-track:hover { background: #16213e; }
        .btn-shop { background: transparent; color: #7a7a9a; border: 1px solid #2a2a4a; }
        .btn-shop:hover { border-color: #e94560; color: #e94560; }
      </style>
      <div class="confirm-card">
        <div class="confirm-icon">✅</div>
        <div class="confirm-title">تم استلام طلبك!</div>
        <div class="confirm-order-id">${order.id}</div>
        <div class="confirm-details">
          <div>💰 الإجمالي: <strong>${total.toLocaleString('ar-SA')} ر.س</strong></div>
          <div>🚚 الشحن: ${shipping === 0 ? 'مجاني ✅' : shipping + ' ر.س'}</div>
          <div>💵 الدفع: عند الاستلام</div>
          <div>📦 الحالة: قيد المراجرة</div>
        </div>
        <div class="confirm-btns">
          <a href="https://wa.me/${order.customer?.phone || this.config.ownerWhatsapp}?text=${customerMsg}" target="_blank" class="confirm-btn btn-wa">💬 تأكيد الطلب عبر واتساب</a>
          <a href="${this.config.storeUrl}track.html?id=${order.id}" class="confirm-btn btn-track">📍 تتبع طلبك</a>
          <a href="${this.config.storeUrl}products.html" class="confirm-btn btn-shop">🛍️ متابعة التسوق</a>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    
    return customerMsg;
  },

  /**
   * تأكيد الطلب + إرسال للمورد (KSA Drop)
   * يُستدعى من لوحة التحكم لما علي يضغط "تأكيد وطلب من المورد"
   */
  confirmAndOrderFromSupplier(orderId) {
    const orders = JSON.parse(localStorage.getItem('souq-alzein-orders') || '[]');
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // تحديث الحالة
    order.status = 'ordered_from_supplier';
    if (!order.tracking) order.tracking = [];
    order.tracking.push({ status: 'ordered_from_supplier', date: new Date().toISOString(), note: 'تم الطلب من المورد' });
    localStorage.setItem('souq-alzein-orders', JSON.stringify(orders));

    // فتح واتساب لـ KSA Drop
    this.sendToSupplier(order);

    // فتح واتساب لتأكيد العميل
    this.sendCustomerConfirmation(order);

    return order;
  },

  /**
   * إرسال طلب لـ KSA Drop عبر واتساب
   */
  sendToSupplier(order) {
    const items = order.items.map(item => {
      const p = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.find(pr => pr.id === item.id) : null;
      const slug = item.slug || (p ? p.slug : '');
      const name = item.name || (p ? p.name : 'منتج');
      const cost = item.cost || (p ? p.cost : 0);
      const qty = item.qty || item.quantity || 1;
      let line = `• ${name} × ${qty}\n`;
      if (slug) line += `  رابط: https://ksadrop.com/products/${slug}\n`;
      line += `  سعر الجملة: ${cost} ر.س × ${qty} = ${(cost * qty).toLocaleString('ar-SA')} ر.س`;
      return line;
    }).join('\n\n');

    const totalCost = order.items.reduce((sum, item) => {
      const p = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.find(pr => pr.id === item.id) : null;
      return sum + ((item.cost || (p ? p.cost : 0)) * (item.qty || item.quantity || 1));
    }, 0);

    let msg = `📋 *طلب دروب شيبينغ — ${this.config.storeName}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `📋 رقم الطلب: ${order.id}\n\n`;
    msg += `📦 *المنتجات:*\n\n${items}\n\n`;
    msg += `💰 *إجمالي التكلفة:* ${totalCost.toLocaleString('ar-SA')} ر.س\n\n`;
    msg += `👤 *عنوان الشحن:*\n`;
    msg += `  ${order.customer?.name || '—'}\n`;
    msg += `  ${order.customer?.phone || '—'}\n`;
    msg += `  ${order.customer?.city || '—'} — ${order.customer?.address || '—'}\n\n`;
    msg += `💵 الدفع: عند الاستلام (COD)`;

    const url = `https://wa.me/966555550555?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    return url;
  },

  /**
   * إرسال تأكيد للعميل عبر واتساب
   */
  sendCustomerConfirmation(order) {
    const total = order.total || order.totals?.total || 0;
    const shipping = order.shipping ?? order.totals?.shipping ?? 0;

    let msg = `✅ *تم تأكيد طلبك!* — ${this.config.storeName}\n\n`;
    msg += `📋 رقم الطلب: ${order.id}\n`;
    msg += `📦 الحالة: قيد التجهيز 📦\n`;
    msg += `💰 الإجمالي: ${total.toLocaleString('ar-SA')} ر.س\n`;
    msg += `🚚 الشحن: ${shipping === 0 ? 'مجاني ✅' : shipping + ' ر.س'}\n`;
    msg += `📅 التوصيل المتوقع: 2-5 أيام عمل\n\n`;
    msg += `📍 تتبع طلبك:\n`;
    msg += `${this.config.storeUrl}track.html?id=${order.id}\n\n`;
    msg += `💬 للاستفسار:\n`;
    msg += `https://wa.me/${this.config.ownerWhatsapp}\n\n`;
    msg += `شكراً لتسوقك معنا! 🙏`;

    const url = `https://wa.me/${order.customer?.phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    return url;
  },

  /**
   * إرسال إشعار شحن للعميل
   */
  sendShippingNotification(orderId, trackingNumber) {
    const orders = JSON.parse(localStorage.getItem('souq-alzein-orders') || '[]');
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    order.status = 'shipped';
    order.trackingNumber = trackingNumber;
    if (!order.tracking) order.tracking = [];
    order.tracking.push({ status: 'shipped', date: new Date().toISOString(), note: trackingNumber ? `تم الشحن — رقم التتبع: ${trackingNumber}` : 'تم الشحن' });
    localStorage.setItem('souq-alzein-orders', JSON.stringify(orders));

    const total = order.total || order.totals?.total || 0;
    let msg = `🚚 *تم شحن طلبك!* — ${this.config.storeName}\n\n`;
    msg += `📋 رقم الطلب: ${order.id}\n`;
    if (trackingNumber) msg += `📦 رقم التتبع: ${trackingNumber}\n`;
    msg += `📅 التوصيل المتوقع: خلال 2-3 أيام\n\n`;
    msg += `📍 تتبع طلبك:\n`;
    msg += `${this.config.storeUrl}track.html?id=${order.id}\n\n`;
    msg += `شكراً لتسوقك معنا! 🙏`;

    const url = `https://wa.me/${order.customer?.phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    return url;
  },

  /**
   * إرسال إشعار تسليم للعميل
   */
  sendDeliveryNotification(orderId) {
    const orders = JSON.parse(localStorage.getItem('souq-alzein-orders') || '[]');
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    order.status = 'delivered';
    if (!order.tracking) order.tracking = [];
    order.tracking.push({ status: 'delivered', date: new Date().toISOString(), note: 'تم التسليم بنجاح 🎉' });
    localStorage.setItem('souq-alzein-orders', JSON.stringify(orders));

    let msg = `📦 *تم تسليم طلبك بنجاح!* 🎉\n\n`;
    msg += `📋 رقم الطلب: ${order.id}\n`;
    msg += `💰 الإجمالي: ${(order.total || 0).toLocaleString('ar-SA')} ر.س\n\n`;
    msg += `نتمنى إن المنتج عجبك! ⭐\n\n`;
    msg += `🎁 كود خصم للمرة القادمة: *WELCOME10*\n`;
    msg += `تسوق مرة أخرى:\n`;
    msg += `${this.config.storeUrl}\n\n`;
    msg += `💬 رايك يهمنا — راسلنا:\n`;
    msg += `https://wa.me/${this.config.ownerWhatsapp}`;

    const url = `https://wa.me/${order.customer?.phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    return url;
  }
};