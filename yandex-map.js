ymaps.ready(function () {
    var el = document.getElementById('footerMap');
    if (!el) return;

    var CENTER = [54.71373910817075, 20.505736971414482];

    var map = new ymaps.Map(el, {
        center: CENTER,
        zoom: 17,
        controls: []
    }, {
        suppressMapOpenBlock: true
    });

    map.controls.add('zoomControl', {
        size: 'small',
        position: { left: 16, top: 16, bottom: 'auto' }
    });

    map.behaviors.disable('scrollZoom');

    function applyDark() {
        var panes = el.querySelectorAll('[class*="ground-pane"]');
        panes.forEach(function (p) {
            p.style.filter = 'invert(1) hue-rotate(180deg) grayscale(1) brightness(0.9) contrast(0.9)';
        });
    }
    map.events.add('boundschange', applyDark);
    setTimeout(applyDark, 300);

    var PinLayout = ymaps.templateLayoutFactory.createClass(
        '<div class="map-pin"><img class="map-pin__img" src="img/Group%202.png" alt="Точка доступа"></div>'
    );

    var pin = new ymaps.Placemark(CENTER, {}, {
        iconLayout: PinLayout,
        iconShape: { type: 'Circle', coordinates: [0, 0], radius: 27 }
    });

    map.geoObjects.add(pin);

    pin.events.add('click', function () {
        window.open('https://yandex.kz/maps/org/tochka_dostupa/25286136012/?indoorLevel=1&ll=20.505520%2C54.713824&z=17', '_blank', 'noopener');
    });

    function sizePin() {
        var scale = Math.pow(2, map.getZoom() - 16);
        scale = Math.max(0.6, Math.min(scale, 2.4));
        el.style.setProperty('--pin-scale', scale);

        pin.options.set('iconShape', {
            type: 'Circle',
            coordinates: [0, 0],
            radius: 27 * scale
        });
    }
    map.events.add('boundschange', sizePin);
    sizePin();

    function recenter() {
        map.container.fitToViewport();

        var targetCenter = CENTER;

        var panel = document.querySelector('.footer__panel');
        if (panel && getComputedStyle(panel).display !== 'none') {
            var mapRect = el.getBoundingClientRect();
            var panelRect = panel.getBoundingClientRect();
            var visibleWidth = panelRect.left - mapRect.left;

            if (visibleWidth > 0) {
                var shiftX = mapRect.width / 2 - visibleWidth / 2;
                var zoom = map.getZoom();
                var projection = map.options.get('projection');

                var centerPx = projection.toGlobalPixels(CENTER, zoom);
                var shiftedPx = [centerPx[0] + shiftX, centerPx[1]]; 
                targetCenter = projection.fromGlobalPixels(shiftedPx, zoom);
            }
        }

        map.setCenter(targetCenter, map.getZoom(), { duration: 0 });
    }

    window.addEventListener('load', recenter);
    window.addEventListener('resize', recenter);
    window.addEventListener('orientationchange', recenter);

    if (document.readyState === 'complete') {
        recenter();
    }
});