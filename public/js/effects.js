/* ═══════════════════════════════════════════════════════════════
   ✨ المؤثرات البصرية — Canvas
   (سماء نجوم + قلب Bokeh متوهج + تجمع الجزيئات)
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── أدوات ── */
  function makeCanvas(id) {
    var c = document.getElementById(id);
    if (!c) return null;
    var ctx = c.getContext("2d");
    return { c: c, ctx: ctx };
  }

  function fitCanvas(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.c.width = cv.c.clientWidth * dpr;
    cv.c.height = cv.c.clientHeight * dpr;
    cv.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: cv.c.clientWidth, h: cv.c.clientHeight };
  }

  /* نقاط على شكل قلب (معادلة القلب) */
  function heartPoints(count, cx, cy, scale) {
    var pts = [];
    for (var i = 0; i < count; i++) {
      var t = (i / count) * Math.PI * 2;
      var x = 16 * Math.pow(Math.sin(t), 3);
      var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push({ x: cx + x * scale, y: cy - y * scale });
    }
    return pts;
  }

  window.Effects = { startStars: startStars, startHeart: startHeart };

  /* ═══ 1) سماء النجوم الخلفية ═══ */
  function startStars() {
    var cv = makeCanvas("starfield");
    if (!cv || reducedMotion) return;
    var size = fitCanvas(cv);
    var stars = [];
    var COUNT = Math.min(120, Math.floor(size.w / 8));

    for (var i = 0; i < COUNT; i++) {
      stars.push({
        x: Math.random() * size.w,
        y: Math.random() * size.h,
        r: Math.random() * 1.4 + 0.4,
        tw: Math.random() * Math.PI * 2,
        sp: 0.008 + Math.random() * 0.02,
        drift: Math.random() * 0.08 + 0.02
      });
    }

    function frame() {
      var s = size;
      cv.ctx.clearRect(0, 0, s.w, s.h);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        st.tw += st.sp;
        st.y -= st.drift * 0.35;
        if (st.y < -4) { st.y = s.h + 4; st.x = Math.random() * s.w; }
        var alpha = 0.22 + Math.abs(Math.sin(st.tw)) * 0.55;
        cv.ctx.beginPath();
        cv.ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        cv.ctx.fillStyle = "rgba(255,238,245," + alpha.toFixed(3) + ")";
        cv.ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    frame();

    window.addEventListener("resize", function () { size = fitCanvas(cv); });
  }

  /* ═══ 2) قلب Bokeh: جزيئات كروية متوهجة على حدود القلب ═══
     opts.form = true  → الجزيئات تتجمّع من كل مكان لحدود القلب
     opts.form = false → القلب جاهز من الأول (مع لمعات خفيفة) */
  function startHeart(canvasId, opts) {
    opts = opts || {};
    var form = !!opts.form;
    var cv = makeCanvas(canvasId);
    if (!cv) return { stop: function () {} };

    var ctx = cv.ctx;
    var size = fitCanvas(cv);
    var t = 0;
    var raf = null;
    var stopped = false;
    var geom = { cy: opts.cyPx != null ? opts.cyPx : null, h: opts.heightPx != null ? opts.heightPx : null };

    /* سبرايت الجزيئة الكروية (performance: نرسمها مرة واحدة) */
    var SPR = 96;
    var sprite = document.createElement("canvas");
    sprite.width = sprite.height = SPR;
    var sctx = sprite.getContext("2d");
    var g = sctx.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
    g.addColorStop(0.00, "rgba(255,252,253,0.98)");
    g.addColorStop(0.18, "rgba(255,235,244,0.72)");
    g.addColorStop(0.45, "rgba(242,147,171,0.30)");
    g.addColorStop(0.75, "rgba(211,37,60,0.10)");
    g.addColorStop(1.00, "rgba(211,37,60,0)");
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, SPR, SPR);

    var outline = [];     // نقاط حدود القلب
    var dots = [];       // جزيئات الحدود (مع لمعة)
    var orbs = [];       // كرات ضخمة داخل القلب
    var dust = [];       // غبار خفيف
    var travelers = [];  // الجزيئات اللي بتتجمّع (للمقدمة)
    var glowLayer = null; // طبقة ثابتة للـ glow
    var heartCx = size.w / 2;
    var heartCy = size.h * 0.4;
    var heartH = 0;
    var progress = form ? 0 : 1;

    var COLORS = [
      "255,245,249",  // أبيض وردي
      "255,232,240",
      "242,147,171",  // بنك
      "239,217,167",  // ذهبي فاتح
      "255,255,255"
    ];

    function layout() {
      var w = size.w, h = size.h;
      var cx = w / 2;
      var cy, heartH;
      if (geom.cy != null && geom.h != null) {
        // هندسة دقيقة: القلب بيتحسب من المساحة الفعلية المتاحة فوق النص
        cy = geom.cy;
        heartH = geom.h;
      } else {
        cy = h * (opts.cy != null ? opts.cy : 0.40);
        heartH = Math.min(w * 0.54, h * 0.44);
      }
      var scale = heartH / 26;      // ارتفاع القلب المرسوم ≈ 26 وحدة
      var heartW = 32 * scale;      // العرض ≈ 32 وحدة
      heartCx = cx; heartCy = cy;

      outline = heartPoints(300, cx, cy, scale);

      // جزيئات الحدود: نقط صغيرة حادة (خط نظيف رفيع)
      dots = [];
      for (var i = 0; i < outline.length; i++) {
        var o = outline[i];
        dots.push({
          x: o.x, y: o.y,
          r: 0.55 + Math.random() * 0.85,
          c: COLORS[Math.floor(Math.random() * COLORS.length)],
          tw: Math.random() * Math.PI * 2,
          sp: 0.01 + Math.random() * 0.03
        });
      }

      // كرات bokeh خفيفة جوه القلب (قليلة وباهتة)
      orbs = [];
      for (var k = 0; k < 12; k++) {
        var idx = Math.floor(Math.random() * outline.length);
        var base = outline[idx];
        var u = 0.14 + Math.random() * 0.62;
        orbs.push({
          x: cx + (base.x - cx) * u,
          y: cy + (base.y - cy) * u,
          r: (4 + Math.random() * 7),
          a: 0.07 + Math.random() * 0.14,
          tw: Math.random() * Math.PI * 2,
          sp: 0.004 + Math.random() * 0.012,
          dx: (Math.random() - 0.5) * 0.5,
          dy: (Math.random() - 0.5) * 0.5
        });
      }

      // غبار
      dust = [];
      for (var d = 0; d < 34; d++) {
        dust.push({
          x: Math.random() * w, y: Math.random() * h,
          r: 0.6 + Math.random() * 1.5,
          a: 0.15 + Math.random() * 0.5,
          tw: Math.random() * Math.PI * 2,
          sp: 0.01 + Math.random() * 0.03
        });
      }

      // طبقة التوهج الثابتة
      glowLayer = document.createElement("canvas");
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      glowLayer.width = w * dpr; glowLayer.height = h * dpr;
      var gctx = glowLayer.getContext("2d");
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (var j = 0; j < dots.length; j++) {
        var dt = dots[j];
        gctx.beginPath();
        gctx.arc(dt.x, dt.y, dt.r, 0, Math.PI * 2);
        gctx.fillStyle = "rgba(" + dt.c + ",0.9)";
        gctx.shadowColor = "rgba(242,147,171,0.95)";
        gctx.shadowBlur = 5;
        gctx.fill();
      }
      gctx.shadowBlur = 0;

      // نقطة الشرر أسفل القلب
      var tip = outline[Math.round(outline.length * 0.75)];

      // الجزيئات المتجمّعة
      travelers = [];
      if (form) {
        for (var m = 0; m < dots.length; m++) {
          var d2 = dots[m];
          travelers.push({
            tx: d2.x, ty: d2.y,
            x: cx + (Math.random() - 0.5) * w * 1.1,
            y: cy + (Math.random() - 0.5) * h * 1.1,
            r: d2.r * 2.2,
            c: d2.c,
            d: 0.012 + Math.random() * 0.022,
            tw: Math.random() * Math.PI * 2
          });
        }
      }
    }

    function drawOrb(x, y, r, alpha, color) {
      if (r <= 0) return;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }

    function frame() {
      if (stopped) return;
      t += 0.016;
      var s = size;
      ctx.clearRect(0, 0, s.w, s.h);

      var breath = 1 + Math.sin(t * 1.1) * 0.012;
      var cx = s.w / 2;
      var cy = heartCy;

      /* --- هالة خلفية بنفسجية/وردية: عمق وتوهج حوالين القلب --- */
      var bloomR = Math.max(s.w, s.h) * 0.60;
      var bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR);
      bloom.addColorStop(0, "rgba(150,80,175,0.20)");
      bloom.addColorStop(0.40, "rgba(110,45,135,0.09)");
      bloom.addColorStop(1, "rgba(50,15,70,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, s.w, s.h);

      /* --- هالة وردية خفيفة على القلب نفسه --- */
      if (heartH > 0) {
        var hr = heartH * 1.15;
        var hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, hr);
        hg.addColorStop(0, "rgba(242,147,171,0.13)");
        hg.addColorStop(0.6, "rgba(211,37,60,0.05)");
        hg.addColorStop(1, "rgba(211,37,60,0)");
        ctx.fillStyle = hg;
        ctx.fillRect(0, 0, s.w, s.h);
      }

      /* --- غبار عائم --- */
      for (var i = 0; i < dust.length; i++) {
        var du = dust[i];
        du.tw += du.sp;
        du.x += Math.sin(t * 0.2 + du.tw) * 0.12;
        du.y -= 0.06;
        if (du.y < -6) { du.y = s.h + 6; du.x = Math.random() * s.w; }
        var al = du.a * (0.35 + Math.abs(Math.sin(du.tw)) * 0.65);
        ctx.beginPath();
        ctx.arc(du.x, du.y, du.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,235,244," + al.toFixed(3) + ")";
        ctx.fill();
      }

      /* --- كرات داخلية كبيرة (bokeh) --- */
      for (var k = 0; k < orbs.length; k++) {
        var o = orbs[k];
        o.tw += o.sp;
        var ox = o.x + Math.sin(t * 0.5 + o.tw * 3) * 3;
        var oy = o.y + Math.cos(t * 0.4 + o.tw * 2) * 3;
        var sc = breath * (1 + Math.sin(o.tw) * 0.06);
        drawOrb(ox, oy, o.r * sc, o.a * (0.6 + Math.abs(Math.sin(o.tw)) * 0.4), o.c);
      }

      /* --- جزيئات بتتجمّع (المقدمة) --- */
      if (form) {
        progress = Math.min(1, progress + 0.012);
        for (var m = 0; m < travelers.length; m++) {
          var tv = travelers[m];
          tv.x += (tv.tx - tv.x) * tv.d;
          tv.y += (tv.ty - tv.y) * tv.d;
          tv.tw += 0.05;
          var fade = 0.35 + Math.abs(Math.sin(tv.tw)) * 0.5;
          drawOrb(tv.x, tv.y, tv.r * (1 + (1 - progress) * 1.4), fade * (0.4 + progress * 0.6), tv.c);
        }
      }

      /* --- توهج حدود القلب --- */
      var op = form ? Math.max(0, (progress - 0.35) / 0.65) : 1;
      if (glowLayer && op > 0.01) {
        ctx.globalAlpha = op * 0.95;
        ctx.drawImage(glowLayer, 0, 0, s.w, s.h);
        ctx.globalAlpha = 1;
      }

      /* --- لمعات على الحدود --- */
      if (!form || progress > 0.3) {
        ctx.save();
        ctx.shadowColor = "rgba(255,240,246,0.9)";
        ctx.shadowBlur = 10;
        for (var j = 0; j < dots.length; j += 3) {
          var d = dots[j];
          d.tw += d.sp;
          var tw = 0.4 + Math.abs(Math.sin(d.tw)) * 0.6;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r * (0.8 + tw * 0.5) * breath, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + d.c + "," + (tw * 0.95).toFixed(3) + ")";
          ctx.fill();
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    }

    layout();
    frame();

    window.addEventListener("resize", function () { size = fitCanvas(cv); layout(); });

    return {
      stop: function () {
        stopped = true;
        if (raf) cancelAnimationFrame(raf);
      },
      setGeometry: function (cyPx, heightPx) {
        geom.cy = cyPx;
        geom.h = heightPx;
        layout();
      }
    };
  }
})();
