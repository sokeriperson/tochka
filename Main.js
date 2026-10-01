
(function () {
    const track = document.getElementById('galleryTrack');
    if (!track) return;

    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');

    const originals = Array.from(track.querySelectorAll('.gallery__slide'));
    if (!originals.length) return;

    originals.forEach((slide, i) => {
        const img = slide.querySelector('img');
        if (img) img.dataset.index = i;
    });

    const N = originals.length;
    const CLONES = N;

    const headClones = originals.slice(-CLONES).map(s => s.cloneNode(true));
    const tailClones = originals.slice(0, CLONES).map(s => s.cloneNode(true));
    headClones.forEach(c => track.insertBefore(c, track.firstChild));
    tailClones.forEach(c => track.appendChild(c));

    const slides = Array.from(track.querySelectorAll('.gallery__slide'));

    const DURATION = 450;

    let idx = CLONES;
    let animating = false;
    let failsafe = null;

    function gap() {
        return parseFloat(getComputedStyle(track).gap) || 0;
    }

    function offsetFor(i) {
        let off = 0;
        for (let k = 0; k < i; k++) {
            off += slides[k].getBoundingClientRect().width + gap();
        }
        return off;
    }

    function setX(i, animate) {
        if (animate) {
            track.style.transition = 'transform 0.45s cubic-bezier(.4,0,.2,1)';
            track.style.transform = `translateX(-${offsetFor(i)}px)`;
            return;
        }

        track.style.transition = 'none';
        track.style.transform = `translateX(-${offsetFor(i)}px)`;
        void track.offsetWidth;
    }

    function normalize() {
        if (idx >= N + CLONES) {
            idx -= N;
            setX(idx, false);
        } else if (idx < CLONES) {
            idx += N;
            setX(idx, false);
        }
    }

    function finish() {
        if (failsafe) { clearTimeout(failsafe); failsafe = null; }
        normalize();
        animating = false;
    }

    function go(dir) {
        if (animating) return;
        animating = true;
        idx += dir;
        setX(idx, true);
        failsafe = setTimeout(finish, DURATION + 150);
    }

    track.addEventListener('transitionend', (e) => {
        if (e.target !== track || e.propertyName !== 'transform') return;
        finish();
    });

    bindTap(prevBtn, () => go(-1));
    bindTap(nextBtn, () => go(1));

    let touchStartX = 0;
    let touchStartY = 0;
    let touchDeltaX = 0;
    let isHorizontal = null;

    track.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchDeltaX = 0;
        isHorizontal = null;
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
        touchDeltaX = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;

        if (isHorizontal === null && (Math.abs(touchDeltaX) > 8 || Math.abs(dy) > 8)) {
            isHorizontal = Math.abs(touchDeltaX) > Math.abs(dy);
        }
    }, { passive: true });

    track.addEventListener('touchend', () => {
        const threshold = 40;
        if (isHorizontal === false) return;
        if (touchDeltaX < -threshold) go(1);
        else if (touchDeltaX > threshold) go(-1);
    }, { passive: true });

    function reset() {
        if (failsafe) { clearTimeout(failsafe); failsafe = null; }
        animating = false;
        setX(idx, false);
    }

    track.querySelectorAll('img').forEach((img) => {
        if (!img.complete) img.addEventListener('load', reset, { once: true });
    });

    window.addEventListener('load', reset);

    let lastW = window.innerWidth;
    let resizeTimer = null;

    window.addEventListener('resize', () => {
        if (window.innerWidth === lastW) return;
        lastW = window.innerWidth;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(reset, 120);
    });

    reset();
})();

(function () {
    const track = document.getElementById('galleryTrack');
    const lightbox = document.getElementById('galleryLightbox');
    if (!track || !lightbox) return;

    const img      = document.getElementById('galleryLightboxImg');
    const closeBtn = document.getElementById('galleryLightboxClose');
    const prevBtn  = document.getElementById('galleryLightboxPrev');
    const nextBtn  = document.getElementById('galleryLightboxNext');

    const photos = [];
    track.querySelectorAll('.gallery__slide img[data-index]').forEach((el) => {
        const i = Number(el.dataset.index);
        if (!photos[i]) photos[i] = { src: el.currentSrc || el.src, alt: el.alt || '' };
    });

    let current = 0;

    function openAt(i) {
        if (!photos.length) return;
        current = (i + photos.length) % photos.length;
        img.src = photos[current].src;
        img.alt = photos[current].alt;
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        updateNavVisibility();
    }

    function close() {
        lightbox.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    function next() { openAt(current + 1); }
    function prev() { openAt(current - 1); }

    function updateNavVisibility() {
        const hide = photos.length <= 1;
        if (prevBtn) prevBtn.style.display = hide ? 'none' : '';
        if (nextBtn) nextBtn.style.display = hide ? 'none' : '';
    }

    track.addEventListener('click', (e) => {
        const clickedImg = e.target.closest('.gallery__slide img[data-index]');
        if (!clickedImg) return;
        openAt(Number(clickedImg.dataset.index));
    });

    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); next(); });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('is-open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
    });

    let touchStartX = 0, touchStartY = 0;
    const SWIPE_THRESHOLD = 40;

    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
            dx < 0 ? next() : prev();
        }
    }, { passive: true });
})();

/* ══════════════════════════════════════════════
   NAV  active link on scroll
══════════════════════════════════════════════ */
(function () {
    const firstLink = document.querySelector('.nav a.active');
    const pairs = [];

    document.querySelectorAll('section[id], div[id]').forEach((sec) => {
        const link = document.querySelector(`.nav a[href="#${sec.id}"]`);
        if (link) pairs.push({ sec, link });
    });

    if (!pairs.length) return;

    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            const pair = pairs.find((p) => p.sec === e.target);
            if (pair) pair.link.classList.toggle('active', e.isIntersecting);
        });

        const anyActive = pairs.some((p) => p.link.classList.contains('active'));
        if (!anyActive && firstLink) firstLink.classList.add('active');
    }, { rootMargin: '-70px 0px -75% 0px' });

    pairs.forEach((p) => io.observe(p.sec));
})();

(function () {
    const btn   = document.getElementById('submitBtn');
    const name  = document.getElementById('f-name');
    const phone = document.getElementById('f-phone');
    const c1    = document.getElementById('c1');
    const c2    = document.getElementById('c2');
    const err   = document.getElementById('booking-error');

    if (!btn) return;

    btn.addEventListener('click', async (e) => {
        e.preventDefault();

        const n = name.value.trim();
        const p = phone.value.trim();
        const phoneDigits = p.replace(/\D/g, '');

        [name, phone].forEach(f => f.style.borderBottomColor = '');
        let ok = true;

        if (phoneDigits.length < 10) { phone.style.borderBottomColor = '#ff3b42'; ok = false; }
        if (!c1.checked || !c2.checked) ok = false;

        if (!ok) {
            if (err) {
                err.className = 'modal-status err';
            }
            return;
        }

        if (err) { err.textContent = ''; err.className = 'modal-status'; }
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.6';

        try {
            await window.saveLead({
                type: 'booking',
                source: 'Главная — форма',
                name: n,
                phone: p
            });

            name.value = '';
            phone.value = '';

            if (typeof window.showBookingSuccess === 'function') {
                window.showBookingSuccess();
            }
        } catch (e2) {
            console.error(e2);
            if (err) {
                err.textContent = 'Не получилось отправить. Попробуйте ещё раз.';
                err.className = 'modal-status err';
            }
        } finally {
            btn.style.pointerEvents = '';
            btn.style.opacity = '';
        }
    });
})();

(function () {
    const overlay = document.getElementById('policyModal');
    const openBtn = document.getElementById('policyOpen');
    const closeBtn = document.getElementById('policyClose');

    if (!overlay || !openBtn) return;

    function open() {
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
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
    function formatRu(nat) {
        let out = "+7";
        if (nat.length)      out += " (" + nat.slice(0, 3);
        if (nat.length >= 3) out += ")";
        if (nat.length > 3)  out += " " + nat.slice(3, 6);
        if (nat.length > 6)  out += "-" + nat.slice(6, 8);
        if (nat.length > 8)  out += "-" + nat.slice(8, 10);
        return out;
    }

    function attach(input) {
        input.setAttribute("inputmode", "tel");
        input.setAttribute("maxlength", "18");

        let nat = "";

        function render() {
            input.value = nat.length ? formatRu(nat) : "";
            const end = input.value.length;
            try { input.setSelectionRange(end, end); } catch (e) {}
        }

        input.addEventListener("beforeinput", (e) => {
            const t = e.inputType;

            if (t === "insertText" || t === "insertFromPaste" || t === "insertCompositionText") {
                e.preventDefault();
                const incoming = String(e.data || "").replace(/\D/g, "");
                if (!incoming) return;
                nat = (nat + incoming).slice(0, 10);
                render();
                return;
            }

            if (t === "deleteContentBackward") {
                e.preventDefault();
                nat = nat.slice(0, -1);
                render();
                return;
            }

            if (t === "deleteContentForward" || t === "deleteByCut" || t === "deleteHardLineBackward" ||
                t === "deleteSoftLineBackward" || t === "deleteWordBackward") {
                e.preventDefault();
                nat = "";
                render();
            }
        });

        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const txt = (e.clipboardData || window.clipboardData).getData("text");
            let d = String(txt).replace(/\D/g, "");
            if (d.length > 10 && (d[0] === "7" || d[0] === "8")) d = d.slice(1);
            nat = d.slice(0, 10);
            render();
        });

        input.addEventListener("focus", () => {
            const end = input.value.length;
            try { input.setSelectionRange(end, end); } catch (e) {}
        });

        input.addEventListener("blur", () => {
            if (!nat.length) input.value = "";
        });

        input.addEventListener("change", () => {
            if (!input.value) nat = "";
        });
    }

    document.querySelectorAll('input[type="tel"]').forEach(attach);
})();

document.addEventListener('touchstart', function () {}, { passive: true });

function bindTap(el, handler) {
    if (!el) return;
    let handledByTouch = false;
    let startX = 0;
    let startY = 0;
    let moved = false;

    el.addEventListener('touchstart', (e) => {
        const t = e.changedTouches[0];
        startX = t.clientX;
        startY = t.clientY;
        moved = false;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
        const t = e.changedTouches[0];
        // палец уехал больше чем на 10px — это скролл, а не тап
        if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
            moved = true;
        }
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
        if (moved) return;

        handledByTouch = true;
        e.preventDefault();
        handler(e);
        setTimeout(() => { handledByTouch = false; }, 400);
    }, { passive: false });

    el.addEventListener('click', (e) => {
        if (handledByTouch) return; // не дублируем срабатывание
        handler(e);
    });
}

(function () {
    var isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isTouch) return; // мышь/трекпад — ничего не делаем, там свой :hover

    document.querySelectorAll('.glitch-img').forEach(function (el) {
        var startX = 0;
        var startY = 0;
        var moved = false;

        el.addEventListener('touchstart', function (e) {
            var t = e.changedTouches[0];
            startX = t.clientX;
            startY = t.clientY;
            moved = false;
        }, { passive: true });

        el.addEventListener('touchmove', function (e) {
            var t = e.changedTouches[0];
            if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
                moved = true;
            }
        }, { passive: true });

        el.addEventListener('touchend', function (e) {
            if (moved) return;      // это был скролл — не мешаем странице

            // событие неотменяемо => прокрутка уже идёт, трогать нельзя
            if (e.cancelable) e.preventDefault();
            el.classList.toggle('is-active');
        }, { passive: false });
    });
})();

(function () {
    var shade = document.querySelector('.bottom-shade');
    if (!shade) return;

    var lastTop = -1;

    function update() {
        if (window.innerWidth > 900) return;

        var vv = window.visualViewport;
        var visibleBottom = vv ? vv.height : window.innerHeight;
        var top = Math.floor(visibleBottom - 10);

        if (top === lastTop) return;
        lastTop = top;

        shade.style.top = top + 'px';
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
    window.addEventListener('scroll', onScroll, { passive: true });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', update);
        window.visualViewport.addEventListener('scroll', onScroll);
    }
})();