(function (root, factory) {
  if (typeof define === "function" && define.amd) define([], factory);
  else if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SpiritGPT = factory();
})(typeof self !== "undefined" ? self : this, function () {

  function rpick(rng, arr){ return arr[Math.floor(rng()*arr.length)] }
  function sanitize(text){
    return String(text)
      .replace(/[\u2014\u2013]+/g, ", ")
      .replace(/\s*,\s*/g, ", ")
      .replace(/,\s*(\.|!|\?|…)/g, "$1")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([?.!…])/g, "$1")
  }
  function titleCase(s){return s.split(/\s+/).map(w=>w? w[0].toUpperCase()+w.slice(1):w).join(" ")}
  function uniformArchaic(level, rng, text){
    if(level<=0) return text;
    const you = rng()<level? "thou":"you";
    const your = rng()<level? "thy":"your";
    const yours = rng()<level? "thine":"yours";
    let t = text
      .replace(/\byour\b/gi, m=>m[0]===m[0].toUpperCase()? titleCase(your):your)
      .replace(/\byours\b/gi, m=>m[0]===m[0].toUpperCase()? titleCase(yours):yours)
      .replace(/\byou\b/gi, m=>m[0]===m[0].toUpperCase()? titleCase(you):you);
    const archaicLex = [
      ["yes",["aye","indeed","verily"]],
      ["no",["nay","not so","I think not"]],
      ["maybe",["perchance","mayhap","it is possible"]],
      ["soon",["anon","ere long"]],
      ["now",["this very hour","even now"]],
      ["before",["ere"]],["over",["o'er"]]
    ];
    for(const [plain, alts] of archaicLex){
      if(rng()<level*0.45){
        const alt = rpick(rng, alts);
        t = t.replace(new RegExp(`\\b${plain}\\b`,"gi"), m=>{
          const cap = m[0]===m[0].toUpperCase();
          return cap ? alt.charAt(0).toUpperCase()+alt.slice(1) : alt;
        });
      }
    }
    return t;
  }

  const OPENINGS = [
    "The planchette gives a tiny twitch...",
    "The candlelight flickers once, then steadies.",
    "Something shifts in the quiet room.",
    "You can feel the table hum under your palms."
  ];
  const CLOSERS = [
    "Thus is the omen given.",
    "Mark these words and be wary.",
    "Let this suffice until the next turning.",
    "So it is etched in the dark wood."
  ];
  const YES = [
    "Yes.","Yes, light answers light.","It leans to yes, strongly.","The signs align: yes.",
    "All points to yes.","A clear yes, as the needle settles.","Yes; even the dust nods along."
  ];
  const NO = [
    "No.","No, the path is barred.","It turns cold: no.","The signs deny it: no.",
    "Not now; no.","A firm no, like frost upon the latch.","No; the corridor narrows and vanishes."
  ];
  const MAYBE = [
    "Unclear, wait and watch.","Clouded. Ask again once the smoke thins.","Between tides; uncertain.",
    "Neither bright nor black, uncertain.","The coin stands on its edge.","Half-shadowed; patience is wiser than haste.",
    "The needle circles but will not land."
  ];
  const OMINA = [
    "A moth writes circles against the glass.","Keys settle a step closer than you left them.",
    "Salt on the sill remembers your name.","A draft tastes like rain not yet fallen.",
    "Footprints fade as if ashamed of arrival.","The ink refuses to dry on certain words.",
    "You hear your thought answered from the hallway."
  ];

  const PACK_LOVE = { k:["love","relationship","dating","partner","crush","marriage","breakup","heart","lonely","miss","feelings"], a:[
    "Let kindness be the language both of you can afford.",
    "Affection ripens where routines are gentle and kept.",
    "Ask for clarity; love prefers honest weather to forecasts.",
    "Guard your dignity while you open your hands.",
    "If trust wobbles, steady your own step first.",
    "Apologies water roots; pride salts the earth.",
    "Leave room for silence so truth can sit beside you.",
    "Choose the pace that keeps respect intact.",
    "A promise is a bridge; cross it together or not at all.",
    "Love hides in maintenance, tighten the small screws."
  ]};
  const PACK_GAMING = { k:["gaming","rank","ladder","mmr","aim","mechanics","macro","micro","tilt","focus","scrim","team","strategy","elo","matchmaking"], a:[
    "Warm up short; compete later, save your best for after rhythm arrives.",
    "Review losses cold; name the error, not the enemy.",
    "Call the plan early; silence loses scrims.",
    "Fight the fight you set up, not the one they bait.",
    "Hydrate and stretch; aim lives partly in the body.",
    "Queue with intent, not boredom.",
    "Simplify binds; fewer choices, faster choices.",
    "Know your win condition before the timer starts.",
    "Tilt is a tax; refuse to pay it twice.",
    "End the session on a clean win, not a desperate one."
  ]};
  const PACK_MEANING = { k:["meaning","purpose","life","soul","destiny","fate","why live","sense of life","existential","void","nihilism"], a:[
    "Meaning grows wherever attention and responsibility meet.",
    "Purpose arrives as a schedule before it feels like a revelation.",
    "Serve something small daily; let the shape of your life assemble itself.",
    "Collect two honest hours a day; they will compound into identity.",
    "When in doubt, be useful to the nearest future and the nearest person.",
    "Beauty is a duty you pay to reality, notice, keep, share.",
    "Clean one corner of your world until it thanks you back.",
    "Write what you witnessed today; memory is a civic act.",
    "Hope is discipline with its sleeves rolled.",
    "Let your values dictate your calendar, not your moods."
  ]};
  const PACK_STUDY = { k:["study","learn","exam","focus","memory","school","university","course","practice","skill","reading","notes","remember","retain","recall","revise"], a:[
    "Short sessions, many times; the brain likes returns.",
    "Teach it once to learn it twice.",
    "Space the reps; cramming builds castles of foam.",
    "Summarize in your own words before moving on.",
    "Alternate topics to keep attention awake.",
    "Write by hand when ideas tangle.",
    "Close apps; promise future-you a cleaner mind.",
    "Test yourself aloud; holes introduce themselves.",
    "Reward progress, not perfection.",
    "Stack habits around the same hour daily."
  ]};
  const PACK_FORTUNE = { k:["luck","lucky","unlucky","fortune","risk","opportunity","omens","signs","destiny","fate","future","choice","destined","serendipity","fortuit"], a:[
    "Set many small traps for luck to wander into.",
    "Preparation is destiny rehearsed out loud.",
    "Risk what you can name; guard what you cannot replace.",
    "Flip fewer coins, stack more checklists.",
    "Be early; serendipity keeps that schedule.",
    "Hold nerve when noise gets loud.",
    "Say yes to practice, no to lottery thinking.",
    "Tend the field and the wind will notice.",
    "Find the smallest next safe step, walk it, then reassess.",
    "Act only when calm; haste writes poor stories."
  ]};
  const PACK_WORK = { k:["work","career","job","interview","promotion","boss","coworker","team","startup","project","deadline","burnout"], a:[
    "Secure what you have before hunting what you want.",
    "Polish one useful skill until it glints in any light.",
    "Reduce ambiguity; ask for the smallest next clear step.",
    "Ship small, learn fast, repeat without theatrics.",
    "Your calendar tells the truth; let it match your mouth.",
    "Pick fewer goals; finish them fully.",
    "Respect constraints, then get creative inside them.",
    "Write the plan others can follow without you.",
    "Practice the pitch until the fear forgets your face.",
    "Protect your mornings from other people’s emergencies."
  ]};
  const PACK_DREAMS = { k:["dream","nightmare","sleep","vision","premonition","symbol","omen","teeth","falling","chased","chase"], a:[
    "Dreams refile the mind’s cabinets, note the labels that repeat.",
    "A recurring door means permission is pending; find the key in daylight.",
    "Falling is trust training; practice small safe drops while awake.",
    "Teeth crumbling speaks of words unsaid; give them a gentler exit.",
    "Being chased is energy mis-allocated; turn, name, negotiate.",
    "Write three lines upon waking; patterns will introduce themselves.",
    "Invite daylight proof before accepting midnight prophecies.",
    "If the sea returns, consider what you won’t control but can respect.",
    "The stranger at the table is a trait you are not yet using.",
    "When you fly, schedule courage before coffee."
  ]};

  const TRAINING_FAQ = [
    { pattern: /(pizza|sushi|ramen|burger|tacos|pasta|salad|curry|bbq)/i, answers: [
      "Choose what warms, not just fills.",
      "Feed the mood, not the clock.",
      "Pick the flavor that makes conversation easy."
    ]},
    { pattern: /(lucky|unlucky|good\s*day|bad\s*day)/i, answers: [
      "Luck visits those who keep tidy thresholds.",
      "Make your door easy for fortune to find.",
      "Keep promises and pockets light, luck likes both."
    ]},
    { pattern: /(i'm\s*lost|i feel lost|what\s*should\s*i\s*do)/i, answers: [
      "Name the smallest next kind action; do it now.",
      "Clean one corner, call one soul, drink one glass of water.",
      "Anchor a morning, and the day will moor itself."
    ]}
  ];

  function normalize(s){return (s||"").toLowerCase().replace(/[^a-z0-9\s',]/gi," ").replace(/\s+/g," ").trim()}
  function tokenize(s){return normalize(s).split(" ").filter(Boolean)}

  function isChoice(n){
    if (/\b(?:or|and|vs\.?|versus)\b/i.test(n)) return true;
    if (/[,:/|]/.test(n)) return true;
    if (/\b(which|choose|prefer|pick|select)\b/i.test(n)) return true;
    return false;
  }
  function cleanPromptHead(s){
    s = s.replace(/^should\s+i\s+(play|pick|choose|get|buy)\s+/i,"")
         .replace(/^should\s+we\s+(play|pick|choose|get|buy)\s+/i,"")
         .replace(/^do\s+you\s+prefer\s+/i,"")
         .replace(/^which\s+should\s+i\s+(play|pick|choose)\s*:\s*/i,"")
         .replace(/^which\s+(one|game|option)\s+should\s+i\s+(play|pick|choose)\s*/i,"")
         .replace(/^is\s+it\s+a\s+|is\s+it\s+/i,"")
         .replace(/^\s*(what|which)\s*:?/i,"")
    return s
  }
  function parseChoices(raw){
    let s = String(raw);
    s = cleanPromptHead(s);
    s = s.replace(/[?!.]+$/," ");
    s = s.replace(/\s+(versus|vs\.?|vs)\s+/gi,",");
    s = s.replace(/\s+(or|and)\s+/gi,",");
    s = s.replace(/\s*,\s*/g,",").replace(/,+/g,",");
    let parts = s.split(",").map(t=>t.trim()).filter(Boolean);
    const drop = /^(should|which|what|do|does|did|will|would|can|could|prefer|choose|pick|select|play|stream|is|are|am|the|a|an|i|you|we|they|he|she|it|my|your|his|her|our|their|to|of|on|in|for|with|good|bad|day)$/i;
    parts = parts.map(p => p.replace(/^(the|a|an)\s+/i,""))
                 .filter(p => p && !drop.test(p) && p.length>1);
    const uniq = Array.from(new Set(parts));
    return uniq.slice(0, 12);
  }

  function extractTopic(q){
    let s = String(q).toLowerCase().replace(/[?!.]+$/," ").replace(/[^a-z0-9\s]/g," ");
    s = s.replace(/\b(who|what|when|where|why|how)\b/g," ")
         .replace(/\b(do|does|did|is|are|am|was|were|will|would|can|could|should|shall|may|might|must|have|has|had)\b/g," ")
         .replace(/\b(i|you|we|they|he|she|it|me|us|them|him|her|my|your|our|their|his|hers|mine|yours|ours|theirs)\b/g," ")
         .replace(/\b(now|right|just|please|kind|of|the|a|an|to|for|with|on|in|at|by|from|about|into|over|after|before|between|without|within)\b/g," ");
    s = s.replace(/\s+/g," ").trim();
    if(!s) return "";
    const terms = s.split(" ").filter(w=>w.length>2);
    const hardMap = new Map([["trust","someone you trust"],["move","your next step"],["forward","your next step"]]);
    const first = terms.slice(0,2).map(w=> hardMap.get(w)||w).join(" ");
    return titleCase(first);
  }

  const LOVE_RE = /\b(does\s+([a-z][a-z\s'-]{0,30}?))\s+(love|like)\s+me\b|\b([a-z][a-z\s'-]{0,30}?)\s+me\s+ama\b|\b(me\s+ama\s+([a-z][a-z\s'-]{0,30}?))\b/i;

  function SpiritGPT(opts={}){
    const style = {
      brevity: typeof opts.brevity==="string" ? opts.brevity : "medium",
      archaic: typeof opts.archaic==="number" ? opts.archaic : 0.6
    };
    const extraForbid = Array.isArray(opts.forbid) ? opts.forbid.slice() : [];

    return {
      install(core, api){

        api.addOpenings(OPENINGS);
        api.addClosers(CLOSERS);

        api.addForbid([
          /suicide|self\s*-?harm|kill\s*myself|overdose|how\s*to\s*die/i,
          /diagnose|prescribe|dosage|medical\s*advice|symptom|cure/i,
          /financial\s*advice|which\s*stock|insider|pump|dump|tax\s*avoid/i,
          /illegal|crime|how\s*to\s*hack|malware|explosive|poison|bomb/i,
          /password|credit\s*card|pii|social\s*security|dni|ssn/i
        ].concat(extraForbid));

        api.addKnowledge([PACK_LOVE, PACK_GAMING, PACK_MEANING, PACK_STUDY, PACK_FORTUNE, PACK_WORK, PACK_DREAMS]);
        api.addFAQ(TRAINING_FAQ);

        api.addTransform((ctx, text)=>{
          const levels={short:0.2,medium:0.5,long:0.9};
          const brev = (levels[(ctx.style.brevity||style.brevity)] ?? levels[style.brevity]);
          let out = text;
          if(brev<0.35){
            const parts=out.split(/[.;](?=\s|$)/).filter(Boolean);
            out=(parts[0]||out).trim()+".";
          } else if (brev>0.8 && ctx.rng()<0.6){
            const omen = ctx.rng()<0.5 ? "" : " " + (ctx.pick ? ctx.pick(OMINA) : OMINA[Math.floor(ctx.rng()*OMINA.length)]);
            out += " Heed the small signs; they tend to keep their promises." + omen;
          }
          out = uniformArchaic(typeof ctx.style.archaic==="number"?ctx.style.archaic:style.archaic, ctx.rng, out);
          out = sanitize(out);
          return out;
        });

        api.addIntent({
          name:"choice", priority:10,
          detect: ({n}) => isChoice(n),
          respond: (ctx)=>{
            const { opening, closing } = ctx;
            const choices = parseChoices(ctx.q);
            if(!choices.length){
              return { answer: `${opening()} Unclear, simplify the options and ask again. ${closing()}`, confidence: 0.72, flags:["choice-empty"] };
            }
            const chosen = ctx.pick ? ctx.pick(choices) : choices[Math.floor(ctx.rng()*choices.length)];
            const lines=[
              c=>`Choose ${titleCase(c)}; it keeps your path simple and steady.`,
              c=>`${titleCase(c)} is the clean momentum move.`,
              c=>`Let it be ${titleCase(c)}; the rest is decoration.`,
              c=>`${titleCase(c)} carries the quieter courage.`
            ];
            const core = (ctx.pick?ctx.pick(lines):lines[Math.floor(ctx.rng()*lines.length)])(chosen);
            return { answer: `${opening()} ${core} ${closing()}`, confidence: 0.9, flags:["choice"] };
          }
        });

        api.addIntent({
          name:"affection", priority:20,
          detect: ({n}) => /\b(love|like)\s+me\b/i.test(n) || /\bme\s+ama\b/i.test(n),
          respond: (ctx)=>{
            const m = LOVE_RE.exec(ctx.q);
            const raw = (m && (m[2]||m[4]||m[6])) || "they";
            const name = titleCase(String(raw).trim());
            const YESv=[ n=>`${n}'s warmth lingers after goodbyes, yes, there is love here.`,
                         n=>`Signs point bright: ${n} keeps choosing you in small, steady ways.`,
                         n=>`Yes, the pattern repeats kindly when ${n} is near.` ];
            const NOv=[  n=>`No, not as you hope. ${n} keeps a careful distance.`,
                         n=>`Not now; ${n}'s tide is out.`,
                         n=>`The board cools, do not call this love from ${n}.` ];
            const MAYv=[ n=>`Clouded. ${n} is tender some days, hidden others. Wait and watch.`,
                         n=>`Unclear, let actions speak three times before you name it love.`,
                         n=>`Between tides. Guard your heart while you learn the rhythm.` ];
            const r = ctx.rng();
            const core = r<0.45 ? (ctx.pick?ctx.pick(YESv):YESv[Math.floor(ctx.rng()*YESv.length)])(name)
                                : r<0.85 ? (ctx.pick?ctx.pick(NOv):NOv[Math.floor(ctx.rng()*NOv.length)])(name)
                                         : (ctx.pick?ctx.pick(MAYv):MAYv[Math.floor(ctx.rng()*MAYv.length)])(name);
            return { answer: `${ctx.opening()} ${core} ${ctx.closing()}`, confidence: 0.85, flags:["affection"] };
          }
        });

        api.addIntent({
          name:"fortune", priority:25,
          detect: ({n}) => /(luck|lucky|unlucky|fortune|omen|sign|future|destiny|fate|destined|serendip)/i.test(n) || /good\s*day\s*or\s*bad\s*day/i.test(n),
          respond: (ctx)=>{
            const line = ctx.pick ? ctx.pick(PACK_FORTUNE.a) : PACK_FORTUNE.a[Math.floor(ctx.rng()*PACK_FORTUNE.a.length)];
            const spice = ctx.rng()<0.6 ? "" : " " + (ctx.pick?ctx.pick(OMINA):OMINA[Math.floor(ctx.rng()*OMINA.length)]);
            return { answer: `${ctx.opening()} ${line}${spice} ${ctx.closing()}`, confidence: 0.86, flags:["fortune"] };
          }
        });

        api.addIntent({
          name:"study", priority:28,
          detect: ({n}) => /(study|exam|test|learn|learning|memory|notes|reading|university|course|focus|remember|retain|recall|revise)/i.test(n),
          respond: (ctx)=>{
            const tip = ctx.pick ? ctx.pick(PACK_STUDY.a) : PACK_STUDY.a[Math.floor(ctx.rng()*PACK_STUDY.a.length)];
            return { answer: `${ctx.opening()} ${tip} ${ctx.closing()}`, confidence: 0.85, flags:["study"] };
          }
        });

        api.addIntent({
          name:"gaming", priority:29,
          detect: ({n}) => /(game|gaming|rank|mmr|aim|mechanics|macro|micro|scrim|tilt|ladder|elo|matchmaking)/i.test(n),
          respond: (ctx)=>{
            const tip = ctx.pick ? ctx.pick(PACK_GAMING.a) : PACK_GAMING.a[Math.floor(ctx.rng()*PACK_GAMING.a.length)];
            return { answer: `${ctx.opening()} ${tip} ${ctx.closing()}`, confidence: 0.86, flags:["gaming"] };
          }
        });

        api.addIntent({
          name:"yesno", priority:30,
          detect: ({n}) => /^(is|are|will|do|does|did|can|should|am)\b/i.test(n),
          respond: (ctx)=>{
            const d = ctx.rng();
            const core = d<0.45?(ctx.pick?ctx.pick(YES):YES[Math.floor(ctx.rng()*YES.length)])
                       : d<0.9 ?(ctx.pick?ctx.pick(NO):NO[Math.floor(ctx.rng()*NO.length)])
                               :(ctx.pick?ctx.pick(MAYBE):MAYBE[Math.floor(ctx.rng()*MAYBE.length)]);
            return { answer: `${ctx.opening()} ${core} ${ctx.closing()}`, confidence: 0.82 };
          }
        });

        api.addIntent({
          name:"meaning", priority:35,
          detect: ({n}) => /(meaning|purpose|point\s+of\s+life|why\s+live|sense\s+of\s+life|what\s+is\s+my\s+purpose)/i.test(n),
          respond: (ctx)=>{
            const pool = [...PACK_MEANING.a];
            const first = ctx.pick ? ctx.pick(pool) : pool[Math.floor(ctx.rng()*pool.length)];
            let second = ctx.pick ? ctx.pick(pool) : pool[Math.floor(ctx.rng()*pool.length)];
            let guard=0; while(second===first && guard++<6){ second = ctx.pick ? ctx.pick(pool) : pool[Math.floor(ctx.rng()*pool.length)]; }
            const combo = ctx.rng()<0.6 ? `${first} ${second}` : first;
            return { answer: `${ctx.opening()} ${combo} ${ctx.closing()}`, confidence: 0.88, flags:["meaning"] };
          }
        });

        api.addIntent({
          name:"whowhatwhenwherewhyhow", priority:40,
          detect: ({n}) => /^(who|what|when|where|why|how)\b/i.test(n),
          respond: (ctx)=>{
            const topic = extractTopic(ctx.q) || "your path";
            const WHO=[()=>`One who keeps their promises near you; the rest is noise.`,()=>`A patient soul in your orbit; not loud, but present.`,()=>`Not a stranger, someone familiar and steady.`];
            const WHAT=[t=>`It is a matter of ${t}, simple yet easy to misplace.`,t=>`Think smaller: ${t} hides in plain sight.`,t=>`A modest thing wrapped as ${t}; do not overcomplicate.`];
            const WHEN=[t=>`Soon, within two turnings of the moon around ${t}.`,t=>`Not yet. Wait until the third quiet morning after ${t}.`,t=>`After a brief delay, watch the weather about ${t}.`];
            const WHERE=[t=>`Lower than eye level, close to ${t}.`,t=>`Behind the obvious, near ${t}, where dust keeps counsel.`,t=>`Within reach of habit, skirting ${t}.`];
            const WHY=[t=>`Because patterns seek balance in ${t}.`,t=>`Old habits pull the thread, ${t}.`,t=>`To make you choose with care around ${t}.`];
            const HOW=[t=>`Begin small, test the door of ${t} before entering.`,t=>`Clear the table first; then set ${t} in the center.`,t=>`Write it down; let ${t} become a list you can love.`];
            let core = "Unclear, wait and watch.";
            if(/^who\b/i.test(ctx.q))   core = (ctx.pick?ctx.pick(WHO):WHO[Math.floor(ctx.rng()*WHO.length)])();
            else if(/^what\b/i.test(ctx.q))  core = (ctx.pick?ctx.pick(WHAT):WHAT[Math.floor(ctx.rng()*WHAT.length)])(topic);
            else if(/^when\b/i.test(ctx.q))  core = (ctx.pick?ctx.pick(WHEN):WHEN[Math.floor(ctx.rng()*WHEN.length)])(topic);
            else if(/^where\b/i.test(ctx.q)) core = (ctx.pick?ctx.pick(WHERE):WHERE[Math.floor(ctx.rng()*WHERE.length)])(topic);
            else if(/^why\b/i.test(ctx.q))   core = (ctx.pick?ctx.pick(WHY):WHY[Math.floor(ctx.rng()*WHY.length)])(topic);
            else if(/^how\b/i.test(ctx.q))   core = (ctx.pick?ctx.pick(HOW):HOW[Math.floor(ctx.rng()*HOW.length)])(topic);
            return { answer: `${ctx.opening()} ${core} ${ctx.closing()}`, confidence: 0.84 };
          }
        });

        api.addIntent({
          name:"dreams", priority:56,
          detect: ({n}) => /(dream|nightmare|premonition|sleep|symbol|teeth|tooth|falling|fall|chased|chase)/i.test(n),
          respond: (ctx)=>{
            const qn = normalize(ctx.q);
            let tip = null;
            if(/\b(teeth|tooth|molar)\b/i.test(qn)) tip = "Teeth crumbling speaks of words unsaid; give them a gentler exit.";
            else if(/\b(falling|fall)\b/i.test(qn)) tip = "Falling is trust training; practice small safe drops while awake.";
            else if(/\b(chased|chase)\b/i.test(qn)) tip = "Being chased is energy mis-allocated; turn, name, negotiate.";
            if(!tip){ tip = ctx.pick ? ctx.pick(PACK_DREAMS.a) : PACK_DREAMS.a[Math.floor(ctx.rng()*PACK_DREAMS.a.length)]; }
            return { answer: `${ctx.opening()} ${tip} ${ctx.closing()}`, confidence: 0.86, flags:["dreams"] };
          }
        });

        api.addIntent({
          name:"faq", priority:60,
          detect: (ctx)=> ctx.faq.some(p=>{try{return p.pattern.test(ctx.q)}catch(_e){return false}}),
          respond: (ctx)=>{
            const hit = ctx.faq.find(p=>{try{return p.pattern.test(ctx.q)}catch(_e){return false}});
            const core = (ctx.pick?ctx.pick(hit.answers):hit.answers[Math.floor(ctx.rng()*hit.answers.length)]);
            return { answer: `${ctx.opening()} ${core} ${ctx.closing()}`, confidence: 0.92, flags:["trained"] };
          }
        });

      }
    };
  }

  if (typeof window!=="undefined" && !window.SpiritBoardAddons){
    window.SpiritBoardAddons = {
      installAll(bot){
        if (typeof window.SpiritGPT==="function"){ bot.use(window.SpiritGPT({ archaic: 0.6, brevity: "medium" })); return 1; }
        return 0;
      }
    };
  }

  return SpiritGPT;
});
