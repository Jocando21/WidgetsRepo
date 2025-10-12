class Layerlite {
  constructor(root, sidebar, schema) {
    this.root = root
    this.sidebar = sidebar
    this.schema = schema
    this.template = root.innerHTML
    this.state = Object.fromEntries(schema.map(f => [f.key, f.default ?? ""]))
    this.fieldTypes = {
      text: (f, v, on) => this.input("text", v, on, f.placeholder),
      textarea: (f, v, on) => {
        const t = document.createElement("textarea")
        t.value = v
        t.rows = f.rows || 3
        t.oninput = e => on(e.target.value)
        return t
      },
      color: (f, v, on) => this.input("color", v, on),
      number: (f, v, on) => {
        const i = this.input("number", v, on)
        if (f.min != null) i.min = f.min
        if (f.max != null) i.max = f.max
        if (f.step != null) i.step = f.step
        return i
      },
      range: (f, v, on) => {
        const i = this.input("range", v, on)
        if (f.min != null) i.min = f.min
        if (f.max != null) i.max = f.max
        if (f.step != null) i.step = f.step
        return i
      },
      select: (f, v, on) => {
        const s = document.createElement("select")
        ;(f.options || []).forEach(o => {
          const opt = document.createElement("option")
          opt.value = o.value ?? o
          opt.textContent = o.label ?? o
          if (opt.value == v) opt.selected = true
          s.append(opt)
        })
        s.oninput = e => on(e.target.value)
        return s
      },
      toggle: (f, v, on) => {
        const box = document.createElement("div")
        box.className = "layerlite-toggle"
        const i = this.input("checkbox", v, e => on(e.target.checked))
        i.checked = !!v
        const l = document.createElement("label")
        l.textContent = f.label || f.key
        box.append(i, l)
        return box
      },
      image: (f, v, on) => {
        const wrap = document.createElement("div")
        wrap.className = "layerlite-image"
        const file = this.input("file", "", null)
        file.accept = "image/*"
        file.onchange = e => {
          const fl = e.target.files[0]
          if (!fl) return
          const r = new FileReader()
          r.onload = ev => on(ev.target.result)
          r.readAsDataURL(fl)
        }
        const url = this.input("url", v, e => on(e.target.value))
        wrap.append(file, url)
        return wrap
      }
    }
    this.regex = /\{([a-zA-Z0-9_\-]+)\}/g
    this.mount()
    this.apply()
  }

  input(type, value, on, placeholder) {
    const i = document.createElement("input")
    i.type = type
    if (value != null) i.value = value
    if (placeholder) i.placeholder = placeholder
    if (on) i.oninput = e => on(e.target.value)
    return i
  }

  mount() {
    this.sidebar.innerHTML = ""
    this.schema.forEach(f => {
      const cur = this.state[f.key] ?? f.default ?? ""
      const render = this.fieldTypes[f.type]
      if (!render) return
      const el = render(f, cur, val => {
        this.state[f.key] = f.transform ? f.transform(val) : val
        this.apply()
      })
      const wrap = document.createElement("div")
      wrap.className = "layerlite-field"
      const lb = document.createElement("label")
      lb.textContent = f.label || f.key
      wrap.append(lb, el)
      this.sidebar.append(wrap)
    })
  }

  apply() {
    let html = this.template
    html = html.replace(this.regex, (_, k) =>
      this.state[k] != null ? String(this.state[k]) : `{${k}}`
    )
    this.root.innerHTML = html
  }

  set(key, value) {
    this.state[key] = value
    this.apply()
  }

  get(key) {
    return this.state[key]
  }

  export() {
    return JSON.parse(JSON.stringify(this.state))
  }

  import(data) {
    Object.assign(this.state, data)
    this.apply()
  }
}

window.Layerlite = Layerlite
