// Clawd Madenci — ortak fizik: yerçekimi, sütun yükseklikleri, parçacıklar. Saf.

import { BLOK, blokAl, h2 } from './dunya.js'

export const CLAWD_G = 10 // Clawd genişliği (kollar dahil)
const EN_COK_PARCA = 80
const BASAMAK = 1 // ayağın bu kadar altındaki blok üstü zemin sayılır

// Sütunun zeminden yüksekliği (piksel): boş 0, bir blok 4, iki blok 8
export function sutunUstu(degisen, bx) {
  if (blokAl(degisen, bx, -2)) return 2 * BLOK
  return blokAl(degisen, bx, -1) ? BLOK : 0
}

export function govdeSutunlari(x) {
  const ilk = Math.floor(x / BLOK), son = Math.floor((x + CLAWD_G - 1) / BLOK)
  return Array.from({ length: son - ilk + 1 }, (_, i) => ilk + i)
}

// Gövdenin altındaki en yüksek basılabilir yüzey
export function zeminYuksekligi(s, x = s.x) {
  const ustler = govdeSutunlari(Math.round(x)).map((bx) => sutunUstu(s.degisen, bx))
  return Math.max(0, ...ustler.filter((u) => u <= s.zy + BASAMAK))
}

export function yerde(s) {
  return s.vy === 0 && s.zy === zeminYuksekligi(s)
}

export function yerCekimi(s) {
  const zemin = zeminYuksekligi(s)
  if (s.vy <= 0 && s.zy <= zemin) return s.zy === zemin && s.vy === 0 ? s : { ...s, zy: zemin, vy: 0 }
  const zy = s.zy + s.vy
  return zy <= zemin ? { ...s, zy: zemin, vy: 0 } : { ...s, zy, vy: s.vy - 1 }
}

export function parcaSac(s, cx, cy, renkFn, adet, guc) {
  const yeni = Array.from({ length: adet }, (_, i) => {
    const r1 = h2(s.kare * 31 + i, cx), r2 = h2(s.kare * 17 + i, cy + 5)
    return { x: cx + (r1 - 0.5) * 3, y: cy, vx: (r1 - 0.5) * 2.4 * guc, vy: -(0.6 + r2 * 1.8) * guc, renk: renkFn(i), omur: 7 + Math.floor(r2 * 8) }
  })
  return [...s.parca, ...yeni].slice(-EN_COK_PARCA)
}

export function parcaAdim(parca) {
  return parca
    .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.35, omur: p.omur - 1 }))
    .filter((p) => p.omur > 0 && p.y < 20)
}
