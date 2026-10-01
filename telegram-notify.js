var TELEGRAM_PROXY_URL = 'https://tochka-telegram-proxy.korolev-tt.workers.dev';

function notifyTelegram(payload) {
    var type = (payload && payload.type) || 'booking';

    if (type === 'vacancy') {
        return Promise.resolve();
    }

    return fetch(TELEGRAM_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type:    type,                            // booking
            source:  payload.source  || '',
            name:    payload.name    || '',
            phone:   payload.phone   || '',
            contact: payload.contact || '',
            comment: payload.comment || '',
            page:    payload.page    || location.pathname
        })
    }).catch(function (err) {
        console.error('Не удалось отправить уведомление в Telegram:', err);
    });
}

window.notifyTelegram = notifyTelegram;