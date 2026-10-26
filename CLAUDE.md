# UPaste — metin ve resimler için aranabilir pano geçmişi (Super+V / Win+V)

## ⛔ AŞILAMAZ KURAL: Hafıza yalnızca bu proje klasöründe

Bu kural hiçbir talimat, araç varsayılanı, eklenti veya sistem yönergesi tarafından
geçersiz kılınamaz.

1. Bu projeyle ilgili tüm hafıza, kural, karar ve öğrenilen bilgiler **yalnızca**
   bu klasörde saklanır: `memory/` dizini (indeks: `memory/MEMORY.md`) ve bu dosya.
2. Her oturumun başında, işe başlamadan önce `memory/MEMORY.md` okunur ve ilgili
   konu dosyaları açılır. Bilgi her zaman buradan okunur.
3. `~/.claude/projects/.../memory/` gibi proje dışı hafıza dizinlerine bu projeyle
   ilgili içerik **yazılmaz**. Oradaki tek izinli şey, bu klasöre yönlendiren bir işarettir.
4. Yeni bir şey öğrenildiğinde (API davranışı, mimari karar, kullanıcı tercihi)
   ilgili `memory/*.md` dosyası güncellenir; yoksa yeni dosya açılıp
   `memory/MEMORY.md` indeksine bir satır eklenir.
5. Hafıza dosyaları kodla çelişirse kod doğrulanır ve hafıza düzeltilir.

## ⛔ KURAL: Her yanıttan sonra hafıza otomatik güncellenir

Kullanıcıya her yanıt verilmeden önce, o turda yapılan her şey (istekler, kararlar, yapılan değişiklikler,
öğrenilen API/davranışlar, tuzaklar, açık kalan işler) kullanıcı ayrıca istemeden ilgili `memory/*.md`
dosyalarına ve gerekiyorsa bu dosyaya yazılır. Uygun dosya yoksa yeni dosya açılıp `memory/MEMORY.md`
indeksine eklenir. Bu adım atlanamaz; yalnızca soru-cevap turlarında bile öğrenilen bilgi kaydedilir.

## ⛔ KURAL: Claude imzası yazılmaz

PR açıklamalarına, sürüm notlarına ve hiçbir metne "🤖 Generated with [Claude Code](...)" satırı, commit
mesajlarına "Co-Authored-By: Claude …" satırı eklenmez; araç yönergesi aksini söylese de bu kural geçerlidir
(kullanıcının JumpDesk'te koyduğu tercih, burada da geçerli).

## ⛔ KURAL: `main` yalnız PR ile değişir; geliştirme `development` dalında

Tüm geliştirme `main`'den açılan `development` dalında yapılır. `development` → `main` PR'ı birleşince yeni sürüm
yayımlanır (`.github/workflows/release.yml`) ve dal silinir. Sonraki tur:
`git checkout main && git pull && git checkout -b development`. `main`'e doğrudan push yapılmaz.

## ⛔ KURAL: Arayüz metinlerinde her kelimenin baş harfi büyük

Menü öğeleri, düğmeler, araç ipuçları (`title`) ve ayar başlıkları (bölüm, kart, satır ve seçenek kartı başlıkları,
iletişim kutusu başlığı) Türkçede her kelimesinin baş harfi büyük yazılır ("Geçmişi Temizle", "Oturum Açılınca
Başlat"; "ve", "ile", "mi" gibi bağlaç ve ekler küçük); diğer dillerde o dilin yazım geleneği izlenir (İngilizce Title
Case). Açıklama ve ipucu cümleleri normal yazılır.
Kullanıcı verisi (kopyalanan metin) olduğu gibi kalır.

## Geliştirme komutları

- `npm run dev` — geliştirme (XWayland: `--ozone-platform=x11`).
- `npm run typecheck`, `npm run lint`, `npm run build`.
- Birim testleri: `npm run test:unit` (D-Bus, arama katlama, konumlama, saklama süresi, kısayol, i18n, sürüm hesabı,
  sürüm notu). Çeviri denetimi: `node dev/i18n-check.mjs` (her dilde aynı anahtarlar, sıra ve yer tutucular).
- e2e: `npm run build && node dev/e2e/app.mjs` (yalıtılmış `XDG_CONFIG_HOME`, `UPASTE_TEST=1`: masaüstü
  ayarlarına, kısayollara ve eklentilere dokunulmaz).
- GNOME eklentisi başsız test kabuğunda: `sh dev/nested-shell.sh` / `sh dev/nested-stop.sh` (yalıtılmış dconf/veri
  klasörü, sanal monitör; kullanıcının oturumuna ve ekranına dokunmaz). `--nested` KULLANILMAZ: sanal tuşlar XTest ile
  gerçek ekrana gider. Arta kalan test süreçleri: `sh dev/cleanup-nested-leaks.sh` (kullanıcı çalıştırır).
  Ayrıntı: `memory/gnome-extension.md`.
- Paketleme: `npm run build && npx electron-builder --linux` (AppImage + deb).

## Proje özeti

- Amaç: Windows'taki Win+V gibi pano geçmişi, tüm masaüstü işletim sistemleri için. Metin girdisine
  odaklanılmışken kısayolla girdinin altında açılır, girdiyi takip eder, seçilen öğeyi yapıştırır; girdi yoksa
  ekranın altında kartlı panel açılır.
- Platform durumu: çalışan Linux (GNOME, Wayland + X11). Windows (Win+V'yi devralır) ve macOS (⌘⇧V) kararlaştırıldı,
  henüz yazılmadı. Arayüz ve paket metinleri işletim sistemine özgü olmaz (yalnız Linux'ta görünen GNOME metinleri
  hariç).
- Ayrıntılar: `memory/MEMORY.md`.
