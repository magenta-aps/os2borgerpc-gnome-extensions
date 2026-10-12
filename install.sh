#!/usr/bin/env sh

# Authors: Heini L. Ovason, Marcus Funch
#
# Installs a extension given by name
#
# This script is written to be runnable from anywhere, and from any user, including root.

EXTENSION_NAME=$1
BORGERPC=$2
INSTALL=$3

set -x

EXT_REPO_BASE_PATH="$(dirname "$(realpath "$0")")/extensions"
cd "$EXT_REPO_BASE_PATH" || exit 1
SHADOW_AUTOSTART_DESKTOP_FILE="/home/.skjult/.config/autostart/enable-$EXTENSION.desktop"
USER_AUTOSTART_DESKTOP_FILE="/home/user/.config/autostart/enable-$EXTENSION.desktop"

help() {
  printf "%s\n" "Usage: ./install.sh <EXTENSION_NAME> <BorgerPC (boolean)>" \
                "Example: ./install.sh logout-timer@os2borgerpc.magenta.dk true"
  exit 1
}

[ $# -lt 1 ] && help


if [ "$INSTALL" = "true" ]; then

  # This is the folder where extension-folders need to be placed.
  cp -r "$EXTENSION_NAME" "/usr/share/gnome-shell/extensions/"

  # Enable the extension on user login
  if "$BORGERPC"; then
    mkdir --parents "$(dirname "$SHADOW_AUTOSTART_DESKTOP_FILE")"
		cat <<- EOF > "$SHADOW_AUTOSTART_DESKTOP_FILE"
			[Desktop Entry]
			Type=Application
			Exec=gnome-extensions enable $EXTENSION_NAME
		EOF

    chmod ug+x "$SHADOW_AUTOSTART_DESKTOP_FILE"
  fi
else
  gnome-extensions disable "$EXTENSION_NAME"
  rm "$SHADOW_AUTOSTART_DESKTOP_FILE" "$USER_AUTOSTART_DESKTOP_FILE"
fi
