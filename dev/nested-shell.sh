#!/bin/sh
# UPaste eklentisini denemek için yalıtılmış, başsız (headless) bir GNOME Shell açar. Kullanıcının oturumuna dokunmaz:
# ayarlar (dconf), eklenti klasörü ve önbellekler geçici bir klasördedir, oturum veri yolu ayrıdır, kabuk gerçek ekrana
# bağlanmaz (sanal monitörler; sanal klavye/fare olayları yalnız bu kabukta kalır). Görüntü Screenshot ile alınır.
#
# Kullanım: sh dev/nested-shell.sh [klasör] [monitör sayısı] [monitör boyutu, ör. 1600x1000; varsayılan 960x600]
# Klasör yolu kısa olmalı: IBus soketi onun altında açılır ve Unix soket yolu 108 karakteri geçemez.
# Ortam değişkenleri `<klasör>/env` dosyasına yazılır; iç içe kabukta komut çalıştırmak için:
#   sh -c '. <klasör>/env && gdbus call --session ...'
# Kapatmak: sh dev/nested-stop.sh [klasör]
set -eu

case "${WAYLAND_DISPLAY:-}" in
  upaste-nested-*)
    echo "Bu kabuk iç içe oturumun ortamını taşıyor (WAYLAND_DISPLAY=$WAYLAND_DISPLAY); temiz bir kabukta çalıştırın." >&2
    exit 1
    ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:-${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/upaste-nested}"
MONITORS="${2:-2}"
SIZE="${3:-960x600}"
UUID="upaste@metin-aydin.github.io"

rm -rf "$DIR"
mkdir -p "$DIR/config" "$DIR/data/gnome-shell/extensions" "$DIR/cache" "$DIR/state"
cp -r "$ROOT/resources/gnome-extension/$UUID" "$DIR/data/gnome-shell/extensions/"
cp -r "$ROOT/dev/nested-devtools@upaste" "$DIR/data/gnome-shell/extensions/"

export XDG_CONFIG_HOME="$DIR/config"
export XDG_DATA_HOME="$DIR/data"
export XDG_CACHE_HOME="$DIR/cache"
export XDG_STATE_HOME="$DIR/state"
VIRTUAL_MONITORS=""
for _ in $(seq 1 "$MONITORS"); do VIRTUAL_MONITORS="$VIRTUAL_MONITORS --virtual-monitor $SIZE"; done
WAYLAND_NAME="upaste-nested-$$"

RUNTIME="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

dbus-run-session -- sh -c '
  gsettings set org.gnome.shell enabled-extensions "[\"'"$UUID"'\", \"nested-devtools@upaste\"]"
  gsettings set org.gnome.shell disable-user-extensions false
  gsettings set org.gnome.shell welcome-dialog-last-shown-version "999"
  gsettings set org.gnome.desktop.interface toolkit-accessibility true
  # Veri yolunun kendiliğinden başlattığı hizmetler (ör. gnome-terminal-server) gerçek masaüstüne değil iç içe
  # kabuğa pencere açsın; kabuğun kendisi ise gerçek ekrana bağlanır.
  dbus-update-activation-environment WAYLAND_DISPLAY='"$WAYLAND_NAME"' GDK_BACKEND=wayland DISPLAY=
  echo "DBUS_SESSION_BUS_ADDRESS=$DBUS_SESSION_BUS_ADDRESS" > "'"$DIR"'/bus"
  echo $$ > "'"$DIR"'/shell-pid"
  exec env -u DISPLAY -u WAYLAND_DISPLAY gnome-shell --headless --wayland --wayland-display='"$WAYLAND_NAME"''"$VIRTUAL_MONITORS"'
' > "$DIR/shell.log" 2>&1 &
echo $! > "$DIR/pid"

for _ in $(seq 1 100); do
  [ -S "$RUNTIME/$WAYLAND_NAME" ] && break
  sleep 0.1
done
sleep 1
# Kabuğun kullandığı X ekranı ve yetki dosyası kabuğa sorulur (Eval, test eklentisi güvensiz kipi açınca çalışır).
xdisplay=""
xauth=""
for _ in $(seq 1 100); do
  out="$(env "$(cat "$DIR/bus")" gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell \
    --method org.gnome.Shell.Eval "imports.gi.GLib.getenv('DISPLAY') + '|' + imports.gi.GLib.getenv('XAUTHORITY')" \
    2>/dev/null || true)"
  case "$out" in
    "(true, '"*)
      value="$(printf '%s' "$out" | sed -E "s/^\(true, '\"?([^']*)\"?'\)$/\1/")"
      xdisplay="${value%%|*}"
      xdisplay="${xdisplay#\"}"
      xauth="${value#*|}"
      xauth="${xauth%\"}"
      [ -n "$xdisplay" ] && [ "$xdisplay" != null ] && break
      ;;
  esac
  sleep 0.1
done
if [ -n "$xdisplay" ]; then
  env "$(cat "$DIR/bus")" dbus-update-activation-environment "DISPLAY=$xdisplay" "XAUTHORITY=$xauth"
fi

{
  cat "$DIR/bus" | sed 's/^/export /'
  echo "export WAYLAND_DISPLAY=$WAYLAND_NAME"
  echo "export DISPLAY=${xdisplay:-}"
  echo "export XAUTHORITY=${xauth:-}"
  echo "export XDG_CONFIG_HOME=$DIR/config"
  echo "export XDG_DATA_HOME=$DIR/data"
  echo "export XDG_CACHE_HOME=$DIR/cache"
  echo "export XDG_STATE_HOME=$DIR/state"
  echo "export GDK_BACKEND=wayland"
} > "$DIR/env"
echo "nested shell: pid $(cat "$DIR/pid"), wayland $WAYLAND_NAME, x11 ${xdisplay:-?}, env $DIR/env"
echo "$WAYLAND_NAME" > "$DIR/wayland-name"
echo "stop: sh dev/nested-stop.sh $DIR"
