// Clawd Madenci — dünya: tohumlu sonsuz şerit, blok tipleri ve 4x4 piksel dokuları. Saf.

export const BLOK = 4 // bir blok 4x4 piksel
export const ZEMIN_Y = 12 // çim yüzeyinin piksel satırı (0 = bandın üstü)
export const BOS = 0x01000000 // terminalin varsayılan rengi

export const RENK = {
  clawd: 0xd97757, clawdAcik: 0xeb9a7a, clawdKoyu: 0xb35a3e, goz: 0x2b1b17,
  cim: 0x6aaa3a, cimAcik: 0x8cc84b, cimKoyu: 0x4e8a2b,
  toprak: 0x866043, toprakKoyu: 0x6b4a30, toprakAcik: 0x9c7352,
  tas: 0x7f7f7f, tasKoyu: 0x666666, tasAcik: 0x999999,
  komur: 0x252525, demir: 0xd8af93, altin: 0xf5d03b, elmas: 0x4de3e0, kizil: 0xd02a2a,
  kutuk: 0x6b4e2e, kutukAcik: 0x8d6a3f, yaprak: 0x3f8a2e, yaprakAcik: 0x5aa83f,
  tahta: 0xb08850, tahtaKoyu: 0x8c6a3a,
  tnt: 0xdb3a2f, tntKoyu: 0xa52a22, beyaz: 0xf2f2f2,
  creeper: 0x4cb34c, creeperKoyu: 0x2f7a2f, creeperAcik: 0x7ad36a,
  sap: 0x8b5a2b, balonZemin: 0xf4ebdd, balonYazi: 0x2b1b17,
  yildiz: 0x5a6080, yildizParlak: 0xc9d1f0, kivilcim: 0xffd166, alev: 0xff7a1a,
}

export function h2(a, b) {
  let h = Math.imul((a | 0) * 73856093 ^ (b | 0) * 19349663, 2654435761)
  h ^= h >>> 15
  h = Math.imul(h, 2246822519)
  h ^= h >>> 13
  return ((h >>> 0) % 10000) / 10000
}

// Cevherli taş katmanı (by = 1)
function tasTipi(bx) {
  const r = h2(bx, 11)
  if (r < 0.05) return 'elmas'
  if (r < 0.1) return 'altin'
  if (r < 0.2) return 'demir'
  if (r < 0.34) return 'komur'
  if (r < 0.37) return 'kizil'
  return 'tas'
}

const ENGEL_TIPLERI = ['kutuk', 'tas', 'komur', 'demir', 'elmas', 'altin', 'toprak', 'yaprak']
const ENGEL_AGIRLIK = [0.22, 0.2, 0.16, 0.12, 0.06, 0.06, 0.1, 0.08]

function engelTipi(bx) {
  let r = h2(bx, 23)
  for (let i = 0; i < ENGEL_TIPLERI.length; i++) {
    if (r < ENGEL_AGIRLIK[i]) return ENGEL_TIPLERI[i]
    r -= ENGEL_AGIRLIK[i]
  }
  return 'tas'
}

// Arazinin değişmemiş hâli. by: -2, -1 = yüzey üstü engeller; 0 = çim; 1 = taş/cevher
export function araziBlogu(bx, by) {
  if (by === 0) return 'cim'
  if (by === 1) return tasTipi(bx)
  if (bx === 6) return by === -1 ? 'kutuk' : by === -2 ? 'yaprak' : null
  if (bx < 9 || h2(bx, 7) > 0.2) return null
  if (by === -1) return engelTipi(bx)
  if (by === -2 && h2(bx, 31) < 0.3) return engelTipi(bx) === 'kutuk' ? 'yaprak' : engelTipi(bx)
  return null
}

export const anahtar = (bx, by) => `${bx},${by}`

export function blokAl(degisen, bx, by) {
  const k = anahtar(bx, by)
  return k in degisen ? degisen[k] : araziBlogu(bx, by)
}

const CEVHER = { komur: RENK.komur, demir: RENK.demir, altin: RENK.altin, elmas: RENK.elmas, kizil: RENK.kizil }

function tasDoku(px, py, bx) {
  const r = h2(bx * 4 + px, py + 50)
  return r < 0.25 ? RENK.tasKoyu : r > 0.85 ? RENK.tasAcik : RENK.tas
}

const CEVHER_DESEN = [
  ['1,1', '2,2', '3,0', '0,3'],
  ['0,0', '2,1', '1,2', '3,3'],
  ['1,0', '3,1', '0,2', '2,3'],
]

function cevherDoku(tip, px, py, bx) {
  const desen = CEVHER_DESEN[Math.floor(h2(bx, 4) * CEVHER_DESEN.length)]
  return desen.includes(`${px},${py}`) ? CEVHER[tip] : tasDoku(px, py, bx)
}

function cimDoku(px, py, bx) {
  if (py === 0) return h2(bx * 4 + px, 3) > 0.7 ? RENK.cimAcik : RENK.cim
  if (py === 1 && h2(bx * 4 + px, 9) > 0.55) return RENK.cimKoyu
  return h2(bx * 4 + px, py) > 0.75 ? RENK.toprakKoyu : RENK.toprak
}

const DOKULAR = {
  cim: cimDoku,
  toprak: (px, py, bx) => (h2(bx * 4 + px, py + 70) > 0.7 ? RENK.toprakKoyu : h2(bx + px, py) > 0.85 ? RENK.toprakAcik : RENK.toprak),
  tas: tasDoku,
  kutuk: (px) => (px === 0 || px === 3 ? RENK.kutuk : px === 1 ? RENK.kutukAcik : RENK.kutuk + 0x080604),
  yaprak: (px, py, bx) => (h2(bx * 4 + px, py + 90) > 0.6 ? RENK.yaprakAcik : RENK.yaprak),
  tahta: (px, py) => (py === 1 || py === 3 ? RENK.tahtaKoyu : px === (py === 0 ? 3 : 1) ? RENK.tahtaKoyu : RENK.tahta),
  tnt: (px, py) => (py === 1 || py === 2 ? (px === 1 || px === 2 ? RENK.beyaz : RENK.tntKoyu) : RENK.tnt),
}

export function dokuRengi(tip, px, py, bx) {
  if (tip in CEVHER) return cevherDoku(tip, px, py, bx)
  const doku = DOKULAR[tip]
  return doku ? doku(px, py, bx) : RENK.tas
}

// Bloktan saçılan parçacıkların rengi
export function parcaRengi(tip, i, bx) {
  return dokuRengi(tip, i % 4, (i >> 2) % 4, bx)
}
