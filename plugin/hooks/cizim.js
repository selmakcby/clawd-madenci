// Clawd Madenci — çizici: sahne durumu → Raster hücreleri (▀ yarım blok: üst piksel fg, alt piksel bg). Saf.

import { BLOK, ZEMIN_Y, BOS, RENK, h2, blokAl, dokuRengi } from './dunya.js'
import { CLAWD_G } from './sahne.js'

const UST_YARIM = 0x2580 // ▀
const ALT_YARIM = 0x2584 // ▄
const BOSLUK = 0x20
const SAHNE_Y = 20 // tasarım yüksekliği (piksel)

// ---- Sprite'lar: O gövde, A açık, D koyu, K göz ----
const CLAWD = [
  '.AAAAAAAA.',
  '.OOOOOOOO.',
  'OOOOOOOOOO',
  'DOOOOOOOOD',
  '.OOOOOOOO.',
]
const BACAK = ['.D.D..D.D.', 'D.D..D.D..']
const YARDIMCI = ['.AAAAAA.', '.OKOOKO.', 'DOOOOOOD', '.D.D.D.D']
const SPRITE_RENK = { O: RENK.clawd, A: RENK.clawdAcik, D: RENK.clawdKoyu, K: RENK.goz }
const CREEPER = ['GgGGgG', 'GKKgKK', 'gGgKGg', 'GgKKKG', 'GgKgKg', '.GgGg.', '.gGGG.', '.Gg.gG']
const CREEPER_RENK = { G: RENK.creeper, g: RENK.creeperKoyu, K: RENK.goz }

// Kazma pozları (sağa bakarken, ele göre)
const KAZMA = [
  { sap: [[1, 0], [1, -1], [1, -2]], bas: [[0, -3], [1, -3], [2, -3], [3, -2]] },
  { sap: [[1, 0], [2, -1]], bas: [[3, -3], [3, -2], [4, -2], [4, -1]] },
  { sap: [[1, 0], [2, 0], [3, 0]], bas: [[4, -2], [4, -1], [4, 0], [4, 1]] },
]
const CATLAK = [[1, 1], [2, 2], [1, 2], [2, 0], [0, 3], [3, 1]]

function tuval(g, y) {
  return { g, y, p: new Uint32Array(g * y).fill(BOS) }
}

function nokta(t, x, y, renk) {
  const xi = Math.round(x), yi = Math.round(y)
  if (xi >= 0 && xi < t.g && yi >= 0 && yi < t.y) t.p[yi * t.g + xi] = renk
}

function spriteCiz(t, satirlar, renkler, sx, sy, yon) {
  const g = satirlar[0].length
  satirlar.forEach((satir, dy) => [...satir].forEach((c, dx) => {
    if (renkler[c] !== undefined) nokta(t, sx + (yon < 0 ? g - 1 - dx : dx), sy + dy, renkler[c])
  }))
}

function yildizlar(t, s, kam, oy) {
  const kayma = Math.floor(kam * 0.25)
  for (let x = 0; x < t.g; x++) {
    const wx = x + kayma
    if (h2(wx, 101) > 0.045) continue
    const parlak = (s.kare + wx * 7) % 29 < 3
    nokta(t, x, oy + 2 + Math.floor(h2(wx, 103) * 7), parlak ? RENK.yildizParlak : RENK.yildiz)
  }
}

function blokRengi(s, tip, px, py, bx, by) {
  if (tip === 'tnt' && s.mod === 'tnt' && (s.modKare >> 1) % 2 === 1) return RENK.beyaz
  const catlak = s.kaziyor && by === -1 && bx === s.hedefBx ? Math.min(CATLAK.length, Math.floor(s.hasar / 2)) : 0
  if (CATLAK.slice(0, catlak).some(([cx, cy]) => cx === px && cy === py)) return 0x2a2a2a
  return dokuRengi(tip, px, py, bx)
}

function bloklar(t, s, kam, oy) {
  for (let x = 0; x < t.g; x++) {
    const wx = x + kam
    const bx = Math.floor(wx / BLOK), px = ((wx % BLOK) + BLOK) % BLOK
    for (let by = -2; by <= 1; by++) {
      const tip = blokAl(s.degisen, bx, by)
      if (!tip) continue
      for (let py = 0; py < BLOK; py++) nokta(t, x, oy + ZEMIN_Y + by * BLOK + py, blokRengi(s, tip, px, py, bx, by))
    }
  }
}

function kazmaCiz(t, s, hx, hy) {
  const poz = s.kaziyor ? KAZMA[Math.floor(s.kare / 2) % 3] : KAZMA[0]
  poz.sap.forEach(([dx, dy]) => nokta(t, hx + dx * s.yon, hy + dy, RENK.sap))
  poz.bas.forEach(([dx, dy]) => nokta(t, hx + dx * s.yon, hy + dy, RENK.elmas))
  if (s.kaziyor && poz === KAZMA[2] && s.kare % 2 === 0) nokta(t, hx + 5 * s.yon, hy - 1, RENK.kivilcim)
}

function elmasTut(t, s, sx, sy) {
  const zipla = Math.floor(s.kare / 3) % 2
  const ex = sx + CLAWD_G, ey = sy - 3 - zipla
  const elmas = [[1, 0, RENK.beyaz], [0, 1, RENK.elmas], [1, 1, RENK.beyaz], [2, 1, RENK.elmas], [1, 2, 0x2bb3b0]]
  elmas.forEach(([dx, dy, r]) => nokta(t, ex + dx, ey + dy, r))
  nokta(t, ex - 1, ey + 2, RENK.clawd)
  const kivilcim = [[-2, -1], [3, 0], [2, -3], [-1, 3], [4, 2]]
  kivilcim.forEach(([dx, dy], i) => { if ((s.kare + i * 2) % 6 < 3) nokta(t, ex + dx, ey + dy, RENK.yildizParlak) })
  const sallanan = s.kare % 6 < 3 ? -1 : 0
  nokta(t, sx - 1, sy + 2 + sallanan, RENK.clawdKoyu)
}

function clawdCiz(t, s, kam, oy) {
  const sx = Math.round(s.x - kam), sy = oy + ZEMIN_Y - 6 - Math.round(s.zy)
  spriteCiz(t, CLAWD, SPRITE_RENK, sx, sy, 1)
  const hareket = s.mod === 'kac' || (!s.kaziyor && s.mod === 'yuru')
  spriteCiz(t, [BACAK[hareket ? Math.floor(s.kare / 2) % 2 : 0]], SPRITE_RENK, sx, sy + 5, s.yon)
  const kirpma = s.kare % 41 === 0
  const gozler = s.yon > 0 ? [3, 7] : [2, 6]
  gozler.forEach((gx) => {
    nokta(t, sx + gx, sy + 2, RENK.goz)
    if (!kirpma) nokta(t, sx + gx, sy + 1, RENK.goz)
  })
  if (s.mod === 'bitti') return elmasTut(t, s, sx, sy)
  if (s.mod === 'kac') return nokta(t, sx + (s.yon > 0 ? 0 : CLAWD_G - 1), sy - 1, RENK.beyaz)
  kazmaCiz(t, s, s.yon > 0 ? sx + CLAWD_G - 1 : sx, sy + 3)
}

function yardimciCiz(t, s, kam, oy) {
  if (s.yardimci <= 0) return
  const sx = Math.round(s.x - kam) - 10, sy = oy + ZEMIN_Y - 4 - (s.kaziyor && s.kare % 4 < 2 ? 1 : 0)
  spriteCiz(t, YARDIMCI, SPRITE_RENK, sx, sy, 1)
  if (s.kaziyor) nokta(t, sx + 8, sy + (s.kare % 4 < 2 ? 0 : 2), RENK.elmas)
}

function creeperCiz(t, s, kam, oy) {
  if (!s.creeper) return
  const parla = s.modKare > 16 && s.kare % 2 === 0
  const renk = parla ? { G: RENK.beyaz, g: RENK.creeperAcik, K: RENK.goz } : CREEPER_RENK
  spriteCiz(t, CREEPER, renk, Math.round(s.creeper.x - kam), oy + ZEMIN_Y - 8, 1)
}

function patlamaCiz(t, s, kam, oy) {
  if (!s.patlama) return
  const { x, y, kare } = s.patlama
  const r = 2 + kare * 1.2
  for (let dy = -Math.ceil(r); dy <= r; dy++) {
    for (let dx = -Math.ceil(r * 1.2); dx <= r * 1.2; dx++) {
      const d = Math.hypot(dx / 1.2, dy)
      if (d > r) continue
      const renk = d < r - 2.2 ? (kare < 2 ? RENK.beyaz : null) : d < r - 1 ? RENK.kivilcim : RENK.alev
      if (renk) nokta(t, x - kam + dx, oy + y + dy, renk)
    }
  }
}

export function sahnePikselleri(s, g, y) {
  const t = tuval(g, y)
  const kam = Math.round(s.x - g * 0.32)
  const oy = y - SAHNE_Y
  yildizlar(t, s, kam, oy)
  bloklar(t, s, kam, oy)
  creeperCiz(t, s, kam, oy)
  yardimciCiz(t, s, kam, oy)
  clawdCiz(t, s, kam, oy)
  s.parca.forEach((p) => nokta(t, p.x - kam, oy + p.y, p.renk))
  patlamaCiz(t, s, kam, oy)
  return { t, kam }
}

// ---- Hücrelere çevirme ----
function hucreYaz(h, i, cp, fg, bg) {
  h[i * 3] = cp
  h[i * 3 + 1] = fg
  h[i * 3 + 2] = bg
}

function pikseldenHucre(t, sutun, satir) {
  const h = new Uint32Array(sutun * satir * 3)
  for (let r = 0; r < satir; r++) {
    for (let c = 0; c < sutun; c++) {
      const ust = t.p[2 * r * t.g + c], alt = t.p[(2 * r + 1) * t.g + c]
      const i = r * sutun + c
      if (ust === BOS && alt === BOS) hucreYaz(h, i, BOSLUK, BOS, BOS)
      else if (ust === BOS) hucreYaz(h, i, ALT_YARIM, alt, BOS)
      else hucreYaz(h, i, UST_YARIM, ust, alt)
    }
  }
  return h
}

const BALON_RENK = {
  bitti: { zemin: 0xd8f3ec, yazi: 0x14532d },
  kac: { zemin: 0xffd9d2, yazi: 0x8a1c10 },
  varsayilan: { zemin: RENK.balonZemin, yazi: RENK.balonYazi },
}

function balonYaz(h, t, s, kam, sutun) {
  const metin = [...` ${s.balon} `].slice(0, Math.max(6, Math.floor(sutun / 2)))
  const merkez = Math.round(s.x - kam + CLAWD_G / 2)
  const bas = Math.max(0, Math.min(sutun - metin.length, merkez - Math.floor(metin.length / 2)))
  const renk = BALON_RENK[s.mod] || BALON_RENK.varsayilan
  metin.forEach((c, i) => { if (bas + i < sutun) hucreYaz(h, bas + i, c.codePointAt(0), renk.yazi, renk.zemin) })
  const kuyruk = Math.max(bas + 1, Math.min(bas + metin.length - 2, merkez))
  if (kuyruk >= 0 && kuyruk < sutun && sutun < h.length / 3) hucreYaz(h, sutun + kuyruk, UST_YARIM, renk.zemin, t.p[3 * t.g + kuyruk])
}

export function sahneHucreleri(s, sutun, satir) {
  const { t, kam } = sahnePikselleri(s, sutun, satir * 2)
  const h = pikseldenHucre(t, sutun, satir)
  if (s.balon) balonYaz(h, t, s, kam, sutun)
  return h
}

export function base64(h) {
  const bayt = new Uint8Array(h.buffer, h.byteOffset, h.byteLength)
  if (typeof bayt.toBase64 === 'function') return bayt.toBase64()
  let ikili = ''
  for (let i = 0; i < bayt.length; i += 0x8000) ikili += String.fromCharCode(...bayt.subarray(i, i + 0x8000))
  return btoa(ikili)
}
