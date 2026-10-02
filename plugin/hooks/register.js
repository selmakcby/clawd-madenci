// Clawd Madenci — Claude çalışırken istemin üstündeki bantta piksel Minecraft sahnesi.
// Clawd yürür, blok kırar; Claude'un araçlarına göre kazar, inşa eder, TNT patlatır.
// $ kullanan her şey bu dosyada; sahne, dünya, çizim ve metin modülleri saftır.

import { yeniSahne, adim, olayUygula } from './sahne.js'
import { sahneHucreleri, base64 } from './cizim.js'
import { eylemOku } from './metin.js'

const KARE_MS = 90 // ~11 fps
const SATIR = 10 // bant yüksekliği: 10 satır = 20 piksel
const EN_AZ_SATIR = 6
const KAPANIS_MS = 2000
const ANAHTAR = 'sahne'

let acik = true
let gorunur = false
let sahne = yeniSahne()
let kuyruk = []
let eylemNo = 0
let bant = null // { requestId, sutun, satir }
let cizgi = null // kare zamanlayıcısı
let kapanis = null
let ciziliyor = false
let girdiSayac = { zipla: 0, kaz: 0, koy: 0 }
let sonBasili = []

function olayEkle(olay) {
  kuyruk = [...kuyruk, olay]
}

function kareIlerle() {
  const olaylar = kuyruk
  kuyruk = []
  sahne = adim(olaylar.reduce(olayUygula, sahne))
}

async function kareCiz($) {
  kareIlerle()
  if (!bant || ciziliyor) return
  ciziliyor = true
  try {
    const cells = base64(sahneHucreleri(sahne, bant.sutun, bant.satir))
    const r = await $.ui.blit({ requestId: bant.requestId, key: ANAHTAR, cells, columns: bant.sutun, rows: bant.satir })
    if (r?.deny) $.ui.invalidate('ui.render')
  } catch {
    $.ui.invalidate('ui.render')
  } finally {
    ciziliyor = false
  }
}

function durdur() {
  cizgi?.cancel()
  kapanis?.cancel()
  cizgi = null
  kapanis = null
}

function baslat($) {
  kapanis?.cancel()
  kapanis = null
  gorunur = true
  olayEkle({ tip: 'basla' })
  if (!cizgi) cizgi = $.clock.every(KARE_MS, () => kareCiz($))
  $.ui.invalidate('ui.render')
}

function gizle($) {
  durdur()
  gorunur = false
  bant = null
  kuyruk = []
  $.ui.invalidate('ui.render')
}

const DUGMELER = [
  { hotkey: '1', label: 'zıpla', komut: 'zipla' },
  { hotkey: '2', label: '←', komut: 'sol' },
  { hotkey: '3', label: '→', komut: 'sag' },
  { hotkey: '4', label: 'kaz', komut: 'kaz' },
  { hotkey: '5', label: 'koy', komut: 'koy' },
]

function dugmeSeridi(Box, Button) {
  return Box({
    flexDirection: 'row', gap: 2,
    children: DUGMELER.map((d) => Button({
      key: `oyna-${d.komut}`, hotkey: d.hotkey, label: d.label, plain: true, dimColor: true,
      onPress: () => olayEkle({ tip: 'oyuncu', komut: d.komut }),
    })),
  })
}

function bantCiz($, e) {
  const { Box, Text, Raster, Button, Client } = $.ui.resolve(e)
  if (e.surface !== 'terminal') {
    return Text({ wrap: 'truncate', children: [`⛏ Clawd: ${sahne.balon} · ${sahne.sayac} blok`] })
  }
  const sutun = Math.max(20, Math.min(512, e.props.bodyColumns || 80))
  const satir = Math.max(EN_AZ_SATIR, Math.min(SATIR, (e.props.maxRows || SATIR + 1) - 1))
  bant = { requestId: e.requestId, sutun, satir }
  const cells = base64(sahneHucreleri(sahne, sutun, satir))
  return Box({
    flexDirection: 'column',
    children: [
      Box({
        width: sutun, height: satir,
        children: [
          Raster({ key: ANAHTAR, columns: sutun, rows: satir, cells }),
          Box({ position: 'absolute', top: 0, left: 0, children: [Client({ key: 'girdi', module: './girdi.js', width: sutun, height: satir })] }),
        ],
      }),
      dugmeSeridi(Box, Button),
    ],
  })
}

// Client'tan gelen paket: sayaç farkları tek seferlik komut, basılı tuşlar sürekli
function girdiIsle(veri) {
  if (!veri || typeof veri !== 'object') return
  const sayac = (k) => (Number.isInteger(veri[k]) && veri[k] >= 0 ? veri[k] : 0)
  const yeni = { zipla: sayac('zipla'), kaz: sayac('kaz'), koy: sayac('koy') }
  Object.keys(yeni).filter((k) => yeni[k] > girdiSayac[k]).forEach((k) => olayEkle({ tip: 'oyuncu', komut: k }))
  girdiSayac = yeni
  const basili = Array.isArray(veri.basili) ? veri.basili.filter((k) => typeof k === 'string').slice(0, 8) : []
  if (basili.join() !== sonBasili.join()) olayEkle({ tip: 'tuslar', basili })
  sonBasili = basili
}

async function izlenenCagri($, e, next) {
  const eylem = eylemOku(e)
  const no = ++eylemNo
  olayEkle({ tip: 'eylem', ...eylem })
  const sonuc = await next(e)
  if (sonuc?.isError) olayEkle({ tip: 'hata' })
  else if (no === eylemNo) olayEkle({ tip: 'eylemBitti' })
  if (eylem.tur === 'ajan') olayEkle({ tip: 'ajanBitti' })
  return sonuc
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    const kayitli = await $.store.get('acik')
    acik = kayitli !== false
    await $.command.register({ name: 'clawd', description: 'Clawd Madenci bandını aç/kapat', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'clawd' }, async ($) => {
    acik = !acik
    await $.store.set('acik', acik)
    if (!acik) gizle($)
    return { text: acik ? 'Clawd Madenci açık: Claude çalışırken kazmaya başlar.' : 'Clawd Madenci kapalı.' }
  })

  on('turn.start', async ($, e, next) => {
    if (acik && !e.agentId) baslat($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId || !gorunur) return next(e)
    olayEkle({ tip: 'bitti' })
    kapanis?.cancel()
    kapanis = $.clock.after(KAPANIS_MS, () => gizle($))
    return next(e)
  })

  // tool.check'e tepki yok: auto modda her çağrı sınıflandırıcıya gider
  on('tool.call', async ($, e, next) => (gorunur ? izlenenCagri($, e, next) : next(e)))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!acik || !gorunur) return next(e)
    return bantCiz($, e)
  })

  on('ui.message', async ($, e, next) => {
    if (e.element !== 'girdi') return next(e)
    if (gorunur) girdiIsle(e.data)
    return {}
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!gorunur || sahne.sayac === 0) return next(e)
    return next({ ...e, props: { ...e.props, suffix: `${e.props.suffix || ''} · ⛏ ${sahne.sayac} blok` } })
  })
}
