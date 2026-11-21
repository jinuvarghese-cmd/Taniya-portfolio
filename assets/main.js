(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var ICON_ZOOM = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M11 8v6M8 11h6"/></svg>';
  var ICON_FULL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

  var wraps = $$("main .slide-wrap");

  /* ---------- header + progress + dock ---------- */
  var top = $(".top"), bar = $(".progress"), dock = $(".dock");
  var hero = $(".hero"), finale = $(".finale");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? h.scrollTop / max : 0) + ")";
      var heroBottom = hero.getBoundingClientRect().bottom;
      top.classList.toggle("over-hero", heroBottom >= 70);
      var finTop = finale.getBoundingClientRect().top;
      dock.classList.toggle("show", heroBottom < 0 && finTop > window.innerHeight * 0.6);
      hsUpdate();
      if (typeof checkReveal === "function") checkReveal();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { hsLayout(); onScroll(); });

  /* ---------- reveal on scroll ---------- */
  wraps.forEach(function (w) { if (!w.closest(".hero-art")) w.classList.add("rv"); });
  var heroWrap = $(".hero-art .slide-wrap");
  var revealables = $$(".slide-wrap.rv, .rvh");
  function reveal(el) {
    el.classList.add("in");
    if (el.classList.contains("slide-wrap")) setTimeout(function () { el.classList.add("done"); }, 2200);
  }
  // Position check (not IntersectionObserver) so content always appears,
  // including after jumping straight to a section or inside the sideways showcase.
  var pending = reduce ? [] : revealables.slice();
  if (reduce) revealables.forEach(reveal);
  function checkReveal() {
    if (!pending.length) return;
    var vh = window.innerHeight, vw = window.innerWidth;
    pending = pending.filter(function (el) {
      var r = el.getBoundingClientRect();
      var visible = r.top < vh * 0.92 && r.bottom > vh * 0.04 && r.left < vw * 0.96 && r.right > 0;
      if (visible) reveal(el);
      return !visible;
    });
  }
  var sweeps = 0, sweepT = setInterval(function () {
    checkReveal();
    if (++sweeps > 12) clearInterval(sweepT);
  }, 250);

  /* ---------- hero: gentle 3D tilt toward the cursor ---------- */
  if (fine && !reduce && heroWrap) {
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      heroWrap.style.transform = "rotateY(" + (x * 7).toFixed(2) + "deg) rotateX(" + (-y * 6).toFixed(2) + "deg)";
    });
    hero.addEventListener("mouseleave", function () { heroWrap.style.transform = ""; });
  }

  /* ---------- contents strips: lift the strip under its link ---------- */
  $$("a.jump[data-for]").forEach(function (a) {
    var el = a.parentNode.querySelector('.el[data-name="' + a.getAttribute("data-for") + '"]');
    if (!el) return;
    a.addEventListener("mouseenter", function () { el.classList.add("hot"); });
    a.addEventListener("mouseleave", function () { el.classList.remove("hot"); });
    a.addEventListener("focus", function () { el.classList.add("hot"); });
    a.addEventListener("blur", function () { el.classList.remove("hot"); });
  });

  /* ---------- horizontal character showcase ---------- */
  var hs = $(".hs"), hsTrack = hs && $(".hs-track", hs), hsMeter = hs && $(".hs-meter i", hs);
  var hsOn = false, hsDist = 0;
  function hsLayout() {
    if (!hs) return;
    var want = !reduce && window.innerWidth >= 900 && window.innerHeight >= 560;
    document.documentElement.classList.toggle("hs-on", want);
    hsOn = want;
    if (!want) { hs.style.height = ""; hsTrack.style.transform = ""; return; }
    hsDist = Math.max(0, hsTrack.scrollWidth - window.innerWidth);
    hs.style.height = (window.innerHeight + hsDist) + "px";
    hsUpdate();
  }
  function hsUpdate() {
    if (!hsOn) return;
    var r = hs.getBoundingClientRect();
    var p = Math.min(1, Math.max(0, -r.top / Math.max(1, hsDist)));
    hsTrack.style.transform = "translate3d(" + (-p * hsDist).toFixed(1) + "px,0,0)";
    if (hsMeter) hsMeter.style.transform = "scaleX(" + p.toFixed(3) + ")";
  }
  hsLayout();

  /* ---------- videos ---------- */
  function wireVideo(box) {
    var v = $("video", box), s = $(".snd", box);
    if (!v || !s) return;
    s.addEventListener("click", function () {
      v.muted = !v.muted;
      if (!v.muted) v.play().catch(function () {});
      s.setAttribute("aria-pressed", String(!v.muted));
      s.setAttribute("aria-label", v.muted ? "Turn sound on" : "Turn sound off");
      s.firstElementChild.innerHTML = v.muted ? "&#128263;" : "&#128266;";
    });
  }
  var vids = $$("main .vid");
  vids.forEach(wireVideo);
  if ("IntersectionObserver" in window) {
    var vo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = $("video", e.target);
        if (e.isIntersecting && !reduce) { if (v.preload === "none") v.preload = "auto"; v.play().catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.3 });
    vids.forEach(function (b) { vo.observe(b); });
  }

  /* ---------- per-slide tools: zoom lens + full screen ---------- */
  var slides = wraps.map(function (w) { return $(".slide", w); });
  wraps.forEach(function (w, i) {
    var old = $(".expand", w);
    if (old) old.remove();
    var label = w.getAttribute("aria-label") || "slide";
    var t = document.createElement("div");
    t.className = "tools";
    t.innerHTML = '<button type="button" class="zoom" aria-pressed="false" aria-label="Zoom lens: inspect details of ' + label + '" title="Zoom lens">' + ICON_ZOOM + '</button>' +
                  '<button type="button" class="full" aria-label="View ' + label + ' full screen" title="Full screen">' + ICON_FULL + '</button>';
    w.appendChild(t);
    $(".full", t).addEventListener("click", function () { openViewer(i, this); });
    $(".zoom", t).addEventListener("click", function () { toggleLens(w, this); });
  });

  var ZOOM = 2.6;
  function toggleLens(w, btn) {
    var on = !w.classList.contains("zooming");
    $$(".slide-wrap.zooming").forEach(function (o) { if (o !== w) stopLens(o); });
    if (!on) { stopLens(w); return; }
    var slide = $(".slide", w);
    var lens = document.createElement("div");
    lens.className = "lens";
    var clone = slide.cloneNode(true);
    $$("video", clone).forEach(function (v) {
      var img = document.createElement("img");
      img.src = v.getAttribute("poster"); img.alt = ""; img.setAttribute("style", v.getAttribute("style"));
      v.replaceWith(img);
    });
    $$(".snd, a.jump", clone).forEach(function (n) { n.remove(); });
    $$("img", clone).forEach(function (im) { im.loading = "eager"; });
    $$(".el, .tx", clone).forEach(function (n) { n.style.transitionDelay = "0s"; });
    clone.classList.add("in");
    clone.setAttribute("aria-hidden", "true");
    lens.appendChild(clone);
    w.appendChild(lens);
    w.classList.add("zooming");
    btn.setAttribute("aria-pressed", "true");
    function move(e) {
      var r = slide.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) { lens.style.opacity = "0"; return; }
      lens.style.opacity = "1";
      clone.style.width = r.width + "px";
      var L = lens.offsetWidth / 2;
      lens.style.left = (x - L) + "px"; lens.style.top = (y - L) + "px";
      clone.style.transform = "translate(" + (L - x * ZOOM) + "px," + (L - y * ZOOM) + "px) scale(" + ZOOM + ")";
    }
    w._lensMove = move;
    w.addEventListener("mousemove", move);
    lens.style.opacity = "0";
  }
  function stopLens(w) {
    w.classList.remove("zooming");
    var l = $(".lens", w); if (l) l.remove();
    if (w._lensMove) w.removeEventListener("mousemove", w._lensMove);
    var b = $(".tools .zoom", w); if (b) b.setAttribute("aria-pressed", "false");
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") $$(".slide-wrap.zooming").forEach(stopLens);
  });

  /* ---------- full-screen viewer ---------- */
  var dlg = $(".viewer"), stage = $(".stage", dlg), count = $(".count", dlg), cur = 0, lastFocus = null;
  function show(i) {
    cur = (i + slides.length) % slides.length;
    $$("video", stage).forEach(function (v) { v.pause(); });
    var clone = slides[cur].cloneNode(true);
    $$("img", clone).forEach(function (im) { im.loading = "eager"; });
    $$(".el, .tx", clone).forEach(function (n) { n.style.transitionDelay = "0s"; });
    $$("a.jump", clone).forEach(function (a) { a.addEventListener("click", function () { dlg.close(); }); });
    stage.replaceChildren(clone);
    $$(".vid", clone).forEach(function (b) {
      wireVideo(b);
      var v = $("video", b); v.preload = "auto";
      if (!reduce) v.play().catch(function () {});
    });
    count.textContent = (cur + 1) + " / " + slides.length;
  }
  function openViewer(i, from) {
    lastFocus = from; show(i); dlg.showModal();
  }
  $(".close", dlg).addEventListener("click", function () { dlg.close(); });
  $(".prev", dlg).addEventListener("click", function () { show(cur - 1); });
  $(".next", dlg).addEventListener("click", function () { show(cur + 1); });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1); }
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", function () {
    $$("video", stage).forEach(function (v) { v.pause(); });
    stage.replaceChildren();
    if (lastFocus) lastFocus.focus();
  });
  var x0 = null;
  dlg.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  /* ---------- copy email ---------- */
  var toast = $(".toast"), toastT = null;
  function say(msg) {
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }
  $$(".copy").forEach(function (b) {
    b.addEventListener("click", function () {
      var email = b.getAttribute("data-email");
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = email; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
        ta.remove();
        say(ok ? "EMAIL COPIED!" : email);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(function () { say("EMAIL COPIED!"); }, fallback);
      } else fallback();
    });
  });

  onScroll();
  window.addEventListener("load", function () { hsLayout(); onScroll(); });
})();
