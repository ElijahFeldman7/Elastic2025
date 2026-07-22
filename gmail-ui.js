(function () {
    "use strict";

    var STORE_KEY = "elastic2025.gmail";
    var html = document.documentElement;

    if (html.classList.contains("iframe")) return;

    var DEFAULTS = {
        wallpaper: "none",  
        wallpaperData: "",  
        tint: 12,           
        accent: "#0b57d0",
        singlePane: true,
        compact: false
    };

    var PRESETS = [
        { id: "none",     label: "None",     css: "none" },
        { id: "ocean",    label: "Ocean",    css: "linear-gradient(160deg,#2b5876,#4e4376)" },
        { id: "sky",      label: "Sky",      css: "linear-gradient(160deg,#89f7fe,#66a6ff)" },
        { id: "sunset",   label: "Sunset",   css: "linear-gradient(160deg,#ff9a9e,#fad0c4 60%,#fbc2eb)" },
        { id: "forest",   label: "Forest",   css: "linear-gradient(160deg,#134e5e,#71b280)" },
        { id: "graphite", label: "Graphite", css: "linear-gradient(160deg,#232526,#414345)" }
    ];

    var ACCENTS = ["#0b57d0", "#d93025", "#188038", "#8430ce", "#017a70", "#e8710a"];

    function load() {
        var p;
        try { p = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { p = {}; }
        return Object.assign({}, DEFAULTS, p);
    }
    function save(p) {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(p));
            return true;
        } catch (e) { return false; }
    }

    function presetCss(id) {
        for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i].css;
        return "none";
    }

    function luminance(hex) {
        var c = hex.replace("#", "");
        var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    function apply(p) {
        var wp = "none";
        if (p.wallpaper === "custom" && p.wallpaperData) wp = 'url("' + p.wallpaperData + '")';
        else if (p.wallpaper && p.wallpaper !== "none") wp = presetCss(p.wallpaper);

        if (wp !== "none") {
            html.style.setProperty("--wallpaper", wp);
            html.setAttribute("data-wallpaper", "on");
        } else {
            html.style.removeProperty("--wallpaper");
            html.setAttribute("data-wallpaper", "off");
        }

        var t = (Math.max(0, Math.min(60, p.tint || 0)) / 100).toFixed(3);
        html.style.setProperty("--wallpaper-tint", "rgba(0,0,0," + t + ")");

        if (p.accent) {
            html.style.setProperty("--accent", p.accent);
            html.style.setProperty("--accent-contrast", luminance(p.accent) > 0.6 ? "#111" : "#fff");
            html.style.setProperty("--accent-soft", p.accent + "2b");
        }

        html.classList.toggle("pref-single-pane", !!p.singlePane);
        html.classList.toggle("gm-compact", !!p.compact);
    }

    function relayout() {
        try { window.dispatchEvent(new Event("resize")); } catch (e) {}
        if (window.rcmail && rcmail.triggerEvent) rcmail.triggerEvent("skin-resize", { mode: "" });
    }

    function buildTopbar() {
        if (document.getElementById("gm-topbar")) return;

        var task = (document.body.className.match(/task-([a-z]+)/) || [])[1] || "";
        if (["mail", "settings", "addressbook"].indexOf(task) === -1) return;

        var bar = document.createElement("div");
        bar.id = "gm-topbar";

        var logoSrc = "/images/logo.svg";
        var existing = document.getElementById("logo");
        if (existing && existing.getAttribute("src")) logoSrc = existing.getAttribute("src");

        var initial = "@";
        try {
            var u = (window.rcmail && rcmail.env && rcmail.env.username) || "";
            if (u) initial = u.trim().charAt(0).toUpperCase();
        } catch (e) {}

        bar.innerHTML =
            '<button class="gm-hamburger" title="Menu" aria-label="Menu">☰</button>' +
            '<img class="gm-logo" src="' + logoSrc + '" alt="Logo">' +
            '<div class="gm-search-slot"></div>' +
            '<div class="gm-actions">' +
                '<button class="gm-iconbtn gm-gear" title="Theme &amp; layout" aria-label="Theme settings">⚙</button>' +
                '<a class="gm-avatar" href="./?_task=settings" title="Settings">' + initial + '</a>' +
            '</div>';

        document.body.insertBefore(bar, document.body.firstChild);

        if (task === "mail") {
            var search = document.querySelector("#messagelist-header .searchbar");
            if (search) {
                bar.querySelector(".gm-search-slot").appendChild(search);
                document.body.classList.add("gm-search-hoisted");
            }
        }

        bar.querySelector(".gm-hamburger").addEventListener("click", function () {
            document.body.classList.toggle("gm-drawer-open");
        });
        document.body.addEventListener("click", function (e) {
            if (document.body.classList.contains("gm-drawer-open")) {
                var sb = document.getElementById("layout-sidebar");
                if (sb && !sb.contains(e.target) && !e.target.closest(".gm-hamburger")) {
                    document.body.classList.remove("gm-drawer-open");
                }
            }
        });

        bar.querySelector(".gm-gear").addEventListener("click", function (e) {
            e.stopPropagation();
            togglePanel();
        });
    }

    var panel;

    function togglePanel() {
        if (!panel) buildPanel();
        panel.classList.toggle("open");
    }

    function buildPanel() {
        var p = load();
        panel = document.createElement("div");
        panel.id = "gm-panel";

        var swatches = PRESETS.map(function (pr) {
            var bg = pr.css === "none" ? "var(--surface-muted)" : pr.css;
            var label = pr.id === "none" ? "✕" : "";
            return '<div class="gm-swatch" data-preset="' + pr.id + '" title="' + pr.label +
                   '" style="background:' + bg + '">' + label + '</div>';
        }).join("");

        var accents = ACCENTS.map(function (a) {
            return '<div class="gm-accent" data-accent="' + a + '" style="background:' + a + '"></div>';
        }).join("");

        panel.innerHTML =
            '<h4>Theme &amp; layout</h4>' +
            '<div class="gm-section">' +
                '<label>Background</label>' +
                '<div class="gm-swatches">' + swatches +
                    '<div class="gm-swatch gm-upload" title="Upload image" ' +
                         'style="background:var(--surface-muted);color:var(--font)">↑</div>' +
                '</div>' +
                '<input type="file" accept="image/*" class="gm-file" hidden>' +
                '<div class="gm-hint">Upload is stored in this browser only.</div>' +
            '</div>' +
            '<div class="gm-section">' +
                '<label>Background dimming</label>' +
                '<input type="range" class="gm-tint" min="0" max="60" value="' + p.tint + '">' +
            '</div>' +
            '<div class="gm-section">' +
                '<label>Accent</label>' +
                '<div class="gm-swatches">' + accents + '</div>' +
            '</div>' +
            '<div class="gm-section">' +
                '<label>Reading pane</label>' +
                '<div class="gm-seg gm-pane">' +
                    '<button data-pane="1">Full width</button>' +
                    '<button data-pane="0">Split</button>' +
                '</div>' +
            '</div>' +
            '<div class="gm-section">' +
                '<label>Density</label>' +
                '<div class="gm-seg gm-density">' +
                    '<button data-compact="0">Comfortable</button>' +
                    '<button data-compact="1">Compact</button>' +
                '</div>' +
            '</div>' +
            '<div class="gm-row">' +
                '<button class="gm-btn secondary gm-reset">Reset</button>' +
            '</div>';

        document.body.appendChild(panel);
        panel.addEventListener("click", function (e) { e.stopPropagation(); });
        document.body.addEventListener("click", function () { panel.classList.remove("open"); });

        wirePanel(p);
        syncPanel(load());
    }

    function syncPanel(p) {
        if (!panel) return;
        panel.querySelectorAll(".gm-swatch[data-preset]").forEach(function (el) {
            el.classList.toggle("selected", p.wallpaper !== "custom" && el.dataset.preset === p.wallpaper);
        });
        panel.querySelector(".gm-upload").classList.toggle("selected", p.wallpaper === "custom");
        panel.querySelectorAll(".gm-accent").forEach(function (el) {
            el.classList.toggle("selected", el.dataset.accent.toLowerCase() === (p.accent || "").toLowerCase());
        });
        panel.querySelectorAll(".gm-pane button").forEach(function (b) {
            b.classList.toggle("active", (b.dataset.pane === "1") === !!p.singlePane);
        });
        panel.querySelectorAll(".gm-density button").forEach(function (b) {
            b.classList.toggle("active", (b.dataset.compact === "1") === !!p.compact);
        });
    }

    function update(mut) {
        var p = load();
        mut(p);
        save(p);
        apply(p);
        syncPanel(p);
        return p;
    }

    function wirePanel(p) {
        panel.querySelectorAll(".gm-swatch[data-preset]").forEach(function (el) {
            el.addEventListener("click", function () {
                update(function (q) { q.wallpaper = el.dataset.preset; });
            });
        });
        panel.querySelectorAll(".gm-accent").forEach(function (el) {
            el.addEventListener("click", function () {
                update(function (q) { q.accent = el.dataset.accent; });
            });
        });
        panel.querySelector(".gm-tint").addEventListener("input", function () {
            var v = this.value;
            update(function (q) { q.tint = parseInt(v, 10); });
        });
        panel.querySelectorAll(".gm-pane button").forEach(function (b) {
            b.addEventListener("click", function () {
                update(function (q) { q.singlePane = b.dataset.pane === "1"; });
                relayout();
            });
        });
        panel.querySelectorAll(".gm-density button").forEach(function (b) {
            b.addEventListener("click", function () {
                update(function (q) { q.compact = b.dataset.compact === "1"; });
            });
        });
        panel.querySelector(".gm-reset").addEventListener("click", function () {
            save(Object.assign({}, DEFAULTS));
            apply(DEFAULTS);
            syncPanel(DEFAULTS);
            relayout();
        });

        // Upload → downscale on a canvas → data URL → localStorage.
        var upBtn = panel.querySelector(".gm-upload");
        var file = panel.querySelector(".gm-file");
        upBtn.addEventListener("click", function () { file.click(); });
        file.addEventListener("change", function () {
            var f = this.files && this.files[0];
            if (!f) return;
            var img = new Image();
            img.onload = function () {
                var data = downscale(img, 2560, 0.82);
                var stored = tryStore(data) ||
                             tryStore(downscale(img, 1920, 0.72)) ||
                             tryStore(downscale(img, 1280, 0.62));
                if (!stored) {
                    setHint("Image too large to save in this browser. Try a smaller one.");
                } else {
                    apply(load());
                    syncPanel(load());
                }
            };
            img.src = URL.createObjectURL(f);
        });
    }

    function downscale(img, maxEdge, quality) {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, maxEdge / Math.max(w, h));
        var cw = Math.round(w * scale), ch = Math.round(h * scale);
        var c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        c.getContext("2d").drawImage(img, 0, 0, cw, ch);
        return c.toDataURL("image/jpeg", quality);
    }

    function tryStore(data) {
        var p = load();
        p.wallpaper = "custom";
        p.wallpaperData = data;
        return save(p) ? p : null;
    }

    function setHint(msg) {
        var h = panel && panel.querySelector(".gm-hint");
        if (h) h.textContent = msg;
    }

    function boot() {
        apply(load());        
        buildTopbar();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
