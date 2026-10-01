import { db } from "./firebase-config.js";
import {
    collection, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const track    = document.getElementById("thumbsTrack");
const section  = track ? track.closest(".thumbs") : null;
const prevBtn  = document.getElementById("thumbsPrev");
const nextBtn  = document.getElementById("thumbsNext");

const mqMobile = window.matchMedia("(max-width: 900px)");

const WARM_CONCURRENCY = 2;
const WARM_TIMEOUT = 8000;

let io = null;
let renderAbort = null;
let lastReelsKey = null;
let lastReels = null;

const readyMap = new WeakMap();
const warmQueue = [];
let warmActive = 0;
let warmAllowed = document.readyState === "complete";

if (!warmAllowed) {
    window.addEventListener("load", () => {
        warmAllowed = true;
        pumpWarm();
    }, { once: true });
}

if (section) {
    section.addEventListener("pointerenter", () => {
        if (mqMobile.matches) return;
        warmAllowed = true;
        pumpWarm();
    });
}

function loadVideo(video) {
    if (readyMap.has(video)) return readyMap.get(video);

    video.dataset.loaded = "1";
    video.preload = "auto";

    const ready = new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };
        video.addEventListener("canplaythrough", finish, { once: true });
        video.addEventListener("error", finish, { once: true });
        setTimeout(finish, WARM_TIMEOUT);
    });
    readyMap.set(video, ready);

    if (!video.dataset.hasPoster) {
        video.addEventListener("loadedmetadata", () => {
            try { video.currentTime = 0.05; } catch (e) {}
        }, { once: true });
    }

    video.load();
    return ready;
}

function warm(video) {
    if (!video || readyMap.has(video) || video.dataset.queued === "1") return;
    video.dataset.queued = "1";
    warmQueue.push(video);
    pumpWarm();
}

function pumpWarm() {
    if (!warmAllowed) return;
    while (warmActive < WARM_CONCURRENCY && warmQueue.length) {
        const video = warmQueue.shift();
        if (!video.isConnected || readyMap.has(video)) continue;
        warmActive++;
        loadVideo(video).then(() => {
            warmActive--;
            pumpWarm();
        });
    }
}

function releaseVideos() {
    warmQueue.length = 0;
    track.querySelectorAll("video").forEach((v) => {
        v.pause();
        v.querySelectorAll("source").forEach((s) => s.remove());
        v.removeAttribute("src");
        try { v.load(); } catch (e) {}
    });
}

if (track) {
    const q = query(collection(db, "reels"), orderBy("order", "asc"));
    onSnapshot(q, (snap) => {
        const reels = snap.docs
            .map((d) => d.data())
            .filter((r) => r.active !== false && r.videoUrl);

        const key = reels.map(r => r.videoUrl + '|' + r.order).join(',');
        if (key === lastReelsKey) return;
        lastReelsKey = key;

        lastReels = reels;
        renderReels(reels);
    });
}

function buildReelCard(reel, isClone = false) {
    const card = document.createElement("div");
    card.className = "thumbs__item thumbs__item--reel";

    const skeleton = document.createElement("div");
    skeleton.className = "reel-skeleton";

    const video = document.createElement("video");
    video.className = "reel-video";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("muted", "");
    video.controls = false;
    video.disablePictureInPicture = true;
    video.setAttribute("controlslist", "nodownload noplaybackrate noremoteplayback");

    const hasPoster = Boolean(reel.posterUrl) && !mqMobile.matches;

    if (mqMobile.matches) {
        video.preload = "none";
    } else {
        video.preload = hasPoster ? "none" : "metadata";
    }

    video.dataset.src = reel.videoUrl;
    if (hasPoster) {
        video.dataset.hasPoster = "1";
        card.classList.add("has-poster");
    }

    let posterEl = null;
    if (hasPoster) {
        posterEl = document.createElement("img");
        posterEl.className = "reel-poster";
        posterEl.alt = "";
        posterEl.decoding = "async";
        posterEl.addEventListener("load",  () => skeleton.remove(), { once: true });
        posterEl.addEventListener("error", () => skeleton.remove(), { once: true });
        posterEl.src = reel.posterUrl;
    } else if (!isClone && !mqMobile.matches) {
        video.addEventListener("loadedmetadata", () => {
            try { video.currentTime = 0.05; } catch (e) {}
        }, { once: true });
    }

    const source = document.createElement("source");
    source.src = reel.videoUrl;
    source.type = "video/mp4";
    video.appendChild(source);

    ["loadeddata", "canplay", "playing", "seeked", "error"].forEach((ev) => {
        video.addEventListener(ev, () => skeleton.remove(), { once: true });
    });

    card.appendChild(skeleton);
    card.appendChild(video);
    if (posterEl) card.appendChild(posterEl);

    attachPreview(card, video, posterEl, Number(reel.previewSeconds) || 5, reel.linkUrl || "");

    return { card, video };
}

function renderReels(reels) {
    if (io) { io.disconnect(); io = null; }
    if (renderAbort) renderAbort.abort();
    renderAbort = new AbortController();

    resetArrows();
    releaseVideos();

    track.innerHTML = "";
    if (!reels.length) return;

    const N = reels.length;

    const CARD_W = mqMobile.matches ? window.innerWidth : 350;
    const needed = Math.ceil(window.innerWidth / CARD_W) + 2;
    const CLONES = Math.min(
        N * Math.max(1, Math.ceil(needed / N)),
        N * 3
    );

    function repeat(arr, count) {
        const out = [];
        for (let i = 0; i < count; i++) out.push(arr[i % arr.length]);
        return out;
    }

    const headClones = repeat(reels, CLONES);
    const middle     = reels;
    const tailClones = repeat(reels, CLONES);

    headClones.forEach((reel) => track.appendChild(buildReelCard(reel, true).card));
    middle.forEach((reel)     => track.appendChild(buildReelCard(reel, false).card));
    tailClones.forEach((reel) => track.appendChild(buildReelCard(reel, true).card));

    initInfiniteSlider(N, CLONES, renderAbort.signal);
    initReelObserver();
}

let prevRef = prevBtn;
let nextRef = nextBtn;

function resetArrows() {
    if (prevRef && prevRef.parentNode) {
        const fresh = prevRef.cloneNode(true);
        prevRef.parentNode.replaceChild(fresh, prevRef);
        prevRef = fresh;
    }
    if (nextRef && nextRef.parentNode) {
        const fresh = nextRef.cloneNode(true);
        nextRef.parentNode.replaceChild(fresh, nextRef);
        nextRef = fresh;
    }
}

function attachPreview(card, video, posterEl, limit, linkUrl) {
    let token = 0;

    async function play() {
        const my = ++token;
        loadVideo(video);

        try {
            await video.play();
        } catch (e) {
            return;
        }
        if (my !== token) { video.pause(); return; }

        card.classList.add("is-playing");
        if (posterEl) posterEl.classList.add("is-hidden");
    }

    function stop() {
        token++;
        video.pause();
        card.classList.remove("is-playing");
        if (posterEl) posterEl.classList.remove("is-hidden");
        if (video.readyState >= 1) {
            try { video.currentTime = 0; } catch (e) {}
        }
    }

    video.addEventListener("timeupdate", () => {
        if (mqMobile.matches) return;
        if (limit && video.currentTime >= limit) {
            try { video.currentTime = 0; } catch (e) {}
        }
    });

    card.addEventListener("mouseenter", () => {
        if (mqMobile.matches) return;
        play();
    });

    card.addEventListener("mouseleave", () => {
        if (mqMobile.matches) return;
        stop();
    });

    card.addEventListener("click", () => {
        if (!linkUrl) return;
        window.open(linkUrl, "_blank", "noopener");
    });
}

function initReelObserver() {
    if (!("IntersectionObserver" in window)) return;

    const videos = track.querySelectorAll(".reel-video");
    if (!videos.length) return;

    const mobile = mqMobile.matches;

    io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const video = entry.target;

            if (!entry.isIntersecting) {
                if (mobile) video.pause();
                return;
            }

            if (!mobile) {
                warm(video);
                return;
            }

            loadVideo(video);

            if (entry.intersectionRatio >= 0.5) {
                const p = video.play();
                if (p && p.catch) p.catch((e) => console.warn('play failed:', e.name, video.readyState));
            } else {
                video.pause();
            }
        });
    }, {
        threshold: [0, 0.5],
        rootMargin: mobile ? "0px 100% 0px 100%" : "400px 0px 400px 0px"
    });

    videos.forEach((v) => io.observe(v));
}

function initInfiniteSlider(N, CLONES, signal) {
    const items = Array.from(track.querySelectorAll(".thumbs__item"));
    let idx = CLONES;
    let animating = false;
    let unlockTimer = null;

    function visibleCount() {
        const first = items[0];
        if (!first) return 1;
        const w = first.getBoundingClientRect().width + gap();
        if (!w) return 1;
        return Math.max(1, Math.ceil(track.clientWidth / w));
    }

    function preloadAround(centerIdx) {
        const ahead = mqMobile.matches ? 2 : visibleCount() + 1;

        for (let i = centerIdx; i <= centerIdx + ahead; i++) {
            const item = items[i];
            if (item) warm(item.querySelector(".reel-video"));
        }

        const back = items[centerIdx - 1];
        if (back) warm(back.querySelector(".reel-video"));
    }

    let cachedGap = 0;
    let offsets = [];

    function gap() { return cachedGap; }

    function measure() {
        cachedGap = parseFloat(getComputedStyle(track).gap) || 0;
        const w = items[0] ? items[0].getBoundingClientRect().width : 0;
        offsets = new Array(items.length + 1);
        offsets[0] = 0;
        for (let k = 0; k < items.length; k++) {
            offsets[k + 1] = offsets[k] + w + cachedGap;
        }
    }

    function offsetFor(i) {
        return offsets[Math.max(0, Math.min(i, offsets.length - 1))] || 0;
    }

    function setX(i, animate) {
        track.style.transition = animate
            ? "transform 0.4s cubic-bezier(.4,0,.2,1)"
            : "none";
        track.style.transform = `translateX(-${offsetFor(i)}px)`;
    }

    function unlockSoon() {
        clearTimeout(unlockTimer);
        unlockTimer = setTimeout(() => { animating = false; }, 600);
    }

    function go(dir) {
        if (animating) return;
        animating = true;
        idx += dir;
        preloadAround(idx);
        setX(idx, true);
        unlockSoon();
    }

    track.addEventListener("transitionend", (e) => {
        if (e.target !== track || e.propertyName !== "transform") return;

        if (idx >= N + CLONES) {
            idx -= N;
            setX(idx, false);
        } else if (idx < CLONES) {
            idx += N;
            setX(idx, false);
        }
        clearTimeout(unlockTimer);
        animating = false;
    }, { signal });

    bindTap(prevRef, () => go(-1), signal);
    bindTap(nextRef, () => go(1), signal);

    let touchStartX = 0;
    let touchStartY = 0;
    let touchDeltaX = 0;
    let isHorizontal = null;

    track.addEventListener("touchstart", (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchDeltaX = 0;
        isHorizontal = null;
    }, { passive: true, signal });

    track.addEventListener("touchmove", (e) => {
        touchDeltaX = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;

        if (isHorizontal === null && (Math.abs(touchDeltaX) > 8 || Math.abs(dy) > 8)) {
            isHorizontal = Math.abs(touchDeltaX) > Math.abs(dy);
        }
    }, { passive: true, signal });

    track.addEventListener("touchend", () => {
        const threshold = 40;
        if (isHorizontal === false) return;
        if (touchDeltaX < -threshold) go(1);
        else if (touchDeltaX > threshold) go(-1);
    }, { signal });

    let resizeTimer = null;
    function reset() {
        measure();
        setX(idx, false);
        preloadAround(idx);
    }
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(reset, 150);
    }, { signal });

    measure();
    setX(idx, false);
    preloadAround(idx);
}

function bindTap(el, handler, signal) {
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
    }, { passive: true, signal });

    el.addEventListener('touchmove', (e) => {
        const t = e.changedTouches[0];
        if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
            moved = true;
        }
    }, { passive: true, signal });

    el.addEventListener('touchend', (e) => {
        if (moved) return;

        handledByTouch = true;
        e.preventDefault();
        handler(e);
        setTimeout(() => { handledByTouch = false; }, 400);
    }, { passive: false, signal });

    el.addEventListener('click', (e) => {
        if (handledByTouch) return;
        handler(e);
    }, { signal });
}