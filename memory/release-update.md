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
- Sürüm akışı (JumpDesk ile aynı, yalnız Linux paketleri): `development` → `main` PR; birleşince release.yml sürümü
  `dev/next-version.mjs` ile hesaplar, PR açıklamasını sürüm notu yapar, AppImage + deb'i taslak sürüme yükler,
  yayımlar. Henüz yazılmadı (yapılacak).

**Eklenti güncellemesi (7. tur):** Uygulama açılışta kurulu eklentinin `metadata.json` sürümü paketlenenden küçükse
dosyaları kopyalar (`refreshInstalledExtension`). Kabukta yükleyicili eklenti (API ≥ 4) varsa yeni çekirdek
canlı yüklenir, uygulama 1,5 sn sonra sürümü yeniden sorar. Yükleyicisiz eski eklentide bildirim + bir oturum yenilemesi.
Böylece "iki kez oturum yenileme" sorunu API 4 sonrası için kapandı.
