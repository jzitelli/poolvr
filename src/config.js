var POOLVR_VERSION = POOLVR_VERSION || 'poolvr-0.1.0';
var POOLVR = {
    config: POOLVR_CONFIG,
    version: POOLVR_VERSION
};

var URL_PARAMS = (function () {
    "use strict";
    var params = {};
    location.search.substr(1).split("&").forEach(function(item) {
        var k = item.split("=")[0],
            v = decodeURIComponent(item.split("=")[1]);
        if (k in params) {
            params[k].push(v);
        } else {
            params[k] = [v];
        }
    });
    for (var k in params) {
        if (params[k].length == 1)
            params[k] = params[k][0];

        if (params[k] === 'true')
            params[k] = true;
        else if (params[k] === 'false')
            params[k] = false;
    }
    return params;
})();

function logVars() {
    "use strict";
    pyserver.log('app.options = ' + JSON.stringify(app.options));
    pyserver.log('tipBody.position = ' + tipBody.position);
    pyserver.log('toolRoot = ' + toolRoot);
    pyserver.log('avatar = ' + avatar);
}

POOLVR.keyboardCommands = {
    logVars: {buttons: [Primrose.Input.Keyboard.Q],
              commandDown: logVars},
    moveToolUp:        {buttons: [Primrose.Input.Keyboard.NUMBER7]},
    moveToolDown:      {buttons: [Primrose.Input.Keyboard.NUMBER1]},
    moveToolForwards:  {buttons: [Primrose.Input.Keyboard.NUMBER8]},
    moveToolBackwards: {buttons: [Primrose.Input.Keyboard.NUMBER5]},
    moveToolLeft:      {buttons: [Primrose.Input.Keyboard.NUMBER4]},
    moveToolRight:     {buttons: [Primrose.Input.Keyboard.NUMBER6]}
};

var DEADZONE = 0.2;
POOLVR.gamepadCommands = {
    strafe: {axes: [Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    drive: {axes: [Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    dheading: {axes: [-Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    pitch: {axes: [Primrose.Input.Gamepad.LSY], integrate: true, deadzone: DEADZONE,
            max: 0.5 * Math.PI, min: -0.5 * Math.PI},
    float: {axes: [-Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    toggleFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
                      commandDown: function () { avatar.floatMode = true; },
                      commandUp: function () { avatar.floatMode = false; }},
    toolStrafe: {axes: [Primrose.Input.Gamepad.RSX], deadzone: DEADZONE},
    toolDrive: {axes: [Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toolFloat: {axes: [-Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toggleToolFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightStick],
                          commandDown: function () { avatar.toolMode = true; },
                          commandUp: function () { avatar.toolMode = false; } }
};
