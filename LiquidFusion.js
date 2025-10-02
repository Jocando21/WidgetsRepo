const LiquidFusion = (function () {
  function deepMerge(a, b) {
    const o = JSON.parse(JSON.stringify(a || {}));
    function m(t, s) {
      Object.keys(s || {}).forEach((k) => {
        if (s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) {
          if (!t[k]) t[k] = {};
          m(t[k], s[k]);
        } else t[k] = s[k];
      });
    }
    m(o, b || {});
    return o;
  }
  function normHex(h) {
    return h && h[0] === "#" ? h : "#" + h;
  }
  function hexToRgb(h) {
    h = normHex(h);
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16),
    };
  }
  function rgbToHex(r, g, b) {
    const c = (n) =>
      Math.max(0, Math.min(255, Math.round(n)))
        .toString(16)
        .padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function lerpHex(h1, h2, t) {
    const a = hexToRgb(h1),
      b = hexToRgb(h2);
    return rgbToHex(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t));
  }
  function shade(hex, p) {
    const { r, g, b } = hexToRgb(hex);
    const t = p < 0 ? 0 : 255;
    const f = Math.abs(p);
    return rgbToHex((t - r) * f + r, (t - g) * f + g, (t - b) * f + b);
  }
  function angleLinearGradient(ctx, cx, cy, w, h, deg) {
    const r = 0.5 * Math.hypot(w, h);
    const rad = ((90 - deg) * Math.PI) / 180;
    const dx = Math.cos(rad) * r,
      dy = Math.sin(rad) * r;
    return ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  }
  function pickTwo(obj) {
    const keys = Object.keys(obj || {});
    if (keys.length < 2) return ["", ""];
    const i = Math.floor(Math.random() * keys.length);
    let j = Math.floor(Math.random() * (keys.length - 1));
    if (j >= i) j++;
    return [keys[i], keys[j]];
  }
  function pickResult(probs, results) {
    const total = probs.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    for (const r of probs) {
      if (roll < r.weight) {
        const keys = Object.keys((results && results[r.tier]) || {});
        const key = keys[Math.floor(Math.random() * keys.length)];
        return {
          tier: r.tier,
          key,
          svg: results[r.tier] ? results[r.tier][key] : "",
        };
      }
      roll -= r.weight;
    }
    return { tier: null, key: null, svg: "" };
  }
  function Kit(user) {
    const defaults = {
      frame: { left: 200, right: 400, top: 150, bottom: 450, cx: 300, rx: 100 },
      physics: {
        levelEase: 0.12,
        tiltEase: 0.14,
        ryEase: 0.18,
        strokeEase: 0.25,
        ampBase: 4,
        ampMax: 12,
        tiltScale: 28,
        sloshOmegaBase: 0.06,
        sloshOmegaVar: 0.04,
        sloshDamp: 0.985,
      },
      surface: { ry: 35 },
      outlines: { topWidth: 2.7, bodyWidth: 2 },
      palette: {
        surfaceA: "#B480C2",
        surfaceB: "#521873",
        liquidBaseA: "#B480C2",
        liquidBaseB: "#521873",
        liquidMixA: "#97C280",
        liquidMixB: "#3F7318",
        bubblesBase: "#B381C3",
        bubblesMix: "#A7C381",
      },
      gradient: { surfaceAngle: 90, bodyAngle: 90 },
      base: { level: 28, tilt: 2.8 },
      bubbles: {
        size: [12, 32],
        rise: [100, 160],
        drift: [-20, 20],
        speed: [50, 90],
        wobbleHz: [0.4, 1],
        wobbleAmp: [6, 16],
        pulseHz: [0.4, 0.9],
        ratePerSec: 6,
        burstChance: 0.08,
        burstCount: [2, 4],
        maxActive: 16,
        spawnerWidth: 196,
        surfaceBottom: 180,
        pop: { scale: 1.6, duration: 200, ring: true, ringStroke: 2 },
        scaleIn: { duration: 0.45, from: 0.45 },
      },
      fusion: {
        orbitMode: "coorbit",
        motion: { baseSpeed: 0.45 },
        spawn: { durationMs: 600, scaleFrom: 0.65, opacityFrom: 0 },
        ramp: { preTargetSpeed: 2, durationMs: 2000 },
        preFuse: { turns: 2 },
        fuse: { fuseSpeed: 2.6, durationMs: 1200, blurMax: 6, targetRadius: 0 },
        reveal: {
          startRadius: 0,
          targetRadius: 0,
          durationMs: 900,
          scaleFrom: 0,
          scaleTo: 1,
        },
        display: { holdAfterMs: 2000, fadeOutMs: 520, flashMs: 420 },
        center: { snapPx: 1 },
        newOsc: { ampDeg: 5, speedHz: 0.6 },
        limits: { maxSeparation: null },
        orbits: {
          A: {
            radius: 140,
            dir: 1,
            startAngle: 0,
            rotY: 4,
            ellipseY: 0.2,
            depthAmp: 20,
            zAmp: 20,
            zPhase: 0,
            scale: 1,
          },
          B: {
            radius: 140,
            dir: -1,
            startAngle: Math.PI,
            rotY: -4,
            ellipseY: 0.2,
            depthAmp: 20,
            zAmp: 20,
            zPhase: 0.5,
            scale: 1,
          },
          New: {
            dir: 1,
            startAngle: 0,
            rotY: 0,
            ellipseY: 0,
            depthAmp: 0,
            zAmp: 0,
            zPhase: 0,
            scale: 1,
          },
        },
      },
      materials: {},
      results: {},
      resultProbs: [
        { tier: "common", weight: 70 },
        { tier: "rare", weight: 25 },
        { tier: "legendary", weight: 5 },
      ],
      mount: {
        canvas: "#c",
        bubbles: "#bubles-layer",
        fusion: "#fusion",
        fire: "#fire",
      },
      lottieUrl:
        "https://lottie.host/eab7593c-380a-4303-84ac-440ec3305c3b/17cYyuRqOJ.json",
      domHex: "#ff7a0e",
      exposeGlobals: false,
    };
    const W = deepMerge(defaults, user || {});
    let CONFIG = deepMerge(defaults, W);
    CONFIG.materials = W.materials || {};
    const RESULTS = deepMerge({}, W.results || {});
    const RESULT_PROBS =
      Array.isArray(W.resultProbs) && W.resultProbs.length
        ? W.resultProbs
        : defaults.resultProbs;
    let fusionLoopStarted = false;
    const cv = document.querySelector(W.mount.canvas),
      ctx = cv ? cv.getContext("2d") : null;
    if (CONFIG.palette.liquidBaseA) CONFIG.palette.surfaceA = CONFIG.palette.liquidBaseA;
    if (CONFIG.palette.liquidBaseB) CONFIG.palette.surfaceB = CONFIG.palette.liquidBaseB;
    let L = CONFIG.base.level,
      LT = CONFIG.base.level,
      T = 0,
      TDeg = CONFIG.base.tilt,
      TDegT = CONFIG.base.tilt,
      RY = CONFIG.surface.ry,
      RYT = CONFIG.surface.ry,
      SWTop = CONFIG.outlines.topWidth,
      SWTopT = CONFIG.outlines.topWidth,
      SWBody = CONFIG.outlines.bodyWidth,
      SWBodyT = CONFIG.outlines.bodyWidth,
      sloshAmp = 0,
      sloshPhase = 0,
      sloshOmega = 0.08,
      sloshDamp = CONFIG.physics.sloshDamp;
    function topPoint(t, cx, rx, ry, baseY, d, phase, amp) {
      const x = cx + rx * Math.cos(t);
      let y = baseY + ry * Math.sin(t);
      const k = (x - cx) / rx;
      const f = 1 - Math.pow(Math.abs(k), 3);
      y += k * d;
      y += Math.sin(t * 2 + phase) * amp * f;
      return { x, y };
    }
    function drawLiquid() {
      const P = CONFIG.physics;
      L += (LT - L) * P.levelEase;
      TDeg += (TDegT - TDeg) * P.tiltEase;
      RY += (RYT - RY) * P.ryEase;
      SWTop += (SWTopT - SWTop) * P.strokeEase;
      SWBody += (SWBodyT - SWBody) * P.strokeEase;
      T += 0.05;
      const F = CONFIG.frame,
        cx = F.cx,
        rx = F.rx,
        left = F.left,
        right = F.right,
        top = F.top,
        bottom = F.bottom;
      const h = (bottom - top) * (L / 100),
        baseY = bottom - h;
      sloshOmega = P.sloshOmegaBase + P.sloshOmegaVar * (1 - L / 100);
      sloshPhase += sloshOmega;
      sloshAmp *= P.sloshDamp;
      const tiltEff = TDeg + sloshAmp * Math.sin(sloshPhase),
        d = Math.tan((tiltEff * Math.PI) / 180) * P.tiltScale,
        amp = P.ampBase + Math.min(P.ampMax, Math.abs(LT - L) * 0.6) * 0.25,
        phase = T * 0.9,
        step = 0.02;
      const surfPts = [];
      for (let t = Math.PI; t >= 0; t -= step)
        surfPts.push(topPoint(t, cx, rx, RY, baseY, d, phase, amp));
      const leftTop = surfPts[0];
      const fullPts = [];
      for (let t = 0; t <= Math.PI * 2; t += step)
        fullPts.push(topPoint(t, cx, rx, RY, baseY, d, phase, amp));
      const topA = CONFIG.palette.surfaceA,
        topB = CONFIG.palette.surfaceB;
      const bodyGrad = angleLinearGradient(
        ctx,
        cx,
        (baseY + bottom) / 2,
        right - left,
        Math.max(1, bottom - baseY),
        CONFIG.gradient.bodyAngle
      );
      bodyGrad.addColorStop(0, shade(topA, 0.2));
      bodyGrad.addColorStop(0.55, shade(topA, 0.05));
      bodyGrad.addColorStop(1, shade(topB, -0.05));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      ctx.lineTo(leftTop.x, leftTop.y);
      for (const p of surfPts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(right, bottom);
      ctx.closePath();
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.restore();
      const surfaceGrad = angleLinearGradient(
        ctx,
        cx,
        baseY,
        rx * 2,
        RY * 2,
        CONFIG.gradient.surfaceAngle
      );
      surfaceGrad.addColorStop(0, topA);
      surfaceGrad.addColorStop(1, topB);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(fullPts[0].x, fullPts[0].y);
      for (const p of fullPts) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fillStyle = surfaceGrad;
      ctx.fill();
      ctx.strokeStyle = shade(topB, -0.15);
      ctx.lineWidth = Math.max(0.001, SWTop);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = shade(topB, -0.2);
      ctx.lineWidth = Math.max(0.001, SWBody);
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      ctx.lineTo(leftTop.x, leftTop.y);
      for (const p of surfPts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(right, bottom);
      ctx.stroke();
      ctx.restore();
    }
    const Bubbles = (function () {
      const host = document.querySelector(W.mount.bubbles);
      const stage = document.createElement("div");
      stage.setAttribute("data-bubbles-stage", "");
      stage.style.position = "relative";
      stage.style.width = "400px";
      stage.style.height = "400px";
      stage.style.overflow = "hidden";
      stage.style.pointerEvents = "none";
      if (host) host.appendChild(stage);
      let active = 0;
      function makePalette(mainHex) {
        const h = normHex(mainHex),
          a = hexToRgb(h),
          to01 = (c) => c / 255;
        const r = to01(a.r),
          g = to01(a.g),
          b = to01(a.b);
        const max = Math.max(r, g, b),
          min = Math.min(r, g, b);
        let hh = 0,
          s,
          l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r:
              hh = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              hh = (b - r) / d + 2;
              break;
            default:
              hh = (r - g) / d + 4;
          }
          hh /= 6;
        } else s = 0;
        function hslToRgb(h, s, l) {
          if (s === 0) return { r: l, g: l, b: l };
          const hue2 = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          return {
            r: hue2(p, q, h + 1 / 3),
            g: hue2(p, q, h),
            b: hue2(p, q, h - 1 / 3),
          };
        }
        const hueNudge = 0.002;
        const c1 = hslToRgb(
          (hh + hueNudge) % 1,
          Math.min(1, s * 1.85),
          Math.min(1, l + 0.22)
        );
        const c2 = hslToRgb(
          (hh - hueNudge + 1) % 1,
          Math.min(1, s * 0.92),
          Math.max(0, l - 0.065)
        );
        const c3 = hslToRgb(
          (hh + 2 * hueNudge) % 1,
          Math.min(1, s * 1.3),
          Math.min(1, l + 0.13)
        );
        const to255 = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255);
        return [
          `#${to255(r).toString(16).padStart(2, "0")}${to255(g)
            .toString(16)
            .padStart(2, "0")}${to255(b)
            .toString(16)
            .padStart(2, "0")}`.toUpperCase(),
          rgbToHex(to255(c1.r), to255(c1.g), to255(c1.b)),
          rgbToHex(to255(c2.r), to255(c2.g), to255(c2.b)),
          rgbToHex(to255(c3.r), to255(c3.g), to255(c3.b)),
        ];
      }
      let currentHex = CONFIG.palette.bubblesBase || CONFIG.palette.surfaceA;
      let palette = makePalette(currentHex);
      if (!document.getElementById("bubbles-dyn")) {
        const st = document.createElement("style");
        st.id = "bubbles-dyn";
        st.textContent = `[data-bubbles-stage]{--bubble-fill-0:${palette[0]};--bubble-fill-1:${palette[1]};--bubble-fill-2:${palette[2]};--bubble-fill-3:${palette[3]}}[data-bubbles-stage] .bubble{position:absolute;left:0;top:0;will-change:transform,opacity}[data-bubbles-stage] .bubble svg{display:block}.bubble-shape,.bubble-shape *{transition:fill 420ms ease;stroke:none!important}.tone-0,.tone-0 *{fill:var(--bubble-fill-0)!important}.tone-1,.tone-1 *{fill:var(--bubble-fill-1)!important}.tone-2,.tone-2 *{fill:var(--bubble-fill-2)!important}.tone-3,.tone-3 *{fill:var(--bubble-fill-3)!important}`;
        document.head.appendChild(st);
      }
      const svgs = [
        '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11"/></svg>',
        '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11"/></svg>',
        '<svg width="9" height="8" viewBox="0 0 9 8"><path d="M8.33301 3.7802L7.23846 3.45221C6.74555 3.3065 6.29655 3.03058 5.93443 2.65086C5.5723 2.27115 5.30917 1.80033 5.17021 1.28348L4.85742 0.135748C4.84169 0.0955924 4.81493 0.0612472 4.78054 0.0370763C4.74615 0.0129054 4.70568 0 4.66428 0C4.62288 0 4.58242 0.0129054 4.54803 0.0370763C4.51364 0.0612472 4.48688 0.0955924 4.47115 0.135748L4.15836 1.28348C4.0194 1.80033 3.75627 2.27115 3.39414 2.65086C3.03202 3.03058 2.58302 3.3065 2.09011 3.45221L0.995554 3.7802C0.953526 3.79271 0.916537 3.81925 0.890198 3.8558C0.86386 3.89234 0.849609 3.9369 0.849609 3.98271C0.849609 4.02852 0.86386 4.07308 0.890198 4.10963C0.916537 4.14618 0.953526 4.17272 0.995554 4.18523L2.09011 4.51321C2.58302 4.65893 3.03202 4.93485 3.39414 5.31456C3.75627 5.69428 4.0194 6.16509 4.15836 6.68195L4.47115 7.82968C4.48308 7.87375 4.50839 7.91253 4.54325 7.94015C4.5781 7.96777 4.6206 7.98271 4.66428 7.98271C4.70797 7.98271 4.75047 7.96777 4.78532 7.94015C4.82018 7.91253 4.84549 7.87375 4.85742 7.82968L5.17021 6.68195C5.30917 6.16509 5.5723 5.69428 5.93443 5.31456C6.29655 4.93485 6.74555 4.65893 7.23846 4.51321L8.33301 4.18523C8.37504 4.17272 8.41203 4.14618 8.43837 4.10963C8.46471 4.07308 8.47896 4.02852 8.47896 3.98271C8.47896 3.9369 8.46471 3.89234 8.43837 3.8558C8.41203 3.81925 8.37504 3.79271 8.33301 3.7802Z"/></svg>',
      ];
      function svgNode() {
        const s = svgs[Math.floor(Math.random() * svgs.length)];
        const div = document.createElement("div");
        div.innerHTML = s.trim();
        const node = div.firstChild;
        const toneIdx = Math.floor(Math.random() * 4);
        node.classList.add("bubble-shape", `tone-${toneIdx}`);
        node.removeAttribute("fill");
        node.removeAttribute("stroke");
        node.querySelectorAll("*").forEach((n) => {
          n.removeAttribute("fill");
          n.removeAttribute("stroke");
        });
        return node;
      }
      function popEffect(x, y, base) {
        const p = document.createElement("span");
        p.style.position = "absolute";
        p.style.left = "0";
        p.style.top = "0";
        const d = base;
        p.style.width = d + "px";
        p.style.height = d + "px";
        p.style.transform = `translate(${x}px,${y}px) scale(1)`;
        p.style.borderRadius = "50%";
        p.style.opacity = "1";
        p.style.border = `${CONFIG.bubbles.pop.ringStroke}px solid ${palette[0]}`;
        p.style.boxShadow = `0 0 8px ${palette[1]}80`;
        p.style.background = "transparent";
        p.setAttribute("aria-hidden", "true");
        stage.appendChild(p);
        const kf = [
          { transform: `translate(${x}px,${y}px) scale(1)`, opacity: 1 },
          {
            transform: `translate(${x}px,${y}px) scale(${CONFIG.bubbles.pop.scale})`,
            opacity: 0,
          },
        ];
        const an = p.animate(kf, {
          duration: CONFIG.bubbles.pop.duration,
          easing: "linear",
          fill: "forwards",
        });
        an.finished.finally(() => p.remove());
      }
      function spawnOne() {
        if (active >= CONFIG.bubbles.maxActive) return;
        active++;
        const el = document.createElement("span");
        el.className = "bubble";
        el.setAttribute("aria-hidden", "true");
        const s =
          CONFIG.bubbles.size[0] +
          Math.random() * (CONFIG.bubbles.size[1] - CONFIG.bubbles.size[0]);
        const x0 =
          stage.clientWidth / 2 -
          CONFIG.bubbles.spawnerWidth / 2 +
          Math.random() * CONFIG.bubbles.spawnerWidth;
        const y0 = CONFIG.bubbles.surfaceBottom - s * 0.4;
        const shape = svgNode();
        shape.setAttribute("width", s);
        shape.setAttribute("height", s);
        el.appendChild(shape);
        stage.appendChild(el);
        const rise =
          CONFIG.bubbles.rise[0] +
          Math.random() * (CONFIG.bubbles.rise[1] - CONFIG.bubbles.rise[0]);
        const drift =
          CONFIG.bubbles.drift[0] +
          Math.random() * (CONFIG.bubbles.drift[1] - CONFIG.bubbles.drift[0]);
        const speed =
          CONFIG.bubbles.speed[0] +
          Math.random() * (CONFIG.bubbles.speed[1] - CONFIG.bubbles.speed[0]);
        const wobHz =
          CONFIG.bubbles.wobbleHz[0] +
          Math.random() *
            (CONFIG.bubbles.wobbleHz[1] - CONFIG.bubbles.wobbleHz[0]);
        const wobAmp =
          CONFIG.bubbles.wobbleAmp[0] +
          Math.random() *
            (CONFIG.bubbles.wobbleAmp[1] - CONFIG.bubbles.wobbleAmp[0]);
        const pulseHz =
          CONFIG.bubbles.pulseHz[0] +
          Math.random() *
            (CONFIG.bubbles.pulseHz[1] - CONFIG.bubbles.pulseHz[0]);
        const yStart = stage.clientHeight - y0 - s / 2;
        const yEnd = yStart - rise;
        const xStart = x0 - s / 2;
        const tTotal = Math.max(0.6, rise / speed);
        let t0 = null,
          lastX = xStart,
          lastY = yStart;
        function tick(t) {
          if (!t0) t0 = t;
          const tt = (t - t0) / 1000;
          const p = Math.min(1, tt / tTotal);
          const y = yStart + (yEnd - yStart) * p;
          const x =
            xStart +
            drift * p +
            Math.sin(tt * 2 * Math.PI * wobHz) * wobAmp * (1 - p);
          const g = Math.max(
            0,
            Math.min(1, tt / CONFIG.bubbles.scaleIn.duration)
          );
          const env =
            CONFIG.bubbles.scaleIn.from + (1 - CONFIG.bubbles.scaleIn.from) * g;
          const base = 0.94 + 0.06 * Math.sin(tt * 2 * Math.PI * pulseHz);
          const scale = env * base;
          let op = 1;
          if (p < 0.12) op = p / 0.12;
          else if (p > 0.85) op = (1 - p) / 0.15;
          el.style.opacity = String(Math.max(0, Math.min(1, op)));
          el.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
          lastX = x;
          lastY = y;
          if (p < 1 && running) requestAnimationFrame(tick);
          else {
            el.remove();
            popEffect(lastX, lastY, s);
            active--;
          }
        }
        el.style.transform = `translate(${xStart}px,${yStart}px) scale(${
          CONFIG.bubbles.scaleIn.from * 0.94
        })`;
        el.style.opacity = "0";
        requestAnimationFrame(tick);
      }
      function spawnBurst() {
        const slots = Math.max(0, CONFIG.bubbles.maxActive - active);
        if (slots <= 0) return;
        let n =
          Math.floor(
            Math.random() *
              (CONFIG.bubbles.burstCount[1] - CONFIG.bubbles.burstCount[0] + 1)
          ) + CONFIG.bubbles.burstCount[0];
        n = Math.min(n, slots);
        for (let i = 0; i < n; i++) setTimeout(spawnOne, i * 45);
      }
      let last = performance.now(),
        carry = 0,
        running = false,
        boilTimer = null,
        easingTimer = null;
      function loop(t) {
        if (!running) {
          requestAnimationFrame(loop);
          return;
        }
        const dt = (t - last) / 1000;
        last = t;
        const expected = CONFIG.bubbles.ratePerSec * dt + carry;
        let k = Math.floor(expected);
        carry = expected - k;
        const slots = Math.max(0, CONFIG.bubbles.maxActive - active);
        k = Math.min(k, slots);
        for (let i = 0; i < k; i++) spawnOne();
        if (Math.random() < CONFIG.bubbles.burstChance * dt) spawnBurst();
        requestAnimationFrame(loop);
      }
      function setColor(hex) {
        currentHex = hex;
        palette = makePalette(hex);
        stage.style.setProperty("--bubble-fill-0", palette[0]);
        stage.style.setProperty("--bubble-fill-1", palette[1]);
        stage.style.setProperty("--bubble-fill-2", palette[2]);
        stage.style.setProperty("--bubble-fill-3", palette[3]);
      }
      function getColor() {
        return currentHex;
      }
      const baseState = {
        ratePerSec: CONFIG.bubbles.ratePerSec,
        speedMin: CONFIG.bubbles.speed[0],
        speedMax: CONFIG.bubbles.speed[1],
      };
      function boil(d = 6, b = 2) {
        clearTimeout(boilTimer);
        if (easingTimer) cancelAnimationFrame(easingTimer);
        CONFIG.bubbles.ratePerSec = baseState.ratePerSec * b;
        CONFIG.bubbles.speed = [baseState.speedMin * b, baseState.speedMax * b];
        boilTimer = setTimeout(() => {
          const s = performance.now();
          const dur = 1200;
          const from = {
            rate: CONFIG.bubbles.ratePerSec,
            s0: CONFIG.bubbles.speed[0],
            s1: CONFIG.bubbles.speed[1],
          };
          function back(t) {
            const k = Math.max(0, Math.min(1, (t - s) / dur));
            const e = 1 - (1 - k) * (1 - k);
            CONFIG.bubbles.ratePerSec =
              from.rate + (baseState.ratePerSec - from.rate) * e;
            CONFIG.bubbles.speed[0] =
              from.s0 + (baseState.speedMin - from.s0) * e;
            CONFIG.bubbles.speed[1] =
              from.s1 + (baseState.speedMax - from.s1) * e;
            if (k < 1) easingTimer = requestAnimationFrame(back);
          }
          easingTimer = requestAnimationFrame(back);
        }, Math.max(0, d * 1000));
      }
      function start() {
        if (running) return;
        running = true;
        last = performance.now();
        requestAnimationFrame(loop);
      }
      function stop() {
        running = false;
      }
      function dispose() {
        stop();
        if (typeof easingTimer === "number") cancelAnimationFrame(easingTimer);
        clearTimeout(boilTimer);
        stage.querySelectorAll(".bubble").forEach((n) => n.remove());
      }
      stage.style.setProperty("--bubble-fill-0", palette[0]);
      stage.style.setProperty("--bubble-fill-1", palette[1]);
      stage.style.setProperty("--bubble-fill-2", palette[2]);
      stage.style.setProperty("--bubble-fill-3", palette[3]);
      return { start, stop, dispose, setColor, getColor, boil, stage };
    })();
    (function () {
      const easeOut = (t) => 1 - Math.pow(1 - t, 3),
        easeInOut = (t) =>
          t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      let root,
        stage,
        flash,
        orbits = [],
        t0 = performance.now(),
        running = false,
        state = "idle",
        spoolCtx = null;
      function ensureStage() {
        if (stage) return;
        root = document.querySelector(W.mount.fusion);
        stage = document.createElement("div");
        stage.className = "stage";
        flash = document.createElement("div");
        flash.className = "flash";
        stage.appendChild(flash);
        if (root) root.appendChild(stage);
        if (!fusionLoopStarted) {
          fusionLoopStarted = true;
          requestAnimationFrame((now) => {
            t0 = now;
            requestAnimationFrame(fusionLoop);
          });
        }
      }
      function fusionLoop(now) {
        if (!running) {
          requestAnimationFrame(fusionLoop);
          return;
        }
        const dt = Math.min(0.05, (now - t0) / 1000);
        t0 = now;
        const F = CONFIG.fusion,
          snap = F.center.snapPx ?? 0,
          ms = F.limits.maxSeparation,
          maxR = typeof ms === "number" && ms > 0 ? ms * 0.5 : null;
        for (const o of orbits) {
          if (!o.spawnDone) {
            const sp = Math.min(1, (now - o.spawnStart) / o.spawnDur),
              se = easeOut(sp);
            o.scale = lerp(o.scaleStart, o.scaleTarget, se);
            o.node.style.opacity = lerp(F.spawn.opacityFrom, 1, se);
            if (sp === 1) o.spawnDone = true;
          }
          if (o.stateSpin) {
            o.angle += o.speed * o.dir * dt;
            const depth = Math.sin(o.angle) * o.depthAmp;
            o.el.style.transform = `translate(-50%,-50%) rotateY(${o.rotY}deg) translateZ(${depth}px)`;
            const rEff = maxR ? Math.min(o.radius, maxR) : o.radius;
            let x = Math.cos(o.angle) * rEff,
              y = Math.sin(o.angle) * rEff * o.ellipseY,
              z = Math.sin(o.angle + o.zPhase) * o.zAmp;
            if (snap) {
              x = Math.round(x / snap) * snap;
              y = Math.round(y / snap) * snap;
              z = Math.round(z / snap) * snap;
            }
            o.node.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateZ(${o.angle}rad) scale(${o.scale})`;
            if (state === "spooling" && spoolCtx) {
              const d = o.angle - o.prevAngle;
              o.revProgress += Math.abs(d) / (Math.PI * 2);
              o.prevAngle = o.angle;
            }
          } else if (o.oscillate) {
            o.oscPhase += o.oscOmega * dt;
            const rot = Math.sin(o.oscPhase) * o.oscAmpDeg;
            o.node.style.transform = `translate3d(0,0,0) rotate(${rot}deg) scale(${o.scale})`;
          }
        }
        if (state === "spooling" && spoolCtx && !spoolCtx.fuseTriggered) {
          const minTurns = Math.min(
            ...spoolCtx.orbits.map((o) => o.revProgress)
          );
          if (spoolCtx.rampDone && minTurns >= spoolCtx.targetTurns) {
            spoolCtx.fuseTriggered = true;
            fuse(spoolCtx.orbits[0], spoolCtx.orbits[1], spoolCtx.svgNew);
          }
        }
        requestAnimationFrame(fusionLoop);
      }
      function flashBang() {
        const F = CONFIG.fusion;
        flash.animate(
          [{ opacity: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }],
          { duration: F.display.flashMs, easing: "cubic-bezier(.2,.8,.2,1)" }
        );
      }
      function createOrbit(svgString, radius, opts = {}) {
        const wrap = document.createElement("div");
        wrap.className = "orbit";
        const orb = document.createElement("div");
        orb.className = "orb";
        orb.innerHTML = svgString;
        wrap.appendChild(orb);
        stage.appendChild(wrap);
        const F = CONFIG.fusion,
          spawnEnabled = opts.spawn !== false,
          angle0 = opts.startAngle ?? 0;
        const o = {
          el: wrap,
          node: orb,
          angle: angle0,
          prevAngle: angle0,
          revProgress: 0,
          speed: F.motion.baseSpeed,
          dir: opts.dir ?? 1,
          radius,
          blur: 0,
          rotY: opts.rotY ?? 20,
          depthAmp: opts.depthAmp ?? 60,
          ellipseY: opts.ellipseY ?? 0.6,
          zAmp: opts.zAmp ?? 80,
          zPhase: opts.zPhase ?? 0,
          scaleStart: spawnEnabled ? F.spawn.scaleFrom : opts.scale ?? 1,
          scaleTarget: opts.scale ?? 1,
          scale: spawnEnabled ? F.spawn.scaleFrom : opts.scale ?? 1,
          spawnStart: performance.now(),
          spawnDur: spawnEnabled ? F.spawn.durationMs : 0,
          spawnDone: !spawnEnabled,
          stateSpin: true,
          oscillate: !!opts.oscillate,
          oscAmpDeg: opts.oscAmpDeg ?? F.newOsc.ampDeg,
          oscOmega: (opts.oscSpeedHz ?? F.newOsc.speedHz) * Math.PI * 2,
          oscPhase: opts.oscPhase ?? 0,
        };
        orb.style.opacity = spawnEnabled ? F.spawn.opacityFrom : 1;
        return o;
      }
      function clearStage() {
        for (const o of orbits) o.el.remove();
        orbits = [];
        state = "idle";
        running = false;
        spoolCtx = null;
      }
      function prepareOrbitConfigs() {
        const F = CONFIG.fusion,
          A = { ...F.orbits.A },
          B = { ...F.orbits.B };
        if (F.orbitMode === "coorbit") {
          A.dir = 1;
          B.dir = 1;
          A.startAngle = 0;
          B.startAngle = Math.PI;
          B.rotY = A.rotY;
        }
        return { A, B };
      }
      function summon(svgA, svgB, svgNew) {
        clearStage();
        const F = CONFIG.fusion,
          { A: cfgA, B: cfgB } = prepareOrbitConfigs();
        const A = createOrbit(svgA, cfgA.radius ?? F.orbits.A.radius, cfgA);
        const B = createOrbit(svgB, cfgB.radius ?? F.orbits.B.radius, cfgB);
        orbits.push(A, B);
        running = true;
        t0 = performance.now();
        state = "spooling";
        spoolCtx = {
          targetTurns: F.preFuse.turns,
          rampDone: false,
          fuseTriggered: false,
          orbits: [A, B],
          svgNew,
        };
        const s0 = performance.now();
        (function accelStep(now) {
          const t = Math.min(1, (now - s0) / F.ramp.durationMs),
            e = easeInOut(t);
          A.speed = lerp(F.motion.baseSpeed, F.ramp.preTargetSpeed, e);
          B.speed = lerp(F.motion.baseSpeed, F.ramp.preTargetSpeed, e);
          if (t < 1) requestAnimationFrame(accelStep);
          else spoolCtx.rampDone = true;
        })(performance.now());
      }
      function fuse(A, B, svgNew) {
        const F = CONFIG.fusion;
        state = "fusing";
        const baseRA = A.radius,
          baseRB = B.radius,
          s1 = performance.now();
        (function fuseStep(now) {
          const t = Math.min(1, (now - s1) / F.fuse.durationMs),
            e = easeInOut(t);
          A.radius = lerp(baseRA, F.fuse.targetRadius, e);
          B.radius = lerp(baseRB, F.fuse.targetRadius, e);
          A.speed = lerp(F.ramp.preTargetSpeed, F.fuse.fuseSpeed, e);
          B.speed = lerp(F.ramp.preTargetSpeed, F.fuse.fuseSpeed, e);
          const bl = lerp(0, F.fuse.blurMax, e);
          A.el.style.setProperty("--blur", bl + "px");
          B.el.style.setProperty("--blur", bl + "px");
          if (t < 1) {
            requestAnimationFrame(fuseStep);
            return;
          }
          flashBang();
          A.el.classList.add("hidden");
          B.el.classList.add("hidden");
          const N = createOrbit(svgNew, F.reveal.startRadius, {
            ...F.orbits.New,
            spawn: false,
            scale: F.reveal.scaleFrom,
            oscillate: true,
            oscAmpDeg: F.newOsc.ampDeg,
            oscSpeedHz: F.newOsc.speedHz,
            oscPhase: 0,
          });
          N.stateSpin = false;
          orbits.push(N);
          state = "new";
          const s2 = performance.now();
          N.node.style.opacity = 0;
          (function grow(now2) {
            const tt = Math.min(1, (now2 - s2) / F.reveal.durationMs),
              ee = easeOut(tt);
            N.radius = lerp(F.reveal.startRadius, F.reveal.targetRadius, ee);
            N.scale = lerp(F.reveal.scaleFrom, F.reveal.scaleTo, ee);
            N.node.style.opacity = ee;
            if (tt < 1) requestAnimationFrame(grow);
          })(performance.now());
          setTimeout(() => {
            for (const o of orbits) o.el.classList.add("fade-out");
            setTimeout(clearStage, F.display.fadeOutMs);
          }, F.display.holdAfterMs);
        })(performance.now());
      }
      function setMode(m) {
        const F = CONFIG.fusion;
        if (m === "counter" || m === "coorbit") F.orbitMode = m;
      }
      function setTurns(n) {
        if (n >= 0) CONFIG.fusion.preFuse.turns = n;
      }
      function setMaxSeparation(px) {
        CONFIG.fusion.limits.maxSeparation =
          typeof px === "number" && px > 0 ? px : null;
      }
      function selectResult(res) {
        if (res && res.tier && res.key) {
          return {
            tier: res.tier,
            key: res.key,
            svg: (RESULTS[res.tier] && RESULTS[res.tier][res.key]) || "",
          };
        }
        return pickResult(RESULT_PROBS, RESULTS);
      }
      function mix(a, b, res, mode, turns, sep) {
        try {
          ensureStage();
          if (mode) setMode(mode === "orbit" ? "coorbit" : mode);
          if (typeof turns === "number") setTurns(turns);
          if (typeof sep === "number") setMaxSeparation(sep);
          if (!a || !b) {
            const [kA, kB] = pickTwo(CONFIG.materials);
            a = kA;
            b = kB;
          }
          const svgA = CONFIG.materials[a] || "",
            svgB = CONFIG.materials[b] || "";
          const resultObj = selectResult(res);
          const svgN = resultObj.svg || "";
          CONFIG.fusion.reveal.startRadius = 0;
          CONFIG.fusion.reveal.targetRadius = 0;
          requestAnimationFrame(() => {
            summon(svgA, svgB, svgN);
          });
        } catch (e) {}
      }
      function runAll({
        mat1,
        mat2,
        res,
        mode = "orbit",
        turns = 2,
        sep = null,
        colorA,
        colorB,
        bubblesColor,
        fadeMs = 600,
        boilDur = 6,
        boilBoost = 2,
        revertFadeMs = 500,
        reverseWait = 0,
        mixWait = 0,
        reverseAt = "afterReveal",
      }) {
        const num = (v, f) => (Number.isFinite(+v) ? +v : f);
        turns = num(turns, 2);
        sep = sep == null ? null : num(sep, 180);
        fadeMs = num(fadeMs, 600);
        boilDur = num(boilDur, 6);
        boilBoost = num(boilBoost, 2);
        revertFadeMs = num(revertFadeMs, 500);
        reverseWait = Math.max(0, num(reverseWait, 0));
        mixWait = Math.max(0, num(mixWait, 0));
        const liquidMixA = colorA || CONFIG.palette.liquidMixA || CONFIG.palette.surfaceA;
        const liquidMixB = colorB || CONFIG.palette.liquidMixB || CONFIG.palette.surfaceB;
        const bubblesMix = bubblesColor || CONFIG.palette.bubblesMix || liquidMixA;
        const a0 =
            (CONFIG && CONFIG.palette && CONFIG.palette.surfaceA) || liquidMixA,
          b0 =
            (CONFIG && CONFIG.palette && CONFIG.palette.surfaceB) || liquidMixB;
        const bubs0 =
          (Bubbles && Bubbles.getColor && Bubbles.getColor()) ||
          CONFIG.palette.bubblesBase ||
          a0;
        const picked = selectResult(res);
        function fadeLiquid(fromA, fromB, toA, toB, ms) {
          ms = num(ms, 0);
          if (ms <= 0) {
            if (CONFIG && CONFIG.palette) {
              CONFIG.palette.surfaceA = toA;
              CONFIG.palette.surfaceB = toB;
            }
            return;
          }
          const t0 = performance.now();
          function step(t) {
            const k = Math.min(1, (t - t0) / ms);
            const ca = lerpHex(fromA, toA, k),
              cb = lerpHex(fromB, toB, k);
            if (CONFIG && CONFIG.palette) {
              CONFIG.palette.surfaceA = ca;
              CONFIG.palette.surfaceB = cb;
            }
            if (k < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
        function fadeBubbles(from, to, ms) {
          ms = num(ms, 0);
          if (!Bubbles || !Bubbles.setColor) return;
          if (ms <= 0) {
            try {
              Bubbles.setColor(to);
            } catch {}
            return;
          }
          const t0 = performance.now();
          function step(t) {
            const k = Math.min(1, (t - t0) / ms);
            const c = lerpHex(from, to, k);
            try {
              Bubbles.setColor(c);
            } catch {}
            if (k < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
        try {
          Bubbles && Bubbles.boil && Bubbles.boil(boilDur, boilBoost);
        } catch {}
        fadeLiquid(a0, b0, liquidMixA, liquidMixB, fadeMs);
        fadeBubbles(bubs0, bubblesMix, fadeMs);
        const doMix = () => {
          let F = (CONFIG && CONFIG.fusion) || {};
          const rampMs = num(F.ramp && F.ramp.durationMs, 400);
          const preTurns = num(
            typeof turns === "number" ? turns : F.preFuse && F.preFuse.turns,
            2
          );
          const preSpd = Math.max(
            0.001,
            num(F.ramp && F.ramp.preTargetSpeed, 2)
          );
          const spinMs = Math.max(
            0,
            ((preTurns * (2 * Math.PI)) / preSpd) * 1000
          );
          const fuseMs = num(F.fuse && F.fuse.durationMs, 800);
          const revealMs = num(F.reveal && F.reveal.durationMs, 600);
          const holdMs = num(F.display && F.display.holdAfterMs, 600);
          const fadeOutMs = num(F.display && F.display.fadeOutMs, 500);
          let afterRamp = rampMs + 80;
          let afterFuse = afterRamp + spinMs + fuseMs;
          let afterReveal = afterFuse + revealMs;
          let afterDisplay = afterReveal + holdMs + fadeOutMs;
          let phaseEnd =
            reverseAt === "afterRamp"
              ? afterRamp
              : reverseAt === "afterFuse"
              ? afterFuse
              : reverseAt === "afterDisplay"
              ? afterDisplay
              : afterReveal;
          let reverted = false;
          function revertNow() {
            if (reverted) return;
            reverted = true;
            const curA =
              (CONFIG && CONFIG.palette && CONFIG.palette.surfaceA) ||
              liquidMixA;
            const curB =
              (CONFIG && CONFIG.palette && CONFIG.palette.surfaceB) ||
              liquidMixB;
            fadeLiquid(curA, curB, a0, b0, revertFadeMs);
            const curBubs =
              (Bubbles && Bubbles.getColor && Bubbles.getColor()) ||
              bubblesMix;
            fadeBubbles(curBubs, bubs0, revertFadeMs);
          }
          let primaryDelay = phaseEnd + reverseWait;
          let watchdogDelay = primaryDelay + Math.max(200, revertFadeMs + 100);
          try {
            mix(
              mat1,
              mat2,
              { tier: picked.tier, key: picked.key },
              mode,
              turns,
              sep
            );
          } catch {
            primaryDelay = reverseWait;
            watchdogDelay = primaryDelay + Math.max(200, revertFadeMs + 100);
          }
          setTimeout(revertNow, primaryDelay);
          setTimeout(revertNow, watchdogDelay);
        };
        setTimeout(doMix, mixWait);
        return [picked.key, picked.tier];
      }
      function setColors(a, b) {
        CONFIG.palette.surfaceA = a;
        CONFIG.palette.surfaceB = b;
      }
      function boilAll(d = 6, b = 2) {
        Bubbles.boil(d, b);
      }
      function all(a, b, d = 6, bb = 2) {
        Bubbles.setColor(a);
        setColors(a, b);
        Bubbles.boil(d, bb);
      }
      function allFade(a, b, d = 6, bb = 2, ms = 420) {
        const a0 = CONFIG.palette.surfaceA,
          b0 = CONFIG.palette.surfaceB;
        const t0 = performance.now();
        Bubbles.setColor(a);
        Bubbles.boil(d, bb);
        function step(t) {
          const k = Math.min(1, (t - t0) / ms);
          CONFIG.palette.surfaceA = lerpHex(a0, a, k);
          CONFIG.palette.surfaceB = lerpHex(b0, b, k);
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
      let svg = null;
      const DOM_HEX = W.domHex;
      const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
      const fromHex = (h) => {
        h = h.replace("#", "");
        return {
          r: parseInt(h.slice(0, 2), 16),
          g: parseInt(h.slice(2, 4), 16),
          b: parseInt(h.slice(4, 6), 16),
        };
      };
      const rgb2hsl = ({ r, g, b }) => {
        r /= 255;
        g /= 255;
        b /= 255;
        const m = Math.max(r, g, b),
          n = Math.min(r, g, b);
        let h,
          s,
          l = (m + n) / 2;
        if (m === n) {
          h = 0;
          s = 0;
        } else {
          const d = m - n;
          s = l > 0.5 ? d / (2 - m - n) : d / (m + n);
          switch (m) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            default:
              h = (r - g) / d + 4;
          }
          h *= 60;
        }
        return { h, s, l };
      };
      const luma = ({ r, g, b }) => {
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const contrast = (a, b) =>
        Math.max(
          (luma(a) + 0.05) / (luma(b) + 0.05),
          (luma(b) + 0.05) / (luma(a) + 0.05)
        );
      const deltaH = (a, b) => ((a - b + 540) % 360) - 180;
      const Ff = (p) =>
        `hue-rotate(${p.h}deg) saturate(${p.s}) brightness(${p.b}) contrast(${p.c})`;
      let base = rgb2hsl(fromHex(DOM_HEX)),
        cur = { h: 0, s: 1, b: 1, c: 1 };
      const calc = (tHEX) => {
        const tRGB = fromHex(tHEX),
          t = rgb2hsl(tRGB),
          domRGB = fromHex(DOM_HEX);
        return {
          h: deltaH(t.h, base.h),
          s: clamp((t.s || 0.0001) / (base.s || 0.0001), 0.05, 20),
          b: clamp((luma(tRGB) + 0.05) / (luma(domRGB) + 0.05), 0.2, 5),
          c:
            contrast(tRGB, domRGB) < 3
              ? clamp(3 / contrast(tRGB, domRGB), 1, 2)
              : 1,
        };
      };
      const animateFilter = (from, to, ms) => {
        if (!svg) return;
        const t0 = performance.now();
        (function step(t) {
          const k = Math.min(1, (t - t0) / ms),
            e = 1 - Math.pow(1 - k, 3);
          const p = {
            h: from.h + e * (to.h - from.h),
            s: from.s + e * (to.s - from.s),
            b: from.b + e * (to.b - from.b),
            c: from.c + e * (to.c - from.c),
          };
          svg.style.filter = Ff(p);
          if (k < 1) requestAnimationFrame(step);
          else cur = to;
        })(performance.now());
      };
      function setFireColor(hex, ms = 420) {
        animateFilter(cur, calc(hex), ms);
      }
      let lottieFire = null;
      function initLottie() {
        if (!window.lottie || !W.lottieUrl) return;
        const c = document.querySelector(W.mount.fire);
        if (!c) return;
        lottieFire = window.lottie.loadAnimation({
          container: c,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: W.lottieUrl,
        });
        lottieFire.addEventListener("DOMLoaded", () => {
          svg = c.querySelector("svg");
          if (svg) svg.style.filter = Ff(cur);
        });
      }
      if (ctx) {
        (function loop() {
          ctx.clearRect(0, 0, cv.width, cv.height);
          drawLiquid();
          requestAnimationFrame(loop);
        })();
      }
      Bubbles.setColor(CONFIG.palette.bubblesBase || CONFIG.palette.surfaceA);
      Bubbles.start();
      initLottie();
      const api = {
        mix,
        runAll,
        setColors,
        boilAll,
        all,
        allFade,
        setFireColor,
        Bubbles,
        CONFIG,
        get materials() {
          return CONFIG.materials;
        },
        set materials(v) {
          CONFIG.materials = v || {};
        },
        get results() {
          return RESULTS;
        },
        get resultProbs() {
          return RESULT_PROBS;
        },
      };
      if (W.exposeGlobals) {
        window.mix = mix;
        window.runAll = runAll;
        window.Bubbles = Bubbles;
        window.setColors = setColors;
        window.boilAll = boilAll;
        window.all = all;
        window.allFade = allFade;
        window.setFireColor = setFireColor;
      }
      return api;
    })();
    return { api: window.runAll ? window : undefined };
  }
  return { init: (cfg) => Kit(cfg) };
})();
