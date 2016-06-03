/* global THREE */

module.exports = ( function () {
    "use strict";

    const INCH2METERS = 0.0254;

    function Keyboard(eventTarget, commands) {

        this.enabled = true;

        eventTarget.addEventListener("keydown", onKeyDown.bind(this), false);
        eventTarget.addEventListener("keyup", onKeyUp, false);

        var keyDown = [];
        var commandDowns = [];

        function onKeyDown(evt) {
            if (this.enabled) {
                keyDown[evt.keyCode] = true;
                if (commandDowns[evt.keyCode]) commandDowns[evt.keyCode](evt.keyCode);
            }
        }

        function onKeyUp(evt) {
            keyDown[evt.keyCode] = false;
        }

        function getState(buttons) {
            if (!this.enabled) return 0;
            for (var i = 0; i < buttons.length; i++) {
                if (keyDown[buttons[i]]) return 1;
            }
            return 0;
        }

        for (var name in commands) {
            var buttons = commands[name].buttons;
            Object.defineProperty(this, name, {
                enumerable: true,
                get: getState.bind(this, buttons)
            });
            var commandDown = commands[name].commandDown;
            if (commandDown) {
                for (var i = 0; i < buttons.length; i++) {
                    commandDowns[buttons[i]] = commandDown;
                }
            }
        }

    }

    Keyboard.KEYCODES = {
        BACKSPACE: 8,
        TAB: 9,
        ENTER: 13,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        PAUSEBREAK: 19,
        CAPSLOCK: 20,
        ESCAPE: 27,
        SPACEBAR: 32,
        PAGEUP: 33,
        PAGEDOWN: 34,
        END: 35,
        HOME: 36,
        LEFTARROW: 37,
        UPARROW: 38,
        RIGHTARROW: 39,
        DOWNARROW: 40,
        INSERT: 45,
        DELETE: 46,
        NUMBER0: 48,
        NUMBER1: 49,
        NUMBER2: 50,
        NUMBER3: 51,
        NUMBER4: 52,
        NUMBER5: 53,
        NUMBER6: 54,
        NUMBER7: 55,
        NUMBER8: 56,
        NUMBER9: 57,
        A: 65,
        B: 66,
        C: 67,
        D: 68,
        E: 69,
        F: 70,
        G: 71,
        H: 72,
        I: 73,
        J: 74,
        K: 75,
        L: 76,
        M: 77,
        N: 78,
        O: 79,
        P: 80,
        Q: 81,
        R: 82,
        S: 83,
        T: 84,
        U: 85,
        V: 86,
        W: 87,
        X: 88,
        Y: 89,
        Z: 90,
        LEFTWINDOWKEY: 91,
        RIGHTWINDOWKEY: 92,
        SELECTKEY: 93,
        NUMPAD0: 96,
        NUMPAD1: 97,
        NUMPAD2: 98,
        NUMPAD3: 99,
        NUMPAD4: 100,
        NUMPAD5: 101,
        NUMPAD6: 102,
        NUMPAD7: 103,
        NUMPAD8: 104,
        NUMPAD9: 105,
        MULTIPLY: 106,
        ADD: 107,
        SUBTRACT: 109,
        DECIMALPOINT: 110,
        DIVIDE: 111,
        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123,
        NUMLOCK: 144,
        SCROLLLOCK: 145,
        SEMICOLON: 186,
        EQUALSIGN: 187,
        COMMA: 188,
        DASH: 189,
        PERIOD: 190,
        FORWARDSLASH: 191,
        GRAVEACCENT: 192,
        OPENBRACKET: 219,
        BACKSLASH: 220,
        CLOSEBRACKET: 221,
        SINGLEQUOTE: 222
    };

    Keyboard.KEYCODES['1'] = Keyboard.KEYCODES.NUMBER1;
    Keyboard.KEYCODES['2'] = Keyboard.KEYCODES.NUMBER2;
    Keyboard.KEYCODES['3'] = Keyboard.KEYCODES.NUMBER3;
    Keyboard.KEYCODES['4'] = Keyboard.KEYCODES.NUMBER4;
    Keyboard.KEYCODES['5'] = Keyboard.KEYCODES.NUMBER5;
    Keyboard.KEYCODES['6'] = Keyboard.KEYCODES.NUMBER6;
    Keyboard.KEYCODES['7'] = Keyboard.KEYCODES.NUMBER7;
    Keyboard.KEYCODES['8'] = Keyboard.KEYCODES.NUMBER8;
    Keyboard.KEYCODES['9'] = Keyboard.KEYCODES.NUMBER9;
    Keyboard.KEYCODES['0'] = Keyboard.KEYCODES.NUMBER0;
    Keyboard.KEYCODES['-'] = Keyboard.KEYCODES.DASH;
    Keyboard.KEYCODES['='] = Keyboard.KEYCODES.EQUALSIGN;
    Keyboard.KEYCODES[';'] = Keyboard.KEYCODES.SEMICOLON;
    Keyboard.KEYCODES["'"] = Keyboard.KEYCODES.SINGLEQUOTE;
    Keyboard.KEYCODES["\\"] = Keyboard.KEYCODES.BACKSLASH;
    Keyboard.KEYCODES["["] = Keyboard.KEYCODES.OPENBRACKET;
    Keyboard.KEYCODES["]"] = Keyboard.KEYCODES.CLOSEBRACKET;
    Keyboard.KEYCODES["`"] = Keyboard.KEYCODES.GRAVEACCENT;
    Keyboard.KEYCODES["/"] = Keyboard.KEYCODES.FORWARDSLASH;
    Keyboard.KEYCODES["."] = Keyboard.KEYCODES.PERIOD;
    Keyboard.KEYCODES[","] = Keyboard.KEYCODES.COMMA;

    Keyboard.CODEKEYS = [];
    for (var k in Keyboard.KEYCODES) {
        Keyboard.CODEKEYS[Keyboard.KEYCODES[k]] = k;
    }

    Keyboard.makeStageObject = function () {
        var keyboardObject = new THREE.Object3D();
        var keyMaterial = new THREE.MeshLambertMaterial({color: 0xbbbbbb});
        const keyDelta = INCH2METERS * 0.75;
        const keyHeight = INCH2METERS * 0.3;
        const keyTravel = keyHeight * 0.7;
        var regularKeyGeom = new THREE.BoxBufferGeometry(0.95 * keyDelta, keyHeight, 0.95 * keyDelta);
        var i, j; // i = 0 at upper number key row, 4 at bottom row, 5 (or -1) at function key row;
                  // j = 0 at start (left) of row, increments for each key until the end of the row.
        var row, char;
        var mesh;
        var keyMesh = {};
        // regular-sized keys:
        const REGULAR_ROWS = [
            "`1234567890-=",
            "qwertyuiop[]",
            "asdfghjkl;'",
            "zxcvbnm,./"
        ];
        for (i = 0; i < REGULAR_ROWS.length; i++) {
            row = REGULAR_ROWS[i];
            for (j = 0; j < row.length; j++) {
                char = row[j];
                mesh = new THREE.Mesh(regularKeyGeom, keyMaterial);
                mesh.name = char;
                mesh.position.z = 0.5 * keyDelta + i * keyDelta;
                mesh.position.x = 0.5 * keyDelta + j * keyDelta;
                keyMesh[char] = mesh;
                keyboardObject.add(mesh);
            }
        }
        // the *crazy* bottom row:
        var controlWidth = INCH2METERS * 1.5,
            windowsWidth = controlWidth,
            altWidth     = controlWidth;
        var controlGeom = new THREE.BoxBufferGeometry(0.95 * controlWidth, keyHeight, 0.95 * keyDelta);
        var spacebarWidth = 0.95 * INCH2METERS * 4.75;
        var spacebarGeom = new THREE.BoxBufferGeometry(0.95 * spacebarWidth, keyHeight, 0.95 * keyDelta);
        mesh = new THREE.Mesh(controlGeom, keyMaterial);
        mesh.position.z = 4.5 * keyDelta;
        mesh.position.x = 0.5 * controlWidth;
        keyMesh.lcontrol = mesh;
        keyboardObject.add(mesh);
        mesh = mesh.clone();
        mesh.position.x += 0.5 * (controlWidth + windowsWidth);
        keyMesh.lwindows = mesh;
        keyboardObject.add(mesh);
        mesh = mesh.clone();
        mesh.position.x += 0.5 * (windowsWidth + altWidth);
        keyMesh.lalt = mesh;
        keyboardObject.add(mesh);
        mesh = new THREE.Mesh(spacebarGeom, keyMaterial);
        mesh.position.z = 4.5 * keyDelta;
        mesh.position.x = keyMesh.lalt.position.x + 0.5 * (altWidth + spacebarWidth);
        keyMesh.spacebar = mesh;
        keyboardObject.add(mesh);
        for (var k in keyMesh) {
            keyMesh[k].updateMatrix();
        }
        var keyDown = [];
        window.addEventListener("keydown", function (evt) {
            if (!keyDown[evt.keyCode]) {
                var keyName = Keyboard.CODEKEYS[evt.keyCode];
                if (keyName) keyName = keyName.toLowerCase();
                var mesh = keyMesh[keyName];
                if (mesh) {
                    mesh.position.y -= keyTravel;
                    mesh.updateMatrix();
                }
            }
            keyDown[evt.keyCode] = true;
        }, false);
        window.addEventListener("keyup", function (evt) {
            if (keyDown[evt.keyCode]) {
                var keyName = Keyboard.CODEKEYS[evt.keyCode];
                if (keyName) keyName = keyName.toLowerCase();
                var mesh = keyMesh[keyName];
                if (mesh) {
                    mesh.position.y += keyTravel;
                    mesh.updateMatrix();
                }
            }
            keyDown[evt.keyCode] = false;
        }, false);
        return keyboardObject;
    };

    return Keyboard;
} )();
