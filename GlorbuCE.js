(function (root, factory) {
  if (typeof define === "function" && define.amd) define([], factory);
  else if (typeof module === "object" && module.exports)
    module.exports = factory();
  else root.GlorbuCE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  function xorshift32(seed) {
    let x = seed >>> 0 || 88675123;
    return () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }
  const stopWords = /[^a-z0-9\s']/gi;
  function normalize(s) {
    return (s || "")
      .toLowerCase()
      .replace(stopWords, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function tokenize(s) {
    return normalize(s).split(" ").filter(Boolean);
  }
  function bow(tokens) {
    const m = new Map();
    for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
    return m;
  }
  function bowCosine(a, b) {
    let dot = 0,
      na = 0,
      nb = 0;
    for (const [k, v] of a) {
      na += v * v;
      if (b.has(k)) dot += v * b.get(k);
    }
    for (const v of b.values()) nb += v * v;
    return !na || !nb ? 0 : dot / Math.sqrt(na * nb);
  }
  function titleCase(s) {
    return String(s)
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }
  function compose(open, core, close) {
    return `${open} ${core} ${close}`.replace(/\s+/g, " ").trim();
  }
  function sanitize(text) {
    return String(text)
      .replace(/[\u2014\u2013]+/g, ", ")
      .replace(/\s*,\s*/g, ", ")
      .replace(/,\s*(\.|!|\?|…)/g, "$1")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([?.!…])/g, "$1");
  }

  class GlorbuCE {
    constructor(opts = {}) {
      this.style = Object.assign(
        { brevity: "medium", randomness: 0.6 },
        opts.style || {}
      );
      this.focus = Array.isArray(opts.focus)
        ? opts.focus
        : opts.focus
        ? [opts.focus]
        : [];
      this.rng = xorshift32(
        typeof opts.seed === "number" ? opts.seed : Date.now() & 0xffffffff
      );
      this.memory = { lastOpen: null, lastClose: null, lastTopics: [] };
      this._addons = [];
      this._intents = [];
      this._transforms = [];
      this._forbid = [];
      this._openings = [];
      this._closers = [];
      this._knowledge = [];
      this._faq = [];
      this._blocks = [
        "The veil denies me this.",
        "Such matters are bound by mortal law; I shall not speak.",
        "Another path must be taken; I will not cross that line.",
      ];
    }

    use(addon) {
      if (!addon || typeof addon.install !== "function") return this;
      const api = {
        addIntent: (def) => {
          if (def && def.name && def.detect && def.respond) {
            def.priority = typeof def.priority === "number" ? def.priority : 50;
            this._intents.push(def);
            this._intents.sort((a, b) => a.priority - b.priority);
          }
        },
        addTransform: (fn) => {
          if (typeof fn === "function") this._transforms.push(fn);
        },
        addForbid: (arr) => {
          if (Array.isArray(arr)) this._forbid.push(...arr);
        },
        addOpenings: (arr) => {
          if (Array.isArray(arr)) this._openings.push(...arr);
        },
        addClosers: (arr) => {
          if (Array.isArray(arr)) this._closers.push(...arr);
        },
        addKnowledge: (packs) => {
          if (Array.isArray(packs)) this._knowledge.push(...packs);
        },
        addFAQ: (pairs) => {
          if (Array.isArray(pairs)) this._faq.push(...pairs);
        },
        addBlocks: (phrases) => {
          if (Array.isArray(phrases)) this._blocks.push(...phrases);
        },
        utils: {
          normalize,
          tokenize,
          bow,
          bowCosine,
          pick: (arr) => pick(this.rng, arr),
          clamp,
          titleCase,
        },
      };
      addon.install(this, api);
      this._addons.push(addon);
      return this;
    }

    loadCustomModel(data) {
      if (!data) return;
      const faqPairs = (Array.isArray(data.faqPatterns) ? data.faqPatterns : [])
        .map((s) => {
          const parts = s.split("->");
          if (parts.length === 2)
            return {
              pattern: new RegExp(parts[0].trim(), "i"),
              answers: [parts[1].trim()],
            };
        })
        .filter(Boolean);
      const addon = {
        install: (core, api) => {
          api.addOpenings(data.openings || []);
          api.addClosers(data.closers || []);
          const forbid = (data.extraForbid || "")
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
          api.addForbid(forbid.map((w) => new RegExp(w, "i")));
          api.addFAQ(faqPairs);
          api.addKnowledge([
            {
              k: (data.keywords || "")
                .split(/[,;]/)
                .map((s) => s.trim())
                .filter(Boolean),
              a: data.responses || [],
            },
          ]);
          api.addTransform((ctx, text) => sanitize(text));
        },
      };
      this.use(addon);
    }

    async loadModel(mode, customArray) {
      if (mode === "spirit" && typeof SpiritGPT === "function") {
        this.use(SpiritGPT({ archaic: 0.6, brevity: "medium" }));
      } else if (mode === "custom" && Array.isArray(customArray)) {
        for (const addon of customArray) {
          this.loadCustomModel(addon);
        }
      }
    }

    rankKnowledge(tokens) {
      const qbow = bow(tokens),
        scored = [];
      for (const entry of this._knowledge) {
        const kwScore = (entry.k || []).reduce(
          (t, w) => t + (qbow.has(w) ? 1 : 0),
          0
        );
        const ebow = bow(entry.k || []);
        const sim = bowCosine(qbow, ebow);
        scored.push({ entry, s: kwScore * 0.7 + sim * 0.6 });
      }
      scored.sort((a, b) => b.s - a.s);
      return scored;
    }

    opening() {
      return this._openings.length ? pick(this.rng, this._openings) : "";
    }
    closing() {
      return this._closers.length ? pick(this.rng, this._closers) : "";
    }

    ask(question) {
      const q = String(question || "").trim();
      if (!q)
        return {
          answer: "Speak clearly across the veil.",
          intent: "none",
          confidence: 0,
          flags: ["empty"],
        };
      for (const re of this._forbid) {
        try {
          if (re instanceof RegExp && re.test(q)) {
            const block = pick(this.rng, this._blocks);
            return {
              answer: block,
              intent: "blocked",
              confidence: 1,
              flags: ["blocked"],
            };
          }
        } catch (_e) {}
      }
      const ctx = {
        q,
        n: normalize(q),
        tokens: tokenize(q),
        rng: this.rng,
        pick: (arr) => pick(this.rng, arr),
        clamp,
        openings: this._openings,
        closers: this._closers,
        opening: () => this.opening(),
        closing: () => this.closing(),
        style: this.style,
        memory: this.memory,
        focus: this.focus,
        knowledge: this._knowledge,
        rankKnowledge: (t) => this.rankKnowledge(t),
        faq: this._faq,
        blocks: this._blocks,
        utils: { normalize, tokenize, bow, bowCosine, titleCase },
      };
      for (const intent of this._intents) {
        try {
          const detected = intent.detect(ctx);
          if (detected) {
            const out = intent.respond(
              Object.assign({}, ctx, { intent: intent.name, detected })
            );
            if (out && out.answer) {
              let text = out.answer;
              for (const t of this._transforms) {
                try {
                  text = t(
                    Object.assign({}, ctx, { intent: intent.name }),
                    text
                  );
                } catch (_e) {}
              }
              text = sanitize(text);
              return {
                answer: text,
                intent: out.intent || intent.name,
                confidence:
                  typeof out.confidence === "number" ? out.confidence : 0.75,
                flags: out.flags || [],
              };
            }
          }
        } catch (_e) {}
      }
      for (const item of this._faq) {
        try {
          if (item.pattern.test(q)) {
            const core = pick(this.rng, item.answers);
            let text = compose(this.opening(), core, this.closing());
            for (const t of this._transforms) {
              try {
                text = t(ctx, text);
              } catch (_e) {}
            }
            text = sanitize(text);
            return {
              answer: text,
              intent: "faq",
              confidence: 0.9,
              flags: ["trained"],
            };
          }
        } catch (_e) {}
      }
      let text = this._openings.length
        ? compose(this.opening(), "Unclear—wait and watch.", this.closing())
        : "Unclear—wait and watch.";
      for (const t of this._transforms) {
        try {
          text = t(ctx, text);
        } catch (_e) {}
      }
      text = sanitize(text);
      return {
        answer: text,
        intent: "open",
        confidence: 0.5,
        flags: ["fallback"],
      };
    }
  }

  if (typeof window !== "undefined" && !window.GlorbuCE)
    window.GlorbuCE = GlorbuCE;
  return GlorbuCE;
});

function resolveAddonByName(name, opts) {
  const map = {
    OuijaCore: typeof window.SpiritGPT === "function" ? window.SpiritGPT : null,
  };
  const fn = map[name] || window[name];
  return typeof fn === "function" ? fn(opts || {}) : null;
}

async function initOracle(options) {
  const {
    seed = 42,
    style = {},
    addonNames = [],
    customAddons = [],
    mode = "custom",
  } = options || {};
  const bot = new GlorbuCE({ seed, style });
  for (const n of addonNames) {
    const addonFn = resolveAddonByName(n, {
      brevity: style.brevity || "medium",
      archaic: style.archaic ?? 0.6,
    });
    if (addonFn) bot.use(addonFn);
  }
  if (mode === "spirit" && typeof window.SpiritGPT === "function") {
    bot.use(
      window.SpiritGPT({
        brevity: style.brevity || "medium",
        archaic: style.archaic ?? 0.6,
      })
    );
  }
  if (mode === "custom" && Array.isArray(customAddons)) {
    for (const spec of customAddons) {
      bot.loadCustomModel(spec);
    }
  }
  return { ask: (q) => bot.ask(q), bot };
}
