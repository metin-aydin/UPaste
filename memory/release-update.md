---
name: release-update
description: JumpDesk'ten alınan güncelleme ve sürüm akışı (UPaste'te yalnız Linux)
metadata:
  type: project
---

Kaynak: JumpDesk deposunun yerel kopyası (CLAUDE.md, `src/main/updater.ts`, `.github/workflows/{ci,release}.yml`,
`dev/next-version.mjs`, `dev/release-notes.mjs`, `.github/pull_request_template.md`).

- `src/main/updater.ts` JumpDesk'ten uyarlandı: AppImage (`APPIMAGE` ortamı) ve .deb (`resources/package-type`)
  kendini günceller; .deb kurulumu `pkexec` ile eşzamansız, `no_new_privs` varsa systemd kullanıcı hizmeti üzerinden;
  yeniden açılış `--hidden` ile. Otomatik denetim açılıştan 15 sn sonra ve 6 saatte bir (yalnız paketli sürümde),
  hiçbir şey sormadan indirilmez. Test ortamı: `UPASTE_UPDATE_URL`, `UPASTE_RELEASES_API`, `UPASTE_UPDATE_INSTALLER`,
  `UPASTE_TEST_DEB_INSTALLER`, `UPASTE_TEST_NO_NEW_PRIVS`, `UPASTE_TEST_SYSTEMD_RUN`.
- Durum değişince ayarlar penceresi ve tepsi menüsü ("Güncellemeyi Kur (X)") haberdar edilir (`updateEvents`).
- Sürüm akışı (JumpDesk ile aynı): `development` → `main` PR; birleşince release.yml sürümü `dev/next-version.mjs`
  ile hesaplar, PR açıklamasını sürüm notu yapar, üç platformun paketlerini taslak sürüme yükler, yayımlar.

**Eklenti güncellemesi (7. tur):** Uygulama açılışta kurulu eklentinin `metadata.json` sürümü paketlenenden küçükse
dosyaları kopyalar (`refreshInstalledExtension`). Kabukta yükleyicili eklenti (API ≥ 4) varsa yeni çekirdek
canlı yüklenir, uygulama 1,5 sn sonra sürümü yeniden sorar. Yükleyicisiz eski eklentide bildirim + bir oturum yenilemesi.
Böylece "iki kez oturum yenileme" sorunu API 4 sonrası için kapandı.

**Üç platform (15. tur):** release.yml build matrisi ubuntu (AppImage, deb), windows (NSIS `UPaste-<v>-Setup.exe`,
imzasız → SmartScreen uyarısı), macos (dmg + zip, arm64 + x64, Developer ID + Apple onayı). macOS gizli değerleri
JumpDesk'teki 5 değerin aynısı (`CSC_LINK` base64 .p12, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`,
`APPLE_TEAM_ID`); sertifika ve .p12 kullanıcının `~/Documents/apple-signing` klasöründe (JumpDesk hafızası). Değerleri
kullanıcı `gh secret set ... -R metin-aydin/UPaste` ile ekler (Claude parola görmez). Güncelleyici NsisUpdater ve
MacUpdater (macOS'ta `app-update.yml` varsa).

**Depo koruması (2026-10-27, UPaste ve JumpDesk aynı):** `main`: PR zorunlu (onay sayısı 0), CI kontrollerinin hepsi
zorunlu ve dal güncel olmalı (UPaste 6: check, native windows/macos, package ×3; JumpDesk 4: check, package ×3),
yorumlar çözülmeli, zorla gönderme/silme kapalı, yöneticiler dahil. `development`: zorla gönderme/silme kapalı
(yöneticiler dahil), doğrudan push serbest, kalıcı (birleşince silinmez; `delete_branch_on_merge` kapalı). `v*`
etiketleri kural kümesiyle (ruleset "Release tags") silinemez/güncellenemez. Actions: yalnız GitHub'ın kendi action'ları,
iş akışı anahtarı varsayılan salt okunur, dış katkı PR'ları onayla çalışır, CI `permissions: contents: read`.
`release` ortamı yalnız korunan dallardan çalışır; release.yml `build` işi bu ortamda → imza gizli değerleri ortam
gizli değeri olarak tutulur, depo düzeyindekiler silinir. Gizli bilgi taraması ve itme koruması zaten açıktı.
Yeni CI işi eklenince dal korumasındaki zorunlu kontrol listesi de güncellenmeli (`gh api -X PUT
repos/metin-aydin/<repo>/branches/main/protection`).
