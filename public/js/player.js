/* ═══════════════════════════════════════════════════════════════
   🎵 مشغل الموسيقى — مشغّل حقيقي (HTML5 Audio)
   ═══════════════════════════════════════════════════════════════ */

window.Player = (function () {
  "use strict";

  var cfg = window.SITE_CONFIG.music;
  var audio, el;
  var seekDragging = false;
  var fileMissing = false;
  var everPlayed = false;

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function init() {
    audio = document.getElementById("audio");
    el = {
      player: document.getElementById("player"),
      playBtn: document.getElementById("playBtn"),
      icPlay: document.querySelector("#playBtn .ic-play"),
      icPause: document.querySelector("#playBtn .ic-pause"),
      cover: document.getElementById("cover"),
      title: document.getElementById("trackName"),
      seek: document.getElementById("seek"),
      cur: document.getElementById("curTime"),
      dur: document.getElementById("durTime"),
      mute: document.getElementById("muteBtn"),
      icVol: document.getElementById("ic-vol"),
      icMuted: document.getElementById("ic-muted"),
      vol: document.getElementById("volume"),
      collapse: document.getElementById("playerCollapse"),
      reopen: document.getElementById("playerReopen")
    };

    audio.src = cfg.file;
    audio.volume = cfg.volume;
    audio.loop = true;
    el.vol.value = Math.round(cfg.volume * 100);
    el.title.textContent = cfg.title;

    // الغلاف: لو مش موجود نستخدم خلفية متدرجة (CSS بتتكفل)
    if (cfg.cover) {
      el.cover.onerror = function () { el.cover.style.visibility = "hidden"; };
      el.cover.src = cfg.cover;
    } else {
      el.cover.style.visibility = "hidden";
    }

    // لو الملف مش موجود
    audio.addEventListener("error", function () {
      fileMissing = true;
      showNotice("حطي ملف الأغنية في assets/audio/song.mp3 🎵");
      setPlaying(false);
    });

    audio.addEventListener("loadedmetadata", function () {
      el.dur.textContent = fmt(audio.duration);
    });
    audio.addEventListener("timeupdate", function () {
      if (!seekDragging && audio.duration) {
        el.seek.value = (audio.currentTime / audio.duration) * 100;
      }
      el.cur.textContent = fmt(audio.currentTime);
    });
    audio.addEventListener("play", function () { everPlayed = true; setPlaying(true); });
    audio.addEventListener("pause", function () { setPlaying(false); });

    // لو المتصفح منع التشغيل التلقائي: أول ضغطة على أي حاجة في الصفحة تشغّل الأغنية
    document.addEventListener("click", function () {
      if (!everPlayed && !fileMissing && audio.paused) tryAutoStart();
    }, { once: true });

    el.playBtn.addEventListener("click", toggle);
    el.mute.addEventListener("click", toggleMute);
    el.vol.addEventListener("input", function () {
      audio.volume = el.vol.value / 100;
      audio.muted = false;
      syncMuteIcon();
    });
    el.seek.addEventListener("input", function () { seekDragging = true; });
    el.seek.addEventListener("change", function () {
      if (audio.duration) audio.currentTime = (el.seek.value / 100) * audio.duration;
      seekDragging = false;
    });
    el.collapse.addEventListener("click", function () {
      el.player.classList.add("hidden");
      el.reopen.hidden = false;
      el.reopen.classList.toggle("playing", !audio.paused);
    });
    el.reopen.addEventListener("click", function () {
      el.player.classList.remove("hidden");
      el.reopen.hidden = true;
    });
  }

  function toggle() {
    if (fileMissing) { showNotice("حطي ملف الأغنية في assets/audio/song.mp3 🎵"); return; }
    if (audio.paused) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () { /* المتصفح منع التشغيل — مش خطأ */ });
    } else {
      audio.pause();
    }
  }

  function tryAutoStart() {
    if (fileMissing) return;
    // نبدأ بصوت خفيف ونطلع تدريجيًا — عشان ميبقاش صوت مرتفع فجأة
    audio.volume = 0;
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function () {
        setPlaying(false);   // المتصفح منع التشغيل التلقائي — زر التشغيل واضح كفاية
      });
    }
    var target = el.vol.value / 100;
    var fade = setInterval(function () {
      if (audio.paused) { audio.volume = target; clearInterval(fade); return; }
      audio.volume = Math.min(target, audio.volume + 0.03);
      if (audio.volume >= target) clearInterval(fade);
    }, 120);
  }

  function setPlaying(isPlaying) {
    el.icPlay.style.display = isPlaying ? "none" : "";
    el.icPause.style.display = isPlaying ? "" : "none";
    el.reopen.classList.toggle("playing", isPlaying);
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    syncMuteIcon();
  }
  function syncMuteIcon() {
    el.icVol.style.display = audio.muted ? "none" : "";
    el.icMuted.style.display = audio.muted ? "" : "none";
  }

  function showNotice(text) {
    var old = el.player.querySelector(".player-notice");
    if (old) old.remove();
    var n = document.createElement("div");
    n.className = "player-notice";
    n.textContent = text;
    el.player.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.remove(); }, 5000);
  }

  return { init: init, tryAutoStart: tryAutoStart };
})();
