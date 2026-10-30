---
name: implementation-notes
description: UPaste kod yapısı, test komutları ve öğrenilen tuzaklar
metadata:
  type: project
---

## Kod yapısı
- `src/main/`: index (yaşam döngüsü, tek örnek, görüntü protokolü `upaste-img://thumb/<id>`), store (settings.json,
  integration.json), history, clipboard (izleyici), shell (eklenti köprüsü + uygulama D-Bus hizmeti `Show`,
  `OpenSettings`), gnome (gsettings, çakışma, devralma/geri yükleme, eklenti kurulumu/durumu, oturumu kapat), popup,
  settings-window, tray, updater (JumpDesk'ten), autostart, ipc, i18n, log (`UPASTE_DEBUG=1`), test-hooks
  (`UPASTE_TEST=1` → `globalThis.__upaste`).
- `src/shared/`: types, ipc, placement (çoklu ekran yerleşimi), search (katlama/vurgu), retention, update, i18n/.
- `src/renderer/`: popup.html + `src/popup/PopupApp.tsx`; settings.html + `src/settings/*Section.tsx`.

## Komutlar
- `npm run typecheck`, `npx eslint .`, `npx electron-vite build`, `node dev/run-unit-tests.mjs [filtre]`.
- Simgeler: `sh dev/render-icons.sh` (build/icon.svg, resources/tray/tray.svg → PNG, Electron ile çizilir).

## Tuzaklar (2026-10-26)
- **Electron 44+ pano API'si eşzamansız ve W3C tarzı:** `availableFormats/readImage/writeImage/readHTML/readBuffer`
  yok. `clipboard.read()` → `ClipboardItem[]` (`types`, `getType()` → Blob), `clipboard.write([new ClipboardItem({...})])`,
  resim `new Blob([new Uint8Array(png)], {type:'image/png'})`, PRIMARY `clipboard.selection.writeText()`. Ham X11 biçimleri
  `electron application/osclipboard;format="TIMESTAMP"` gibi görünür (değişim algılamada kullanılıyor; UPaste'in
  kendi yazdığı içerikte TIMESTAMP yok).
- `lucide-react` 1.x'te marka simgeleri (GithubIcon) yok.
- **Süreç kapatma:** `pkill -f` desenleri kendi kabuk komut satırımı ve `dbus-run-session`'ı da eşler; kabuğun asıl
  süreci için asla `pkill -x gnome-shell` (gerçek kabuk!). Chromium süreç başlığını yazarken `/proc/<pid>/environ`'ı
  bozar; Electron süreci `readlink /proc/<pid>/exe` + `--type=` olmayan ana süreç ile tanınır.
- **İç içe oturum sızıntısı:** `dbus-run-session` öldürülünce iç içe veri yolu (`/tmp/dbus-*`) ve ~25 hizmeti (gvfs,
  evolution, tracker, goa…) sahipsiz kalıyor ve kullanıcının inotify örnek sınırını (128) dolduruyor; gerçek oturum
  da etkilenebilir. Kullanıcı `sh dev/cleanup-nested-leaks.sh` ile temizledi (otomatik kapatma sınıflandırıcıda
  reddedildi). `dev/nested-stop.sh` artık yalnız kabuk PID'ine sinyal gönderir; dbus-run-session veri yolunu kapatır.
  (O sırada iç içe kabukta tuşların çalışmaması inotify'dan değil, aşağıdaki XTest sorunundandı.)
- Electron `inotify_init() failed: Too many open files` uyarısı aynı sınırdan.
- **İç içe kabukta sanal giriş YASAK (2026-10-26):** `gnome-shell --nested` X11 arka ucunu kullanır; Clutter sanal
  klavye/fare olayları XTest ile **gerçek oturumun X ekranına (:0)** gider. İç içe pencere odakta değilse tuşlar ve
  tıklamalar kullanıcının gerçek masaüstündeki X11 penceresine ulaşabilir. Bu yüzden iç içe testler `--headless
  --virtual-monitor` ile (yerel arka uç, dış ekrana bağlanmaz, pencere de açmaz) yapılır; eklentinin Shift dokunuşu ve
  yapıştırma tuşları da ancak orada sınanır.
- **Pencere aktörünü başka katmana taşıma YASAK (2026-10-26):** `win.get_compositor_private()` aktörünü
  `global.window_group`'tan `global.top_window_group`'a taşımak paneli rıhtımın üstüne çıkarıyor ama pencere
  odaktayken kapatılınca mutter `meta_window_unmanage: assertion (focus_window != window)` ile **kabuğu çökertiyor**
  (başsız kabukta görüldü; gerçek oturumda tüm masaüstü kapanır). Kabuk çubuklarının üstünde görünmenin desteklenen
  yolu override-redirect penceredir (Electron `focusable: false`): mutter onları zaten `top_window_group`'a koyar.
- Electron'un `workArea`'sı farklı yüksekliklerde dizilmiş çok monitörde yanlış (ölçülen örnekte alt kenar, rıhtım
  düşülmüş doğru değerden ~100 px yukarıda). Doğru değer mutter'dan:
  `workspace.get_work_area_for_monitor(i)`, `display.get_monitor_geometry(i)`.
- **Eklenti modül önbelleği (7. tur):** GJS bir ESM adresini oturum boyunca bir kez yükler; aynı dosyayı yeniden
  `import()` etmek eski kodu verir. Canlı güncelleme için çekirdek her sürümde yeni dosya adıyla gelir
  (`core-N.js`). Eklenti klasörü silinip yeniden oluşturulursa `Gio.FileMonitor` ölü düğümü izler → güncellemede
  klasör silinmez, dosyalar yerinde yazılır.
- **Tanı: hangi eklenti sürümü yüklü?** Diskteki `metadata.json` değil, `gdbus call --session --dest org.gnome.Shell
  --object-path /io/github/metin_aydin/UPaste --method io.github.metin_aydin.UPaste.Shell.GetVersion` ve
  `gnome-extensions info` (kabuğun bellekteki metadata'sı). Kabuğun başlangıç saati: `ps -o lstart -C gnome-shell`.
- **Geliştirme Electron'unu kapatmak:** `pgrep -af 'node_modules/(\.bin/)?electro[n]'` ile listele, PID ile `kill`.
  Kurulu uygulama `/opt/UPaste/upaste-bin` de `--ozone-platform=x11` taşır; o desenle öldürme.
- **Elle `apt install` uygulamayı yeniden başlatmaz** (postinst yok; güncelleyici yolu systemd ile yeniden başlatır).
  Eski süreç çalışmayı sürdürür, yeni eklenti dosyalarını uygulama bir sonraki açılışında kopyalar.
- **DING (ding@rastersoft.com, Ubuntu masaüstü simgeleri):** masaüstüne tıklanınca odak DING'in Wayland penceresine
  (`gjs`, monitör başına bir tam ekran pencere) geçer. DING `window_manager` 'map' olayında kendi pencerelerini
  `lower()` eder, 'destroy' olayında en üstteki normal pencereyi `Main.activateWindow` ile etkinleştirir (açılır menü
  ve üstü türler hariç). Başsız kabukta DING sürekli yeniden başlatılıyor; orada denenemez.
- **Fare düğmesi durumu kabukta okunabilir:** `global.get_pointer()[2]` değiştirici maskesi BUTTON1..3 bitlerini
  (256/512/1024) içerir; istemci pencerelerine giden tıklamalar Clutter sahnesinde görünmediği için yoklama kullanılır.
- **`global.get_window_actors()` güvenilmez:** DING `Shell.Global.prototype.get_window_actors`'ı değiştirip masaüstü
  pencerelerini listeden çıkarır (başka eklentiler de yapabilir). Pencere aramak için `global.display.list_all_windows()`.
- **Başsız kabukta DING:** tek, büyük monitörde (ör. `sh dev/nested-shell.sh <klasör> 1 1400x1000`) Ubuntu oturum
  kipinin DING'i çalışır ve gerçek `~/Desktop` dosyalarını gösterir (yalnız okur; ayarları yalıtılmış klasörde).
  960x600 ×2'de sürekli yeniden başlar. Test panosu: kabuk Eval'de `St.Clipboard.get_default().set_text(...)` /
  `set_content(CLIPBOARD, 'image/png', GLib.Bytes)` (makinede wl-copy/xclip yok).
- **Panel her açılışta yeniden kurulmamalı** (`key` değiştirmek resimleri yeniden yükletir, açılışta takılma yapar);
  animasyonu baştan oynatmak için `element.getAnimations()` → `cancel()` + `play()`.
- **İmleç bildirmeyen uygulamalar:** Sublime Text giriş yöntemine 0×0 (pencere köşesi) imleç verir. Geçerli imleç =
  yüksekliği > 0 ve pencere içinde (`knownCaret`); GTK4 genişliği 0, yüksekliği satır boyu (ör. 34) verir.
- **koffi 3:** platform modülü isteğe bağlı bağımlılık (`@koromix/koffi-<os>-<arch>`); npm yalnız çalıştığı
  mimariyinkini kurar → macOS'ta iki mimari paket için CI'da `npm install --no-save --force` ile ikisi de kurulur.
  `.node` dosyaları electron-builder'ın akıllı açmasıyla `app.asar.unpacked`'a çıkar (deb'de doğrulandı).
  Geri çağrıda işaretçi argümanı BigInt adres gelir → `koffi.decode(adres, YAPI)`. `_Inout_` yapı nesnesi çağrıdan
  sonra yerinde güncellenir; tek öğeli dizi (`[0]`, `[null]`) çıktı parametresi. Dışa aktarılan değişken:
  `koffi.decode(lib.symbol('kCFBooleanTrue'), 'void *')`. COM yöntemi: sanal tabloyu `koffi.decode(nesne, 'void *')`,
  yuvaları `koffi.array('void *', n)` ile okuyup `koffi.call(yuva, proto, ...)`. Aynı sembol farklı imzalarla birden
  çok kez tanımlanabilir (objc_msgSend). Birim testi paketinde koffi dış modül; paket çıktısı depo içindeki
  `node_modules/.cache` altında (yoksa koffi bulunamaz).
- **Windows yapı boyutları (64 bit):** INPUT 40 (birleşim 8. bayttan), GUITHREADINFO 72, KBDLLHOOKSTRUCT 24,
  VARIANT 24 (8 bayt hizalı), GUID 16. macOS: CGRect 32, CFRange 16.
- **README ekran görüntüsü:** başsız kabukta `gsettings set org.gnome.shell disabled-extensions "['ding@rastersoft.com']"`
  (yoksa gerçek ~/Desktop dosyaları görünür), LANG=en_US, gnome-text-editor `-s`; başlıktaki dosya yolu kırpılır;
  kırpma kabukta GdkPixbuf ile (`new_subpixbuf().savev`).
- **Windows CI satır sonu:** windows-latest depoyu CRLF ile açıyordu → `.gitattributes` `* text=auto eol=lf`; dosya
  okuyan testler yine de `\r\n`'i normalleştirir (release-notes testi bu yüzden düşmüştü). İlk CI'da Windows ve macOS
  yerel API testleri geçti (kütüphaneler yüklendi, Windows'ta klavye kancası kurulup kaldırıldı).
- **Electron pano biçimleri (Linux):** dosya adresi standart `text/uri-list` olarak gelir; ham biçimler
  `electron application/osclipboard;format="..."`. macOS'ta ham ad nokta ya da eğik çizgiyle gelebilir
  (`public.file-url` / `public/file-url`) — desenler ikisini de kabul eder.
