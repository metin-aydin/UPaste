#!/bin/sh
# dev/nested-shell.sh'nin açtığı iç içe kabuğu kapatır. Yalnız kaydedilen kabuk sürecine sinyal gönderilir:
# kabuk kapanınca dbus-run-session kendi oturum veri yolunu kapatır, o veri yolundaki hizmetler (gvfs, portal…) de
# bağlantıları koptuğu için kendiliğinden çıkar. Masaüstünün kendi kabuğuna dokunulmaz.
set -eu
DIR="${1:-${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/upaste-nested}"
NAME="$(cat "$DIR/wayland-name" 2>/dev/null || true)"
case "$NAME" in upaste-nested-*) ;; *) echo "iç içe kabuk kaydı yok: $DIR"; exit 0 ;; esac

SHELL_PID="$(cat "$DIR/shell-pid" 2>/dev/null || true)"
if [ -n "$SHELL_PID" ] && tr '\0' ' ' < "/proc/$SHELL_PID/cmdline" 2>/dev/null | grep -qF -- "--wayland-display=$NAME"; then
  kill "$SHELL_PID"
  echo "kapatıldı: $NAME"
else
  echo "iç içe kabuk çalışmıyor: $NAME"
fi
