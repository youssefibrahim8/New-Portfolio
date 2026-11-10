/* =========================================================
   PORTFOLIO — command menu behaviour
   - hash routing (#/profile, #/projects …)
   - red slash screen transitions
   - JRPG menu sounds (WebAudio)
   - arrow-key navigation on the home menu
   - subtle parallax on the character art
   ========================================================= */

(() => {
  "use strict";

  const app = document.getElementById("app");
  const wipe = document.querySelector(".wipe");
  const home = document.getElementById("screen-home");
  const menu = document.getElementById("menu");
  const items = [...document.querySelectorAll(".menu-item")];
  const heroFigure = document.querySelector(".hero__figure");
  const screens = [...document.querySelectorAll(".screen")];
  const introScreen = document.getElementById("introScreen");
  const introEnter = document.getElementById("introEnter");
  let introOpen = Boolean(introScreen);
  if (introScreen) {
    introScreen.hidden = false;
  }

  function dismissIntro() {
    if (!introScreen || !introOpen) return;
    introOpen = false;
    document.body.classList.add("intro-entering");
    if (home && home.classList.contains("is-active")) {
      home.classList.add("is-arriving");
      window.setTimeout(() => home.classList.remove("is-arriving"), 1200);
    }
    introScreen.classList.add("is-leaving");
    window.setTimeout(() => {
      introScreen.hidden = true;
      document.body.classList.add("intro-dismissed");
      window.setTimeout(() => document.body.classList.remove("intro-entering"), 500);
    }, 650);
  }

  if (introEnter) introEnter.addEventListener("click", dismissIntro);
  if (introScreen) {
    introScreen.addEventListener("click", (event) => {
      if (event.target === introScreen || event.target.classList.contains("intro-screen__veil")) dismissIntro();
    });
    document.addEventListener("keydown", (event) => {
      if (!introOpen || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dismissIntro();
    }, true);
  }

  let focusIndex = 0;
  let isWiping = false;
  let soundOn = true;

  /* ---------------------------------------------------------
     AUDIO — tiny synthesized menu SFX (no assets needed)
     --------------------------------------------------------- */
  let audioCtx = null;
  const getCtx = () => {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  };

  // short filtered noise burst = brush/paper sound
  function playNoise(duration = 0.09, cutoff = 2400, gain = 0.16) {
    if (!soundOn) return;
    const ctx = getCtx();
    if (!ctx) return;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.9;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start();
  }

  // pitched blip for confirmations
  function playTone(freq = 660, duration = 0.14, type = "triangle", gain = 0.12) {
    if (!soundOn) return;
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.6, ctx.currentTime + duration);
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  const sfxHover = () => playNoise(0.07, 3000, 0.12);
  const sfxMove = () => playTone(520, 0.08, "square", 0.06);
  const sfxConfirm = () => { playNoise(0.12, 1600, 0.2); playTone(720, 0.18, "triangle", 0.1); };
  const sfxBack = () => playTone(320, 0.16, "sawtooth", 0.07);

  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      soundOn = !soundOn;
      soundToggle.setAttribute("aria-pressed", String(soundOn));
      soundToggle.querySelector(".sound-toggle__label").textContent = soundOn ? "SOUND ON" : "SOUND OFF";
      if (soundOn) sfxConfirm();
    });
  }

  const emailCopy = document.getElementById("emailCopy");
  const copyToast = document.getElementById("copyToast");
  let copyToastTimer = null;
  if (emailCopy) {
    emailCopy.addEventListener("click", async () => {
      const email = "yimgi09@gmail.com";
      let copied = false;
      try {
        await navigator.clipboard.writeText(email);
        copied = true;
      } catch (_) {
        const field = document.createElement("textarea");
        field.value = email;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        try { copied = document.execCommand("copy"); } catch (_) { copied = false; }
        field.remove();
      }

      if (copyToast) {
        copyToast.textContent = copied ? "Copied!" : "yimgi09@gmail.com";
        copyToast.classList.add("is-visible");
        clearTimeout(copyToastTimer);
        copyToastTimer = setTimeout(() => copyToast.classList.remove("is-visible"), 1800);
      }
    });
  }

  /* ---------------------------------------------------------
     SCREEN ROUTING with slash transitions
     --------------------------------------------------------- */
  function screenFor(hash) {
    const route = (hash || "").replace(/^#\/?/, "").trim().toLowerCase();
    if (!route) return home;
    return screens.find((s) => s.dataset.screen === route) || home;
  }

  function activate(target) {
    screens.forEach((s) => {
      const on = s === target;
      s.classList.toggle("is-active", on);
      s.classList.remove("is-entering");
      if (on) {
        // restart reveal animations
        void s.offsetWidth;
        s.classList.add("is-entering");
        s.scrollTop = 0;
      }
    });
    window.scrollTo({ top: 0, behavior: "auto" });
    document.querySelectorAll(".top-nav__link").forEach((link) => {
      if (target.dataset.screen === link.dataset.section) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.title =
      target === home
        ? "PORTFOLIO — Command Menu"
        : `${target.dataset.screen.toUpperCase()} — Portfolio`;
  }

  function navigate(hash) {
    if (isWiping) return;
    const target = screenFor(hash);
    const current = screens.find((s) => s.classList.contains("is-active"));

    if (target === current) return;

    isWiping = true;
    sfxConfirm();

    // sweep in → swap → sweep out
    wipe.classList.remove("is-out");
    wipe.classList.add("is-in");

    setTimeout(() => {
      activate(target);
      wipe.classList.remove("is-in");
      wipe.classList.add("is-out");
      setTimeout(() => {
        wipe.classList.remove("is-out");
        isWiping = false;
      }, 520);
    }, 400);
  }

  // navigate while keeping the URL in sync (file:// safe)
  function go(hash) {
    try {
      history.pushState(null, "", hash);
      navigate(hash);
    } catch (err) {
      // some browsers restrict pushState on file:// — hashchange covers it
      location.hash = hash.replace(/^#/, "");
    }
  }

  // intercept internal navigation links
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='#/'], [data-nav]");
    if (!link) return;
    const hash = link.dataset.nav || link.getAttribute("href");
    if (location.hash !== hash) {
      e.preventDefault();
      go(hash);
    }
  });

  window.addEventListener("hashchange", () => navigate(location.hash));
  window.addEventListener("popstate", () => navigate(location.hash));

  /* ---------------------------------------------------------
     HOME MENU — hover / focus / keyboard
     --------------------------------------------------------- */
  function setFocus(i) {
    focusIndex = (i + items.length) % items.length;
    items.forEach((el, idx) => el.classList.toggle("is-focus", idx === focusIndex));
    sfxMove();
  }

  items.forEach((el, i) => {
    el.addEventListener("mouseenter", () => {
      focusIndex = i;
      // Pointer hover uses :hover; keep the keyboard focus state from sticking
      // after the pointer leaves an option.
      items.forEach((o) => o.classList.remove("is-focus"));
      sfxHover();
    });
    el.addEventListener("focus", () => {
      focusIndex = i;
      items.forEach((o, idx) => o.classList.toggle("is-focus", idx === focusIndex));
    });
    el.addEventListener("click", (e) => {
      if (isWiping) e.preventDefault();
    });
  });

  document.addEventListener("keydown", (e) => {
    const homeActive = home.classList.contains("is-active");

    // BACK from any screen
    if ((e.key === "Escape" || e.key === "Backspace") && !homeActive) {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      go("#/");
      return;
    }

    if (!homeActive) return;

    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      e.preventDefault();
      setFocus(focusIndex + 1);
    } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      setFocus(focusIndex - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      const el = items[focusIndex];
      if (el && document.activeElement !== el) {
        e.preventDefault();
        go(el.getAttribute("href"));
      }
    }
  });

    /* ---------------------------------------------------------
     CONTACT FORM — open a prefilled email draft
     --------------------------------------------------------- */
  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const message = String(data.get("message") || "").trim();

      if (!name || !email || !message) {
        status.textContent = "⚠ Fill in every field to send the pact.";
        status.style.color = "#ffe16b";
        playTone(220, 0.2, "sawtooth", 0.09);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = "⚠ That email address looks wrong.";
        status.style.color = "#ffe16b";
        return;
      }

      const subject = `Portfolio message from ${name}`;
      const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
      status.textContent = "Your email draft is ready — press Send in your mail app.";
      status.style.color = "#37d67a";
      sfxConfirm();
      window.location.href = `mailto:yimgi09@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  /* ---------------------------------------------------------
     BOOT — respect any deep link in the URL
     --------------------------------------------------------- */
  activate(screenFor(location.hash));
})();
