#!/usr/bin/env sh

# Authors: Heini L. Ovason, Marcus Funch
#
# Installs a extension given by name
#
# This script is written to be runnable from anywhere, and from any user, including root.

EXTENSION=$1
BORGERPC=$2

EXT_REPO_BASE_PATH="$(dirname "$(realpath "$0")")/extensions"
cd "$EXT_REPO_BASE_PATH" || exit 1

help() {
  printf "%s\n" "Usage: ./install.sh <EXTENSION_NAME> <BorgerPC (boolean)>" \
                "Example: ./install.sh logout-timer@os2borgerpc.magenta.dk true"
  exit 1
}

[ $# -lt 1 ] && help

# This is the folder where extension-folders need to be placed.
cp -r "$EXTENSION" "/usr/share/gnome-shell/extensions/"

# Enable the extension on user login
if "$BORGERPC"; then
  AUTOSTART_DESKTOP_FILE="/home/.skjult/.config/autostart/enable-$EXTENSION.desktop"
  mkdir --parents "$(dirname "$AUTOSTART_DESKTOP_FILE")"
	cat <<- EOF > "$AUTOSTART_DESKTOP_FILE"
		[Desktop Entry]
		Type=Application
		Exec=gnome-extensions enable $EXTENSION
	EOF

  chmod ug+x "$AUTOSTART_DESKTOP_FILE"
fi
