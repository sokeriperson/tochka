(function () {
    var timer = null;
    var scrolling = false;

    function onScroll() {
        if (!scrolling) {
            scrolling = true;
            document.body.classList.add('is-scrolling');
        }
        clearTimeout(timer);
        timer = setTimeout(function () {
            scrolling = false;
            document.body.classList.remove('is-scrolling');
        }, 140);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
})();