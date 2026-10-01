
(function () {
    function wrap(el) {
        if (el.querySelector('.phone-glitch')) return; 
        const text = el.textContent.trim();
        el.textContent = '';
        const span = document.createElement('span');
        span.className = 'phone-glitch';
        span.setAttribute('data-text', text);
        span.textContent = text;
        el.appendChild(span);
    }

    function init() {
        document.querySelectorAll('.nav__phone').forEach(wrap);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();