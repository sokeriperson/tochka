import { db } from "./firebase-config.js";
import {
    getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
    collection, query, orderBy, onSnapshot,
    addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const R2_WORKER_URL = "https://tochka-r2-upload.korolev-tt.workers.dev";
const R2_UPLOAD_TOKEN = "idkidkidkidkidkidkidkidkidkidkidkidkidkidkidk";

const BOOKINGS_COLLECTION = "bookings";

const auth = getAuth();

const loginBox   = document.getElementById("loginBox");
const panel      = document.getElementById("panel");
const emailEl    = document.getElementById("email");
const passEl     = document.getElementById("password");
const loginBtn   = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn  = document.getElementById("logoutBtn");

const videoFileEl  = document.getElementById("videoFile");
const posterFileEl = document.getElementById("posterFile");
const previewSecEl = document.getElementById("previewSec");
const linkEl       = document.getElementById("newLink");
const addBtn       = document.getElementById("addBtn");
const progressBox  = document.getElementById("progress");
const progressBar  = document.getElementById("progressBar");

const galleryFileEl     = document.getElementById("galleryFile");
const galleryAddBtn     = document.getElementById("galleryAddBtn");
const galleryProgress   = document.getElementById("galleryProgress");
const galleryProgressBar= document.getElementById("galleryProgressBar");
const galleryBody       = document.getElementById("galleryBody");
const galleryEmpty      = document.getElementById("galleryEmpty");

const reelsBody     = document.getElementById("reelsBody");
const reelsEmpty    = document.getElementById("reelsEmpty");
const bookingsBody  = document.getElementById("bookingsBody");
const bookingsEmpty = document.getElementById("bookingsEmpty");

const menuLabelEl    = document.getElementById("menuLabel");
const menuUnitEl     = document.getElementById("menuUnit");
const menuImageEl    = document.getElementById("menuImage");
const menuAddBtn     = document.getElementById("menuAddBtn");
const menuProgress   = document.getElementById("menuProgress");
const menuProgressBar= document.getElementById("menuProgressBar");
const menuListEl     = document.getElementById("menuList");
const menuEmptyEl    = document.getElementById("menuEmpty");
const bookingsCount  = document.getElementById("bookingsCount");
const vacanciesCount = document.getElementById("vacanciesCount");
const vacanciesBody  = document.getElementById("vacanciesBody");
const vacanciesEmpty = document.getElementById("vacanciesEmpty");
const menuImage2El   = document.getElementById("menuImage2");

let reels = [];
let gallery = [];
let editingId = null;
let unsubReels = null;
let unsubGallery = null;
let unsubBookings = null;
let menuSections = [];
let unsubMenu = null;
let openMenuId = null;

/* АВТОРИЗАЦИЯ */
loginBtn.addEventListener("click", async () => {
    loginError.textContent = "";
    try {
        await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
    } catch {
        loginError.textContent = "Неверный логин или пароль";
    }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    loginBox.style.display = user ? "none" : "flex";
    panel.style.display    = user ? "block" : "none";

    if (user) {
        subscribeReels();
        subscribeGallery();
        subscribeBookings();
        subscribeMenu();
    } else {
        if (unsubReels) unsubReels();
        if (unsubGallery) unsubGallery();
        if (unsubBookings) unsubBookings();
        if (unsubMenu) unsubMenu();
    }
});

/*ТАБЫ*/
document.querySelectorAll(".tabs__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tabs__btn").forEach((b) => b.classList.remove("is-active"));
        document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("is-active"));
        btn.classList.add("is-active");
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add("is-active");
    });
});

/*общий загрузчик*/
function supabaseUpload(file, onProgress) {
    return new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", R2_WORKER_URL);
        xhr.setRequestHeader("Authorization", `Bearer ${R2_UPLOAD_TOKEN}`);

        xhr.upload.addEventListener("progress", (e) => {
            if (onProgress && e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve({ url: data.url, path: data.path });
                } catch {
                    reject(new Error("Некорректный ответ от сервера загрузки"));
                }
            } else {
                reject(new Error(`Ошибка загрузки (${xhr.status})`));
            }
        };
        xhr.onerror = () => reject(new Error("Сетевая ошибка при загрузке"));
        xhr.send(fd);
    });
}

function grabVideoFrame(videoFile) {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.src = URL.createObjectURL(videoFile);

        video.addEventListener("loadeddata", () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 720;
            canvas.height = video.videoHeight || 1280;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(video.src);
                if (blob) resolve(new File([blob], "poster.jpg", { type: "image/jpeg" }));
                else reject(new Error("Не удалось создать кадр обложки"));
            }, "image/jpeg", 0.85);
        });

        video.addEventListener("error", () => reject(new Error("Не удалось прочитать видео для кадра")));
    });
}

/*РИЛСЫ*/
function subscribeReels() {
    const q = query(collection(db, "reels"), orderBy("order", "asc"));
    unsubReels = onSnapshot(q, (snap) => {
        reels = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderReels();
    });
}

function renderReels() {
    reelsBody.innerHTML = "";
    reelsEmpty.hidden = reels.length > 0;

    reels.forEach((reel, i) => {
        const tr = document.createElement("tr");
        const posterCell = reel.posterUrl
            ? `<img src="${reel.posterUrl}" alt="" class="reel-thumb__img" />`
            : (reel.videoUrl ? "🎬" : "—");
        const linkCell = reel.linkUrl
            ? `<a href="${escapeHtml(reel.linkUrl)}" target="_blank" rel="noopener" class="reel-link">открыть ↗</a>`
            : "—";

        tr.innerHTML = `
            <td data-label="#">${i + 1}</td>
            <td data-label="Превью"><div class="reel-thumb">${posterCell}</div></td>
            <td data-label="Ссылка">${linkCell}</td>
            <td data-label="Наведение">${reel.previewSeconds || 5} c</td>
            <td data-label="Активен">
                <input type="checkbox" data-action="toggle" data-id="${reel.id}" ${reel.active ? "checked" : ""} />
            </td>
            <td data-label="Действия">
                <div class="cell-actions">
                    <button class="btn-icon" data-action="edit" data-id="${reel.id}" aria-label="Редактировать">✎</button>
                    <button class="btn-icon" data-action="up" data-id="${reel.id}" aria-label="Выше">↑</button>
                    <button class="btn-icon" data-action="down" data-id="${reel.id}" aria-label="Ниже">↓</button>
                    <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${reel.id}" aria-label="Удалить">✕</button>
                </div>
            </td>`;
        reelsBody.appendChild(tr);

        if (editingId === reel.id) reelsBody.appendChild(buildEditRow(reel));
    });
}

function buildEditRow(reel) {
    const tr = document.createElement("tr");
    tr.className = "edit-row";
    tr.innerHTML = `
        <td colspan="6">
            <div class="edit-form">
                <label class="upload-field">
                    <span class="upload-field__label">Ссылка при клике</span>
                    <input type="url" class="field__input" data-f="link" value="${escapeHtml(reel.linkUrl || "")}" placeholder="https://..." />
                </label>
                <label class="upload-field upload-field--sm">
                    <span class="upload-field__label">Превью, сек</span>
                    <input type="number" class="field__input" data-f="sec" min="1" max="30" value="${reel.previewSeconds || 5}" />
                </label>
                <label class="upload-field">
                    <span class="upload-field__label">Новая обложка (по желанию)</span>
                    <input type="file" class="field__input" data-f="poster" accept="image/*" />
                </label>
                <label class="upload-field">
                    <span class="upload-field__label">Заменить видео (по желанию)</span>
                    <input type="file" class="field__input" data-f="video" accept="video/mp4,video/webm,video/quicktime" />
                </label>
                <div class="edit-form__actions">
                    <button class="btn-primary btn-primary--sm" data-action="save" data-id="${reel.id}">Сохранить</button>
                    <button class="btn-ghost btn-primary--sm" data-action="cancel">Отмена</button>
                    <span class="edit-form__status" data-f="status"></span>
                </div>
            </div>
        </td>`;
    return tr;
}

addBtn.addEventListener("click", async () => {
    const videoFile  = videoFileEl.files[0];
    const posterFile = posterFileEl.files[0];
    const linkUrl    = linkEl.value.trim();

    if (!videoFile) { alert("Выбери видеофайл"); return; }
    if (videoFile.size > 70 * 1024 * 1024) { alert("Видео больше 50 МБ — лимит бесплатного тарифа Supabase. Сожми файл."); return; }

    addBtn.disabled = true;
    progressBox.hidden = false;
    progressBar.style.width = "0%";

    try {
        const videoRes = await supabaseUpload(videoFile, (pct) => { progressBar.style.width = pct + "%"; });

        let posterUrl;
        if (posterFile) {
            const posterRes = await supabaseUpload(posterFile, null);
            posterUrl = posterRes.url;
        } else {
            const frameFile = await grabVideoFrame(videoFile);
            const posterRes = await supabaseUpload(frameFile, null);
            posterUrl = posterRes.url;
        }

        const maxOrder = reels.reduce((m, r) => Math.max(m, r.order || 0), 0);
        await addDoc(collection(db, "reels"), {
            videoUrl: videoRes.url,
            posterUrl,
            videoPath: videoRes.path,
            linkUrl: linkUrl || "",
            previewSeconds: Math.max(1, Math.min(30, Number(previewSecEl.value) || 5)),
            order: maxOrder + 1,
            active: true,
            createdAt: serverTimestamp()
        });

        videoFileEl.value = ""; posterFileEl.value = ""; previewSecEl.value = "5"; linkEl.value = "";
    } catch (err) {
        console.error(err); alert("Ошибка загрузки: " + err.message);
    } finally {
        addBtn.disabled = false; progressBox.hidden = true;
    }
});

reelsBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === "cancel") { editingId = null; renderReels(); return; }
    if (action === "edit")   { editingId = (editingId === id) ? null : id; renderReels(); return; }
    if (action === "save")   { await saveEdit(btn); return; }

    const idx = reels.findIndex((r) => r.id === id);
    if (idx === -1) return;

    if (action === "delete") await deleteDoc(doc(db, "reels", id));
    if (action === "up" && idx > 0) await swapOrder("reels", reels[idx], reels[idx - 1]);
    if (action === "down" && idx < reels.length - 1) await swapOrder("reels", reels[idx], reels[idx + 1]);
});

async function saveEdit(saveBtn) {
    const id  = saveBtn.dataset.id;
    const row = saveBtn.closest(".edit-form");
    const statusEl = row.querySelector('[data-f="status"]');

    const linkUrl    = row.querySelector('[data-f="link"]').value.trim();
    const secVal     = Number(row.querySelector('[data-f="sec"]').value) || 5;
    const posterFile = row.querySelector('[data-f="poster"]').files[0];
    const videoFile  = row.querySelector('[data-f="video"]').files[0];

    if (videoFile && videoFile.size > 50 * 1024 * 1024) { statusEl.textContent = "Видео больше 50 МБ"; return; }

    saveBtn.disabled = true;
    statusEl.textContent = "Сохранение…";

    try {
        const patch = { linkUrl, previewSeconds: Math.max(1, Math.min(30, secVal)) };

        if (videoFile) {
            const vr = await supabaseUpload(videoFile, null);
            patch.videoUrl = vr.url;
            patch.videoPath = vr.path;
            if (!posterFile) {
                const frameFile = await grabVideoFrame(videoFile);
                const pr = await supabaseUpload(frameFile, null);
                patch.posterUrl = pr.url;
            }
        }
        if (posterFile) {
            const pr = await supabaseUpload(posterFile, null);
            patch.posterUrl = pr.url;
        }

        await updateDoc(doc(db, "reels", id), patch);
        editingId = null; renderReels();
    } catch (err) {
        console.error(err); statusEl.textContent = "Ошибка: " + err.message; saveBtn.disabled = false;
    }
}

function grabVideoFrameFromUrl(url) {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous"; // без CORS-заголовка на бакете canvas.toBlob упадёт с "tainted canvas"
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        video.src = url;

        video.addEventListener("loadeddata", () => {
            video.currentTime = 0.05;
        }, { once: true });

        video.addEventListener("seeked", () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 720;
            canvas.height = video.videoHeight || 1280;
            canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                blob
                    ? resolve(new File([blob], "poster.jpg", { type: "image/jpeg" }))
                    : reject(new Error("canvas.toBlob вернул null — похоже, бакет режет CORS"));
            }, "image/jpeg", 0.85);
        }, { once: true });

        video.addEventListener("error", () => reject(new Error("видео не загрузилось: " + url)));
    });
}

const backfillPostersBtn = document.getElementById("backfillPostersBtn");
if (backfillPostersBtn) {
    backfillPostersBtn.addEventListener("click", async () => {
        const missing = reels.filter((r) => !r.posterUrl && r.videoUrl);
        if (!missing.length) { alert("У всех рилсов уже есть обложка"); return; }
        if (!confirm(`Без обложки: ${missing.length} рилсов. Сгенерировать сейчас?`)) return;

        backfillPostersBtn.disabled = true;
        let ok = 0, failed = 0;

        for (const reel of missing) {
            try {
                const frameFile = await grabVideoFrameFromUrl(reel.videoUrl);
                const res = await supabaseUpload(frameFile, null);
                await updateDoc(doc(db, "reels", reel.id), { posterUrl: res.url });
                ok++;
            } catch (err) {
                console.error(`Обложка не сделана для ${reel.id}:`, err);
                failed++;
            }
        }

        backfillPostersBtn.disabled = false;
        alert(`Готово. Успешно: ${ok}, с ошибкой: ${failed}${failed ? " (см. консоль)" : ""}`);
    });
}

reelsBody.addEventListener("change", async (e) => {
    if (e.target.dataset.action !== "toggle") return;
    await updateDoc(doc(db, "reels", e.target.dataset.id), { active: e.target.checked });
});

/*ГАЛЕРЕЯ*/
function subscribeGallery() {
    const q = query(collection(db, "gallery"), orderBy("order", "asc"));
    unsubGallery = onSnapshot(q, (snap) => {
        gallery = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderGallery();
    });
}

function renderGallery() {
    galleryBody.innerHTML = "";
    galleryEmpty.hidden = gallery.length > 0;

    gallery.forEach((ph, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="#">${i + 1}</td>
            <td data-label="Фото"><div class="reel-thumb"><img src="${ph.imageUrl}" alt="" class="reel-thumb__img" /></div></td>
            <td data-label="Действия">
                <div class="cell-actions">
                    <button class="btn-icon" data-gaction="up" data-id="${ph.id}" aria-label="Выше">↑</button>
                    <button class="btn-icon" data-gaction="down" data-id="${ph.id}" aria-label="Ниже">↓</button>
                    <button class="btn-icon btn-icon--danger" data-gaction="delete" data-id="${ph.id}" aria-label="Удалить">✕</button>
                </div>
            </td>`;
        galleryBody.appendChild(tr);
    });
}

galleryAddBtn.addEventListener("click", async () => {
    const files = Array.from(galleryFileEl.files);
    if (!files.length) { alert("Выбери фото"); return; }

    galleryAddBtn.disabled = true;
    galleryProgress.hidden = false;

    try {
        let maxOrder = gallery.reduce((m, p) => Math.max(m, p.order || 0), 0);
        let done = 0;

        for (const file of files) {
            const res = await supabaseUpload(file, null);
            maxOrder += 1;
            await addDoc(collection(db, "gallery"), {
                imageUrl: res.url,
                imagePath: res.path,
                order: maxOrder,
                createdAt: serverTimestamp()
            });
            done += 1;
            galleryProgressBar.style.width = Math.round((done / files.length) * 100) + "%";
        }

        galleryFileEl.value = "";
    } catch (err) {
        console.error(err); alert("Ошибка загрузки: " + err.message);
    } finally {
        galleryAddBtn.disabled = false;
        galleryProgress.hidden = true;
        galleryProgressBar.style.width = "0%";
    }
});

galleryBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-gaction]");
    if (!btn) return;
    const { gaction, id } = btn.dataset;
    const idx = gallery.findIndex((p) => p.id === id);
    if (idx === -1) return;

    if (gaction === "delete") await deleteDoc(doc(db, "gallery", id));
    if (gaction === "up" && idx > 0) await swapOrder("gallery", gallery[idx], gallery[idx - 1]);
    if (gaction === "down" && idx < gallery.length - 1) await swapOrder("gallery", gallery[idx], gallery[idx + 1]);
});

async function swapOrder(coll, a, b) {
    await updateDoc(doc(db, coll, a.id), { order: b.order });
    await updateDoc(doc(db, coll, b.id), { order: a.order });
}

/*ЗАЯВКИ*/
function subscribeBookings() {
    const q = query(collection(db, BOOKINGS_COLLECTION), orderBy("createdAt", "desc"));
    unsubBookings = onSnapshot(q, (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const bookings  = all.filter((b) => (b.type || "booking") === "booking");
        const vacancies = all.filter((b) => b.type === "vacancy");

        renderBookings(bookings);
        renderVacancies(vacancies);
    });
}

function renderBookings(list) {
    bookingsBody.innerHTML = "";
    bookingsEmpty.hidden = list.length > 0;
    if (bookingsCount) bookingsCount.textContent = list.length ? `(${list.length})` : "";

    list.forEach((b) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="Дата">${formatDate(b.createdAt)}</td>
            <td data-label="Имя">${escapeHtml(b.name || "—")}</td>
            <td data-label="Телефон">${phoneLink(b.phone)}</td>
            <td data-label="Источник" class="muted">${escapeHtml(b.source || "—")}</td>
            <td data-label="Действия">
                <div class="cell-actions">
                    <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${b.id}" aria-label="Удалить">✕</button>
                </div>
            </td>`;
        bookingsBody.appendChild(tr);
    });
}

function renderVacancies(list) {
    vacanciesBody.innerHTML = "";
    vacanciesEmpty.hidden = list.length > 0;
    if (vacanciesCount) vacanciesCount.textContent = list.length ? `(${list.length})` : "";

    list.forEach((v) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td data-label="Дата">${formatDate(v.createdAt)}</td>
            <td data-label="Имя">${escapeHtml(v.name || "—")}</td>
            <td data-label="Телефон">${phoneLink(v.phone)}</td>
            <td data-label="Контакт">${escapeHtml(v.contact || "—")}</td>
            <td data-label="Комментарий" class="muted">${escapeHtml(v.comment || "—")}</td>
            <td data-label="Действия">
                <div class="cell-actions">
                    <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${v.id}" aria-label="Удалить">✕</button>
                </div>
            </td>`;
        vacanciesBody.appendChild(tr);
    });
}

[bookingsBody, vacanciesBody].forEach((tbody) => {
    tbody.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-action='delete']");
        if (!btn) return;
        if (!confirm("Удалить заявку?")) return;
        await deleteDoc(doc(db, BOOKINGS_COLLECTION, btn.dataset.id));
    });
});

function phoneLink(phone) {
    if (!phone) return "—";
    const digits = String(phone).replace(/\D/g, "");
    return `<a href="tel:+${digits}" class="reel-link">${escapeHtml(phone)}</a>`;
}

/*УТИЛИТЫ*/
function formatDate(ts) {
    if (!ts || !ts.toDate) return "—";
    const d = ts.toDate();
    return d.toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit"
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

/*МЕНЮ — разделы, позиции, прайс-картинки*/
function subscribeMenu() {
    const q = query(collection(db, "menu"), orderBy("order", "asc"));
    unsubMenu = onSnapshot(q, (snap) => {
        menuSections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderMenu();
    });
}

/* Формат строки:
   Название | Original name | 750 мл | 5 900 */
function itemsToText(items) {
    return (items || []).map((it) => {
        const parts = [it.name || "", it.orig || ""];
        if (it.vol) parts.push(it.vol);
        parts.push(it.price || "");
        return parts.join(" | ");
    }).join("\n");
}

function textToItems(text) {
    return text.split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const p = line.split("|").map((s) => s.trim());
            // 4 части → есть объём; 3 части → объём не указан
            if (p.length >= 4) return { name: p[0], orig: p[1], vol: p[2], price: p[3] };
            if (p.length === 3) return { name: p[0], orig: p[1], price: p[2] };
            if (p.length === 2) return { name: p[0], price: p[1] };
            return { name: p[0], price: "" };
        });
}

function renderMenu() {
    menuListEl.innerHTML = "";
    menuEmptyEl.hidden = menuSections.length > 0;

    menuSections.forEach((sec, i) => {
        const el = document.createElement("div");
        el.className = "msec" + (openMenuId === sec.id ? " is-open" : "");

        const badge = sec.image
            ? `<span class="msec__badge msec__badge--img">кнопка + картинка</span>`
            : `<span class="msec__badge">подпункт</span>`;

        el.innerHTML = `
                        <div class="msec__head" data-maction="toggle" data-id="${sec.id}">
                <span class="msec__title">${i + 1}. ${escapeHtml(sec.label || "Без названия")}</span>
                <span class="msec__badges">
                    ${badge}
                    <span class="msec__badge">${(sec.items || []).length} поз.</span>
                </span>
                <span class="msec__ctrls">
                    <button class="btn-icon" data-maction="up"   data-id="${sec.id}" aria-label="Выше">↑</button>
                    <button class="btn-icon" data-maction="down" data-id="${sec.id}" aria-label="Ниже">↓</button>
                    <button class="btn-icon btn-icon--danger" data-maction="delete" data-id="${sec.id}" aria-label="Удалить">✕</button>
                </span>
            </div>

            <div class="msec__body">
                <div class="msec__grid">
                    <label class="upload-field">
                        <span class="upload-field__label">Название раздела</span>
                        <input type="text" class="field__input" data-m="label" value="${escapeHtml(sec.label || "")}" />
                    </label>
                    <label class="upload-field">
                        <span class="upload-field__label">Общий объём</span>
                        <input type="text" class="field__input" data-m="unit" value="${escapeHtml(sec.unit || "")}" placeholder="50 мл" />
                    </label>
                                        <label class="upload-field">
                        <span class="upload-field__label">Заменить прайс-картинку</span>
                        <input type="file" class="field__input" data-m="image" accept="image/*" />
                        ${sec.image ? `<img src="${sec.image}" alt="" class="msec__thumb" />` : ""}
                    </label>
                    <label class="upload-field">
                        <span class="upload-field__label">Вторая картинка (стрелки-листалка)</span>
                        <input type="file" class="field__input" data-m="image2" accept="image/*" />
                        ${sec.image2 ? `<img src="${sec.image2}" alt="" class="msec__thumb" />` : ""}
                    </label>
                </div>

                <span class="upload-field__label">Позиции — по одной в строке</span>
                <textarea class="msec__items" data-m="items" spellcheck="false">${escapeHtml(itemsToText(sec.items))}</textarea>
                <p class="menu-hint">
                    Формат: <b>Название | Original name | объём | цена</b><br>
                    Объём можно опустить, если задан общий: <b>Мартини Фиеро | Martini Fiero | 390</b>
                </p>

                <div class="msec__actions">
                    <button class="btn-primary btn-primary--sm" data-maction="save" data-id="${sec.id}">Сохранить</button>
                    ${sec.image ? `<button class="btn-ghost btn-primary--sm" data-maction="unimage" data-id="${sec.id}">Убрать картинку</button>` : ""}
                    ${sec.image2 ? `<button class="btn-ghost btn-primary--sm" data-maction="unimage2" data-id="${sec.id}">Убрать вторую</button>` : ""}
                    <span class="msec__status" data-m="status"></span>
                </div>
                
            
            </div>`;

        menuListEl.appendChild(el);
    });
}

menuAddBtn.addEventListener("click", async () => {
    const label = menuLabelEl.value.trim();
    if (!label) { alert("Введи название раздела"); return; }

    const imgFile = menuImageEl.files[0];

    menuAddBtn.disabled = true;
    menuProgress.hidden = false;
    menuProgressBar.style.width = "30%";

    try {
        const payload = {
            label,
            unit: menuUnitEl.value.trim(),
            items: [],
            order: menuSections.reduce((m, s) => Math.max(m, s.order || 0), 0) + 1,
            createdAt: serverTimestamp()
        };

        if (imgFile) {
            const res = await supabaseUpload(imgFile, null);
            payload.image = res.url;
            payload.imagePath = res.path;
        }

        const imgFile2 = menuImage2El ? menuImage2El.files[0] : null;
        if (imgFile2) {
            const res2 = await supabaseUpload(imgFile2, null);
            payload.image2 = res2.url;
            payload.imagePath2 = res2.path;
        }

        menuProgressBar.style.width = "90%";
        await addDoc(collection(db, "menu"), payload);

        menuLabelEl.value = ""; menuUnitEl.value = ""; menuImageEl.value = "";
        if (menuImage2El) menuImage2El.value = "";
    } catch (err) {
        console.error(err); alert("Ошибка: " + err.message);
    } finally {
        menuAddBtn.disabled = false;
        menuProgress.hidden = true;
        menuProgressBar.style.width = "0%";
    }
});

menuListEl.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-maction]");
    if (!el) return;

    const { maction, id } = el.dataset;
    const idx = menuSections.findIndex((s) => s.id === id);

    if (maction === "toggle") {
        if (e.target.closest("button[data-maction]")) return;
        openMenuId = (openMenuId === id) ? null : id;
        renderMenu();
        return;
    }

    if (maction === "save")    { await saveMenuSection(el, id); return; }
    if (maction === "unimage") {
        await updateDoc(doc(db, "menu", id), { image: "", imagePath: "" });
        return;
    }
    if (maction === "unimage2") {
        await updateDoc(doc(db, "menu", id), { image2: "", imagePath2: "" });
        return;
    }
    if (maction === "delete") {
        if (!confirm("Удалить раздел вместе со всеми позициями?")) return;
        await deleteDoc(doc(db, "menu", id));
        return;
    }
    if (idx === -1) return;
    if (maction === "up"   && idx > 0)                        await swapOrder("menu", menuSections[idx], menuSections[idx - 1]);
    if (maction === "down" && idx < menuSections.length - 1)  await swapOrder("menu", menuSections[idx], menuSections[idx + 1]);
});

async function saveMenuSection(btn, id) {
    const body     = btn.closest(".msec__body");
    const statusEl = body.querySelector('[data-m="status"]');

    const label   = body.querySelector('[data-m="label"]').value.trim();
    const unit    = body.querySelector('[data-m="unit"]').value.trim();
    const items   = textToItems(body.querySelector('[data-m="items"]').value);
    const imgFile  = body.querySelector('[data-m="image"]').files[0];
    const imgFile2El = body.querySelector('[data-m="image2"]');
    const imgFile2 = imgFile2El ? imgFile2El.files[0] : null;

    if (!label) { statusEl.textContent = "Название не может быть пустым"; return; }

    btn.disabled = true;
    statusEl.textContent = "Сохранение…";

    try {
        const patch = { label, unit, items };

        if (imgFile) {
            const res = await supabaseUpload(imgFile, null);
            patch.image = res.url;
            patch.imagePath = res.path;
        }

        if (imgFile2) {
            const res2 = await supabaseUpload(imgFile2, null);
            patch.image2 = res2.url;
            patch.imagePath2 = res2.path;
        }
        await updateDoc(doc(db, "menu", id), patch);
        statusEl.textContent = "Сохранено ✓";
        setTimeout(() => { statusEl.textContent = ""; }, 2000);
    } catch (err) {
        console.error(err);
        statusEl.textContent = "Ошибка: " + err.message;
    } finally {
        btn.disabled = false;
    }
}