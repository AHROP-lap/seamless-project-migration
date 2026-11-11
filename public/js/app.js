/* ═══════════════════════════════════════════════════════════════
   🎬 app.js — ربط كل حاجة ببعضها
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var CFG = window.SITE_CONFIG;
  var MEM = window.MEMORIES;
  var MSGS = window.MESSAGES;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };

  /* ══════════ 1) شاشة الدخول ══════════ */
  var gateHeartFx = null;
  var MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
                "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  /* بناء الـmonogram: "A + M" → حروف متدرّجة + علامة + */
  function renderMonogram(el, name, cls) {
    if (!el) return;
    el.classList.remove("ar-name", "mono");
    if (cls) el.classList.add(cls);
    var parts = String(name || "").split("+").map(function (s) { return s.trim(); }).filter(Boolean);
    if (!parts.length) { el.textContent = name || ""; return; }
    el.innerHTML = parts.map(function (p, i) {
      return (i > 0 ? '<span class="ma-plus">+</span>' : "") + '<span class="ma-letter">' + esc(p) + "</span>";
    }).join("");
  }

  /* تخطيط دقيق: القلب بياخد المساحة الفعلية فوق كتلة النص — مفيش تداخل أبدًا */
  function layoutGate() {
    var inner = document.querySelector(".gate-inner");
    if (!inner) return;
    var cardTop = inner.getBoundingClientRect().top;

    // قلب صغير في الأول
    var heartH = Math.max(140, Math.min(window.innerHeight * 0.21, window.innerWidth * 0.28, 230));
    var heartTop = Math.max(8, window.innerHeight * 0.035);
    var cy = heartTop + heartH * 0.5;      // مركز القلب الهندسي
    var heartBottom = cy + heartH * 0.65; // طرف القلب السفلي المرسوم

    if (gateHeartFx && gateHeartFx.setGeometry) gateHeartFx.setGeometry(cy, heartH);

    var nameEl = $("gateName");
    if (nameEl) {
      // الاسم تحت القلب (بره)
      var fs = Math.round(Math.min(heartH * 0.34, 64));
      var nameH = fs * 1.25;
      var center = heartBottom + 14 + nameH / 2;
      if (center + nameH / 2 > cardTop - 10) {
        center = cardTop - 10 - nameH / 2;
        fs = Math.round(Math.max(32, Math.min(fs, (cardTop - 10 - (center - nameH / 2)) / 1.25)));
      }
      nameEl.style.top = Math.round(center) + "px";
      nameEl.style.fontSize = fs + "px";
    }
  }

  // توحيد شكل الكلمة: مسافات + أ/إ/آ → ا + ي/ى → ي + أحرف لاتينية صغيرة
  function normPass(s) {
    return String(s).trim()
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, "")
      .toLowerCase();
  }
  function isCorrectPassword(val) {
    var list = CFG.passwords || [CFG.password];
    var v = normPass(val);
    var direct = list.some(function (p) { return normPass(p) === v; });
    if (direct) return true;
    // يقبل رقم الشهر كمان (1..12) واسم الشهر
    var num = Number(v);
    if (num >= 1 && num <= 12 && Number(CFG.password) === num) return true;
    var idx = MONTHS.findIndex(function (m) { return normPass(m) === v; });
    if (idx >= 0 && Number(CFG.password) === idx + 1) return true;
    return false;
  }

  function buildMonthPicker() {
    var wrap = $("monthPicker");
    if (!wrap) return;
    wrap.innerHTML = MONTHS.map(function (name, i) {
      return '<button type="button" class="month-btn" role="radio" aria-checked="false" data-m="' + (i + 1) + '">' + name + "</button>";
    }).join("");
    wrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".month-btn");
      if (!btn) return;
      var m = Number(btn.dataset.m);
      wrap.querySelectorAll(".month-btn").forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-checked", "true");
      $("gateInput").value = String(m);
      $("gateMsg").classList.remove("show");
      if (Number(CFG.password) === m) {
        // اختيار الشهر الصحيح → ادخلي على طول
        $("gateForm").dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
  }

  function initGate() {
    var input = $("gateInput");
    var msg = $("gateMsg");
    buildMonthPicker();

    $("gateForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var val = input.value.trim();
      if (!val) {
        sayMsg("اختاري شهر ميلادك من فوق 💗");
        return;
      }
      if (isCorrectPassword(val)) {
        msg.classList.remove("show");
        unlock();
      } else {
        sayMsg("مش دي... 🙈 فكري في حاجة بينا، وجربي تاني.");
        input.value = "";
      }
    });

    function sayMsg(t) {
      msg.textContent = t;
      msg.classList.add("show");
      setTimeout(function () { msg.classList.remove("show"); }, 3200);
    }

    // لو فاتحة في نفس الجلسة، منرجعش نطلب الباسورد
    if (sessionStorage.getItem("olu-unlocked") === "1") {
      unlock(true);
    }
  }

  function unlock(instant) {
    sessionStorage.setItem("olu-unlocked", "1");

    var gate = $("gate");
    var door = $("door");
    var intro = $("intro");

    var enterIntro = function () {
      gate.style.display = "none";
      if (gateHeartFx) { gateHeartFx.stop(); gateHeartFx = null; }
      if (instant) {
        startStory(true);
      } else {
        door.classList.add("open");
        setTimeout(function () {
          intro.hidden = false;
          startIntroScene();
        }, 500);
        setTimeout(function () { door.classList.remove("open"); }, 1900);
      }
    };

    if (instant) { enterIntro(); return; }
    gate.classList.add("leaving");
    setTimeout(enterIntro, 600);
  }

  /* ══════════ 2) المقدمة السينمائية ══════════ */
  var introFx = null;

  function startIntroScene() {
    var nameEl = $("introName");
    var typedEl = $("introTyped");
    var moreEl = $("introMore");
    var startBtn = $("introStart");
    var introEl = $("intro");
    var skipped = false;
    var autoTimer = null;

    renderMonogram(nameEl, CFG.monogram || "A + M", "mono");
    introFx = window.Effects.startHeart("introCanvas", { form: true });
    Player.tryAutoStart();      // نحاول تشغيل الأغنية بهدوء بعد تفاعل الدخول

    typedEl.textContent = "";
    moreEl.classList.remove("show");
    // زر البداية ظاهر من أول لحظة — تقدر تدخل في أي وقت
    startBtn.classList.add("show");

    /* تخطيط ثابت: القلب في النص والاسم في فراغه */
    function layoutIntro() {
      var inner = document.querySelector(".intro-text");
      if (!inner) return;
      var rect = inner.getBoundingClientRect();
      var vh = window.innerHeight, vw = window.innerWidth;
      var hH = Math.min(vh * 0.42, vw * 0.48, 540);   // ارتفاع القلب
      var cy = vh * 0.30;                             // مركز القلب
      if (introFx && introFx.setGeometry) introFx.setGeometry(cy, hH);
      // مركز فراغ القلب (تحت التقاء الفصول) = cy + 4 وحدات
      var scale = hH / 26;
      var belly = cy + 4 * scale;
      var fs = Math.round(Math.min(hH * 0.20, 86));
      var nameH = fs * 1.1;
      if (belly + nameH / 2 > rect.top - 10) {
        fs = Math.round(Math.max(30, Math.min(fs, (rect.top - 10 - belly) * 2 / 1.1)));
      }
      nameEl.style.top = Math.round(belly) + "px";
      nameEl.style.fontSize = fs + "px";
    }
    layoutIntro();
    window.addEventListener("resize", layoutIntro);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutIntro);
    setTimeout(layoutIntro, 500);

    function finishIntro() {
      if (skipped) return;
      skipped = true;
      clearTimeout(autoTimer);
      if (introFx) { introFx.stop(); introFx = null; }
      $("intro").hidden = true;
      startStory(false);
    }

    // أي ضغطة في أي مكان على شاشة المقدمة كمّلي (بعد ثانية عشان ميبقاش بالغلط)
    var clickToGo = function (e) {
      if (e.target.closest("#introSkip") || e.target.closest("#introStart")) return;
      finishIntro();
    };
    setTimeout(function () { introEl.addEventListener("click", clickToGo); }, 1000);

    $("introSkip").addEventListener("click", finishIntro, { once: true });
    startBtn.addEventListener("click", finishIntro, { once: true });

    // أمان: لو محصلش أي تفاعل، نكمل لوحدنا
    autoTimer = setTimeout(finishIntro, 15000);

    var delay = reducedMotion ? 0 : 350;

    setTimeout(function () {
      nameEl.classList.add("show");
      typeLines(typedEl, CFG.intro.typedLines, function () {
        if (skipped) return;
        moreEl.classList.add("show");
        setTimeout(function () {
          if (skipped) return;
          startBtn.classList.add("show");
        }, 250);
      });
    }, delay);
  }

  function typeLines(el, lines, onDone) {
    if (reducedMotion) { el.textContent = lines.join(" "); onDone(); return; }
    var li = 0;
    function typeLine() {
      if (li >= lines.length) { onDone(); return; }
      var text = lines[li];
      var ci = 0;
      el.textContent = "";
      var timer = setInterval(function () {
        el.textContent = text.slice(0, ++ci);
        if (ci >= text.length) {
          clearInterval(timer);
          li++;
          setTimeout(typeLine, 380);
        }
      }, 38);
    }
    typeLine();
  }

  /* ══════════ 3) فتح القصة ══════════ */
  function addBgVideo(section) {
    if (!CFG.bgVideo || reducedMotion) return;
    var v = document.createElement("video");
    v.className = "bg-video";
    v.src = CFG.bgVideo;
    v.autoplay = true; v.loop = true; v.muted = true;
    v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.setAttribute("aria-hidden", "true");
    v.addEventListener("error", function () { v.remove(); });
    section.insertBefore(v, section.firstChild);
  }

  function startStory(skipIntro) {
    if (skipIntro) Player.tryAutoStart();
    $("intro").hidden = true;
    $("story").hidden = false;
    $("player").hidden = false;
    addBgVideo(document.querySelector(".hero"));
    addBgVideo($("finalSection"));
    initStoryContent();
    initRevealObserver();
    showScrollToast();
  }

  /* تنبيه لطيف أول مرة: الحكاية تحت */
  function showScrollToast() {
    var t = document.createElement("div");
    t.className = "scroll-toast";
    t.textContent = "الحكاية كلها تحت... اسحبي لتحت ⬇";
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("in"); }, 400);
    setTimeout(function () {
      t.classList.remove("in");
      setTimeout(function () { t.remove(); }, 500);
    }, 5500);
  }

  /* ══════════ 4) العدّاد ══════════ */
  var COUNTER_KEY = "olu-counter-start";

  // تحويل وقت محلي (بدون منطقة) لوقت عالمي باستخدام IANA timezone
  function zonedToMs(localIso, tz) {
    try {
      var guess = new Date(localIso + ":00Z").getTime();
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
      var parts = {};
      fmt.formatToParts(new Date(guess)).forEach(function (p) { parts[p.type] = p.value; });
      var asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day,
                           +parts.hour % 24, +parts.minute, +parts.second);
      var offset = asUTC - guess;
      return guess - offset;
    } catch (e) {
      return new Date(localIso).getTime();
    }
  }

  function resolveCounterStart() {
    var cfg = CFG.counter || {};

    // 1) تاريخ ثابت (مع منطقة زمنية)
    if (cfg.mode === "fixed" && cfg.start) {
      var fixed = cfg.timeZone ? zonedToMs(cfg.start, cfg.timeZone) : new Date(cfg.start).getTime();
      if (!isNaN(fixed)) return { start: fixed, note: cfg.caption || null };
      return { start: null, note: "⚠️ صيغة التاريخ في config.js مش صحيحة." };
    }

    // 2) يبدأ من أول زيارة (بيتحفظ في المتصفح)
    var off = cfg.offset;
    if (off) {
      var stored = localStorage.getItem(COUNTER_KEY);
      if (stored && !isNaN(Number(stored))) return { start: Number(stored), note: cfg.caption || null };
      var sec = (off.days || 0) * 86400 + (off.hours || 0) * 3600 +
                (off.minutes || 0) * 60 + (off.seconds || 0);
      var start = Date.now() - sec * 1000;
      try { localStorage.setItem(COUNTER_KEY, String(start)); } catch (e) {}
      return { start: start, note: cfg.caption || null };
    }

    // 3) مفيش أي إعداد
    return { start: null, note: "⏱️ العدّاد مستني تاريخكم الحقيقي… هيتفعّل من ملف js/config.js." };
  }

  function initCounter() {
    var box = $("counter");
    var note = $("counterNote");
    var res = resolveCounterStart();

    if (!res.start) {
      box.style.display = "none";
      note.innerHTML = '<div class="unset">' + res.note + "</div>";
      return;
    }
    var start = res.start;
    if (res.note) {
      note.innerHTML = '<div class="counter-caption">' + res.note + "</div>";
    }

    var units = [
      { key: "d", label: "يوم" },
      { key: "h", label: "ساعة" },
      { key: "m", label: "دقيقة" },
      { key: "s", label: "ثانية" }
    ];
    box.innerHTML = units.map(function (u) {
      return '<div class="count-card"><span class="count-num" data-u="' + u.key + '">0</span><span class="count-label">' + u.label + "</span></div>";
    }).join("");

    var nums = {};
    box.querySelectorAll(".count-num").forEach(function (n) { nums[n.dataset.u] = n; });
    var last = { d: -1, h: -1, m: -1, s: -1 };

    function tick() {
      var diff = Math.max(0, Date.now() - start);
      var s = Math.floor(diff / 1000);
      var vals = {
        d: Math.floor(s / 86400),
        h: Math.floor(s / 3600) % 24,
        m: Math.floor(s / 60) % 60,
        s: s % 60
      };
      for (var k in vals) {
        if (vals[k] !== last[k]) {
          last[k] = vals[k];
          nums[k].textContent = vals[k];
          nums[k].classList.add("tick");
          setTimeout(function (n) { return function () { n.classList.remove("tick"); }; }(nums[k]), 250);
        }
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ══════════ 5) بناء الرسائل ══════════ */
  function buildMessages() {
    var flow = $("messagesFlow");
    MSGS.forEach(function (m, idx) {
      var wrap = document.createElement("div");
      wrap.className = "reveal";
      wrap.style.transitionDelay = (idx % 2) * 80 + "ms";

      if (m.type === "paper") {
        wrap.innerHTML =
          '<article class="paper-card"><h4 class="paper-title">' + esc(m.title || "") + "</h4><div>" + esc(m.text) + "</div></article>";
      } else if (m.type === "envelope") {
        wrap.innerHTML =
          '<div class="envelope-wrap">' +
          '<div class="envelope" role="button" tabindex="0" aria-label="افتحي الظرف">' +
          '<div class="env-flap"></div><div class="env-seal">♥</div>' +
          '<div class="env-letter">' + esc(m.text) + "</div></div>" +
          '<p class="envelope-title">' + esc(m.title || "اضغطي على الظرف") + "</p></div>";
        var env = wrap.querySelector(".envelope");
        var open = function () {
          env.classList.toggle("open");
          if (env.classList.contains("open")) wrap.querySelector(".paper-card") && null;
        };
        env.addEventListener("click", open);
        env.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      } else if (m.type === "float") {
        var hearts = "";
        for (var i = 0; i < 6; i++) {
          hearts += '<span style="left:' + (8 + i * 15) + "%; animation-duration:" + (5 + (i % 3) * 2) + "s; animation-delay:" + i * 0.9 + 's">❤</span>';
        }
        wrap.innerHTML =
          '<div class="float-card"><div class="float-hearts" aria-hidden="true">' + hearts + "</div>" +
          '<p class="float-text">" ' + esc(m.text) + ' "</p>' +
          (m.note ? '<p class="float-note">' + esc(m.note) + "</p>" : "") +
          "</div>";
      } else if (m.type === "notebook") {
        wrap.innerHTML =
          '<article class="notebook-card"><h4 class="notebook-title">📖 ' + esc(m.title || "") + "</h4><div>" + esc(m.text) + "</div></article>";
      } else if (m.type === "long") {
        wrap.innerHTML =
          '<article class="long-card">' +
          '<button class="long-head" aria-expanded="false"><span>' + esc(m.title || "") + '</span><span class="chev">▾</span></button>' +
          '<div class="long-body">' + esc(m.text) + "</div></article>";
        var card = wrap.querySelector(".long-card");
        var head = wrap.querySelector(".long-head");
        head.addEventListener("click", function () {
          var open = card.classList.toggle("open");
          head.setAttribute("aria-expanded", open);
        });
      }
      flow.appendChild(wrap);
    });
  }

  /* ══════════ 6) المعرض ══════════ */
  function buildGallery() {
    var gal = $("gallery");
    var sec = MEM.photos || { heading: "", hint: "", items: [] };
    if (sec.heading) $("galleryTitle").textContent = sec.heading;
    if (sec.hint) $("galleryHint").textContent = sec.hint;
    sec.items.forEach(function (p, i) {
      var hasImg = !!p.src;
      var card = document.createElement("figure");
      card.className = "photo-card reveal";
      card.style.setProperty("--tilt", ((i % 2 ? 1 : -1) * (1 + (i % 3) * 1.2)) + "deg");
      card.innerHTML =
        '<div class="photo-frame">' +
        (hasImg ? '<img loading="lazy" src="' + esc(p.src) + '" alt="' + esc(p.caption || "") + '">'
                : '<div class="ph-placeholder"><span class="big">📷</span>صورة جاية قريب ❤</div>') +
        "</div>" +
        '<figcaption><div class="photo-caption">' + esc(p.caption || "") + '</div><div class="photo-date">' + esc(p.date || "") + "</div></figcaption>";
      if (hasImg) {
        card.addEventListener("click", function () { openLightbox(p); });
      }
      gal.appendChild(card);
    });
  }

  function openLightbox(p) {
    $("lbImg").src = p.src;
    $("lbCaption").textContent = (p.caption || "") + (p.date ? " — " + p.date : "");
    var lb = $("lightbox");
    lb.hidden = false;
    requestAnimationFrame(function () { lb.classList.add("show"); });
  }

  function closeOverlay(el) {
    el.classList.remove("show");
    setTimeout(function () { el.hidden = true; }, 350);
  }

  /* ══════════ 7) حاجات بحبها فيكي ══════════ */
  function buildThings() {
    var grid = $("thingsGrid");
    var sec = MEM.loveThings || { heading: "", cards: [] };
    if (sec.heading) $("thingsTitle").textContent = sec.heading;
    if (sec.hint) $("thingsHint").textContent = sec.hint;
    sec.cards.forEach(function (t) {
      var card = document.createElement("button");
      card.className = "thing-card reveal";
      card.setAttribute("aria-expanded", "false");
      card.innerHTML = '<span class="thing-label">✦ ' + esc(t.label) + '</span><p class="thing-text">' + esc(t.text) + "</p>";
      card.addEventListener("click", function () {
        var open = card.classList.toggle("open");
        card.setAttribute("aria-expanded", open);
      });
      grid.appendChild(card);
    });
  }

  /* ══════════ 8) لو كنتِ تعرفي ══════════ */
  function buildKnew() {
    var list = $("knewList");
    var sec = MEM.ifYouKnew || { heading: "", items: [] };
    if (sec.heading) $("knewTitle").textContent = sec.heading;
    if (sec.hint) $("knewHint").textContent = sec.hint;
    sec.items.forEach(function (k) {
      var btn = document.createElement("button");
      btn.className = "knew-btn reveal";
      btn.textContent = k.prompt;
      btn.addEventListener("click", function () {
        list.querySelectorAll(".knew-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        showSecret(k.text);
      });
      list.appendChild(btn);
    });
  }

  /* ══════════ 9) الخط الزمني ══════════ */
  function buildTimeline() {
    var tl = $("timeline");
    var sec = MEM.timeline || { heading: "", events: [] };
    if (sec.heading) $("timelineTitle").textContent = sec.heading;
    sec.events.forEach(function (ev) {
      var item = document.createElement("div");
      item.className = "tl-item tl-reveal";
      item.innerHTML =
        '<span class="tl-date">' + esc(ev.date) + "</span>" +
        '<h4 class="tl-title">' + esc(ev.title) + "</h4>" +
        '<p class="tl-text">' + esc(ev.text) + "</p>" +
        (ev.star ? '<button class="tl-star" title="نجمة سرّية">★</button><p class="tl-star-text">' + esc(ev.star) + "</p>" : "") +
        (ev.img ? '<img loading="lazy" class="tl-img" src="' + esc(ev.img) + '" alt="">' : "");
      tl.appendChild(item);
      var star = item.querySelector(".tl-star");
      if (star) {
        star.addEventListener("click", function () {
          showSecret(ev.star);
        });
      }
    });
  }

  /* ══════════ 10) المفاجآت والأسرار ══════════ */
  function buildSurprises() {
    var area = $("surprisesArea");
    var S = MEM.surprises;

    // قلب سرّي
    var heart = document.createElement("button");
    heart.className = "surprise-heart";
    heart.title = "في حاجة هنا...";
    heart.textContent = "❤";
    heart.addEventListener("click", function () { showSecret(S.heartSecret); burstHearts(heart); });
    area.appendChild(heart);

    // ظرف متأخر
    var env = document.createElement("button");
    env.className = "surprise-envelope";
    env.setAttribute("aria-label", "ظرف سرّي");
    env.innerHTML = '<span class="seal"></span><span class="lbl">للقادمين متأخر</span>';
    env.addEventListener("click", function () { showSecret(S.envelopeLate); });
    area.appendChild(env);

    // زر "لسه فيه حاجة مستخبية"
    var btn = document.createElement("button");
    btn.className = "surprise-btn";
    btn.textContent = "لسه فيه حاجة مستخبية";
    var pressed = false;
    btn.addEventListener("click", function () {
      showSecret(S.stillHiddenBtn);
      if (!pressed) { pressed = true; btn.textContent = "لقيتيها 🎉"; }
    });
    area.appendChild(btn);

    // نجمة مضيّة
    var star = document.createElement("button");
    star.className = "surprise-star";
    star.title = "نجمة...";
    star.textContent = "★";
    star.addEventListener("click", function () { showSecret(S.starMemory); });
    area.appendChild(star);

    // عبارة نهاية القسم — بتظهر بعد ما تكمل التمرير جوه القسم
    var late = document.createElement("p");
    late.className = "reveal";
    late.style.cssText = "width:100%;text-align:center;color:#9d8188;font-size:.95rem";
    late.textContent = "وبعد ما تخلصي القسم ده... فيه هدية مستنياك تحت 👇";
    area.appendChild(late);
  }

  function burstHearts(el) {
    if (reducedMotion) return;
    var rect = el.getBoundingClientRect();
    for (var i = 0; i < 7; i++) {
      var h = document.createElement("span");
      h.textContent = "❤";
      h.style.cssText = "position:fixed;z-index:99;pointer-events:none;font-size:" + (12 + Math.random() * 10) + "px;color:" + ["#f293ab", "#ef7d99", "#d3253c"][i % 3] +
        ";left:" + (rect.left + rect.width / 2) + "px;top:" + rect.top + "px";
      document.body.appendChild(h);
      var dx = (Math.random() - 0.5) * 160;
      var dy = -(80 + Math.random() * 100);
      h.animate([
        { transform: "translate(0,0) scale(.6)", opacity: 1 },
        { transform: "translate(" + dx + "px," + dy + "px) scale(1.1)", opacity: 0 }
      ], { duration: 1100 + Math.random() * 500, easing: "ease-out" }).onfinish = function (n) { return function () { n.remove(); }; }(h);
    }
  }

  function showSecret(text) {
    $("secretText").textContent = text;
    var m = $("secretModal");
    m.hidden = false;
    requestAnimationFrame(function () { m.classList.add("show"); });
  }

  /* ══════════ 11) صندوق الهدية ══════════ */
  function initGift() {
    var box = $("giftBox");
    var msg = $("giftMsg");
    var opened = false;
    var g = MEM.gift || {};
    if (g.heading) $("giftTitle").textContent = g.heading;
    if (g.hint) $("giftHint").textContent = g.hint;

    function open() {
      if (opened) return;
      opened = true;
      box.classList.add("open");
      // قلوب طايرة
      var hearts = box.querySelector(".gift-hearts");
      if (!reducedMotion) {
        for (var i = 0; i < 10; i++) {
          var s = document.createElement("span");
          s.textContent = "❤";
          s.style.left = 10 + Math.random() * 80 + "%";
          s.style.animationDelay = Math.random() * 0.6 + "s";
          s.style.fontSize = 0.9 + Math.random() * 0.9 + "rem";
          hearts.appendChild(s);
        }
      }
      setTimeout(function () {
        msg.hidden = false;
        msg.innerHTML = "";
        (g.message || []).forEach(function (line) {
          var p = document.createElement("p");
          p.textContent = line;
          msg.appendChild(p);
        });
        if (g.signature) {
          var sig = document.createElement("p");
          sig.className = "gift-sign";
          sig.textContent = "— " + g.signature;
          msg.appendChild(sig);
        }
      }, reducedMotion ? 100 : 1100);
    }

    box.addEventListener("click", open);
    box.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  }

  /* ══════════ 12) الرسالة الأخيرة + مفاجأة النهاية ══════════ */
  function buildFinal() {
    var F = CFG.finalLetter || {};
    $("mainPhrase").textContent = CFG.mainPhrase;
    if (CFG.greeting) {
      $("greetTitle").textContent = CFG.greeting.title;
      $("greetSub").textContent = CFG.greeting.subtitle;
    }
    if (F.lines) $("finalLines").innerHTML = F.lines.map(function (l) { return esc(l); }).join("<br />");
    $("finalLetter").textContent = (F.body || []).join("\n\n");
    $("finalSign").textContent = F.addressee || "";
    $("finalLast").textContent = F.lastLine || "";
    var signName = $("finalSignName");
    if (signName) signName.textContent = F.sign || "";

    // مفاجأة النهاية: بتظهر لما توصلي لآخر الصفحة (تدار مع مراقب التمرير في initRevealObserver)
    var end = $("endSurprise");
    var phrase = document.createElement("p");
    phrase.className = "end-phrase";
    phrase.textContent = MEM.surprises.endPhrase;
    end.appendChild(phrase);
  }

  /* ══════════ 13) ظهور العناصر مع التمرير ══════════ */
  function initRevealObserver() {
    var pending = Array.prototype.slice.call(
      document.querySelectorAll(".reveal:not(.in), .tl-item.tl-reveal:not(.in)")
    );
    var endPhrase = document.querySelector(".end-phrase");
    var ticking = false;

    function revealAll() {
      pending = pending.filter(function (el) {
        if (el.classList.contains("in")) return false;
        var r = el.getBoundingClientRect();
        // يظهر لما يدخل الشاشة بمقدار بسيط (هامش سفلي)
        if (r.top < window.innerHeight - 50 && r.bottom > 0) {
          el.classList.add("in");
          return false;
        }
        return true;
      });
      if (endPhrase && !endPhrase.classList.contains("show")) {
        var er = endPhrase.getBoundingClientRect();
        if (er.top < window.innerHeight * 0.75) {
          setTimeout(function () { endPhrase.classList.add("show"); }, 1800);
        }
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(revealAll);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    revealAll();

    // شبكة أمان: لو rAF مش شغال (تبويب في الخلفية مثلاً) نكمل بالتايمر الخفيف
    var fallback = setInterval(function () {
      revealAll();
      if (pending.length === 0) clearInterval(fallback);
    }, 700);
  }

  /* ══════════ 14) أدوات ══════════ */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ══════════ تشغيل ══════════ */
  function initStoryContent() {
    initCounter();
    buildMessages();
    buildGallery();
    buildThings();
    buildKnew();
    buildTimeline();
    buildSurprises();
    initGift();
    buildFinal();
  }

  function boot() {
    Player.init();
    window.Effects.startStars();
    initGate();

    $("lbClose").addEventListener("click", function () { closeOverlay($("lightbox")); });
    $("lightbox").addEventListener("click", function (e) { if (e.target === this) closeOverlay(this); });
    $("secretClose").addEventListener("click", function () { closeOverlay($("secretModal")); });
    $("secretModal").addEventListener("click", function (e) { if (e.target === this) closeOverlay(this); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeOverlay($("lightbox"));
        closeOverlay($("secretModal"));
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
