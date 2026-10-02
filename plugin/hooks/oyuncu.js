// Clawd Madenci — oyuncu kontrolü: rakam tuşları ve bant odaklıyken klavye/fare. Saf.

import { BLOK, anahtar, blokAl, parcaRengi, RENK } from './dunya.js'
import { CLAWD_G, parcaSac, sutunUstu, govdeSutunlari, yerde } from './fizik.js'
import { DUSUNUYOR_METNI } from './metin.js'

export const OYUNCU_OLAYLARI = new Set(['oyuncu', 'tuslar'])
export const OYUNCU_SURE = 55 // ~5 sn, sonra Claude'un tepkilerine döner
export const KONTROL_METNI = 'Kontrol sende!'
const ZIPLAMA_HIZI = 3 // tepe ~6 piksel: bir blok üstüne çıkar
const ADIM_YURUME = 12 // rakamla bir basış = 3 blok
const SALLAMA = 4
const SOL = new Set(['left', 'a'])
const SAG = new Set(['right', 'd'])
const YUKARI = new Set(['up', 'w'])

function onSutun(s) {
  return s.yon > 0 ? Math.floor((s.x + CLAWD_G) / BLOK) : Math.floor((s.x - 1) / BLOK)
}

function zipla(s) {
  return yerde(s) ? { ...s, vy: ZIPLAMA_HIZI } : s
}

// Ayak hizasındaki bloğu önce dener: yukarıdaysan üstteki, yerdeysen alttaki
function kaz(s) {
  const bx = onSutun(s)
  const sira = s.zy >= BLOK ? [-2, -1] : [-1, -2]
  const by = sira.find((b) => blokAl(s.degisen, bx, b))
  const sallayan = { ...s, salla: SALLAMA }
  if (by === undefined) return sallayan
  const tip = blokAl(s.degisen, bx, by)
  const ust = by === -1 ? blokAl(s.degisen, bx, -2) : null // üstteki blok aşağı düşer
  const degisen = { ...s.degisen, [anahtar(bx, by)]: ust, ...(by === -1 ? { [anahtar(bx, -2)]: null } : {}) }
  const parca = parcaSac(s, bx * BLOK + 2, 12 + by * BLOK + 2, (i) => parcaRengi(tip, i * 5, bx), 10, 1)
  return { ...sallayan, degisen, parca, sayac: s.sayac + 1, tnt: tip === 'tnt' ? null : s.tnt }
}

function koy(s) {
  const bx = onSutun(s)
  if (govdeSutunlari(Math.round(s.x)).includes(bx)) return s
  const by = [-1, -2].find((b) => !blokAl(s.degisen, bx, b))
  if (by === undefined) return s
  const parca = parcaSac(s, bx * BLOK + 2, 12 + by * BLOK, () => RENK.tahta, 4, 0.5)
  return { ...s, parca, salla: SALLAMA, degisen: { ...s.degisen, [anahtar(bx, by)]: 'tahta' } }
}

const KOMUTLAR = {
  zipla,
  sol: (s) => ({ ...s, yon: -1, yuruKalan: -ADIM_YURUME }),
  sag: (s) => ({ ...s, yon: 1, yuruKalan: ADIM_YURUME }),
  kaz,
  koy,
}

export function oyuncuOlayi(s, olay) {
  if (s.mod !== 'yuru') return s
  const temel = { ...s, oyuncu: OYUNCU_SURE, balon: KONTROL_METNI, dusunAt: null, kaziyor: false, hasar: 0 }
  if (olay.tip === 'tuslar') return { ...temel, basili: Array.isArray(olay.basili) ? olay.basili : [] }
  const komut = KOMUTLAR[olay.komut]
  return komut ? komut(temel) : s
}

function serbest(s, x) {
  return govdeSutunlari(x).every((bx) => sutunUstu(s.degisen, bx) <= s.zy)
}

function yon(s) {
  if (s.basili.some((k) => SOL.has(k))) return -1
  if (s.basili.some((k) => SAG.has(k))) return 1
  return Math.sign(s.yuruKalan)
}

function yuru(s) {
  const d = yon(s)
  if (d === 0) return s
  const kalan = s.yuruKalan - Math.sign(s.yuruKalan)
  if (!serbest(s, s.x + d)) return { ...s, yon: d, yuruKalan: 0 }
  return { ...s, x: s.x + d, yon: d, yuruKalan: kalan }
}

export function oyuncuAdim(s) {
  const kalan = s.oyuncu - 1
  const yuruyen = yuru(s.basili.some((k) => YUKARI.has(k)) ? zipla(s) : s)
  const salla = Math.max(0, yuruyen.salla - 1)
  const sonraki = { ...yuruyen, oyuncu: kalan, salla, kaziyor: yuruyen.salla > 0 }
  if (kalan > 0) return sonraki
  return { ...sonraki, basili: [], yuruKalan: 0, yon: 1, eylem: 'dusun', balon: DUSUNUYOR_METNI }
}
