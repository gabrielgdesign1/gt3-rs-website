import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { createEngineScene } from "./engine-scene.js";

gsap.registerPlugin(ScrollTrigger, SplitText);

/*
  Motion policy: scroll-scrubbed sequences move 1:1 with user input,
  so they stay on under prefers-reduced-motion. What gets disabled
  there is autonomous/decorative motion: smooth-scroll inertia, the
  loader sweep, entrance tweens, tilt/magnetic hovers, grain.
*/
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 768px)").matches;

/* ------------------------------------------------------------
   Smooth scroll (Lenis) driving ScrollTrigger
------------------------------------------------------------- */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* One-shot entrance reveal that snaps to the end state under RM */
function reveal(targets, vars, triggerVars) {
  if (reduceMotion) return;
  gsap.from(targets, triggerVars ? { ...vars, scrollTrigger: triggerVars } : vars);
}

/* ------------------------------------------------------------
   Scroll-scrubbed video helper.
   Videos are encoded all-intra (every frame a keyframe) so
   currentTime seeks land instantly; a lerp smooths the target.
------------------------------------------------------------- */
function scrubVideo(video, srcDesktop, srcMobile) {
  video.src = isMobile ? srcMobile : srcDesktop;
  video.load();

  const state = { target: 0, current: 0, duration: 0 };

  if (video.readyState >= 1) {
    state.duration = Math.max(video.duration - 0.05, 0);
  } else {
    video.addEventListener(
      "loadedmetadata",
      () => { state.duration = Math.max(video.duration - 0.05, 0); },
      { once: true }
    );
  }

  gsap.ticker.add(() => {
    if (!state.duration) return;
    state.current += (state.target - state.current) * 0.12;
    const t = state.current * state.duration;
    if (Math.abs(video.currentTime - t) > 0.001) {
      try { video.currentTime = t; } catch { /* metadata not ready */ }
    }
  });

  return (progress) => { state.target = progress; };
}

/* ------------------------------------------------------------
   Preloader — rpm needle sweep, then curtain lift
------------------------------------------------------------- */
const loader = document.getElementById("loader");
const loaderRpm = document.getElementById("loaderRpm");
const loaderBar = document.getElementById("loaderBar");

function runLoader() {
  return new Promise((resolve) => {
    if (reduceMotion) {
      loader.remove();
      resolve();
      return;
    }
    const rpm = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => { loader.remove(); resolve(); },
    });
    tl.to(rpm, {
      v: 9000,
      duration: 1.6,
      ease: "power3.inOut",
      onUpdate: () => {
        loaderRpm.textContent = Math.round(rpm.v).toLocaleString("en-US");
        loaderRpm.style.color = rpm.v > 8200 ? "#ff2233" : "";
      },
    })
      .to(loaderBar, { width: "100%", duration: 1.6, ease: "power3.inOut" }, 0)
      .to(loader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "+=0.25");
  });
}

/* ------------------------------------------------------------
   ACT I — HERO: pinned video scrub + typography exit
------------------------------------------------------------- */
function initHero() {
  const setProgress = scrubVideo(
    document.getElementById("heroVideo"),
    "/video/hero-desktop.mp4",
    "/video/hero-mobile.mp4"
  );

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",
      end: "+=320%",
      pin: true,
      scrub: true,
      onUpdate: (self) => setProgress(self.progress),
    },
  });

  // Title drifts apart and dissolves as the car starts to turn
  tl.to("#heroTitle .hero__nine", { yPercent: -160, opacity: 0, ease: "none", duration: 0.3 }, 0.05)
    .to("#heroTitle .hero__gt3", { yPercent: -40, letterSpacing: "0.12em", opacity: 0, ease: "none", duration: 0.35 }, 0.05)
    .to("#heroEyebrow, #heroTag", { opacity: 0, y: -30, ease: "none", duration: 0.2 }, 0.02)
    .to("#heroFoot", { opacity: 0, ease: "none", duration: 0.15 }, 0.12)
    // Late line lands while the car settles into its final angle
    .fromTo("#heroLate", { opacity: 0 }, { opacity: 1, ease: "none", duration: 0.2 }, 0.62)
    .to("#heroLate p", { scale: 1.06, ease: "none", duration: 0.38 }, 0.62)
    .to("#heroLate", { opacity: 0, ease: "none", duration: 0.12 }, 0.88);

  // Intro entrance after loader
  reveal("#heroTitle span, #heroEyebrow, #heroTag", {
    yPercent: 60,
    opacity: 0,
    duration: 1.1,
    stagger: 0.09,
    ease: "power4.out",
    delay: 0.1,
  });
  reveal("#heroFoot", { opacity: 0, y: 20, duration: 0.9, delay: 0.7, ease: "power3.out" });
}

/* ------------------------------------------------------------
   ACT II — MANIFESTO: word-by-word scrub reveal
------------------------------------------------------------- */
function initManifesto() {
  const split = new SplitText("#manifestoText", { type: "words", wordsClass: "word" });
  gsap.to(split.words, {
    opacity: 1,
    stagger: 0.06,
    ease: "none",
    scrollTrigger: {
      trigger: "#manifesto",
      start: "top 70%",
      end: "bottom 75%",
      scrub: true,
    },
  });
  reveal(".manifesto__foot", { opacity: 0, y: 24 }, { trigger: ".manifesto__foot", start: "top 88%" });
}

/* ------------------------------------------------------------
   Theme morph: studio light → track dark
------------------------------------------------------------- */
function initThemeMorph() {
  ScrollTrigger.create({
    trigger: "#specs",
    start: "top 55%",
    onEnter: () => document.body.classList.add("theme-dark"),
    onLeaveBack: () => document.body.classList.remove("theme-dark"),
  });
}

/* ------------------------------------------------------------
   ACT III — SPECS: display-type reveal + animated counters
------------------------------------------------------------- */
function initSpecs() {
  document.querySelectorAll(".specs__heading span").forEach((line, i) => {
    reveal(line, { yPercent: 110, opacity: 0, duration: 1, ease: "power4.out", delay: i * 0.08 },
      { trigger: ".specs__heading", start: "top 82%" });
  });

  document.querySelectorAll("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const grouped = el.dataset.format === "grouped";
    const render = (v) => {
      el.textContent = grouped ? Math.round(v).toLocaleString("en-US") : v.toFixed(decimals);
    };
    if (reduceMotion) { render(end); return; }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end,
      duration: 2,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
      onUpdate: () => render(obj.v),
    });
  });

  reveal(".spec-card", { opacity: 0, y: 40, duration: 0.9, stagger: 0.07, ease: "power3.out" },
    { trigger: ".specs__grid", start: "top 85%" });
}

/* ------------------------------------------------------------
   ACT IV — AERO: pinned horizontal gallery (scroll-driven)
------------------------------------------------------------- */
function initAero() {
  const track = document.getElementById("aeroTrack");
  const bar = document.getElementById("aeroProgress");

  const distance = () => track.scrollWidth - window.innerWidth + 32;

  gsap.to(track, {
    x: () => -distance(),
    ease: "none",
    scrollTrigger: {
      trigger: "#aero",
      start: "top top",
      end: () => "+=" + distance(),
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => { bar.style.width = self.progress * 100 + "%"; },
    },
  });
}

/* ------------------------------------------------------------
   ACT V — ENGINE: Three.js particle vortex + rpm counter
   (intensity is scroll-driven, so it stays under RM)
------------------------------------------------------------- */
function initEngine() {
  const canvas = document.getElementById("engineCanvas");
  const rpmEl = document.getElementById("engineRpm");
  const scene = createEngineScene(canvas, { lowPower: isMobile || reduceMotion });

  ScrollTrigger.create({
    trigger: "#engine",
    start: "top 80%",
    end: "bottom 20%",
    onUpdate: (self) => {
      const p = gsap.utils.clamp(0, 1, self.progress * 1.35);
      scene.setIntensity(p);
      const rpm = Math.round(p * 9000);
      rpmEl.textContent = rpm.toLocaleString("en-US");
      rpmEl.style.color = rpm > 8200 ? "#ff2233" : "";
    },
    onLeave: () => scene.pause(),
    onEnterBack: () => scene.resume(),
    onLeaveBack: () => scene.pause(),
    onEnter: () => scene.resume(),
  });

  reveal(".engine__content > *", { opacity: 0, y: 50, stagger: 0.12, duration: 1, ease: "power3.out" },
    { trigger: "#engine", start: "top 65%" });
}

/* ------------------------------------------------------------
   ACT VI — INTERIOR: pinned video scrub with rotating captions
------------------------------------------------------------- */
function initInterior() {
  const setProgress = scrubVideo(
    document.getElementById("interiorVideo"),
    "/video/interior-desktop.mp4",
    "/video/interior-mobile.mp4"
  );

  const captions = gsap.utils.toArray(".interior-caption");

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#interior",
      start: "top top",
      end: "+=280%",
      pin: true,
      scrub: true,
      onUpdate: (self) => setProgress(self.progress),
    },
  });

  // Heading in, then captions hand over to each other
  tl.from(".interior__head", { opacity: 0, y: 60, duration: 0.12 }, 0)
    .to(".interior__head", { opacity: 0, y: -40, duration: 0.1 }, 0.3);

  const slots = [
    [0.06, 0.3],
    [0.38, 0.62],
    [0.7, 0.94],
  ];
  captions.forEach((cap, i) => {
    const [inAt, outAt] = slots[i];
    tl.fromTo(cap, { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 0.08, ease: "none" }, inAt)
      .to(cap, { opacity: 0, y: -34, duration: 0.06, ease: "none" }, outAt);
  });
}

/* ------------------------------------------------------------
   ACT VII — DYNAMICS rows + ACT VIII — package cards tilt
------------------------------------------------------------- */
function initDynamics() {
  gsap.utils.toArray(".dyn-row").forEach((row) => {
    reveal(row, { opacity: 0, y: 48, duration: 0.9, ease: "power3.out" },
      { trigger: row, start: "top 88%" });
  });
  reveal(".dynamics__heading", { opacity: 0, y: 60, duration: 1, ease: "power4.out" },
    { trigger: ".dynamics__heading", start: "top 85%" });
}

function initPackages() {
  reveal(".pack-card", { opacity: 0, y: 70, duration: 1, stagger: 0.14, ease: "power3.out" },
    { trigger: ".packages__grid", start: "top 82%" });
  reveal(".packages__heading", { opacity: 0, y: 60, duration: 1, ease: "power4.out" },
    { trigger: ".packages__heading", start: "top 85%" });

  // 3D tilt on hover (desktop, motion allowed)
  if (isMobile || reduceMotion) return;
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    const qx = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });
    const qy = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
    gsap.set(card, { transformPerspective: 900 });
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      qx(((e.clientX - r.left) / r.width - 0.5) * 10);
      qy(-((e.clientY - r.top) / r.height - 0.5) * 8);
    });
    card.addEventListener("mouseleave", () => { qx(0); qy(0); });
  });
}

/* ------------------------------------------------------------
   OUTRO: ghost parallax + magnetic CTA
------------------------------------------------------------- */
function initOutro() {
  if (!reduceMotion) {
    gsap.from(".outro__ghost", {
      yPercent: 40,
      ease: "none",
      scrollTrigger: { trigger: ".outro", start: "top bottom", end: "bottom bottom", scrub: true },
    });
  }
  reveal(".outro__cta, .outro__kicker", { opacity: 0, y: 50, duration: 1, stagger: 0.1, ease: "power3.out" },
    { trigger: ".outro", start: "top 65%" });

  // Magnetic CTA
  const cta = document.querySelector(".outro__cta");
  if (!isMobile && !reduceMotion && cta) {
    const qx = gsap.quickTo(cta, "x", { duration: 0.4, ease: "power3.out" });
    const qy = gsap.quickTo(cta, "y", { duration: 0.4, ease: "power3.out" });
    cta.addEventListener("mousemove", (e) => {
      const r = cta.getBoundingClientRect();
      qx((e.clientX - (r.left + r.width / 2)) * 0.25);
      qy((e.clientY - (r.top + r.height / 2)) * 0.25);
    });
    cta.addEventListener("mouseleave", () => { qx(0); qy(0); });
  }
}

/* ------------------------------------------------------------
   Nav anchors through Lenis
------------------------------------------------------------- */
function initNav() {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = link.getAttribute("href");
      if (!target?.startsWith("#")) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else document.querySelector(target)?.scrollIntoView();
    });
  });
}

/* ------------------------------------------------------------
   Boot
------------------------------------------------------------- */
async function boot() {
  await document.fonts.ready;
  initHero();
  initManifesto();
  initThemeMorph();
  initSpecs();
  initAero();
  initEngine();
  initInterior();
  initDynamics();
  initPackages();
  initOutro();
  initNav();
  ScrollTrigger.refresh();
  await runLoader();
}

boot();
