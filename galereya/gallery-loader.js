import { db } from "../firebase-config.js";
import {
    collection, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const grid = document.getElementById("galleryGrid");

const lightbox     = document.getElementById("lightbox");
const lightboxImg  = document.getElementById("lightboxImg");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");

const ROWS_DESKTOP = [
    { cls: "grow grow--duo",            count: 2 }, // 2/3 + 1/3
    { cls: "grow grow--trio",           count: 3 }, // 3 равных
    { cls: "grow grow--duo grow--tall", count: 2 }, // 1/3 + 2/3
    { cls: "grow grow--trio",           count: 3 }, // 3 равных
];

const ROWS_TABLET = [
    { cls: "grow grow--duo",  count: 2 },
    { cls: "grow grow--pair", count: 2 },
    { cls: "grow grow--pair", count: 2 },
];

const tabletMQ = window.matchMedia("(min-width: 700px) and (max-width: 900px)");

function activeRows() {
    return tabletMQ.matches ? ROWS_TABLET : ROWS_DESKTOP;
}

let allPhotos = [];
let currentIndex = 0;

if (grid) {
    const q = query(collection(db, "gallery"), orderBy("order", "asc"));
    onSnapshot(q, (snap) => {
        const photos = snap.docs.map((d) => d.data()).filter((p) => p.imageUrl);
        allPhotos = photos;
        render(photos);
    });
}

function onBreakpointChange() {
    if (allPhotos.length) render(allPhotos);
}

if (tabletMQ.addEventListener) {
    tabletMQ.addEventListener("change", onBreakpointChange);
} else {
    tabletMQ.addListener(onBreakpointChange);   // Safari < 14
}

function render(photos) {
    grid.innerHTML = "";

    const rows = activeRows();

    let idx = 0;
    let r = 0;
    let globalIdx = 0;
    while (idx < photos.length) {
        const { cls, count } = rows[r % rows.length];
        const slice = photos.slice(idx, idx + count);
        idx += count;
        r++;

        const row = document.createElement("div");
        row.className = cls;

        slice.forEach((photo, i) => {
            const fig = document.createElement("figure");
            fig.className = "gcard";
            fig.setAttribute("data-reveal", "");
            fig.style.setProperty("--i", i);

            const img = document.createElement("img");
            img.src = photo.imageUrl;
            img.alt = photo.alt || "Точка Доступа";
            img.loading = "lazy";
            img.dataset.index = globalIdx++;

            fig.appendChild(img);
            row.appendChild(fig);
        });

        grid.appendChild(row);
    }

    initRevealAndLightbox();
}

function initRevealAndLightbox() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                e.target.classList.add("reveal");
                obs.unobserve(e.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    grid.querySelectorAll("[data-reveal]").forEach((el) => obs.observe(el));

    if (!lightbox) return;

    grid.querySelectorAll(".gcard img").forEach((img) => {
        img.addEventListener("click", () => {
            openLightboxAt(parseInt(img.dataset.index, 10));
        });
    });
}

function openLightboxAt(index) {
    if (!allPhotos.length) return;
    currentIndex = (index + allPhotos.length) % allPhotos.length;
    const photo = allPhotos[currentIndex];

    lightboxImg.src = photo.imageUrl;
    lightboxImg.alt = photo.alt || "Точка Доступа";
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
    updateNavVisibility();
}

function showNext() { openLightboxAt(currentIndex + 1); }
function showPrev() { openLightboxAt(currentIndex - 1); }

function updateNavVisibility() {
    const hide = allPhotos.length <= 1;
    if (lightboxPrev) lightboxPrev.style.display = hide ? "none" : "";
    if (lightboxNext) lightboxNext.style.display = hide ? "none" : "";
}

if (lightboxPrev) lightboxPrev.addEventListener("click", (e) => { e.stopPropagation(); showPrev(); });
if (lightboxNext) lightboxNext.addEventListener("click", (e) => { e.stopPropagation(); showNext(); });

document.addEventListener("keydown", (e) => {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;
    if (e.key === "ArrowRight") showNext();
    if (e.key === "ArrowLeft") showPrev();
});

(function () {
    if (!lightbox) return;
    let touchStartX = 0;
    let touchStartY = 0;
    const SWIPE_THRESHOLD = 40;

    lightbox.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener("touchend", (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
            dx < 0 ? showNext() : showPrev();
        }
    }, { passive: true });
})();