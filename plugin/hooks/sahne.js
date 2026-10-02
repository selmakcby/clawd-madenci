// Clawd Madenci — sahne simülasyonu. Saf: durum + olay → yeni durum. $ kullanmaz.

import { BLOK, anahtar, blokAl, parcaRengi, h2, RENK } from './dunya.js'
import { DUSUNUYOR_METNI, HATA_METNI, BITTI_METNI } from './metin.js'

export const CLAWD_G = 10 // Clawd genişliği (kollar dahil)
const INSA_ARALIK = 5
const INSA_YUKSEKLIK = 2
const FITIL_KARE = 12
const KACIS_KARE = 24
const EN_COK_PARCA = 80
const BALON_EN_AZ = 22 // balon en az ~2 sn kalsın: Read gibi araçlar milisaniyede biter
const SERTLIK = { yaprak: 4, toprak: 6, cim: 6, kutuk: 9, tahta: 8, tas: 10, komur: 11, demir: 13, altin: 13, kizil: 12, elmas: 16, tnt: 1 }

export function yeniSahne() {
  return {
    kare: 0, x: 4, yon: 1, zy: 0, vy: 0, hasar: 0, kaziyor: false,
    degisen: {}, parca: [], sayac: 0,
    mod: 'yuru', modKare: 0, eylem: 'dusun', balon: DUSUNUYOR_METNI,
    tnt: null, patlama: null, creeper: null, yardimci: 0, balonKare: 0, dusunAt: null,
  }
}

// ---- Olaylar ----
export function olayUygula(s, olay) {
  if (s.mod === 'bitti' && olay.tip !== 'bitti' && olay.tip !== 'basla') return s
  if (olay.tip === 'eylem') return eylemBaslat(s, olay)
  if (olay.tip === 'eylemBitti') return { ...s, dusunAt: s.balonKare + BALON_EN_AZ }
  if (olay.tip === 'basla') return s.mod === 'bitti' ? { ...s, mod: 'yuru', modKare: 0, eylem: 'dusun', balon: DUSUNUYOR_METNI } : s
  if (olay.tip === 'ajanBitti') return { ...s, yardimci: Math.max(0, s.yardimci - 1) }
  if (olay.tip === 'hata') return hataBaslat(s.tnt ? patlat(s) : s)
  if (olay.tip === 'bitti') return { ...s, mod: 'bitti', modKare: 0, yon: 1, kaziyor: false, balon: `${BITTI_METNI} · ${s.sayac} blok` }
  return s
}

function hataBaslat(s) {
  return { ...s, mod: 'kac', modKare: 0, yon: -1, balon: HATA_METNI, creeper: { x: s.x + 30, kare: 0 } }
}

function eylemBaslat(s, { tur, metin }) {
  const temel = { ...s, eylem: tur, balon: metin, balonKare: s.kare, dusunAt: null }
  if (s.mod === 'kac') return { ...s, eylem: tur }
  if (tur === 'insa') return { ...temel, mod: 'insa', modKare: 0, kaziyor: false }
  if (tur === 'ajan') return { ...temel, yardimci: s.yardimci + 1 }
  if (tur === 'tnt') return tntKoy(temel)
  return temel
}

function onBx(s) {
  return Math.floor((s.x + CLAWD_G) / BLOK)
}

function tntKoy(s) {
  if (s.tnt) return s
  const bx = onBx(s) + 2
  const by = blokAl(s.degisen, bx, -1) ? (blokAl(s.degisen, bx, -2) ? null : -2) : -1
  if (by === null) return s
  return { ...s, mod: 'tnt', modKare: 0, kaziyor: false, tnt: { bx, by }, degisen: { ...s.degisen, [anahtar(bx, by)]: 'tnt' } }
}

// ---- Parçacıklar ----
function parcaSac(s, cx, cy, renkFn, adet, guc) {
  const yeni = Array.from({ length: adet }, (_, i) => {
    const r1 = h2(s.kare * 31 + i, cx), r2 = h2(s.kare * 17 + i, cy + 5)
    return { x: cx + (r1 - 0.5) * 3, y: cy, vx: (r1 - 0.5) * 2.4 * guc, vy: -(0.6 + r2 * 1.8) * guc, renk: renkFn(i), omur: 7 + Math.floor(r2 * 8) }
  })
  return [...s.parca, ...yeni].slice(-EN_COK_PARCA)
}

function parcaAdim(parca) {
  return parca
    .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.35, omur: p.omur - 1 }))
    .filter((p) => p.omur > 0 && p.y < 20)
}

// ---- Blok kırma ----
function kir(s, bx) {
  const tip = blokAl(s.degisen, bx, -1)
  const ust = blokAl(s.degisen, bx, -2)
  const degisen = { ...s.degisen, [anahtar(bx, -1)]: ust, [anahtar(bx, -2)]: null }
  const parca = parcaSac(s, bx * BLOK + 2, 9, (i) => parcaRengi(tip, i * 5, bx), 10, 1)
  return { ...s, degisen, parca, sayac: s.sayac + 1, hasar: 0 }
}

function yuruAdim(s) {
  const bx = onBx(s)
  const engel = blokAl(s.degisen, bx, -1) || blokAl(s.degisen, bx, -2)
  if (!engel) {
    const zipla = s.eylem === 'web' && s.zy === 0 && s.kare % 9 === 0
    return { ...s, x: s.x + 1, kaziyor: false, hasar: 0, ...(zipla ? { vy: 3 } : {}) }
  }
  if (engel === 'tnt' && s.tnt) return { ...s, kaziyor: false }
  const guc = 1 + (s.yardimci > 0 ? 1 : 0)
  const hasar = s.hasar + guc
  const sertlik = SERTLIK[blokAl(s.degisen, bx, -1) || engel] || 10
  if (hasar >= sertlik) return kir({ ...s, kaziyor: true }, bx)
  return { ...s, kaziyor: true, hasar, hedefBx: bx }
}

function insaAdim(s) {
  const bx = Math.floor(s.x / BLOK) - 1
  const sira = Math.floor(s.modKare / INSA_ARALIK)
  if (sira >= INSA_YUKSEKLIK + 1) return { ...s, mod: 'yuru', yon: 1, modKare: 0 }
  if (s.modKare % INSA_ARALIK !== INSA_ARALIK - 1 || sira >= INSA_YUKSEKLIK) return { ...s, yon: -1 }
  const by = -1 - sira
  if (blokAl(s.degisen, bx, by)) return { ...s, yon: -1 }
  const parca = parcaSac(s, bx * BLOK + 2, 12 + by * BLOK, () => RENK.tahta, 4, 0.5)
  return { ...s, yon: -1, parca, degisen: { ...s.degisen, [anahtar(bx, by)]: 'tahta' } }
}

function patlat(s) {
  const { bx: tx, by: ty } = s.tnt
  const sutunlar = [-2, -1, 0, 1, 2].map((d) => tx + d)
  const kirilan = sutunlar.flatMap((bx) => [-1, -2].map((by) => ({ bx, by, tip: blokAl(s.degisen, bx, by) })))
    .filter((b) => b.tip && !(b.bx === tx && b.by === ty))
  const degisen = Object.fromEntries(sutunlar.flatMap((bx) => [[anahtar(bx, -1), null], [anahtar(bx, -2), null]]))
  const cx = tx * BLOK + 2, cy = 12 + ty * BLOK + 2
  const sicak = [RENK.beyaz, RENK.kivilcim, RENK.alev, RENK.tnt, RENK.tasKoyu]
  const parca = parcaSac(s, cx, cy, (i) => sicak[i % sicak.length], 26, 1.6)
  const enkaz = parcaSac({ ...s, parca }, cx, cy, (i) => parcaRengi(kirilan[i % Math.max(1, kirilan.length)]?.tip || 'tas', i, tx), kirilan.length * 3, 1.2)
  return {
    ...s, mod: 'yuru', modKare: 0, tnt: null, parca: enkaz, sayac: s.sayac + kirilan.length,
    degisen: { ...s.degisen, ...degisen }, patlama: { x: cx, y: cy, kare: 0 },
  }
}

function tntAdim(s) {
  if (!s.tnt) return { ...s, mod: 'yuru' }
  if (s.modKare >= FITIL_KARE) return patlat(s)
  const geri = s.modKare < 4 && s.x > 0 ? -1 : 0
  return { ...s, x: s.x + geri, yon: 1 }
}

function kacAdim(s) {
  const c = s.creeper
  if (s.modKare >= KACIS_KARE) {
    const parca = c ? parcaSac(s, c.x + 3, 8, (i) => (i % 2 ? RENK.creeper : RENK.creeperKoyu), 14, 1.2) : s.parca
    return { ...s, mod: 'yuru', modKare: 0, yon: 1, creeper: null, parca, eylem: 'dusun', balon: DUSUNUYOR_METNI }
  }
  const zipla = s.zy === 0 ? { vy: 2 } : {}
  return { ...s, x: s.x - 2, yon: -1, kaziyor: false, creeper: c && { x: c.x - 1.6, kare: c.kare + 1 }, ...zipla }
}

function ziplamaAdim(s) {
  if (s.zy <= 0 && s.vy <= 0) return s.zy === 0 ? s : { ...s, zy: 0, vy: 0 }
  const zy = s.zy + s.vy
  return zy <= 0 ? { ...s, zy: 0, vy: 0 } : { ...s, zy, vy: s.vy - 1 }
}

function balonZamani(s) {
  if (s.dusunAt === null || s.kare < s.dusunAt || s.mod !== 'yuru') return s
  return { ...s, eylem: 'dusun', balon: DUSUNUYOR_METNI, dusunAt: null }
}

const MOD_ADIMI = { yuru: yuruAdim, insa: insaAdim, tnt: tntAdim, kac: kacAdim, bitti: (s) => s }

export function adim(s) {
  const temel = {
    ...s, kare: s.kare + 1, modKare: s.modKare + 1, parca: parcaAdim(s.parca),
    patlama: s.patlama && s.patlama.kare < 5 ? { ...s.patlama, kare: s.patlama.kare + 1 } : null,
  }
  return balonZamani(ziplamaAdim((MOD_ADIMI[s.mod] || yuruAdim)(temel)))
}
