
(function () {
    var MOVE_THRESHOLD = 10;

    function bindTapClick(el) {
        if (!el) return;
        var startX = 0, startY = 0;

        el.addEventListener('touchstart', function (e) {
            var t = e.changedTouches[0];
            startX = t.clientX;
            startY = t.clientY;
        }, { passive: true });

        el.addEventListener('touchend', function (e) {
            var t = e.changedTouches[0];
            var dx = Math.abs(t.clientX - startX);
            var dy = Math.abs(t.clientY - startY);
            if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) return;

            e.preventDefault();
            el.click();
        }, { passive: false });
    }

    document
        .querySelectorAll('.reserve-btn, .hero__cta-mobile')
        .forEach(bindTapClick);
})();