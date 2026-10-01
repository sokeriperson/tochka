import { saveLead } from "./leads.js";

document.addEventListener("DOMContentLoaded", () => {
    const overlay   = document.getElementById("bookingModal");
    const closeBtn  = document.getElementById("modalClose");
    const form      = document.getElementById("modalForm");
    const successEl = document.getElementById("modalSuccess");
    const nameEl    = document.getElementById("modal-f-name");
    const phoneEl   = document.getElementById("modal-f-phone");
    const c1        = document.getElementById("modal-c1");
    const c2        = document.getElementById("modal-c2");
    const submitBtn = document.getElementById("modal-submit");
    const statusEl  = document.getElementById("modal-status");

    const openBtns = document.querySelectorAll(".reserve-btn, .hero__cta-svg");

    if (!overlay || !form) return;

    function resetModalView() {
        form.classList.remove("is-hidden");
        form.style.display = "";
        successEl.classList.remove("is-visible");
        if (statusEl) { statusEl.textContent = ""; statusEl.className = "modal-status"; }
    }

    function openModal(e) {
        if (e) e.preventDefault();
        resetModalView();
        overlay.classList.add("is-open");
        document.body.style.overflow = "hidden";
        document.body.classList.add("modal-open");
        setTimeout(() => nameEl && nameEl.focus(), 200);
    }

    function closeModal() {
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
        document.body.classList.remove("modal-open");
    }

    window.showBookingSuccess = function () {
        form.style.display = "none";
        successEl.classList.add("is-visible");
        overlay.classList.add("is-open");
        document.body.style.overflow = "hidden";
        document.body.classList.add("modal-open");
    };

    openBtns.forEach((btn) => btn.addEventListener("click", openModal));
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
    });

    if (phoneEl) {
        const formatRu = (nat) => {
            let out = "+7";
            if (nat.length)      out += " (" + nat.slice(0, 3);
            if (nat.length >= 3) out += ")";
            if (nat.length > 3)  out += " " + nat.slice(3, 6);
            if (nat.length > 6)  out += "-" + nat.slice(6, 8);
            if (nat.length > 8)  out += "-" + nat.slice(8, 10);
            return out;
        };

        let nat = "";

        const render = () => {
            phoneEl.value = nat.length ? formatRu(nat) : "";
            const end = phoneEl.value.length;
            try { phoneEl.setSelectionRange(end, end); } catch (e) {}
        };

        phoneEl.setAttribute("inputmode", "tel");
        phoneEl.setAttribute("maxlength", "18");

        phoneEl.addEventListener("beforeinput", (e) => {
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

        phoneEl.addEventListener("paste", (e) => {
            e.preventDefault();
            const txt = (e.clipboardData || window.clipboardData).getData("text");
            let d = String(txt).replace(/\D/g, "");
            if (d.length > 10 && (d[0] === "7" || d[0] === "8")) d = d.slice(1);
            nat = d.slice(0, 10);
            render();
        });

        phoneEl.addEventListener("focus", () => {
            const end = phoneEl.value.length;
            try { phoneEl.setSelectionRange(end, end); } catch (e) {}
        });

        phoneEl.addEventListener("blur", () => {
            if (!nat.length) phoneEl.value = "";
        });

        form.addEventListener("reset", () => { nat = ""; });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = nameEl.value.trim();
        const phoneDigits = phoneEl.value.replace(/\D/g, "");

        [nameEl, phoneEl].forEach((f) => (f.style.borderBottomColor = ""));
        let ok = true;

        if (phoneDigits.length < 10) { phoneEl.style.borderBottomColor = "#ff3b42"; ok = false; }
        if (!c1.checked || !c2.checked) ok = false;

        if (!ok) {
            statusEl.textContent = "Заполните имя, телефон и подтвердите согласие.";
            statusEl.className = "modal-status err";
            return;
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Отправка...";

        try {
            await saveLead({
                type: "booking",
                source: "Модалка РЕЗЕРВ",
                name,
                phone: phoneEl.value.trim()
            });

            form.reset();
            statusEl.textContent = "";
            statusEl.className = "modal-status";
            window.showBookingSuccess();
        } catch (err) {
            console.error(err);
            statusEl.textContent = "Не получилось отправить. Попробуйте ещё раз.";
            statusEl.className = "modal-status err";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});