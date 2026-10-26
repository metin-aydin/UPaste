---
name: architecture-decisions
description: UPaste mimari kararları (Electron+React+shadcn, XWayland, GNOME eklentisi, IME tabanlı odak, depolama)
metadata:
  type: project
---

1. **Yığın (2026-10-26):** Electron **44.9.3** (44.0–44.9.0 sertifika açığı; 45 pano API'sini değiştirdi, 44'te de eski
   eşzamanlı API yok — bkz. implementation-notes), electron-vite 5, React 19, Tailwind 4, shadcn/ui (Base UI,
   JumpDesk'ten uyarlanan bileşenler, shadcn varsayılan ölçüleri), lucide-react, @tanstack/react-virtual.
   Bağımlılıklar: yalnız `electron-updater`, `@electron-toolkit/utils` (çalışma zamanı). `npm audit` 0.
2. **D-Bus istemcisi kendi yazımımız** (`src/main/dbus/wire.ts`, `connection.ts`): dbus-next eski bağımlılıklar
   (usocket→node-gyp→request/tar, xml2js) yüzünden 11 açık getiriyordu. EXTERNAL kimlik doğrulama, çağrı, sinyal,
   nesne yayımlama, introspect. `dev/tests/dbus.test.ts` gerçek `gdbus` ile doğrular.
3. **Pencereler XWayland'de** (`--ozone-platform=x11`, JumpDesk gibi): Wayland istemcisi kendi penceresini
   konumlandıramaz; geçmiş penceresi metin alanının altına `setBounds` ile yerleşir.
4. **GNOME Shell eklentisi** (`resources/gnome-extension/upaste@metin-aydin.github.io`): Super+V (grab_accelerator),
   odak bilgisi, pano değişim sinyali (Meta.Selection owner-changed), sanal klavyeyle yapıştırma (evdev kodları,
   Shift+Insert), pencere etkinleştirme. Ayrıntı: gnome-extension.md.
5. **Metin alanı algılama = giriş yöntemi (IME), AT-SPI değil** (2026-10-26 ölçümleri):
   - Wayland istemcileri (GTK3/4, Firefox): `Main.inputMethod.currentFocus` + `_cursorRect` → odak anında doğru
     imleç dikdörtgeni (GTK4 zenity'de girdinin tam yüksekliği: 440,307,0,34).
   - X11 istemcileri (Chromium/Electron XWayland, Java, Qt `QT_IM_MODULE=ibus`): `getIBusManager()` 'focus-in' /
     'focus-out' / 'set-cursor-location'. Chromium imleci yalnız tuş olayında bildirir (odaklanınca değil).
   - AT-SPI elendi: Chromium/Electron içeriği `IsEnabled=false` iken kapalı; GTK4 çerçeve hesabı ara kap boşluklarını
     atlıyor (zenity 24/32 px sapma) ve imleç vermiyor; GTK3 koordinatı tampon köşesine, GTK4 çerçeve köşesine göre.
   - Konum önceliği: imleç → fare (pencere içindeyse) → pencerenin üst ortası. Metin alanı yoksa alt panel açılır.
6. **Odak almayan geçmiş penceresi (4.–6. tur)**: Windows Win+V gibi hedef uygulama odakta kalır (imleç yanıp
   söner, uygulama imleç bildirmeyi sürdürür). Eklenti API ≥ 3 ise pencere odaksızdır (`focusable: false` →
   override-redirect; mutter `top_window_group`'a koyar, kabuk çubukları ve rıhtımın üstünde çizilir, hiç odak
   almaz). Gezinme tuşları eklentinin hızlandırıcılarıyla, arama metni eklentinin görünmez St.Entry'siyle gelir
   (yazarken hedef pencere `focus_window` olarak kalır). API < 3 için yedek: `type: 'toolbar'` + `showInactive`
   (yönetilen pencere, yazınca klavyeyi kendisi alır). Pencere türü eklenti sürümü değişince yeniden oluşturulur. Takip: 120 ms'de bir GetWindowInfo (imleç + çerçeve + odak); hedef odağı kaybederse kapanır.
   İki biçim: metin alanı altında küçük pencere (`popup`), ekran altında yatay kartlı panel (`sheet`); ayar `layout`
   (`auto` | `sheet`). Kısayol `store.integration.shortcut` (GTK hızlandırıcı), Kurulum'da kaydedici.
7. **Yapıştırma**: öğe panoya (metinse PRIMARY'ye de) yazılır, eklenti hedef pencereyi öne alıp metin alanında
   Shift+Insert (GTK, Qt, Chromium, Firefox, VTE/xterm terminallerinde çalışır), metin alanı yoksa (ör. resim
   düzenleyici) Ctrl+V gönderir.
8. **Depolama**: `userData/history/index.json` (+ `images/<id>.png`, `.thumb.png`), aynı içerik özetle tanınıp öne
   alınır, sabitlenenler önce, sınır 1000 sabitlenmemiş öğe, süre `retentionDays` (0 = süresiz). Arama ana süreçte
   (katlanmış metin; Türkçe İ/ı/I/i ve aksan duyarsız).
9. **Çeviri**: 33 dil (`src/shared/i18n/*.ts`), `en.ts` anahtar türü → eksik anahtar derleme hatası; RTL (ar, fa, he,
   ur) için `dir`. Çeviriler 4 alt ajanla üretildi (tsc + anahtar/yer tutucu denetimi geçti).
10. **Eklenti güncellemesi oturum yenilemeden (7. tur, 2026-10-26):** GNOME Shell (Wayland) eklenti kodunu yalnız
    oturum açılışında yükler; kullanıcı iki kez yenilemeyi yapmadı ve eski eklentiyle (v1) çalışan uygulama yedek
    pencere kipine düştü (alt panel rıhtımın altında, ekran dibinde değil). Çözüm: sabit yükleyici `extension.js` +
    sürüm numaralı çekirdek `core-N.js`, klasör izlenir, yeni çekirdek canlı yüklenir (gnome-extension.md). Eklenti
    yükleyicisizse (API < 4) uygulama açılışta "Oturumu kapatıp açın" bildirimi gösterir (tıklayınca Kurulum).
