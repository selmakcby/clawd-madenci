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
let bant = null // { requestId, sutun, satir }
let cizgi = null // kare zamanlayıcısı
let kapanis = null
let ciziliyor = false

function olayEkle(olay) {
  sahne = olayUygula(sahne, olay)
}

function kareIlerle() {
  sahne = adim(sahne)
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
  const { Box, Text, Raster, Button } = $.ui.resolve(e)
  if (e.surface !== 'terminal') {
    return Text({ wrap: 'truncate', children: [`⛏ Clawd: ${sahne.balon} · ${sahne.sayac} blok`] })
  }
  const sutun = Math.max(20, Math.min(512, e.props.bodyColumns || 80))
  const satir = Math.max(EN_AZ_SATIR, Math.min(SATIR, (e.props.maxRows || SATIR + 1) - 1))
  bant = { requestId: e.requestId, sutun, satir }
  const cells = base64(sahneHucreleri(sahne, sutun, satir))
  // Raster bandın doğrudan çocuğu kalmalı: üstüne bindirilen Client, blit'li kareleri siliyordu
  return Box({
    flexDirection: 'column',
    children: [Raster({ key: ANAHTAR, columns: sutun, rows: satir, cells }), dugmeSeridi(Box, Button)],
  })
}

// Ayarlar kancalarının (PreToolUse/PostToolUse) kopyalarını dinleriz: tool.call içinde next()'i
// beklemek uzun bir Bash boyunca modun saatini ve düğmelerini durduruyor.
let calisanAjan = 0

// classic.PreToolUse, tool.call ile aynı zarfı taşır: e.tool + argümanlar
function aracBasladi(e) {
  const eylem = eylemOku(e)
  if (eylem.tur === 'ajan') calisanAjan += 1
  olayEkle({ tip: 'eylem', ...eylem })
}

function aracBitti(e, hata) {
  const ajan = eylemOku({ tool: e?.tool_name }).tur === 'ajan'
  if (ajan && calisanAjan > 0) {
    calisanAjan -= 1
    olayEkle({ tip: 'ajanBitti' })
  }
  olayEkle({ tip: hata ? 'hata' : 'eylemBitti' })
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
  on('classic.PreToolUse', async ($, e, next) => {
    if (gorunur) aracBasladi(e)
    return next(e)
  })

  on('classic.PostToolUse', async ($, e, next) => {
    if (gorunur) aracBitti(e, e?.tool_response?.is_error === true || e?.tool_response?.isError === true)
    return next(e)
  })

  on('classic.PostToolUseFailure', async ($, e, next) => {
    if (gorunur) aracBitti(e, true)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!acik || !gorunur) return next(e)
    return bantCiz($, e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!gorunur || sahne.sayac === 0) return next(e)
    return next({ ...e, props: { ...e.props, suffix: `${e.props.suffix || ''} · ⛏ ${sahne.sayac} blok` } })
  })
}
