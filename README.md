# Clawd Madenci

Claude çalışırken istem satırının hemen üstünde küçük bir piksel Minecraft sahnesi açılır.
Clawd yürür, önüne çıkan blokları kazmayla kırar; Claude ne yapıyorsa sahne ona döner:

| Claude ne yapıyor | Sahnede |
|---|---|
| Read / Grep / Glob | Clawd kazar — balon: `README.md'yi kazıyor` |
| Edit / Write | Arkasına tahta blok dizer — `register.js'ye blok koyuyor` |
| Bash | TNT belirir, yanıp söner, patlar — `npm test patlatıyor` |
| Agent (alt-ajan) | Küçük bir yardımcı Clawd gelir, birlikte daha hızlı kazarlar |
| WebFetch / WebSearch | Clawd zıplaya zıplaya yürür — `internette geziyor` |
| Araç hata döndü | Creeper gelir, Clawd kaçar |
| Tur bitti | Clawd elmasını kaldırıp el sallar, 2 sn sonra bant kapanır |

## Oyna

Claude çalışırken bandın altında `1: zıpla  2: ←  3: →  4: kaz  5: koy` şeridi var. İstem boşken rakama bas,
Clawd ~5 sn senin kontrolünde kalır (balon: "Kontrol sende!"), sonra Claude'un araç tepkilerine döner.
Zıplayınca gerçek yerçekimiyle bir blok üstüne çıkabilir; kazdığın bloklar sayaca eklenir.

Spinner'ın yanında kırılan blok sayacı görünür: `· ⛏ 12 blok`.
LLM çağırmaz, ağ kullanmaz; arazi tohumlu ve deterministiktir.

## Kurulum

Claude Code **2.1.287** ya da üstü gerekir (`claude update`). Claude Code'un içinde:

```
/plugin marketplace add selmakcby/clawd-madenci
/plugin install clawd-madenci@clawd-madenci
```

Kapatıp açmak için `/clawd`. Bu bir [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview)'u.

Kalıcı kurulum için: `/plugin marketplace add ~/clawd-madenci` ve `/plugin install clawd-madenci@clawd-madenci`.

`/clawd` modu açıp kapatır (tercih saklanır, varsayılan açık).
Terminalde `Raster` (▀ yarım blok, truecolor) ile çizilir; tmux içinde de çalışır. Desktop'ta tek satır metin gösterir.

## Geliştirme

```bash
cd plugin && claude plugin test          # testler
claude plugin validate plugin --strict   # doğrulama
node araclar/onizle.mjs 40 100 tnt | node araclar/ansi-png.mjs onizleme.png   # Claude'suz önizleme
```

Tüm hakları saklıdır — bkz. `LICENSE`.
