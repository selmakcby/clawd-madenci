// Clawd Madenci — araç çağrısından balon metni. Saf fonksiyonlar; $ kullanmaz.

const OKUMA = new Set(['Read', 'Grep', 'Glob', 'LS', 'NotebookRead'])
const YAZMA = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const AJAN = new Set(['Agent', 'Task'])
const WEB = new Set(['WebFetch', 'WebSearch'])
const EN_UZUN_PARCA = 28

// Raster hücresi tek genişlikte karakter ister: Latin + Türkçe dışını '?' yap
export function temizle(ham) {
  const tek = String(ham ?? '').replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').replace(/\s+/g, ' ').trim()
  return [...tek].map((c) => {
    const k = c.codePointAt(0)
    return (k >= 0x20 && k <= 0x7e) || (k >= 0xa0 && k <= 0x24f) ? c : '?'
  }).join('')
}

export function kisalt(metin, uzunluk) {
  const harfler = [...metin]
  if (harfler.length <= uzunluk) return metin
  return harfler.slice(0, Math.max(1, uzunluk - 1)).join('') + '…'
}

export function tabanAd(yol) {
  const parca = temizle(yol).split(/[\\/]/).filter(Boolean)
  return kisalt(parca[parca.length - 1] || 'dosya', EN_UZUN_PARCA)
}

// Uzantı harfleri Türkçede adıyla okunur (md = "me-de"); x = "iks"
const HARF_ADI_UNLU = { x: 'i', q: 'ü', w: 'e', h: 'a', k: 'e' }
const UNLU = 'aeıioöuüAEIİOÖUÜ'

function sonSes(ad) {
  const kucuk = ad.toLocaleLowerCase('tr')
  const nokta = kucuk.lastIndexOf('.')
  const uzanti = nokta > 0 ? kucuk.slice(nokta + 1) : ''
  const unluler = [...(uzanti || kucuk)].filter((c) => UNLU.includes(c))
  const son = [...kucuk].pop() || 'e'
  if ((uzanti && uzanti.length <= 3) || unluler.length === 0) {
    if (UNLU.includes(son)) return { unlu: son, unluyleBiter: true }
    const ses = HARF_ADI_UNLU[son] || 'e'
    return { unlu: ses, unluyleBiter: son !== 'x' }
  }
  return { unlu: unluler[unluler.length - 1], unluyleBiter: UNLU.includes(son) }
}

// Belirtme (-ı/-i/-u/-ü) ve yönelme (-a/-e) ekleri, kesme işaretiyle
export function ekle(ad, hal) {
  const { unlu, unluyleBiter } = sonSes(ad)
  const kalin = 'aıou'.includes(unlu)
  const yuvarlak = 'ouöü'.includes(unlu)
  const kaynastirma = unluyleBiter ? 'y' : ''
  if (hal === 'yonelme') return `${ad}'${kaynastirma}${kalin ? 'a' : 'e'}`
  const dar = kalin ? (yuvarlak ? 'u' : 'ı') : (yuvarlak ? 'ü' : 'i')
  return `${ad}'${kaynastirma}${dar}`
}

export function komutAdi(komut) {
  const parcalar = temizle(komut).split(/&&|\|\||;|\|/).map((p) => p.trim()).filter(Boolean)
  const asil = parcalar.find((p) => !/^cd\s/.test(p)) || parcalar[0] || 'komut'
  const [ilk = 'komut', ikinci = ''] = asil.split(' ').filter((k) => !/^\w+=/.test(k))
  const ad = ilk.split('/').pop()
  return kisalt(/^[a-z][\w:-]{0,11}$/i.test(ikinci) ? `${ad} ${ikinci}` : ad, EN_UZUN_PARCA)
}

function hostAdi(url) {
  try {
    return temizle(new URL(String(url)).hostname.replace(/^www\./, ''))
  } catch {
    return ''
  }
}

function okumaHedefi(e) {
  if (e.file_path || e.notebook_path) return tabanAd(e.file_path || e.notebook_path)
  if (e.pattern) return kisalt(`"${temizle(e.pattern)}"`, EN_UZUN_PARCA)
  return tabanAd(e.path || 'klasör')
}

// { tur, metin } — tur: kaz | insa | tnt | web | ajan | is
export function eylemOku(e) {
  const arac = String(e?.tool || '')
  if (OKUMA.has(arac)) return { tur: 'kaz', metin: `${ekle(okumaHedefi(e), 'belirtme')} kazıyor` }
  if (YAZMA.has(arac)) return { tur: 'insa', metin: `${ekle(tabanAd(e.file_path || e.notebook_path), 'yonelme')} blok koyuyor` }
  if (arac === 'Bash') return { tur: 'tnt', metin: `${komutAdi(e.command)} patlatıyor` }
  if (AJAN.has(arac)) {
    const kim = temizle(e.description || e.subagent_type || 'yardımcı')
    return { tur: 'ajan', metin: kisalt(`yardımcı Clawd: ${kim}`, 40) }
  }
  if (arac === 'WebSearch') return { tur: 'web', metin: kisalt(`internette arıyor: ${temizle(e.query)}`, 40) }
  if (WEB.has(arac)) {
    const host = hostAdi(e.url)
    return { tur: 'web', metin: host ? `internette geziyor: ${host}` : 'internette geziyor' }
  }
  const kisa = temizle(arac.replace(/^mcp__/, '').replace(/__/g, ' '))
  return { tur: 'is', metin: kisalt(`${kisa || 'araç'} ile uğraşıyor`, 40) }
}

export const HATA_METNI = 'Eyvah, hata! Creeper geldi, kaç!'
export const BITTI_METNI = 'Bitti! Elmasını buldu'
export const DUSUNUYOR_METNI = 'düşünüyor…'
