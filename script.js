(() => {
    const isInPages = window.location.pathname.includes("/pages/");
    const target = isInPages ? "../js/app.js" : "./js/app.js";
    import(target);
})();
