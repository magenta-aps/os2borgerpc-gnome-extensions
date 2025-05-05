#! /usr/bin/env -S just --justfile

# Local / User specific install
path := "$HOME/.local/share/gnome-shell/extensions/"
# Global install
#path := "/usr/share/gnome-shell/extensions/"

alias i := install
alias ia := install-all
alias r := restart-child-gnome-shell

default:
  @just --list

# List all extensions in this repository
list-extensions:
  ls -l extensions/

# Install specific extension(s) by name
install +EXTENSIONS: _create-the-dir-helper
  for extension in `find . -maxdepth 1 -mindepth 1 {{EXTENSIONS}}`; do \
    ln --symbolic --force $(realpath $extension) {{path}} \
    gnome-extensions enable $extension; \
  done


# Install all extensions in the extensions directory
install-all: _create-the-dir-helper
  for extension in `find extensions/ -maxdepth 1 -mindepth 1`; do \
    ln --symbolic --force $(realpath $extension) {{path}} \
    gnome-extensions enable $extension; \
  done

# Example use for this: Bind it to a hotkey, so restarting the child gnome-shell is very easy
# Close all child gnome shell windows and open a new one - for testing GNOME extensions a teeny bit more easily
restart-child-gnome-shell:
  # Kill any previously opened nested gnome-shell sessions
  -pkill --full 'gnome-shell --nested --wayland'

  # Also kill gnome extension windows so they don't pile up
  -pkill --full org.gnome.Extensions

  # Now create a new nested gnome-shell session
  dbus-run-session -- gnome-shell --nested --wayland

_create-the-dir-helper:
  mkdir --parents {{path}}
