var URL_PARAMS = (function () {
    "use strict";
    var params = {};
    location.search.substr(1).split("&").forEach( function(item) {
        var k = item.split("=")[0],
            v = decodeURIComponent(item.split("=")[1]);
        if (k in params) {
            params[k].push(v);
        } else {
            params[k] = [v];
        }
    } );
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


POOLVR.keyboardCommands = {
    turnLeft: {buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
    turnRight: {buttons: [Primrose.Input.Keyboard.RIGHTARROW]},
    driveForward: {buttons: [-Primrose.Input.Keyboard.W]},
    driveBack: {buttons: [Primrose.Input.Keyboard.S]},
    strafeLeft: {buttons: [-Primrose.Input.Keyboard.A]},
    strafeRight: {buttons: [Primrose.Input.Keyboard.D]},
    floatUp: {buttons: [Primrose.Input.Keyboard.E, Primrose.Input.Keyboard.NUMBER9]},
    floatDown: {buttons: [-Primrose.Input.Keyboard.C, -Primrose.Input.Keyboard.NUMBER3]},
    moveToolUp:        {buttons: [Primrose.Input.Keyboard.O]},
    moveToolDown:      {buttons: [Primrose.Input.Keyboard.PERIOD]},
    moveToolForwards:  {buttons: [Primrose.Input.Keyboard.I]},
    moveToolBackwards: {buttons: [Primrose.Input.Keyboard.K]},
    moveToolLeft:      {buttons: [Primrose.Input.Keyboard.J]},
    moveToolRight:     {buttons: [Primrose.Input.Keyboard.L]},
    rotateToolCW:    {buttons: [Primrose.Input.Keyboard.U]},
    rotateToolCCW:   {buttons: [Primrose.Input.Keyboard.Y]},
    resetTable: {buttons: [Primrose.Input.Keyboard.R],
                 commandDown: function () { resetTable(); }, dt: 0.5},
    autoPosition: {buttons: [Primrose.Input.Keyboard.P],
                   commandDown: function () { autoPosition(avatar); }, dt: 0.5},
    saveConfig: {buttons: [Primrose.Input.Keyboard.NUMBER1],
                 commandDown: saveConfig, dt: 1.0}
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
    toolRotY: {axes: [Primrose.Input.Gamepad.RSY], integrate: true, deadzone: DEADZONE,
               max: 2 * Math.PI, min: 0},
    toggleToolFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightStick],
                          commandDown: function () { avatar.toolMode = true; },
                          commandUp: function () { avatar.toolMode = false; } },
    nextBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightBumper],
               commandDown: function () { POOLVR.nextBall = Math.max(1, (POOLVR.nextBall + 1) % 15); },
               dt: 0.5},
    prevBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftBumper],
               commandDown: function () { POOLVR.nextBall = Math.max(1, (POOLVR.nextBall - 1) % 15); },
               dt: 0.5},
    autoPosition: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.Y],
                   commandDown: function () { autoPosition(avatar); }, dt: 0.5}
};


// TODO: load from JSON config
POOLVR.ballMaterial            = new CANNON.Material();
POOLVR.ballBallContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.ballMaterial, {
    restitution: 0.92,
    friction: 0.17
});
POOLVR.playableSurfaceMaterial            = new CANNON.Material();
POOLVR.ballPlayableSurfaceContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.playableSurfaceMaterial, {
    restitution: 0.33,
    friction: 0.19
});
POOLVR.cushionMaterial            = new CANNON.Material();
POOLVR.ballCushionContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.cushionMaterial, {
    restitution: 0.8,
    friction: 0.21
});
POOLVR.floorMaterial            = new CANNON.Material();
POOLVR.floorBallContactMaterial = new CANNON.ContactMaterial(POOLVR.floorMaterial, POOLVR.ballMaterial, {
    restitution: 0.86,
    friction: 0.4
});
POOLVR.tipMaterial            = new CANNON.Material();
POOLVR.tipBallContactMaterial = new CANNON.ContactMaterial(POOLVR.tipMaterial, POOLVR.ballMaterial, {
    restitution: 0.2,
    friction: 0.333
});

POOLVR.config.vrLeap = URL_PARAMS.vrLeap || POOLVR.config.vrLeap;
POOLVR.config.toolLength   = URL_PARAMS.toolLength   || POOLVR.config.toolLength || 0.5;
POOLVR.config.toolRadius   = URL_PARAMS.toolRadius   || POOLVR.config.toolRadius || 0.013;
POOLVR.config.toolMass     = URL_PARAMS.toolMass     || POOLVR.config.toolMass   || 0.04;
POOLVR.config.toolOffset   = URL_PARAMS.toolOffset   || POOLVR.config.toolOffset || [0, -0.42, -POOLVR.config.toolLength - 0.15];
POOLVR.config.toolRotation = URL_PARAMS.toolRotation || POOLVR.config.toolRotation || 0;
// POOLVR.config.useEllipsoid = URL_PARAMS.useEllipsoid || POOLVR.config.useEllipsoid || false;
POOLVR.config.tipShape     = URL_PARAMS.tipShape     || POOLVR.config.tipShape || 'Sphere';

var localStorageConfig = localStorage.getItem(POOLVR.version);
if (localStorageConfig) {
    console.log(localStorageConfig);
    POOLVR.config = JSON.parse(localStorageConfig);
}


function saveConfig() {
    "use strict";
    if (window.toolRoot) {
        POOLVR.config.toolOffset = [window.toolRoot.position.x, window.toolRoot.position.y, window.toolRoot.position.z];
        POOLVR.config.toolRotation = window.toolRoot.rotation.y;
    }
    if (POOLVR.config.pyserver) {
        delete POOLVR.config.gamepad;
        delete POOLVR.config.keyboard;
        delete POOLVR.config.onResetVRSensor;
        delete POOLVR.config.gamepadCommands;
        delete POOLVR.config.keyboardCommands;
        //pyserver.writeFile('config.json', POOLVR.config);
        pyserver.saveConfig('config.json', POOLVR.config);
    }
    localStorage.setItem(POOLVR.version, JSON.stringify(POOLVR.config));
}


function loadConfig(json) {
    "use strict";
    // TODO
}


var WebVRConfig = WebVRConfig || POOLVR.config.WebVRConfig || {};
WebVRConfig.FORCE_DISTORTION = URL_PARAMS.FORCE_DISTORTION;
WebVRConfig.FORCE_ENABLE_VR  = URL_PARAMS.FORCE_ENABLE_VR;

var userAgent = navigator.userAgent;
