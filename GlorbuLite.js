(function () {
  function pick(a) {
    return a && a.length ? a[Math.floor(Math.random() * a.length)] : "";
  }
  function nrm(s) {
    return (s == null ? "" : String(s)).trim().toLowerCase();
  }
  function strip(s) {
    return s.normalize
      ? s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      : s;
  }
  function key(s) {
    var x = strip(String(s || "").toLowerCase())
      .replace(/[^a-z0-9\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return x;
  }
  function beginsAux(q) {
    var s = nrm(q).replace(/^[¿¡\s]+/, "");
    var a = [
      "is",
      "are",
      "will",
      "do",
      "does",
      "did",
      "can",
      "should",
      "am",
      "was",
      "were",
      "could",
      "would",
      "may",
      "might",
      "shall",
      "have",
      "has",
      "had",
      "es",
      "esta",
      "está",
      "sera",
      "será",
      "soy",
      "puedo",
      "debo",
      "deberia",
      "debería",
      "tengo",
      "tendra",
      "tendrá",
    ];
    for (var i = 0; i < a.length; i++) {
      if (s === a[i] || s.startsWith(a[i] + " ")) return true;
    }
    return false;
  }
  function weight(w) {
    var y = +w.yes || 0.34,
      n = +w.no || 0.33,
      m = +w.maybe || 0.33;
    var s = y + n + m;
    if (s <= 0) {
      y = n = m = 1 / 3;
      s = 1;
    }
    y /= s;
    n /= s;
    var r = Math.random();
    return r < y ? "yes" : r < y + n ? "no" : "maybe";
  }
  function compose(a, m, o) {
    if (o && o.compose) {
      var op = pick(m.openings || []),
        cl = pick(m.closers || []);
      return (op ? op + " " : "") + (a || "") + (cl ? " " + cl : "");
    }
    return a || "";
  }
  function has(q, k) {
    return q.indexOf(k.toLowerCase()) > -1;
  }
  function tokens(t, d) {
    var drop = new Set(
      (d || []).map(function (x) {
        return x.toLowerCase();
      })
    );
    var v = (t || "")
      .toLowerCase()
      .replace(/[?!.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!v) return "";
    return v
      .split(" ")
      .filter(function (x) {
        return x && !drop.has(x);
      })
      .join(" ")
      .trim();
  }
  function extract(q, drop, max) {
    var txt = q.toLowerCase();
    if (!/(\bor\b|,|\/|\||vs|versus)/.test(txt)) return [];
    var parts = txt
      .split(/(?:\bor\b|,|\/|\||vs|versus)/i)
      .map(function (p) {
        return tokens(p, drop);
      })
      .filter(Boolean);
    parts = Array.from(new Set(parts));
    if (parts.length > (max || 8)) parts = parts.slice(0, max);
    return parts;
  }
  function initGlorbuLite(model, options) {
    model = model || {};
    options = options || {};
    var yesnoW = options.yesnoWeights || { yes: 0.34, no: 0.33, maybe: 0.33 };
    var choiceOpt = options.choice || {};
    var drop = choiceOpt.dropWords || [
      "which",
      "what",
      "should",
      "i",
      "we",
      "you",
      "they",
      "do",
      "pick",
      "choose",
      "prefer",
      "select",
      "the",
      "a",
      "an",
      "or",
      "and",
      "vs",
      "versus",
      "today",
      "tonight",
      "is",
      "better",
    ];
    var max = choiceOpt.maxOptions || 8;
    var forbids = (model.forbids || []).map(function (x) {
      return x.toLowerCase();
    });
    var forbAns = model.forbidden_answers || ["This cannot be answered."];
    var yesA = (model.yesno && model.yesno.yes) || ["Yes."];
    var noA = (model.yesno && model.yesno.no) || ["No."];
    var mayA = (model.yesno && model.yesno.maybe) || ["Maybe."];
    var fall = model.fallbacks || ["Try again."];
    var kwg = Array.isArray(model.keywords) ? model.keywords : [];
    var exact = model.exact || { normalize: true, questions: {} };
    var qmap = exact.questions || {};
    return {
      ask: function (q) {
        var orig = q == null ? "" : String(q);
        var norm = nrm(orig);
        for (var i = 0; i < forbids.length; i++) {
          if (has(norm, forbids[i]))
            return {
              intent: "forbid",
              answer: compose(pick(forbAns), model, options),
              meta: { hit: forbids[i] },
            };
        }
        var k = exact.normalize !== false ? key(orig) : nrm(orig);
        if (Object.prototype.hasOwnProperty.call(qmap, k)) {
          var exa = pick(qmap[k] || []);
          return {
            intent: "exact",
            answer: compose(exa, model, options),
            meta: { key: k },
          };
        }
        var opts = extract(norm, drop, max);
        if (opts.length >= 2) {
          var ch = opts[Math.floor(Math.random() * opts.length)];
          return {
            intent: "choice",
            answer: compose(ch, model, options),
            meta: { options: opts, chosen: ch },
          };
        }
        if (beginsAux(orig)) {
          var s = weight(yesnoW);
          var pool = s === "yes" ? yesA : s === "no" ? noA : mayA;
          return {
            intent: "yesno:" + s,
            answer: compose(pick(pool), model, options),
            meta: { sub: s },
          };
        }
        for (var i = 0; i < kwg.length; i++) {
          var g = kwg[i];
          var m = g.match || [];
          for (var j = 0; j < m.length; j++) {
            if (has(norm, m[j]))
              return {
                intent: "keyword:" + g.id,
                answer: compose(pick(g.answers), model, options),
                meta: { id: g.id },
              };
          }
        }
        return {
          intent: "fallback",
          answer: compose(pick(fall), model, options),
          meta: {},
        };
      },
    };
  }
  if (typeof window !== "undefined") window.initGlorbuLite = initGlorbuLite;
  if (typeof globalThis !== "undefined")
    globalThis.initGlorbuLite = initGlorbuLite;
})();
