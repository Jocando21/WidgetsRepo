export class HoroscopeGenerator {
  constructor(locale = "EN") {
    this.locale = locale
    this.data = null
  }

  async init(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to load horoscope data")
    this.data = await res.json()
  }

  getSignByDate(dateStr) {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const signs = [
      { sign: "capricorn", start: [12, 22], end: [1, 19] },
      { sign: "aquarius", start: [1, 20], end: [2, 18] },
      { sign: "pisces", start: [2, 19], end: [3, 20] },
      { sign: "aries", start: [3, 21], end: [4, 19] },
      { sign: "taurus", start: [4, 20], end: [5, 20] },
      { sign: "gemini", start: [5, 21], end: [6, 20] },
      { sign: "cancer", start: [6, 21], end: [7, 22] },
      { sign: "leo", start: [7, 23], end: [8, 22] },
      { sign: "virgo", start: [8, 23], end: [9, 22] },
      { sign: "libra", start: [9, 23], end: [10, 22] },
      { sign: "scorpio", start: [10, 23], end: [11, 21] },
      { sign: "sagittarius", start: [11, 22], end: [12, 21] }
    ]
    for (const s of signs) {
      const [sm, sd] = s.start
      const [em, ed] = s.end
      if (
        (month === sm && day >= sd) ||
        (month === em && day <= ed) ||
        (sm < em && month > sm && month < em) ||
        (sm > em && (month > sm || month < em))
      ) return s.sign
    }
    return "unknown"
  }

  makePRNG(seed) {
    let h = 2166136261 >>> 0
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return () => {
      h += h << 13
      h ^= h >>> 7
      h += h << 3
      h ^= h >>> 17
      h += h << 5
      return (h >>> 0) / 4294967296
    }
  }

  pick(prng, arr) {
    return arr[Math.floor(prng() * arr.length)]
  }

  generate(signOrDate, type = "daily", seed = null) {
    if (!this.data) throw new Error("Horoscope data not loaded")

    if (type === "year" || type === "yearly") type = "annual"

    const sign =
      typeof signOrDate === "string" && !signOrDate.includes("-")
        ? signOrDate.toLowerCase()
        : this.getSignByDate(signOrDate)

    const info = this.data[sign]
    if (!info) return { error: "Invalid sign or date" }

    const entry = info[type]
    if (!entry) return { error: `No ${type} horoscope for ${sign}` }

    const realSeed =
      seed || `${sign}-${type}-${new Date().toISOString().slice(0, 10)}`
    const prng = this.makePRNG(realSeed)

    const tone = this.pick(prng, entry.tone)
    const theme = this.pick(prng, entry.theme)
    const event = this.pick(prng, entry.event)
    const advice = this.pick(prng, entry.advice)

    const emoji = this.pick(prng, info.emoji)
    const color = this.pick(prng, info.lucky_colors)
    const number = this.pick(prng, info.lucky_numbers)
    const vibe = this.pick(prng, info.vibe)

    const keywordGroups = Object.values(info.keywords)
    const keyword = this.pick(prng, this.pick(prng, keywordGroups))

    const fix = s => s.replace(/\.+$/g, "")
    const reading = `${fix(tone)}. ${fix(theme)}. ${fix(event)}. ${fix(advice)}.`

    return {
      sign: sign.charAt(0).toUpperCase() + sign.slice(1),
      type,
      seed: realSeed,
      emoji,
      color,
      number,
      vibe,
      keyword,
      reading,
      lucky: { color, number, emoji },
      source: { tone, theme, event, advice }
    }
  }
}
