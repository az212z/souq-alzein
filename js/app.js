// ===== App Logic =====
document.addEventListener('DOMContentLoaded', () => {
  Cart.init();
  initHeader();
  initSearch();
  initNewsletter();
  renderPageContent();
});

// ===== Header =====
function initHeader() {
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');
  const header = document.getElementById('header');

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      nav.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });
    // Close menu on link click
    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('active');
        menuToggle.classList.remove('active');
      });
    });
  }

  // Header scroll
  if (header) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const curr = window.scrollY;
      header.classList.toggle('scrolled', curr > 50);
      lastScroll = curr;
    });
  }
}

// ===== Search =====
function initSearch() {
  const toggle = document.getElementById('searchToggle');
  const overlay = document.getElementById('searchOverlay');
  const input = document.getElementById('searchInput');
  const close = document.getElementById('searchClose');

  if (toggle && overlay) {
    toggle.addEventListener('click', () => {
      overlay.classList.toggle('active');
      if (overlay.classList.contains('active')) input?.focus();
    });
  }
  if (close && overlay) {
    close.addEventListener('click', () => overlay.classList.remove('active'));
  }
  if (input) {
    input.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length > 1 && document.getElementById('allProducts')) {
        filterProducts(query);
      }
    });
  }
}

// ===== Newsletter =====
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('شكراً! تم تسجيلك في النشرة البريدية 🎉');
      form.reset();
    });
  }
}

// ===== Render Page Content =====
function renderPageContent() {
  // Home page
  renderFeatured();
  renderNewArrivals();

  // Products page
  renderAllProducts();
  initFilters();

  // Product detail
  renderProductDetail();

  // Cart page
  renderCart();

  // Checkout
  initCheckout();

  // Contact form
  initContactForm();

  // FAQ
  initFAQ();

  // Policy tabs
  initPolicyTabs();
}

// ===== Product Card =====
function createProductCard(product) {
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const supplierBadge = product.supplier === 'ksadrop' ? '🇸🇦 KSA Drop' : '🇸🇦 M5AZN';
  const imgStyle = product.img ? `background-image: url('${product.img}?width=600'); background-size: cover; background-position: center;` : `background: ${product.gradient};`;
  const iconHtml = product.img ? '' : `<span class="product-icon">${product.icon}</span>`;
  return `
    <div class="product-card" data-id="${product.id}" data-category="${product.category}">
      <a href="product.html?id=${product.id}" class="product-link">
        <div class="product-image" style="${imgStyle}">
          ${iconHtml}
          ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
          ${discount > 0 ? `<span class="product-discount">-${discount}%</span>` : ''}
          <span class="product-supplier">${supplierBadge}</span>
        </div>
        <div class="product-info">
          <span class="product-category">${CATEGORY_NAMES[product.category]}</span>
          <h3 class="product-name">${product.name}</h3>
          <div class="product-rating">
            <span class="stars">${'★'.repeat(Math.floor(product.rating))}${product.rating % 1 >= 0.5 ? '½' : ''}</span>
            <span class="rating-num">${product.rating}</span>
            <span class="reviews">(${product.reviews})</span>
          </div>
          <div class="product-price-row">
            <span class="product-price">${product.price} ر.س</span>
            ${product.oldPrice ? `<span class="product-old-price">${product.oldPrice} ر.س</span>` : ''}
          </div>
        </div>
      </a>
      <button class="add-to-cart-btn" data-id="${product.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        أضف للسلة
      </button>
    </div>`;
}

// ===== Featured Products =====
function renderFeatured() {
  const container = document.getElementById('featuredProducts');
  if (!container) return;
  const featured = PRODUCTS.filter(p => p.featured).slice(0, 8);
  container.innerHTML = featured.map(createProductCard).join('');
  bindAddToCart(container);
}

// ===== New Arrivals =====
function renderNewArrivals() {
  const container = document.getElementById('newProducts');
  if (!container) return;
  const newItems = PRODUCTS.filter(p => p.isNew).slice(0, 4);
  container.innerHTML = newItems.map(createProductCard).join('');
  bindAddToCart(container);
}

// ===== All Products =====
let currentFilter = 'all';
let currentSort = 'default';

function renderAllProducts(filter = currentFilter, sort = currentSort) {
  const container = document.getElementById('allProducts');
  if (!container) return;

  let filtered = filter === 'all' ? [...PRODUCTS] : PRODUCTS.filter(p => p.category === filter);

  // Search filter
  const searchInput = document.getElementById('searchInput');
  if (searchInput && searchInput.value.trim()) {
    const q = searchInput.value.trim().toLowerCase();
    filtered = filtered.filter(p => p.name.includes(q) || CATEGORY_NAMES[p.category].includes(q));
  }

  // Sort
  switch(sort) {
    case 'price-asc': filtered.sort((a,b) => a.price - b.price); break;
    case 'price-desc': filtered.sort((a,b) => b.price - a.price); break;
    case 'name': filtered.sort((a,b) => a.name.localeCompare(b.name, 'ar')); break;
    case 'rating': filtered.sort((a,b) => b.rating - a.rating); break;
  }

  const noResults = document.getElementById('noResults');
  if (filtered.length === 0) {
    container.innerHTML = '';
    if (noResults) noResults.style.display = 'flex';
  } else {
    container.innerHTML = filtered.map(createProductCard).join('');
    if (noResults) noResults.style.display = 'none';
    bindAddToCart(container);
  }
}

function filterProducts(query) {
  const container = document.getElementById('allProducts');
  if (!container) return;
  let filtered = PRODUCTS.filter(p => p.name.includes(query) || CATEGORY_NAMES[p.category].includes(query));
  container.innerHTML = filtered.map(createProductCard).join('');
  bindAddToCart(container);
  const noResults = document.getElementById('noResults');
  if (noResults) noResults.style.display = filtered.length === 0 ? 'flex' : 'none';
}

function initFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderAllProducts(currentFilter, currentSort);
    });
  });

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      renderAllProducts(currentFilter, currentSort);
    });
  }

  // URL category param
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  if (cat) {
    currentFilter = cat;
    filterBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.filter === cat);
    });
    renderAllProducts(cat, currentSort);
  }
}

// ===== Product Detail =====
function renderProductDetail() {
  const container = document.getElementById('productDetail');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  const product = PRODUCTS.find(p => p.id === id);

  if (!product) {
    container.innerHTML = '<div class="empty-state"><h2>المنتج غير موجود</h2><a href="products.html" class="btn btn-primary">العودة للمنتجات</a></div>';
    return;
  }

  document.title = `${product.name} — سوق الزين`;
  const breadcrumb = document.getElementById('breadcrumbName');
  if (breadcrumb) breadcrumb.textContent = product.name;

  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  const imgStyle = product.img ? `background-image: url('${product.img}?width=800'); background-size: cover; background-position: center;` : `background: ${product.gradient};`;
  const iconHtml = product.img ? '' : `<span class="detail-icon">${product.icon}</span>`;
  const galleryHtml = product.imgs && product.imgs.length > 1 ? `<div class="detail-gallery">${product.imgs.map((img, i) => `<img src="${img}?width=100" class="gallery-thumb${i === 0 ? ' active' : ''}" data-full="${img}?width=800" loading="lazy">`).join('')}</div>` : '';

  container.innerHTML = `
    <div class="detail-grid">
      <div class="detail-image" style="${imgStyle}">
        ${iconHtml}
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        ${galleryHtml}
      </div>
      <div class="detail-info">
        <span class="detail-category">${CATEGORY_NAMES[product.category]}</span>
        <h1 class="detail-name">${product.name}</h1>
        <div class="detail-rating">
          <span class="stars">${'★'.repeat(Math.floor(product.rating))}</span>
          <span>${product.rating}</span>
          <span class="reviews">(${product.reviews} تقييم)</span>
        </div>
        <div class="detail-price">
          <span class="detail-current-price">${product.price} ر.س</span>
          ${product.oldPrice ? `<span class="detail-old-price">${product.oldPrice} ر.س</span><span class="detail-discount">وفّر ${discount}%</span>` : ''}
        </div>
        <p class="detail-desc">${product.desc}</p>
        ${product.specs ? `
        <div class="detail-specs">
          <h3>المواصفات</h3>
          <ul>${product.specs.map(s => `<li>✓ ${s}</li>`).join('')}</ul>
        </div>` : ''}
        <div class="detail-actions">
          <div class="qty-selector">
            <button class="qty-btn" id="qtyMinus">-</button>
            <span class="qty-num" id="qtyNum">1</span>
            <button class="qty-btn" id="qtyPlus">+</button>
          </div>
          <button class="btn btn-primary btn-lg add-to-cart-detail" data-id="${product.id}">أضف للسلة</button>
        </div>
        <div class="detail-features">
          <span>🚚 شحن مجاني فوق 200 ر.س</span>
          <span>🔄 إرجاع خلال 30 يوم</span>
          <span>🔒 دفع آمن 100%</span>
        </div>
      </div>
    </div>`;

  // Qty
  let qty = 1;
  const qtyNum = document.getElementById('qtyNum');
  document.getElementById('qtyMinus')?.addEventListener('click', () => { if (qty > 1) { qty--; qtyNum.textContent = qty; } });
  document.getElementById('qtyPlus')?.addEventListener('click', () => { qty++; qtyNum.textContent = qty; });

  // Add to cart
  container.querySelector('.add-to-cart-detail')?.addEventListener('click', () => {
    Cart.add(product.id, qty);
  });

  // Related
  const related = document.getElementById('relatedProducts');
  if (related) {
    const sameCategory = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
    related.innerHTML = sameCategory.map(createProductCard).join('');
    bindAddToCart(related);
  }

  // Gallery image click handler
  document.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const detailImg = document.querySelector('.detail-image');
      if (detailImg && thumb.dataset.full) {
        detailImg.style.backgroundImage = `url('${thumb.dataset.full}')`;
        document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      }
    });
  });
}

// ===== Cart Page =====
function renderCart() {
  const container = document.getElementById('cartItems');
  const summary = document.getElementById('cartSummary');
  const empty = document.getElementById('emptyCart');
  if (!container) return;

  if (Cart.items.length === 0) {
    container.style.display = 'none';
    if (summary) summary.style.display = 'none';
    if (empty) empty.style.display = 'flex';
    return;
  }

  container.style.display = 'block';
  if (summary) summary.style.display = 'block';
  if (empty) empty.style.display = 'none';

  container.innerHTML = Cart.items.map(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return '';
    return `
      <div class="cart-item">
        <div class="cart-item-image" style="background: ${product.gradient};">
          <span>${product.icon}</span>
        </div>
        <div class="cart-item-info">
          <h3><a href="product.html?id=${product.id}">${product.name}</a></h3>
          <span class="cart-item-cat">${CATEGORY_NAMES[product.category]}</span>
          <span class="cart-item-price">${product.price} ر.س</span>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateCartItem(${product.id}, ${item.qty - 1})">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" onclick="updateCartItem(${product.id}, ${item.qty + 1})">+</button>
        </div>
        <div class="cart-item-total">${product.price * item.qty} ر.س</div>
        <button class="cart-item-remove" onclick="removeCartItem(${product.id})">&times;</button>
      </div>`;
  }).join('');

  updateCartSummary();
}

function updateCartItem(id, qty) {
  Cart.updateQty(id, qty);
  renderCart();
}

function removeCartItem(id) {
  Cart.remove(id);
  renderCart();
}

function updateCartSummary() {
  const subtotal = document.getElementById('subtotal');
  const shipping = document.getElementById('shipping');
  const tax = document.getElementById('tax');
  const total = document.getElementById('total');

  if (subtotal) subtotal.textContent = `${Cart.getSubtotal()} ر.س`;
  if (shipping) shipping.textContent = Cart.getShipping() === 0 ? 'مجاني 🎉' : `${Cart.getShipping()} ر.س`;
  if (tax) tax.textContent = `${Cart.getTax()} ر.س`;
  if (total) total.textContent = `${Cart.getTotal()} ر.س`;
}

// ===== Checkout =====
function initCheckout() {
  const btn = document.getElementById('checkoutBtn');
  const modal = document.getElementById('checkoutModal');
  const closeBtn = document.getElementById('modalClose');
  const form = document.getElementById('checkoutForm');
  const successModal = document.getElementById('successModal');

  if (btn && modal) {
    btn.addEventListener('click', () => {
      if (Cart.items.length === 0) { showToast('السلة فارغة!'); return; }
      modal.classList.add('active');
    });
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
  }
  if (form && successModal) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      modal.classList.remove('active');
      Cart.clear();
      successModal.classList.add('active');
    });
  }
  if (successModal) {
    successModal.addEventListener('click', (e) => { if (e.target === successModal) successModal.classList.remove('active'); });
  }
}

// ===== Contact Form =====
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً 📧');
      form.reset();
    });
  }
}

// ===== FAQ =====
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const btn = item.querySelector('.faq-question');
    btn?.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');
      items.forEach(i => i.classList.remove('active'));
      if (!isOpen) item.classList.add('active');
    });
  });

  const catBtns = document.querySelectorAll('.faq-cat-btn');
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      items.forEach(item => {
        item.style.display = (cat === 'all' || item.dataset.cat === cat) ? '' : 'none';
      });
    });
  });
}

// ===== Policy Tabs =====
function initPolicyTabs() {
  const tabs = document.querySelectorAll('.policy-tab');
  const panels = document.querySelectorAll('.policy-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });
}

// ===== Add to Cart Binding =====
function bindAddToCart(container) {
  container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      Cart.add(id);
      btn.textContent = '✓ تمت الإضافة';
      btn.classList.add('added');
      setTimeout(() => {
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> أضف للسلة';
        btn.classList.remove('added');
      }, 1500);
    });
  });
}

// ===== Toast =====
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}