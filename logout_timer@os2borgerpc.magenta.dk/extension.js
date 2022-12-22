/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'logout-timer-extension';

const { GObject, St } = imports.gi;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ByteArray = imports.byteArray;

const _ = ExtensionUtils.gettext;

// format: TIME_MINUTES=<MINUTES>
//const logout_timers_conf_file = '/usr/share/os2borgerpc/logout_timer.conf'
// While testing:
const logout_timers_conf_file = '.local/share/gnome-shell/extensions/logout_timer@os2borgerpc.magenta.dk/logout_timer.conf'

/* exported arrayToString */
function arrayToString(array) {
    if (array instanceof Uint8Array) {
        return ByteArray.toString(array);
    }
    return array.toString();
}

// Prettify the counter: Only show hours and minutes if there are any of them left
// padStart is there to add leading zeros to seconds so it shows e.g. 1:01 instead of 1:1
function toTimeString(totalSeconds) {
    const total = new Date(totalSeconds * 1000)
    // Debugging:
    //GLib.spawn_command_line_async("notify-send '" + total + "'")
    // Only seconds left
    if (totalSeconds < 60) {
        return total.getUTCSeconds().toString()
    }
    // Only minutes left
    else if (totalSeconds < 3600) {
        return total.getUTCMinutes() + ":"
             + total.getUTCSeconds().toString().padStart(2, "0")
    }
    else {
        return total.getUTCHours() + ":"
            + total.getUTCMinutes().toString().padStart(2, '0') + ":"
            + total.getUTCSeconds().toString().padStart(2, '0')
    }
}



const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Logout Timer'));

            const file = Gio.file_new_for_path(logout_timers_conf_file);
            const [result, contents] = file.load_contents(null);
            if (!result) {
                this.logger.error(`Could not read file: ${this.path}`);
                throw new Errors.IoError(`JsTextFile: trying to load non-existing file ${this.path}`,
                    this.logger.error);
            }
            let content = arrayToString(contents);

            let minutesToLogOff = parseInt(content.split("=")[1]);

            let tmpHeadsUpInputFromFile = "1";
            let headsUp = parseInt(tmpHeadsUpInputFromFile);

            let lbl = new St.Label({
                style_class: 'system-status-icon'
            })
            this.add_child(lbl);

            function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }

            let secondsToLogOff = minutesToLogOff * 60;
            (async () => {
                while (secondsToLogOff >= 0) {
                    await sleep(1000);
                    if (secondsToLogOff === headsUp * 60) {

                        // Text-input fLyttes til Config(?)
                        let headsUpText = 'notify-send \"OBS! Tiden er snart oppe!\"';
                        // Notify user
                        GLib.spawn_command_line_async(headsUpText);
                        // Change label text color
                        lbl.set_style_class_name('system-status-icon label-text-below-treshold')
                        // Change panelbutton background color
                        this.set_style_class_name('panel-button button-background-below-treshold')
                    }
                    let formattedTime = toTimeString(secondsToLogOff)
                    lbl.set_text(formattedTime);
                    secondsToLogOff--;
                }
                // Ref: https://gjs.guide/guides/gio/subprocesses.html#asynchronous-communication
                try {
                    //GLib.spawn_command_line_async('gnome-session-quit --force');
                    lbl.set_text("K.O.");
                } catch (e) {
                    logError(e);
                }

            })();
        }
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
