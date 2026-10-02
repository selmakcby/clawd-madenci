// Sahneyi Claude Code olmadan ANSI olarak basar: node araclar/onizle.mjs <kare> [sutun]
import { yeniSahne, adim, olayUygula } from '../plugin/hooks/sahne.js'
import { sahneHucreleri } from '../plugin/hooks/cizim.js'
import { eylemOku } from '../plugin/hooks/metin.js'

const [kareStr = '60', sutunStr = '120', senaryo = 'kaz'] = process.argv.slice(2)
const OLAYLAR = {
  kaz: { 1: { tip: 'eylem', ...eylemOku({ tool: 'Read', file_path: '/a/README.md' }) } },
  insa: { 1: { tip: 'eylem', ...eylemOku({ tool: 'Edit', file_path: '/a/register.js' }) } },
  tnt: { 1: { tip: 'eylem', ...eylemOku({ tool: 'Bash', command: 'npm test' }) } },
  ajan: { 1: { tip: 'eylem', ...eylemOku({ tool: 'Agent', description: 'testleri bul' }) } },
  hata: { 1: { tip: 'hata' } },
  bitti: { 1: { tip: 'bitti' } },
}
let s = yeniSahne()
for (let k = 0; k < Number(kareStr); k++) {
  const o = (OLAYLAR[senaryo] || {})[k]
  if (o) s = olayUygula(s, o)
  s = adim(s)
}
const sutun = Number(sutunStr), satir = 10
const h = sahneHucreleri(s, sutun, satir)
const BOS = 0x01000000
const renk = (c, tip) => (c === BOS ? `\x1b[${tip === 'fg' ? 39 : 49}m` : `\x1b[${tip === 'fg' ? 38 : 48};2;${(c >> 16) & 255};${(c >> 8) & 255};${c & 255}m`)
const out = []
for (let r = 0; r < satir; r++) {
  let line = ''
  for (let c = 0; c < sutun; c++) {
    const i = (r * sutun + c) * 3
    line += renk(h[i + 1], 'fg') + renk(h[i + 2], 'bg') + String.fromCodePoint(h[i])
  }
  out.push(line + '\x1b[0m')
}
process.stdout.write(out.join('\n') + '\n')
