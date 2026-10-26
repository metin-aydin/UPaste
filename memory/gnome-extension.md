---
name: gnome-extension
description: UPaste GNOME Shell eklentisi — D-Bus arayüzü, kısayol, IME izleme, yapıştırma, kurulum ve iç içe kabuk testi
metadata:
  type: project
---

**Yol:** `resources/gnome-extension/upaste@metin-aydin.github.io/` (ESM, GNOME 45–50). Uygulama `~/.local/share/
gnome-shell/extensions/` altına kopyalar, `enabled-extensions`'a ekler; Wayland'da yeni eklenti için bir kez oturum
kapat-aç gerekir (kabuk zaten tanıyorsa `org.gnome.Shell.Extensions.EnableExtension`).

**Yükleyici + çekirdek (v4, API 4, 2026-10-26 7. tur):** `extension.js` yalnız yükleyicidir (değişmemeli: değişirse
yine oturum yenilemesi gerekir). Asıl kod `core.js` (`export class UPasteCore`, Extension'dan türemez). Uygulama
kurarken çekirdeği `core-<metadata version>.js` adıyla en son ve geçici dosya + `rename` ile koyar, eski `core*.js`
dosyalarını siler; klasörü SİLMEZ (yükleyici `monitor_directory` ile izliyor). Yükleyici klasörde en yüksek
numaralı çekirdeği (`core.js` = 0) 300 ms gecikmeli tarar, `import()` eder, eskisini `disable()` edip yenisini
`enable()` eder. Yeni çekirdek açılamazsa (throw) eskisi yeniden açılır; içe aktarılamayan/açılamayan sürüm
`_failedVersion` ile atlanır. GJS bir modül adresini oturum boyunca bir kez yükler → her sürüm ayrı dosya adı şart.
Başsız kabukta doğrulandı: core-5 canlı yüklendi (API 4→5), throw eden core-6 ve sözdizimi hatalı core-7 atlandı
(5 açık kaldı), core-8 yüklendi; uygulama (kurulu metadata 3 iken) core-4.js'i koydu, yükleyici geçti, Super+V
tutuldu (action 202) ve kısayol sinyali uygulamaya ulaştı. Eklenti değiştikçe `metadata.json` `version` artırılır
(uygulama kurulu sürüm küçükse kopyalar); API değişirse `API_VERSION` (core.js) ve `EXTENSION_API` (shell.ts) artar.
Lock ekranında kabuk eklentiyi kapatıp açar → kilit açılınca da en yeni çekirdek yüklenir.

**D-Bus (API 5; 3: StartTyping/StopTyping/SearchChanged, 4: yükleyici, 5: WatchClicks(ai)/ClickedOutside +
GetWindowInfo'da focusId/focusPid/focusClass/focusOwn):** kabuğun bağlantısında `/io/github/metin_aydin/UPaste`, arayüz `io.github.metin_aydin.UPaste.Shell`.
Yöntemler: GetVersion (api sürümü, herkese açık), SetShortcut(s) ('' = bırak), GetFocusInfo, GetWindowInfo(t)
(focused, textInput, caret dahil), FocusOwnWindow(s başlık), Paste(t pencere, s tuşlar; yakalanan tuşları bırakır),
CaptureKeys(b), ReplayKey(u xkeycode, u mods: 1 Shift, 2 AltGr). Sinyaller (yalnız uygulamaya, unicast):
ShortcutPressed(a{sv}), ClipboardChanged, KeyPressed(s ad, u tuş kodu, u değiştirici).
**Tuş yakalama:** gezinme tuşları ad ile (Up, Return, <Shift>ISO_Left_Tab, <Control>p…), yazı tuşları X tuş koduyla
(`0x18`, `<Shift>0x18`, `<Mod5>0x18`; mutter hex tuş kodu hızlandırıcısını kabul ediyor) `grab_accelerator` ile;
Esc eklentide de bırakır; uygulama kaybolursa (ad sahibi gider) tuşlar bırakılır.
**Taze imleç:** X11 + IBus odaklı pencerede kısayolda Shift (evdev 42) dokunuşu, 120 ms'ye kadar yeni
set-cursor-location beklenir. Yöntemleri yalnız `io.github.metin_aydin.UPaste` adının sahibi çağırabilir (AccessDenied); uygulama
adı alır almaz çağırırsa eklenti sahibi henüz görmemiş olabilir → uygulama 20×100 ms yeniden dener.

**Odak bilgisi (a{sv}):** pointer, id, pid, client (x11|wayland), wmClass, frame, buffer, monitor, own, textInput,
caret. Hepsi sahne (mantıksal) koordinatı.

**Kısayol:** `global.display.grab_accelerator('<Super>v')`; başka bağlama tutuyorsa (Ubuntu varsayılanı
`org.gnome.shell.keybindings toggle-message-tray` ['<Super>v','<Super>m'], kullanıcının Diodon özel kısayolu) alınamaz,
3 sn'de bir yeniden dener. Açılışta `~/.config/UPaste/shell.json` `{shortcut}` okunur (uygulama yazar; "Öncekini Geri
Yükle" sonrası boş → oturum açılışında Diodon'la yarışmaz).

**Yapıştırma:** `Main.activateWindow(win)`, odak gelene kadar 10 ms'lik yoklama (en çok 600 ms) + 40 ms, sonra
`Clutter` sanal klavye `notify_key` evdev: Shift(42)+Insert(110) (düzenden bağımsız).

**Başsız test kabuğu:** `sh dev/nested-shell.sh` (`--headless --virtual-monitor 960x600` ×2; gerçek ekrana bağlanmaz,
pencere açmaz; görüntü Screenshot D-Bus ile; iç içe ortam değişkenleri yüklü kabukta çalıştırılırsa reddeder.
Varsayılan klasör `$XDG_RUNTIME_DIR/upaste-nested`, kısa yol şart:
IBus soketi 108 karakter sınırı), `sh dev/nested-stop.sh`. Yalıtım: XDG_CONFIG/DATA/CACHE/STATE ayrı, ayrı oturum veri
yolu, `dbus-update-activation-environment` ile veri yolu hizmetleri iç içe ekrana açılır. `dev/nested-devtools@upaste`
yalnız iç içe kabukta güvensiz kipi açar (Eval + Screenshot) ve açılış genel görünümünü kapatır.
Eval'de `imports.gi.*` çalışır; `ui/main.js` için `import('resource:///org/gnome/shell/ui/main.js')` ile global'e alınır.
Uygulama iç içe kabukta: `UPASTE_TEST=1 UPASTE_NESTED=1` (gsettings/eklenti adımları yalıtılmış dconf'ta çalışır).
