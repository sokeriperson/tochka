(function () {
    'use strict';

    var SCRIPT_EL = document.currentScript;

    var STORAGE_KEY = 'td_age_verified_at';
    var EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 часа
    var EXIT_URL = 'https://www.google.com';

    function getImgBase() {
        if (SCRIPT_EL && SCRIPT_EL.src) {
            return SCRIPT_EL.src.replace(/[^\/]*$/, '');
        }
        return '';
    }

    function isVerified() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return false;
            return (Date.now() - parseInt(saved, 10)) < EXPIRY_MS;
        } catch (e) {
            return false;
        }
    }

    function markVerified() {
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) {}
    }

    if (isVerified()) return;

    var imgUrl = getImgBase() + 'img/18+.png';
    (function preloadConfirmImg() {
        var preloadImg = document.createElement('link');
        preloadImg.rel = 'preload';
        preloadImg.as = 'image';
        preloadImg.href = imgUrl;
        document.head.appendChild(preloadImg);
    })();

    function loadFont() {
        if (document.getElementById('age-gate-font')) return;

        var pre1 = document.createElement('link');
        pre1.rel = 'preconnect';
        pre1.href = 'https://fonts.googleapis.com';

        var pre2 = document.createElement('link');
        pre2.rel = 'preconnect';
        pre2.href = 'https://fonts.gstatic.com';
        pre2.crossOrigin = 'anonymous';

        var sheet = document.createElement('link');
        sheet.id = 'age-gate-font';
        sheet.rel = 'stylesheet';
        sheet.href = 'https://fonts.googleapis.com/css2?family=Murecho:wght@100..900&display=swap';

        document.head.appendChild(pre1);
        document.head.appendChild(pre2);
        document.head.appendChild(sheet);
    }

    function init() {
        var docEl = document.documentElement;

        loadFont();

        var style = document.createElement('style');
        style.id = 'age-gate-styles';
        style.textContent =
            '.age-gate-lock{overflow:hidden!important}' +
            '.age-gate{position:fixed;inset:0;z-index:99999;display:flex;' +
            'align-items:center;justify-content:center;padding:24px;' +
            'background:rgba(6,4,6,.92);backdrop-filter:blur(10px);' +
            '-webkit-backdrop-filter:blur(10px);' +
            'animation:age-gate-fade-in .35s ease both}' +
            '.age-gate--closing{animation:age-gate-fade-out .25s ease both}' +
            '@keyframes age-gate-fade-in{from{opacity:0}to{opacity:1}}' +
            '@keyframes age-gate-fade-out{from{opacity:1}to{opacity:0}}' +
            '.age-gate__card{width:100%;max-width:420px;text-align:center;' +
            'padding:clamp(28px,5vw,44px) clamp(24px,5vw,36px);' +
            'animation:age-gate-pop .4s cubic-bezier(.2,.8,.2,1) both}' +
            '@keyframes age-gate-pop{from{transform:translateY(12px) scale(.97);opacity:0}' +
            'to{transform:translateY(0) scale(1);opacity:1}}' +
            '.age-gate__eyebrow{display:block;margin:0 0 8px;font-family:"Murecho",Arial,sans-serif;' +
            'font-weight:400;font-size:14px;letter-spacing:.04em;color:#9a9a9f}' +
            '.age-gate__title{margin:0 0 13px;font-family:"Murecho",Arial,sans-serif;' +
            'font-weight:500;letter-spacing:.01em;' +
            'font-size:clamp(22px,4.5vw,30px);color:#fff}' +
            '.age-gate__confirm{position:relative;display:block;width:100%;max-width:320px;' +
            'height:64px;margin:0 auto;padding:0;border:none;background:none;cursor:pointer}' +
            '.age-gate__confirm img{position:absolute;inset:0;width:100%;height:108%;' +
            'object-fit:contain;transition:opacity .25s}' +
            '.age-gate__decline{display:inline-block;margin-top:6px;padding:6px;border:none;' +
            'background:none;cursor:pointer;font-family:"Murecho",Arial,sans-serif;' +
            'font-weight:400;font-size:13px;color:#6f6f74;text-decoration:underline;' +
            'text-underline-offset:3px}' +
            '.age-gate__decline:hover{color:#9a9a9f}' +
            '@media(max-width:380px){.age-gate__card{padding:28px 20px}}';
        document.head.appendChild(style);

        docEl.classList.add('age-gate-lock');

        var overlay = document.createElement('div');
        overlay.className = 'age-gate';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'age-gate-title');
        overlay.innerHTML =
            '<div class="age-gate__card">' +
            '<p class="age-gate__eyebrow">Здравствуйте!</p>' +
            '<h2 class="age-gate__title" id="age-gate-title">Вам есть 18 лет?</h2>' +
            '<button type="button" class="age-gate__confirm" aria-label="Да, мне есть 18 лет">' +
            '<img src="' + imgUrl + '" alt="Да, мне есть 18 лет" fetchpriority="high">' +
            '</button>' +
            '</div>';

        document.body.insertAdjacentElement('afterbegin', overlay);

        function closeGate() {
            markVerified();
            docEl.classList.remove('age-gate-lock');
            overlay.classList.add('age-gate--closing');
            setTimeout(function () {
                overlay.remove();
                style.remove();
            }, 250);
        }

        overlay.querySelector('.age-gate__confirm').addEventListener('click', closeGate);
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();