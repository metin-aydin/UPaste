// Linux paketinde Electron ikilisini küçük bir başlatıcı betikle sarar. AppImage salt okunur ve nosuid bağlandığı için
// chrome-sandbox kullanılamaz; Ubuntu 23.10+ AppArmor da yetkisiz kullanıcı ad alanlarını kısıtlar. Bu yüzden AppImage
// içinden (APPIMAGE tanımlı) çalışırken --no-sandbox eklenir; .deb kurulumunda sandbox olduğu gibi kullanılır.
// Wayland oturumunda uygulama XWayland (X11) üzerinde açılır: geçmiş penceresi metin alanının altına yerleşir ve
// Wayland istemcileri kendi pencerelerini ekranda konumlandıramaz. UPASTE_WAYLAND=1 ile Wayland'da açılır.
const fs = require('fs')
const path = require('path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return
  const name = context.packager.executableName
  const exe = path.join(context.appOutDir, name)
  const bin = `${exe}-bin`
  if (fs.existsSync(bin)) return
  fs.renameSync(exe, bin)
  fs.writeFileSync(
    exe,
    [
      '#!/bin/sh',
      'HERE="$(dirname "$(readlink -f "$0")")"',
      'if [ "$XDG_SESSION_TYPE" = wayland ] && [ -z "$UPASTE_WAYLAND" ]; then set -- --ozone-platform=x11 "$@"; fi',
      // Chromium yalnız ölümcül iletileri yazar (XWayland'de GPU süreci her karede ekran yenileme zamanı hatası basar).
      'if [ -z "$UPASTE_CHROMIUM_LOGS" ]; then set -- --log-level=3 "$@"; fi',
      `if [ -n "$APPIMAGE" ]; then exec "$HERE/${name}-bin" --no-sandbox "$@"; fi`,
      `exec "$HERE/${name}-bin" "$@"`,
      ''
    ].join('\n'),
    { mode: 0o755 }
  )
}
