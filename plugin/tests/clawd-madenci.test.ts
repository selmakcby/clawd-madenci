import { expect, mock, test } from 'claude-code/testing'
import { eylemOku, ekle, komutAdi, temizle } from '../hooks/metin.js'
import { yeniSahne, adim, olayUygula } from '../hooks/sahne.js'
import { sahneHucreleri } from '../hooks/cizim.js'

const BANT = {
  plugin: 'clawd-madenci',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 12, bodyColumns: 100, scroll: { offset: 0, bodyRows: 12 }, view: {} },
} as const

function kur(on: any) {
  const kayit = { depo: new Map<string, unknown>(), blitler: [] as any[] }
  const clock = mock.clock(on)
  on('store.get', ($: any, e: any) => ({ value: kayit.depo.get(e.key) }))
  on('store.set', ($: any, e: any) => {
    kayit.depo.set(e.key, e.value)
    return { value: undefined }
  })
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  on('ui.blit', ($: any, e: any) => {
    kayit.blitler.push(e)
    return { value: {} }
  })
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['Claude Code çizdi'] }))
  on('turn.start', ($: any, e: any) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', ($: any, e: any) => (e.command === 'yanlis' ? { result: 'hata', isError: true } : { result: 'ok' }))
  return { kayit, clock }
}

async function baslat($: any) {
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.turn.start({ turnId: 't1' })
}

test('Claude çalışmıyorken bant yer kaplamaz', async ($, on) => {
  kur(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeUndefined()
})

test('tur başlayınca bantta Raster çizilir ve kareler blitlenir', async ($, on) => {
  const { kayit, clock } = kur(on)
  await baslat($)
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  const r = await ui.find({ key: 'sahne' })
  expect(r?.type).toBe('Raster')
  expect(r?.props.columns).toBe(100)
  expect(r?.props.rows).toBe(10)
  await clock.advance(500)
  expect(kayit.blitler.length).toBeGreaterThan(3)
  expect(kayit.blitler[0].requestId).toBe('above-prompt')
})

test('masaüstünde tek satır metin', async ($, on) => {
  kur(on)
  await baslat($)
  const ui = await $.ui.mount({ ...BANT, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Clawd/ })).toBeDefined()
})

test('tur bitince 2 sn sonra bant kaybolur', async ($, on) => {
  const { clock } = kur(on)
  await baslat($)
  await $.turn.complete({ turnId: 't1' })
  await clock.advance(2100)
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeUndefined()
})

test('/clawd kapatır ve kalıcı kaydeder', async ($, on) => {
  const { kayit } = kur(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const cevap: any = await $.command.run({ command: 'clawd', args: '' })
  expect(cevap.text).toMatch(/kapalı/)
  expect(kayit.depo.get('acik')).toBe(false)
  await $.turn.start({ turnId: 't2' })
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeUndefined()
})

test('araç çağrısı geçer, sonuç değişmez', async ($, on) => {
  kur(on)
  await baslat($)
  const out: any = await $.tool.call({ tool: 'Bash', command: 'yanlis' })
  expect(out.isError).toBe(true)
  const ok: any = await $.tool.call({ tool: 'Read', file_path: '/a/README.md' })
  expect(ok.result).toBe('ok')
})

test('balon metinleri Türkçe ekleriyle', () => {
  expect(eylemOku({ tool: 'Read', file_path: '/x/README.md' }).metin).toBe("README.md'yi kazıyor")
  expect(eylemOku({ tool: 'Edit', file_path: '/x/register.js' }).metin).toBe("register.js'ye blok koyuyor")
  expect(eylemOku({ tool: 'Bash', command: 'npm test' }).metin).toBe('npm test patlatıyor')
  expect(eylemOku({ tool: 'WebFetch', url: 'https://www.example.com/a' }).metin).toBe('internette geziyor: example.com')
  expect(eylemOku({ tool: 'Agent', description: 'ara' }).tur).toBe('ajan')
  expect(ekle('kitap', 'belirtme')).toBe("kitap'ı")
  expect(ekle('App.tsx', 'yonelme')).toBe("App.tsx'e")
  expect(komutAdi('cd /tmp && echo 1')).toBe('echo')
  expect(temizle('a\u001b[31mb\nc😀')).toBe('a [31mb c?')
})

test('Clawd yürür, blok kırar, TNT sayacı artırır', () => {
  let s = yeniSahne()
  for (let i = 0; i < 80; i++) s = adim(s)
  expect(s.x).toBeGreaterThan(20)
  expect(s.sayac).toBeGreaterThan(0)
  const once = s.sayac
  s = olayUygula(s, { tip: 'eylem', tur: 'tnt', metin: 'x' })
  expect(s.mod).toBe('tnt')
  for (let i = 0; i < 20; i++) s = adim(s)
  expect(s.mod).toBe('yuru')
  expect(s.sayac).toBeGreaterThanOrEqual(once)
  s = olayUygula(s, { tip: 'hata' })
  expect(s.creeper).not.toBeNull()
  const h = sahneHucreleri(s, 80, 10)
  expect(h.length).toBe(80 * 10 * 3)
})

test('Bash hata dönerse bekleyen TNT patlar, Clawd takılmaz', () => {
  let s = yeniSahne()
  s = olayUygula(s, { tip: 'eylem', tur: 'tnt', metin: 'ls patlatıyor' })
  expect(s.tnt).not.toBeNull()
  s = olayUygula(s, { tip: 'hata' })
  expect(s.tnt).toBeNull()
  expect(Object.values(s.degisen).includes('tnt')).toBe(false)
  for (let i = 0; i < 40; i++) s = adim(s)
  expect(s.mod).toBe('yuru')
  const x = s.x
  for (let i = 0; i < 60; i++) s = adim(s)
  expect(s.x).toBeGreaterThan(x)
})

test('rakam düğmeleri: 1 zıplatır, oyuncu kontrolü balonda görünür', async ($, on) => {
  const { kayit, clock } = kur(on)
  await baslat($)
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'girdi' })).toBeDefined()
  const dugme = await ui.find({ key: 'oyna-zipla' })
  expect(dugme?.props.hotkey).toBe('1')
  await ui.press({ key: 'oyna-zipla' })
  await clock.advance(300)
  expect(kayit.blitler.length).toBeGreaterThan(0)
})

test('oyuncu bloğa zıplayıp çıkar, kazdığı blok sayaca eklenir, 5 sn sonra kontrol Claude\'a döner', () => {
  let s = yeniSahne()
  for (let i = 0; i < 5; i++) s = adim(s)
  s = olayUygula(s, { tip: 'oyuncu', komut: 'sag' })
  for (let i = 0; i < 14; i++) s = adim(s)
  const once = s.sayac
  s = olayUygula(s, { tip: 'oyuncu', komut: 'kaz' })
  s = olayUygula(s, { tip: 'oyuncu', komut: 'kaz' })
  expect(s.sayac).toBe(once + 2)
  s = olayUygula(s, { tip: 'oyuncu', komut: 'koy' })
  s = adim(s)
  s = olayUygula(s, { tip: 'oyuncu', komut: 'zipla' })
  s = olayUygula(s, { tip: 'tuslar', basili: ['right'] })
  for (let i = 0; i < 12; i++) s = adim(s)
  expect(s.zy).toBe(4)
  expect(s.balon).toBe('Kontrol sende!')
  s = olayUygula(s, { tip: 'tuslar', basili: [] })
  for (let i = 0; i < 60; i++) s = adim(s)
  expect(s.oyuncu).toBe(0)
  s = olayUygula(s, { tip: 'eylem', tur: 'tnt', metin: 'npm test patlatıyor' })
  expect(s.mod).toBe('tnt')
})
