// Clawd Madenci — girdi katmanı (Client). Bant odaklıyken sahnenin üstüne biner,
// tuş ve fareyi okur, basılı tuşları ve sayaçları mod'a gönderir. $ yok; tek yol surface.post.

const ILK_BASIS_MS = 450 // terminal tuş bırakmayı bildirmez: tek basışı bu kadar basılı say
const TEKRAR_MS = 120
const ARALIK_MS = 40
const SUREKLI = new Set(['a', 'd', 'left', 'right'])
const ZIPLA = new Set([' ', 'space', 'w', 'up'])
const KAZ = new Set(['f', 'q', 'down', 's'])
const KOY = new Set(['e', 'return'])

export default function Girdi(props, surface) {
  const { Box } = surface.elements
  if (surface.state === undefined) {
    const durum = { basili: {}, zipla: 0, kaz: 0, koy: 0, gonderilen: JSON.stringify({ basili: [], zipla: 0, kaz: 0, koy: 0 }) }
    surface.setState(durum)
    surface.onKey((e) => {
      const tus = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (SUREKLI.has(tus)) {
        const tekrar = (durum.basili[tus] || 0) > Date.now()
        durum.basili[tus] = Date.now() + (tekrar ? TEKRAR_MS : ILK_BASIS_MS)
      } else if (ZIPLA.has(tus)) durum.zipla += 1
      else if (KAZ.has(tus)) durum.kaz += 1
      else if (KOY.has(tus)) durum.koy += 1
    })
    surface.onPointer((e) => {
      if (e.type !== 'down') return
      if (e.button === 'right') durum.koy += 1
      else durum.kaz += 1
    })
    surface.every(ARALIK_MS, () => {
      const t = Date.now()
      const basili = Object.keys(durum.basili).filter((k) => durum.basili[k] > t).sort()
      const paket = { basili, zipla: durum.zipla, kaz: durum.kaz, koy: durum.koy }
      const imza = JSON.stringify(paket)
      if (imza !== durum.gonderilen) {
        durum.gonderilen = imza
        surface.post(paket)
      }
    })
  }
  return Box({ width: surface.columns || 1, height: surface.rows || 1 })
}
