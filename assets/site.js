(function () {
  "use strict";

  // Mobile menu
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
  }

  // Videos: play (muted) only while on screen; sound toggle per video.
  function wireVideo(box) {
    var v = box.querySelector("video");
    var s = box.querySelector(".snd");
    if (!v || !s) return;
    s.addEventListener("click", function () {
      v.muted = !v.muted;
      if (!v.muted) v.play().catch(function () {});
      s.setAttribute("aria-pressed", String(!v.muted));
      s.setAttribute("aria-label", v.muted ? "Turn sound on" : "Turn sound off");
      s.firstElementChild.innerHTML = v.muted ? "&#128263;" : "&#128266;";
    });
  }
  var vids = Array.prototype.slice.call(document.querySelectorAll("main .vid"));
  vids.forEach(wireVideo);
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target.querySelector("video");
        if (en.isIntersecting && !reduce) {
          if (v.preload === "none") v.preload = "auto";
          v.play().catch(function () {});
        } else { v.pause(); }
      });
    }, { threshold: 0.35 });
    vids.forEach(function (b) { io.observe(b); });
  }

  // Full-screen viewer
  var dlg = document.querySelector(".viewer");
  var stage = dlg.querySelector(".stage");
  var count = dlg.querySelector(".count");
  var slides = Array.prototype.slice.call(document.querySelectorAll("main .slide"));
  var cur = 0;

  function show(i) {
    cur = (i + slides.length) % slides.length;
    stage.querySelectorAll("video").forEach(function (v) { v.pause(); });
    var clone = slides[cur].cloneNode(true);
    clone.querySelectorAll("img").forEach(function (im) { im.loading = "eager"; });
    clone.querySelectorAll("a.jump").forEach(function (a) {
      a.addEventListener("click", function () { dlg.close(); });
    });
    stage.replaceChildren(clone);
    clone.querySelectorAll(".vid").forEach(function (b) {
      wireVideo(b);
      var v = b.querySelector("video");
      v.preload = "auto";
      if (!reduce) v.play().catch(function () {});
    });
    count.textContent = (cur + 1) + " / " + slides.length;
  }
  var lastFocus = null;
  document.querySelectorAll("main .expand").forEach(function (b, i) {
    b.addEventListener("click", function () {
      lastFocus = b;
      show(i);
      dlg.showModal();
    });
  });
  dlg.querySelector(".close").addEventListener("click", function () { dlg.close(); });
  dlg.querySelector(".prev").addEventListener("click", function () { show(cur - 1); });
  dlg.querySelector(".next").addEventListener("click", function () { show(cur + 1); });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1); }
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", function () {
    stage.querySelectorAll("video").forEach(function (v) { v.pause(); });
    stage.replaceChildren();
    if (lastFocus) lastFocus.focus();
  });
  // Swipe on touch screens
  var x0 = null;
  dlg.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
