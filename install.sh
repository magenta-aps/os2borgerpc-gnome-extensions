#!/usr/bin/env sh

# Authors: Heini L. Ovason, Marcus Funch
#
# Installs a extension given by name
#
# This script is written to be runnable from anywhere, and from any user, including root.

INSTALL=$1         # "True" / "False"
EXTENSION_NAME=$2  # E.g. "logout-timer@os2borgerpc.magenta.dk"

set -x

EXT_REPO_BASE_PATH="$(dirname "$(realpath "$0")")/extensions"
cd "$EXT_REPO_BASE_PATH" || exit 1
DESKTOP_FILE_PATH=".config/autostart/enable-$EXTENSION_NAME.desktop"
SHADOW_AUTOSTART_DESKTOP_FILE="/home/.skjult/$DESKTOP_FILE_PATH"

if [ "$INSTALL" = "True" ]; then

  # This is the folder where extension-folders need to be placed.
  cp -r "$EXTENSION_NAME" "/usr/share/gnome-shell/extensions/"

  # Enable the extension on user login
  mkdir --parents "$(dirname "$SHADOW_AUTOSTART_DESKTOP_FILE")"
	cat <<- EOF > "$SHADOW_AUTOSTART_DESKTOP_FILE"
		[Desktop Entry]
		Type=Application
		Exec=gnome-extensions enable $EXTENSION_NAME
	EOF

  chmod ug+x "$SHADOW_AUTOSTART_DESKTOP_FILE"
else
  gnome-extensions disable "$EXTENSION_NAME"
  find /home/ -print0 -mindepth 1 -maxdepth 1 | xargs -0 --no-run-if-empty -I'{}' rm --force "{}/${DESKTOP_FILE_PATH-error}"
fi
