(function () {
    "use strict";

    var STORE_KEY = "elastic2025.gmail";
    var html = document.documentElement;

    /* Gmail-style bottom action pills (Reply / Reply all / Forward).
       Roundcube has no bottom action bar, so we inject one. This must run even
       inside the framed message view — which carries the `.iframe` class — so
       it happens before the early return below. */
    (function initMessageActions() {
        var ICON = {
            reply:    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>',
            replyAll: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V5l-7 7 7 7v-3l-4-4 4-4zm6 1V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>',
            forward:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/></svg>'
        };
        var BTNS = [
            ["reply",     "Reply",     ICON.reply],
            ["reply-all", "Reply all", ICON.replyAll],
            ["forward",   "Forward",   ICON.forward]
        ];
        function inject() {
            var mc = document.getElementById("message-content");
            if (!mc || !window.rcmail) return;
            var host = mc.querySelector(".rightcol") || mc;
            if (host.querySelector(".gm-msg-actions")) return; // already injected
            var bar = document.createElement("div");
            bar.className = "gm-msg-actions";
            bar.setAttribute("data-gm-actions", "1");
            BTNS.forEach(function (b) {
                var el = document.createElement("button");
                el.type = "button";
                el.innerHTML = b[2] + "<span>" + b[1] + "</span>";
                el.addEventListener("click", function (ev) {
                    if (window.rcmail) rcmail.command(b[0], "", this, ev);
                });
                bar.appendChild(el);
            });
            host.appendChild(bar);
        }
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", inject);
        } else {
            inject();
        }
    })();

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
        // Don't build the app bar in standalone/compose windows (they open under
        // task=mail but shouldn't carry the inbox chrome).
        var action = (window.rcmail && rcmail.env && rcmail.env.action) || "";
        if (["compose", "print", "get", "bounce"].indexOf(action) !== -1) return;

        var bar = document.createElement("div");
        bar.id = "gm-topbar";

        // Derive a real account initial; if unavailable, fall back to a clean
        // person glyph instead of an ugly "@".
        var initial = "";
        try {
            var u = (window.rcmail && rcmail.env &&
                     (rcmail.env.username || rcmail.env.user || rcmail.env.email)) || "";
            if (!u) {
                var uEl = document.querySelector(".username, #rcmloginuser");
                if (uEl) u = uEl.textContent || uEl.value || "";
            }
            u = (u || "").trim();
            if (/^[a-z0-9]/i.test(u)) initial = u.charAt(0).toUpperCase();
        } catch (e) {}
        var PERSON_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" ' +
            'aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 ' +
            '2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

        bar.innerHTML =
            '<button class="gm-hamburger" title="Menu" aria-label="Menu">☰</button>' +
            '<div class="gm-search-slot"></div>' +
            '<div class="gm-actions">' +
                '<button class="gm-iconbtn gm-theme" title="Toggle light/dark" aria-label="Toggle light/dark"></button>' +
                '<button class="gm-iconbtn gm-gear" title="Theme &amp; layout" aria-label="Theme settings">⚙</button>' +
                '<a class="gm-avatar" href="./?_task=settings" title="Settings">' +
                    (initial || PERSON_SVG) + '</a>' +
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

        // Light/dark toggle. Elastic reads a colorMode cookie (falling back to
        // prefers-color-scheme), so persist there and flip the class live on
        // both the page and the open message frame.
        var themeBtn = bar.querySelector(".gm-theme");
        function refreshThemeIcon() {
            themeBtn.textContent = html.classList.contains("dark-mode") ? "☀" : "☾";
        }
        refreshThemeIcon();
        themeBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            var dark = !html.classList.contains("dark-mode");
            document.cookie = "colorMode=" + (dark ? "dark" : "light") + ";path=/;max-age=31536000";
            html.classList.toggle("dark-mode", dark);
            var fr = document.getElementById("messagecontframe");
            try {
                if (fr && fr.contentDocument)
                    fr.contentDocument.documentElement.classList.toggle("dark-mode", dark);
            } catch (e2) {}
            refreshThemeIcon();
        });
    }

    /* Full-screen message (Gmail single-column): the preview frame is navigated
       WITHOUT changing its src attribute, so detect an open message by the
       presence of #message-content in the frame on each load, and toggle
       body.gm-fullmsg (the CSS hides the list and expands the message). The
       Back arrow clears it immediately. */
    function initFullMessage() {
        var frame = document.getElementById("messagecontframe");
        if (!frame) return;
        function isOpen() {
            try { return !!(frame.contentDocument && frame.contentDocument.getElementById("message-content")); }
            catch (e) { return false; }
        }
        function setOpen(open) { document.body.classList.toggle("gm-fullmsg", !!open); }
        frame.addEventListener("load", function () { setOpen(isOpen()); });
        // Back arrow: intercept in the CAPTURE phase so Elastic's own handler
        // (href="#sidebar" + UI.show_list, which hides the folder sidebar) never
        // runs — we just return to the full-width list, sidebar intact.
        document.addEventListener("click", function (e) {
            if (e.target.closest &&
                e.target.closest("#layout-content .header_back_back, #layout-content .button.icon.back") &&
                document.body.classList.contains("gm-fullmsg")) {
                e.preventDefault();
                e.stopImmediatePropagation();
                setOpen(false);
            }
        }, true);
        setOpen(isOpen());
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

    /* Gmail-style hover quick actions (Archive / Delete / Mark read) on each
       list row. Elastic only ships a delete glyph, so inject our own bar.
       Two hard-won details:
        - Roundcube selects rows on MOUSEDOWN, so we stop that in the capture
          phase on our icons (a click-phase stop is too late and opens the msg).
        - command('delete') is gated off unless a row is "properly" selected and
          select() opens the message — so we set the selection directly and call
          the action methods (delete_messages / move_messages / mark_message)
          straight, which act without opening anything. */
    function initRowActions() {
        var SVG = {
            archive: '<svg viewBox="0 0 24 24"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1z"/></svg>',
            del:     '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
            read:    '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z"/></svg>'
        };
        var ACTIONS = [
            { cmd: "archive", title: "Archive",      svg: SVG.archive },
            { cmd: "delete",  title: "Delete",       svg: SVG.del },
            { cmd: "read",    title: "Mark as read", svg: SVG.read }
        ];
        function addBar(tr) {
            if (!tr || tr.querySelector(".gm-row-actions")) return;
            var subj = tr.querySelector("td.subject");
            if (!subj) return;
            var bar = document.createElement("span");
            bar.className = "gm-row-actions";
            ACTIONS.forEach(function (a) {
                var el = document.createElement("a");
                el.href = "#";
                el.title = a.title;
                el.setAttribute("aria-label", a.title);
                el.dataset.cmd = a.cmd;
                el.innerHTML = a.svg;
                bar.appendChild(el);
            });
            subj.appendChild(bar);
        }
        function addAll() {
            var rows = document.querySelectorAll("#messagelist tbody tr.message");
            for (var i = 0; i < rows.length; i++) addBar(rows[i]);
        }
        addAll();
        // Roundcube rebuilds the <tbody> on load, so a childList observer on the
        // initial one misses the rows — hook its own row events instead.
        if (window.rcmail && rcmail.addEventListener) {
            rcmail.addEventListener("insertrow", function (e) {
                try { addBar(e.row.obj); } catch (x) {}
            });
            rcmail.addEventListener("listupdate", addAll);
        }

        // Block Roundcube's mousedown row-select on our icons (capture phase).
        document.addEventListener("mousedown", function (e) {
            if (e.target.closest && e.target.closest(".gm-row-actions a")) e.stopPropagation();
        }, true);
        // Run the action directly, no message open.
        document.addEventListener("click", function (e) {
            var a = e.target.closest && e.target.closest(".gm-row-actions a");
            if (!a) return;
            e.preventDefault();
            e.stopPropagation();
            if (!window.rcmail || !rcmail.message_list) return;
            var tr = a.closest("tr");
            var ml = rcmail.message_list;
            var uid = ml.get_row_uid(tr);
            if (uid == null) return;
            ml.selection = [uid];
            ml.last_selected = uid;
            if (a.dataset.cmd === "read") rcmail.mark_message("read", uid);
            else if (a.dataset.cmd === "delete") rcmail.delete_messages(e);
            else if (a.dataset.cmd === "archive")
                rcmail.move_messages(rcmail.env.archive_folder || "Archive", e);
        }, true);
    }

    function boot() {
        apply(load());
        buildTopbar();
        initFullMessage();
        initRowActions();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
