/* ══════════════════════════════════════════════
   ТОЧКА ДОСТУПА — «Акции»
══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- появление блоков при скролле ---------- */
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) { e.target.classList.add('reveal'); io.unobserve(e.target); }
        });
    }, { threshold: 0.12 });
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

    /* ---------- политика конфиденциальности ---------- */
    const policyOverlay = document.getElementById('policyModal');
    const policyOpen = document.getElementById('policyOpen');
    const policyClose = document.getElementById('policyClose');

    if (policyOverlay && policyOpen) {
        const openPolicy = () => {
            policyOverlay.classList.add('is-open');
            document.body.style.overflow = 'hidden';
        };
        const closePolicy = () => {
            policyOverlay.classList.remove('is-open');
            document.body.style.overflow = '';
        };

        policyOpen.addEventListener('click', openPolicy);
        if (policyClose) policyClose.addEventListener('click', closePolicy);
        policyOverlay.addEventListener('click', (e) => { if (e.target === policyOverlay) closePolicy(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && policyOverlay.classList.contains('is-open')) closePolicy();
        });
    }

    /* ---------- меню ---------- */
    const burger = document.getElementById('burgerBtn');
    const menu   = document.getElementById('mobileMenu');

    if (burger && menu) {
        const openMenu = () => {
            menu.classList.add('is-open');
            burger.setAttribute('aria-expanded', 'true');
            document.body.classList.add('menu-open');
        };
        const closeMenu = () => {
            menu.classList.remove('is-open');
            burger.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('menu-open');
        };

        burger.addEventListener('click', () => {
            menu.classList.contains('is-open') ? closeMenu() : openMenu();
        });

        menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 900 && menu.classList.contains('is-open')) closeMenu();
        });
    }

    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});