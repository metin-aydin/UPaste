#!/bin/sh
# İç içe test kabuklarından (dev/nested-shell.sh) arta kalan süreçleri gösterir ve onay alınca kapatır. Bu süreçler
# kendi geçici oturum veri yolunu (/tmp/dbus-*) kullanır; gerçek masaüstü oturumu /run/user/<uid>/bus kullandığı için
# etkilenmez. Kullanım: sh dev/cleanup-nested-leaks.sh
set -eu

pids=""
for p in $(pgrep -u "$(id -u)" .); do
  [ "$p" = "$$" ] && continue
  if { tr '\0' '\n' < "/proc/$p/environ"; } 2>/dev/null | grep -q '^DBUS_SESSION_BUS_ADDRESS=unix:path=/tmp/dbus-'; then
    pids="$pids $p"
  fi
done

if [ -z "$pids" ]; then
  echo "Arta kalan test süreci yok."
  exit 0
fi

echo "İç içe test oturumlarından kalan süreçler:"
for p in $pids; do
  printf '  %-8s %s  %s\n' "$p" "$(ps -o lstart= -p "$p" 2>/dev/null | awk '{print $4}')" "$(ps -o comm= -p "$p" 2>/dev/null)"
done
printf 'inotify kullanımı: %s / %s\n' \
  "$(find /proc/*/fd -lname 'anon_inode:inotify' 2>/dev/null | wc -l)" "$(cat /proc/sys/fs/inotify/max_user_instances)"
printf 'Bu %s süreç kapatılsın mı? [e/H] ' "$(echo $pids | wc -w)"
read -r answer
case "$answer" in
  e | E | y | Y) ;;
  *) echo "Vazgeçildi."; exit 0 ;;
esac

kill $pids 2>/dev/null || true
sleep 2
printf 'Kapatıldı. inotify kullanımı: %s / %s\n' \
  "$(find /proc/*/fd -lname 'anon_inode:inotify' 2>/dev/null | wc -l)" "$(cat /proc/sys/fs/inotify/max_user_instances)"
