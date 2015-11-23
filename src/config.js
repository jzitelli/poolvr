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

var POOLVR_VERSION = POOLVR_VERSION || 'poolvr-0.1.0';
var POOLVR = {
    config: POOLVR_CONFIG,
    version: POOLVR_VERSION
};
POOLVR.keyboardCommands = {
    turnLeft: {buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
    turnRight: {buttons: [Primrose.Input.Keyboard.RIGHTARROW]},
    driveForward: {buttons: [-Primrose.Input.Keyboard.W]},
    driveBack: {buttons: [Primrose.Input.Keyboard.S]},
    strafeLeft: {buttons: [-Primrose.Input.Keyboard.A]},
    strafeRight: {buttons: [Primrose.Input.Keyboard.D]},
    floatUp: {buttons: [Primrose.Input.Keyboard.E, Primrose.Input.Keyboard.NUMBER9]},
    floatDown: {buttons: [-Primrose.Input.Keyboard.C, -Primrose.Input.Keyboard.NUMBER3]},
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

POOLVR.config.mouseEnabled = URL_PARAMS.mouseEnabled || POOLVR.config.mouseEnabled;

window.WebVRConfig = window.WebVRConfig || {
    FORCE_ENABLE_VR: URL_PARAMS.forceEnableVR,
    FORCE_DISTORTION: URL_PARAMS.forceDistortion
};
if (POOLVR.config.oldBoilerplate) {
    // using older version
    window.WEBVR_FORCE_DISTORTION = WebVRConfig.FORCE_DISTORTION;
}

var VR_DEVICES = [
    // Samsung Galaxy 4S #########################################################################################
    // Firefox Beta: Mozilla/5.0 (Android 5.0.1; Mobile; rv:43.0) Gecko/43.0 Firefox/43.0
    // vr.cardboard.enabled = true
    "Phone Sensor (Cardboard) HMD (HMD)",    // VR device 0
    "Phone Sensor (Cardboard) HMD (Sensor)", // VR device 1
    // vr.cardboard.enabled = false
    // no devices
    // Chrome Dev: Mozilla/5.0 (Linux; Android 5.0.1; SCH-I545 Build/LRX22C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2560.5 Mobile Safari/537.36
    // chrome://flags WebVR enabled
    // *** WORKS ***
    "Google, Inc. Cardboard v1", // VR device 0
    "Google, Inc. Cardboard v1", // VR device 1
    // Chrome:
    // Mozilla/5.0 (Linux; Android 5.0.1; SCH-I545 Build/LRX22C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36
    // *** WORKS WITH LATEST WEBVR-BOILERPLATE (z-ordering issue) ***
    "webvr-polyfill deviceName",                 // VR device 0
    "VR Position Device (webvr-polyfill:fused)", // VR device 1

    // Fedora 22 #################################################################################################
    // Firefox Nightly:
    // Mozilla/5.0 (X11; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0
    // no devices

    // Windows 10 ################################################################################################
    // DK2 0.6.0.1 drivers
    // Chrome 0.5.0.1 DK2 build:
    // Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2383.0 Safari/537.36
    // *** WORKS W/ OLDER WEBVR-BOILERPLATE ***
    "Oculus Rift DK2, Oculus VR", // VR device 0
    "Oculus Rift DK2, Oculus VR", // VR device 1
    // Firefox Nightly:
    // Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:45.0) Gecko/20100101 Firefox/45.0
    // *** NO DISPLAY IN HMD ***
    "Oculus VR HMD (HMD)",   // VR device 0
    "Oculus VR HMD (Sensor)" // VR device 0
    // DK2 0.8 drivers

    // Windows 7 ################################################################################################
    // DK2 0.8 drivers
    // Chrome 0.8.0.1 DK2 build
    // *** WORKS W/ OLDER WEBVR-BOILERPLATE ***
];

pyserver.log('WebVRConfig =\n' + JSON.stringify(WebVRConfig, undefined, 2));
var userAgent = navigator.userAgent;
pyserver.log('userAgent = ' + userAgent);
var vrDevices = [];
if (navigator.getVRDevices) {
    navigator.getVRDevices().then(function (devices) {
        devices.forEach(function (device, i) {
            pyserver.log('VR device ' + i + ': ' + JSON.stringify(device, undefined, 2));
            vrDevices[i] = device;
        });
    });
}
