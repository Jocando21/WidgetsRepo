GlorbuCE.prototype.loadCustomModel = function loadCustomModel(data){
  if(!data) return;

  const toArr = (v, splitter=/[,|\n]+/) => {
    if (Array.isArray(v)) return v.map(s=>String(s).trim()).filter(Boolean);
    return String(v||"").split(splitter).map(s=>s.trim()).filter(Boolean);
  };

  const openings  = toArr(data.openings);
  const closers   = toArr(data.closers);
  const responses = toArr(data.responses);
  const keywords  = toArr(data.keywords);
  const forbidRaw = toArr(data.extraForbid);
  const faqRaw    = toArr(data.faqPatterns, /\n+/);

  const faqPairs = faqRaw.map(line=>{
    const parts = line.includes("->") ? line.split("->") : line.split(":");
    if(parts.length===2){
      const q = parts[0].trim();
      const a = parts[1].trim();
      if(q && a){
        return { pattern: new RegExp(q, "i"), answers: [a] };
      }
    }
    return null;
  }).filter(Boolean);

  const kwSet = new Set(keywords.map(k=>k.toLowerCase()));

  const addon = {
    install: (core, api) => {
      if(openings.length) api.addOpenings(openings);
      if(closers.length)  api.addClosers(closers);

      if(forbidRaw.length){
        const regs = forbidRaw.map(w=>new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "i"));
        api.addForbid(regs);
      }

      if(faqPairs.length) api.addFAQ(faqPairs);

      if(keywords.length || responses.length){
        api.addKnowledge([{ k: keywords, a: responses }]);
      }

      api.addIntent({
        name: data.addonName || "custom-addon",
        priority: 25,
        detect: ({ tokens }) => {
          if(keySetEmpty()) return responses.length>0;
          for(const t of tokens){ if(kwSet.has(t)) return true; }
          return false;
        },
        respond: (ctx) => {
          const open = ctx.opening();
          const close = ctx.closing();
          const core = responses.length ? ctx.pick(responses) : "";
          const answer = (open || close || core) ? `${open} ${core} ${close}`.replace(/\s+/g," ").trim() : "";
          return { answer, confidence: 0.8, flags:["custom"] };
        }
      });

      api.addTransform((ctx, text) => String(text)
        .replace(/[\u2014\u2013]+/g, ", ")
        .replace(/\s*,\s*/g, ", ")
        .replace(/,\s*(\.|!|\?|…)/g, "$1")
        .replace(/\s{2,}/g, " ")
        .replace(/\s+([?.!…])/g, "$1")
      );
    }
  };

  const keySetEmpty = () => kwSet.size===0;
  this.use(addon);
};
