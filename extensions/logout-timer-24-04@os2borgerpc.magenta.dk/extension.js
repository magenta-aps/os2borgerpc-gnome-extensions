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


import GObject from 'gi://GObject';
import St from 'gi://St';

import Gio from 'gi://Gio';

import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

// Legacy module without ESM equivalent: https://discourse.gnome.org/t/port-import-into-gnome-shell-45-format/16769
const ByteArray = imports.byteArray;

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

// https://gjs.guide/extensions/upgrading/gnome-shell-45.html

var counter = null
var secondsToLogOff = null

// file.load_contents returns an array of guint8 - this unpacks that
// https://docs.gtk.org/gio/method.File.load_contents.html
function arrayToString(array) {
    if (array instanceof Uint8Array) {
        return ByteArray.toString(array);
    }
    return array.toString();
}

// The Gnome Shell version in Ubuntu 20.04 does not have setInterval/clearInterval. 22.04 does, though.
// ...so it's reinvented here with glib's timeout_add, courtesy of
// https://dontreinventbicycle.com/gjs-set-timeout-interval.html
function setInterval(func, delay, ...args) {
    const wrappedFunc = () => {
        return func.apply(this, args) || true;
    };
    return GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, wrappedFunc);
}
var clearInterval = GLib.Source.remove;

// Open a file and load its contents into a string
function load_file_contents(filename) {
    const file = Gio.file_new_for_path(filename);
    const [result, contents] = file.load_contents(null);
    if (!result) {
        this.logger.error(`Could not read file: ${this.path}`);
        throw new Errors.IoError(`JsTextFile: trying to load non-existing file ${this.path}`,
            this.logger.error);
    }
    return arrayToString(contents);
}

// Prettify the counter: Only show hours and minutes if there are any of them left
// padStart is there to add leading zeros to seconds so it shows e.g. 1:01 instead of 1:1
function toTimeString(totalSeconds) {
    const total = new Date(totalSeconds * 1000)
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

function headsUp(msg, indicator) {
    //Object.keys(indicator).forEach((prop)=> console.log(prop));
    indicator.add_style_class_name('below-threshold')

    const headsUpText = `notify-send "${msg}"`;
    // Notify user
    GLib.spawn_command_line_async(headsUpText);
    // Change label text color
    //lbl.add_style_class_name('label-text-below-threshold button-background-below-threshold panel-button')
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {

        countdown(lbl, headsUpSecondsLeft, headsUpMessage, preTimerText, indicator) {
            if (secondsToLogOff >= 0) {
                if (secondsToLogOff === headsUpSecondsLeft) {
                    headsUp(headsUpMessage, indicator)
                }
                let formattedTime = toTimeString(secondsToLogOff)
                lbl.set_text(`${preTimerText} ${formattedTime}`);
                secondsToLogOff--;
            }
            else {
                clearInterval(counter)
                // In production
                // Ref: https://gjs.guide/guides/gio/subprocesses.html#asynchronous-communication
                GLib.spawn_command_line_async('gnome-session-quit --force');
                // While testing:
                //lbl.set_text('K.O.');
            }
        }

        _init() {
            super._init(0.0, 'Logout Timer');

            // Path to the config file:
            const config_file = Extension.lookupByUUID('logout-timer-24-04@os2borgerpc.magenta.dk').dir.get_path() + '/config.json'

            // Open and parse config file, and load it into variables
            const conf = JSON.parse(load_file_contents(config_file))

            let lbl = new St.Label({
                style_class: 'system-status-icon'
            })
            this.add_child(lbl);
            this.add_style_class_name('logout-button')

            secondsToLogOff = conf.timeMinutes * 60;
            counter = setInterval(this.countdown, 1000, lbl, conf.headsUpSecondsLeft, conf.headsUpMessage, conf.preTimerText, this)
        }

    });

export default class LogoutTimerExtension extends Extension {

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        clearInterval(counter)
        //GLib.spawn_command_line_async('gnome-session-quit --force');
    }
}

// TODO: Maybe superfluous?!:
function init(meta) {
    return new LogoutTimerExtension(meta.uuid);
}
