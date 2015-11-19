// TODO requires pyserver.js, settings.js, webvr-manager.js, webvr-polyfill.js

pyserver.log("hello from cardboard.js");

var userAgent = navigator.userAgent || navigator.vendor || window.opera;
// Check both width and height since the phone may be in landscape.
var width = screen.availWidth;
var height = screen.availHeight;
var pixelWidth = width * window.devicePixelRatio;
var pixelHeight = height * window.devicePixelRatio;

if (!POOLVR.settings.oldBoilerplate) {
    // using most recent webvr-boilerplate
    window.WebVRConfig = window.WebVRConfig || {
        FORCE_ENABLE_VR: URL_PARAMS.forceEnableVR,
        FORCE_DISTORTION: URL_PARAMS.forceDistortion
    };
} else {
    // using older version
    window.WEBVR_FORCE_DISTORTION = window.WEBVR_FORCE_DISTORTION || URL_PARAMS.forceDistorion;
    window.WebVRConfig = window.WebVRConfig || {};
}

var VR_DEVICES = [
    // Samsung Galaxy 4S #########################################################################################
    // Firefox Beta:
    // Mozilla/5.0 (Android 5.0.1; Mobile; rv:43.0) Gecko/43.0 Firefox/43.0
    // vr.cardboard.enabled = true
    "Phone Sensor (Cardboard) HMD (HMD)",    // VR device 0
    "Phone Sensor (Cardboard) HMD (Sensor)", // VR device 1
    // vr.cardboard.enabled = false
    // no devices
    // *** sensor not working? ***
    // Chrome Dev:
    // Mozilla/5.0 (Linux; Android 5.0.1; SCH-I545 Build/LRX22C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2560.5 Mobile Safari/537.36
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

pyserver.log(JSON.stringify(WebVRConfig));
pyserver.log(userAgent);
if (navigator.getVRDevices) {
    navigator.getVRDevices().then(function (devices) {
        devices.forEach(function (device, i) {
            pyserver.log('VR device ' + i + ': ' + device.deviceName);
        });
    });
}

var POOLVR = POOLVR || {};
POOLVR.settings = POOLVR.settings || {useBasicMaterials: 'true'};
