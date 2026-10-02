// ANSI (tmux capture-pane -e) → HTML → PNG (headless Chrome). ▀/▄ hücreleri iki renkli kare olarak çizilir.
// Kullanım: tmux capture-pane -p -e -t <oturum> | node araclar/ansi-png.mjs cikti.png
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const cikti = resolve(process.argv[2] || 'ekran.png')
const ZEMIN = [30, 30, 36], YAZI = [220, 220, 220]
const satirlar = readFileSync(0, 'utf8').replace(/\n$/, '').split('\n')

function palet(n) {
  const temel = [[0,0,0],[205,49,49],[13,188,121],[229,229,16],[36,114,200],[188,63,188],[17,168,205],[229,229,229],[102,102,102],[241,76,76],[35,209,139],[245,245,67],[59,142,234],[214,112,214],[41,184,219],[255,255,255]]
  if (n < 16) return temel[n]
  if (n >= 232) { const g = 8 + (n - 232) * 10; return [g, g, g] }
  const k = n - 16, a = [0, 95, 135, 175, 215, 255]
  return [a[Math.floor(k / 36)], a[Math.floor(k / 6) % 6], a[k % 6]]
}

function sgr(durum, kodlar) {
  const p = kodlar === '' ? [0] : kodlar.split(';').map(Number)
  let d = { ...durum }
  for (let i = 0; i < p.length; i++) {
    const k = p[i]
    if (k === 0) d = { fg: null, bg: null, kalin: false, soluk: false, ters: false }
    else if (k === 1) d.kalin = true
    else if (k === 2) d.soluk = true
    else if (k === 7) d.ters = true
    else if (k === 22) { d.kalin = false; d.soluk = false }
    else if (k === 27) d.ters = false
    else if (k === 39) d.fg = null
    else if (k === 49) d.bg = null
    else if ((k === 38 || k === 48) && p[i + 1] === 2) { d[k === 38 ? 'fg' : 'bg'] = p.slice(i + 2, i + 5); i += 4 }
    else if ((k === 38 || k === 48) && p[i + 1] === 5) { d[k === 38 ? 'fg' : 'bg'] = palet(p[i + 2]); i += 2 }
    else if (k >= 30 && k <= 37) d.fg = palet(k - 30)
    else if (k >= 90 && k <= 97) d.fg = palet(k - 90 + 8)
    else if (k >= 40 && k <= 47) d.bg = palet(k - 40)
    else if (k >= 100 && k <= 107) d.bg = palet(k - 100 + 8)
  }
  return d
}

const css = (c) => `rgb(${c.join(',')})`
const kac = (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c)

function hucre(c, d) {
  let fg = d.fg || YAZI, bg = d.bg || ZEMIN
  if (d.ters) [fg, bg] = [bg, fg]
  if (c === '▀' || c === '▄') {
    const [ust, alt] = c === '▀' ? [fg, bg] : [bg, fg]
    return `<span class="h" style="background:linear-gradient(${css(ust)} 50%,${css(alt)} 50%)"></span>`
  }
  const stil = `color:${css(fg)};${d.bg || d.ters ? `background:${css(bg)};` : ''}${d.kalin ? 'font-weight:700;' : ''}${d.soluk ? 'opacity:.6;' : ''}`
  return `<span class="h" style="${stil}">${c === ' ' ? '&nbsp;' : kac(c)}</span>`
}

const govde = satirlar.map((satir) => {
  let d = { fg: null, bg: null, kalin: false, soluk: false, ters: false }
  let html = ''
  for (const m of satir.matchAll(/\x1b\[([0-9;]*)m|\x1b\][^\x07]*\x07|(\P{M}\p{M}*)/gu)) {
    if (m[1] !== undefined) d = sgr(d, m[1])
    else if (m[2] !== undefined) html += hucre(m[2], d)
  }
  return `<div class="s">${html}</div>`
}).join('')

const genislik = Math.max(...satirlar.map((s) => s.replace(/\x1b\[[0-9;]*m/g, '').length))
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:${css(ZEMIN)};padding:12px;font:15px/20px Menlo,monospace}
.s{height:20px;white-space:pre;display:flex}.h{display:inline-block;width:9px;height:20px;overflow:visible;text-align:center}
</style>${govde}`
const dosya = join(tmpdir(), `ansi-${process.pid}.html`)
writeFileSync(dosya, html)
const g = genislik * 9 + 24, y = satirlar.length * 20 + 24
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${g},${y}`, `--screenshot=${cikti}`, `file://${dosya}`,
], { stdio: 'ignore' })
process.stdout.write(`${cikti}\n`)
