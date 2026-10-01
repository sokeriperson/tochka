import { db } from "../firebase-config.js";
import { collection, query, orderBy, getDocs }
    from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const CACHE_KEY = "td_menu_cache_v2";

const imgCache = new Map();

function preloadImg(src, priority) {
    if (!src) return null;
    let im = imgCache.get(src);
    if (!im) {
        im = new Image();
        im.decoding = "async";
        if (priority && "fetchPriority" in im) im.fetchPriority = priority;
        im.src = src;
        imgCache.set(src, im);
    }
    return im;
}

loadMenu();

async function loadMenu() {
    const cached = readCache();
    if (cached && cached.length) render(cached);

    let sections = [];
    try {
        const snap = await getDocs(query(collection(db, "menu"), orderBy("order", "asc")));
        sections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error("Не удалось загрузить меню:", err);
        if (!cached || !cached.length) clearSkeleton();
        return;
    }

    if (!sections.length) { clearSkeleton(); return; }

    if (JSON.stringify(sections) !== JSON.stringify(cached)) {
        render(sections);
        writeCache(sections);
    }
}

function render(sections) {
    renderDesktop(buildGroups(sections));
    renderMobile(sections);
}

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function writeCache(sections) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(sections)); } catch { }
}

function clearSkeleton() {
    document.querySelectorAll(".acc-skeleton").forEach((el) => el.remove());
}

function buildGroups(sections) {
    const groups = [];

    sections.forEach((sec) => {
        if (sec.image || !groups.length) {
            groups.push({
                label: sec.label,
                subLabels: [],
                contentImgs: [sec.image, sec.image2].filter(Boolean)
            });
        } else {
            groups[groups.length - 1].subLabels.push(sec.label);
        }
    });

    return groups.filter((g) => g.contentImgs.length);
}

var goPageFn = null;

function renderDesktop(groups) {
    const catsEl = document.getElementById("cats");
    const contentImg = document.getElementById("contentImg");
    const prevBtn = document.getElementById("contentPrev");
    const nextBtn = document.getElementById("contentNext");
    if (!catsEl || !contentImg || !groups.length) return;

    const chevronSVG = `<svg class="cat__chevron" viewBox="0 0 8 14" fill="none" aria-hidden="true"><path d="M1 1L7 7L1 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const altFor = (group) =>
        `Прайс-лист: ${group.label}${group.subLabels.length ? " / " + group.subLabels.join(", ") : ""}`;

    catsEl.innerHTML = "";

    const catButtons = groups.map((group, i) => {
        const btn = document.createElement("button");
        btn.className = "cat";
        btn.type = "button";
        btn.dataset.index = i;
        btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");

        const subsHTML = group.subLabels
            .map((s) => `<span class="cat__sub">${esc(s)}</span>`)
            .join("");

        btn.innerHTML = `
      <span class="cat__row">
        <span class="cat__label">${esc(group.label)}</span>
        ${chevronSVG}
      </span>
      ${subsHTML}
    `;
        catsEl.appendChild(btn);
        return btn;
    });

    let activeIndex = 0;
    let pageIndex = 0;
    let paintToken = 0;

    function pages() { return groups[activeIndex].contentImgs; }

    function updateArrows() {
        const list = pages();
        const many = list.length > 1;
        if (prevBtn) prevBtn.hidden = !(many && pageIndex > 0);
        if (nextBtn) nextBtn.hidden = !(many && pageIndex < list.length - 1);
    }

    function paint(animate) {
        const group = groups[activeIndex];
        const src = pages()[pageIndex] || "";
        const token = ++paintToken;

        const im = preloadImg(src, "high");
        const ready = im && im.complete && im.naturalWidth > 0;

        if (!animate || ready || !im) {
            contentImg.src = src;
            contentImg.alt = altFor(group);
            contentImg.classList.remove("is-fading");
            updateArrows();
            return;
        }

        contentImg.classList.add("is-fading");
        im.decode()
            .catch(() => {})
            .then(() => {
                if (token !== paintToken) return;
                contentImg.src = src;
                contentImg.alt = altFor(group);
                contentImg.classList.remove("is-fading");
                updateArrows();
            });
    }

    function setActive(index) {
        if (index === activeIndex) return;
        activeIndex = index;
        pageIndex = 0;

        catButtons.forEach((btn, i) => {
            const isActive = i === index;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
        });

        paint(true);
    }

    function goPage(dir) {
        const next = pageIndex + dir;
        if (next < 0 || next >= pages().length) return;
        pageIndex = next;
        paint(true);
    }

    goPageFn = goPage;

    groups.forEach((g) => preloadImg(g.contentImgs[0], "high"));

    catButtons[0].classList.add("is-active");
    paint(false);

    const preloadRest = () => {
        groups.forEach((g) => g.contentImgs.slice(1).forEach((s) => preloadImg(s, "low")));
    };
    if ("requestIdleCallback" in window) requestIdleCallback(preloadRest, { timeout: 3000 });
    else setTimeout(preloadRest, 800);

    catButtons.forEach((btn) => {
        btn.addEventListener("click", () => setActive(Number(btn.dataset.index)));
    });
}

(function () {
    const prevBtn = document.getElementById("contentPrev");
    const nextBtn = document.getElementById("contentNext");
    if (prevBtn) prevBtn.addEventListener("click", () => goPageFn && goPageFn(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => goPageFn && goPageFn(1));
})();

function renderMobile(sections) {
    const accordionEl = document.getElementById("accordion");
    if (!accordionEl) return;

    const chevronSVG = `<svg class="acc-cat__chevron" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    accordionEl.innerHTML = "";

    sections.forEach((cat) => {
        const catEl = document.createElement("div");
        catEl.className = "acc-cat";

        const itemsHTML = (cat.items || []).map((item) => `
            <div class="acc-item">
                <div class="acc-item__info">
                    <p class="acc-item__name">${esc(item.name)}</p>
                    ${item.orig ? `<p class="acc-item__orig">${esc(item.orig)}</p>` : ""}
                </div>
                <div class="acc-item__meta">
                    ${item.vol ? `<span class="acc-item__vol">${esc(item.vol)}</span>` : ""}
                    <span class="acc-item__price">${esc(item.price)}</span>
                </div>
            </div>
        `).join("");

        catEl.innerHTML = `
            <button type="button" class="acc-cat__head">
                ${chevronSVG}
                <span class="acc-cat__label">${esc(cat.label)}</span>
                <span class="acc-cat__headmeta">
                    ${cat.unit ? `<span>${esc(cat.unit)}</span>` : ""}
                    <span>цена</span>
                </span>
            </button>
            <div class="acc-cat__body">
                ${itemsHTML}
            </div>
        `;

        accordionEl.appendChild(catEl);
    });

    if (!accordionEl.dataset.bound) {
        accordionEl.dataset.bound = "1";
        accordionEl.addEventListener("click", (e) => {
            const head = e.target.closest(".acc-cat__head");
            if (!head) return;

            const catEl = head.closest(".acc-cat");
            const body = catEl.querySelector(".acc-cat__body");

            if (catEl.classList.contains("is-open")) {
                body.style.maxHeight = "0px";
                catEl.classList.remove("is-open");
            } else {
                catEl.classList.add("is-open");
                body.style.maxHeight = body.scrollHeight + "px";
            }
        });
    }
}

function esc(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

(function () {
    const overlay  = document.getElementById('policyModal');
    const openBtn  = document.getElementById('policyOpen');
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