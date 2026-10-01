(function () {
    const SEL = '.blob, .marquee__inner, .blob-decor-gallery .blob, .blob-decor-booking .blob, .blob-decor-footer .blob, .blob-decor-gallery-left .blob, .blob-decor-deal1 .blob, .blob-decor-deal2 .blob, .blob-decor-deal3 .blob';

    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
        });
    }, { rootMargin: '100px' });

    function bind() {
        document.querySelectorAll(SEL).forEach((el) => {
            el.style.animationPlayState = 'paused';
            io.observe(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();