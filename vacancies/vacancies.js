document.addEventListener('DOMContentLoaded', () => {

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

    const revealTargets = document.querySelectorAll('[data-reveal]');

    if ('IntersectionObserver' in window && revealTargets.length) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry, idx) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal');
                    entry.target.setAttribute('data-d', String((idx % 3) + 1));
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealTargets.forEach(el => io.observe(el));
    } else {
        revealTargets.forEach(el => el.classList.add('reveal'));
    }

    const applyForm = document.getElementById('apply-form');
    const status    = document.getElementById('form-status');

    if (applyForm) {
        const submitBtn = applyForm.querySelector('button[type="submit"]');

        applyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nameEl    = applyForm.querySelector('#f-name');
            const phoneEl   = applyForm.querySelector('#f-phone');
            const contactEl = applyForm.querySelector('#f-contact');
            const commentEl = applyForm.querySelector('#f-comment');
            const agree1    = applyForm.querySelector('[name="agree1"]');
            const agree2    = applyForm.querySelector('[name="agree2"]');

            const phoneDigits = phoneEl.value.replace(/\D/g, '');
            const hasPhone    = phoneDigits.length >= 10;
            const hasContact  = contactEl.value.trim().length > 0;
            const hasComment  = commentEl.value.trim().length > 0;

            let ok = true;

            [phoneEl, contactEl, commentEl].forEach(
                f => f.style.borderBottomColor = ''
            );

            if (!hasPhone && !hasContact && !hasComment) {
                phoneEl.style.borderBottomColor    = '#ff3b42';
                contactEl.style.borderBottomColor  = '#ff3b42';
                commentEl.style.borderBottomColor  = '#ff3b42';
                ok = false;
            }
            if (!agree1.checked || !agree2.checked) ok = false;

            if (!ok) {
                status.textContent = 'Укажите телефон или контакт для связи, и подтвердите согласия.';
                status.className = 'form__status err';
                return;
            }

            submitBtn.disabled = true;
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Отправка...';
            status.textContent = '';
            status.className = 'form__status';

            try {
                await window.saveLead({
                    type: 'vacancy',
                    source: 'Вакансии',
                    name:    nameEl.value.trim(),
                    phone:   phoneEl.value.trim(),
                    contact: contactEl.value.trim(),
                    comment: commentEl.value.trim()
                });

                applyForm.reset();

                // показываем ту же модалку «Спасибо!», что и при брони
                if (typeof window.showBookingSuccess === 'function') {
                    window.showBookingSuccess();
                }
            } catch (err) {
                console.error(err);
                status.textContent = 'Не получилось отправить. Попробуйте ещё раз или позвоните нам по тел. 8 (800) 222 86 90.';
                status.className = 'form__status err';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
});

/* ---------- модалка: политика конфиденциальности ---------- */
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
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && policyOverlay.classList.contains('is-open')) closePolicy();
    });
}

(function () {
    function formatRu(digits) {
        digits = digits.replace(/\D/g, "");
        if (!digits) return "";

        if (digits[0] === "8") digits = "7" + digits.slice(1);
        if (digits[0] === "9") digits = "7" + digits;
        if (digits[0] !== "7") digits = "7" + digits;

        digits = digits.slice(0, 11);

        const a = digits.slice(1, 4);
        const b = digits.slice(4, 7);
        const c = digits.slice(7, 9);
        const d = digits.slice(9, 11);

        let out = "+7";
        if (a) out += " (" + a;
        if (a.length === 3) out += ")";
        if (b) out += " " + b;
        if (c) out += "-" + c;
        if (d) out += "-" + d;
        return out;
    }

    function attach(input) {
        input.setAttribute("inputmode", "tel");
        input.setAttribute("maxlength", "18");
        input.dataset.prevDigits = input.value.replace(/\D/g, "");

        input.addEventListener("input", (e) => {
            let digits = input.value.replace(/\D/g, "");

            if (e.inputType === "deleteContentBackward" && digits === input.dataset.prevDigits) {
                digits = digits.slice(0, -1);
            }

            input.value = formatRu(digits);
            input.dataset.prevDigits = input.value.replace(/\D/g, "");
        });

        input.addEventListener("focus", () => {
            if (!input.value) {
                input.value = "+7 ";
                input.dataset.prevDigits = "";
            }
        });

        input.addEventListener("blur", () => {
            if (input.value.replace(/\D/g, "").length <= 1) {
                input.value = "";
                input.dataset.prevDigits = "";
            }
        });

        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const txt = (e.clipboardData || window.clipboardData).getData("text");
            input.value = formatRu(txt);
            input.dataset.prevDigits = input.value.replace(/\D/g, "");
        });
    }

    document.querySelectorAll('input[type="tel"]').forEach(attach);
})();

(function () {
    const contact = document.getElementById('f-contact');
    if (!contact) return;

    const allowed = /[^A-Za-z0-9_@.\-+]/g;

    function clean(v) {
        return v.replace(allowed, '').slice(0, 15);
    }

    contact.setAttribute('maxlength', '15');

    contact.addEventListener('input', () => {
        contact.value = clean(contact.value);
    });

    contact.addEventListener('paste', (e) => {
        e.preventDefault();
        const txt = (e.clipboardData || window.clipboardData).getData('text');
        contact.value = clean(contact.value + txt).slice(0, 15);
    });
})();

(function () {
    var startX = 0;
    var startY = 0;
    var lock = null;

    document.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        lock = null;
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        if (e.touches.length !== 1) return;

        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;

        if (lock === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
            lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        }

        if (lock === 'x') {
            e.preventDefault();
        }
    }, { passive: false });
})();

(function () {
    document.addEventListener('touchmove', function (e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
        document.addEventListener(ev, function (e) {
            e.preventDefault();
        }, { passive: false });
    });

    var lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
        var now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    document.addEventListener('wheel', function (e) {
        if (e.ctrlKey) e.preventDefault();
    }, { passive: false });
})();