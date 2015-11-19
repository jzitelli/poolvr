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
        if (params[k].length == 1) {
            params[k] = params[k][0];
        }
    }
    for (var k in params) {
        if (params[k] === 'true')
            params[k] = true;
        else if (params[k] === 'false')
            params[k] = false;
    }
    return params;
})();

var POOLVR = {
    settings: URL_PARAMS
};

POOLVR.settings = combineDefaults(POOLVR.settings, {
    gravity: 9.8,
    leapDisabled: URL_PARAMS.leapDisabled,
    leapHandsDisabled: URL_PARAMS.leapHandsDisabled,
    mouseControls: URL_PARAMS.mouseControls,
    gamepadControls: URL_PARAMS.gamepadControls,
    // TODO: use three.js MeshPhongMaterials
    usePhongMaterials: false,
    // TODO: use three.js MeshLambertMaterials
    useLambertMaterials: false,
    // use *only* three.js MeshBasicMaterials (a.k.a. "EGA-graphics" look)
    useBasicMaterials: true,
    // use three.js shadow map plugin (slow on some devices)
    shadowMap: false,
    // include point light
    pointLight: false,
    // use older version of webvr-boilerplate
    oldBoilerplate: false
});

function logVars() {
    "use strict";
    pyserver.log(tipBody.position);
    pyserver.log(toolRoot);
    pyserver.log(avatar);
}

POOLVR.keyboardCommands = {
    logVars: {buttons: [Primrose.Input.Keyboard.Q],
              commandDown: logVars},
    moveToolUp:        {buttons: [Primrose.Input.Keyboard.U]},
    moveToolDown:      {buttons: [Primrose.Input.Keyboard.M]},
    moveToolForwards:  {buttons: [Primrose.Input.Keyboard.I]},
    moveToolBackwards: {buttons: [Primrose.Input.Keyboard.K]},
    moveToolLeft:      {buttons: [Primrose.Input.Keyboard.J]},
    moveToolRight:     {buttons: [Primrose.Input.Keyboard.L]}
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
