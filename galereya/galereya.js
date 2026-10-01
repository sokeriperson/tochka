
const revealItems = document.querySelectorAll('[data-reveal]');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

revealItems.forEach((el) => revealObserver.observe(el));

(function () {
    var title = document.querySelector('.page__title');
    if (!title) return;
    var words = title.textContent.trim().split(' ');
    if (words.length < 2) return;
    var last = words.pop();
    title.innerHTML = words.join(' ') + ' <span class="page__title-accent">' + last + '</span>';
})();

(function () {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');
    if (!lightbox || !lightboxImg) return;

    function openLightbox(src, alt) {
        lightboxImg.src = src;
        lightboxImg.alt = alt || '';
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('.gcard img').forEach((img) => {
        img.addEventListener('click', () => openLightbox(img.src, img.alt));
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    });
})();

(function () {
    const policyModal = document.getElementById('policyModal');
    const policyOpen = document.getElementById('policyOpen');
    const policyClose = document.getElementById('policyClose');
    if (!policyModal || !policyOpen) return;

    function openPolicy() {
        policyModal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closePolicy() {
        policyModal.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    policyOpen.addEventListener('click', openPolicy);
    if (policyClose) policyClose.addEventListener('click', closePolicy);

    policyModal.addEventListener('click', (e) => {
        if (e.target === policyModal) closePolicy();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && policyModal.classList.contains('is-open')) closePolicy();
    });
})();

(function () {
    const burger = document.getElementById('burgerBtn');
    const menu   = document.getElementById('mobileMenu');
    if (!burger || !menu) return;

    function open() {
        menu.classList.add('is-open');
        burger.setAttribute('aria-expanded', 'true');
        document.body.classList.add('menu-open');
    }
    function close() {
        menu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
    }

    burger.addEventListener('click', () => {
        menu.classList.contains('is-open') ? close() : open();
    });

    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900 && menu.classList.contains('is-open')) close();
    });
})();

(function () {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();


(function () {
    var shade = document.querySelector('.bottom-shade');
    if (!shade) return;

    function update() {
        if (window.innerWidth > 900) return;

        var vv = window.visualViewport;

        var visibleBottom = vv
            ? vv.height
            : window.innerHeight;

        shade.style.top = Math.floor(visibleBottom - 10) + 'px';
        shade.style.height = '300px';
    }

    var ticking = false;

    function onScroll() {
        if (ticking) return;

        ticking = true;

        requestAnimationFrame(function () {
            update();
            ticking = false;
        });
    }

    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    window.addEventListener(
        'scroll',
        onScroll,
        { passive: true }
    );

    if (window.visualViewport) {
        window.visualViewport.addEventListener(
            'resize',
            update
        );

        window.visualViewport.addEventListener(
            'scroll',
            onScroll
        );
    }
})();