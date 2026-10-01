const LEAD_ENDPOINT = "https://tochka-club.ru/send-lead.php";

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(label + ": таймаут " + ms + " мс")), ms)
        )
    ]);
}

export async function saveLead(data) {
    const payload = {
        type:    data.type || "booking",
        source:  data.source || document.title,
        name:    (data.name    || "").trim(),
        phone:   (data.phone   || "").trim(),
        contact: (data.contact || "").trim(),
        comment: (data.comment || "").trim(),
        page:    location.pathname,
        createdAtClient: new Date().toISOString()
    };

    const debug = new URLSearchParams(location.search).has("debug");
    const results = {};

    const serverTask = withTimeout(
        fetch(LEAD_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(async (r) => {
            const text = await r.text();
            let json;
            try { json = JSON.parse(text); }
            catch { throw new Error("ответ не JSON (HTTP " + r.status + "): " + text.slice(0, 200)); }
            if (!json.ok) throw new Error(JSON.stringify(json.results || json));
            return json;
        }),
        20000,
        "server"
    )
        .then((json) => { results.server = "OK: " + JSON.stringify(json.results); })
        .catch((err) => { results.server = "FAIL: " + err.message; });

    const firestoreTask = withTimeout(saveToFirestore(payload), 15000, "firestore")
        .then(() => { results.firestore = "OK"; })
        .catch((err) => { results.firestore = "FAIL: " + err.message; });

    await Promise.allSettled([serverTask, firestoreTask]);

    if (debug) showDebugPanel(results);

    const delivered = Object.values(results).some((v) => String(v).startsWith("OK"));
    if (!delivered) {
        throw new Error("Заявка не доставлена: " + JSON.stringify(results));
    }

    return true;
}

async function saveToFirestore(payload) {
    const { db } = await import("./firebase-config.js");
    const { collection, addDoc, serverTimestamp } = await import(
        "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js"
        );

    await addDoc(collection(db, "bookings"), {
        ...payload,
        createdAt: serverTimestamp()
    });
}

function showDebugPanel(results) {
    const el = document.createElement("div");
    el.style.cssText =
        "position:fixed;bottom:0;left:0;right:0;z-index:999999;" +
        "background:#000;color:#0f0;font:12px monospace;padding:12px;" +
        "white-space:pre-wrap;max-height:50vh;overflow:auto;";
    el.textContent = "LEAD DEBUG:\n" + JSON.stringify(results, null, 2);
    document.body.appendChild(el);
}

window.saveLead = saveLead;