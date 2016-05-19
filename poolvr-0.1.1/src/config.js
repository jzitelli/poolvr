/* global POOLVR, YAWVRB */
POOLVR.commands = {
    toggleMenu:       function () { POOLVR.toggleMenu(); },
    toggleVRControls: function () { POOLVR.app.toggleVRControls(); },
    toggleVR:         function () { POOLVR.app.toggleVR(); },
    toggleWireframe:  function () { POOLVR.app.toggleWireframe(); },
    resetVRSensor:    function () { POOLVR.app.resetVRSensor(); },
    resetTable:       POOLVR.resetTable,
    autoPosition:     POOLVR.autoPosition,
    selectNextBall:   function () { POOLVR.selectNextBall(); },
    selectPrevBall:   function () { POOLVR.selectNextBall(-1); },
    stroke:           POOLVR.stroke
};

POOLVR.keyboardCommands = {
    turnLeft:     {buttons: [37]},
    turnRight:    {buttons: [39]},
    driveForward: {buttons: [87]},
    driveBack:    {buttons: [83]},
    strafeLeft:   {buttons: [65]},
    strafeRight:  {buttons: [68]},
    floatUp:      {buttons: [69]},
    floatDown:    {buttons: [67]},

    moveToolUp:        {buttons: [79]},
    moveToolDown:      {buttons: [190]},
    moveToolForwards:  {buttons: [73]},
    moveToolBackwards: {buttons: [75]},
    moveToolLeft:      {buttons: [74]},
    moveToolRight:     {buttons: [76]},
    rotateToolCW:      {buttons: [85]},
    rotateToolCCW:     {buttons: [89]},

    toggleVR: {buttons: [YAWVRB.Keyboard.KEYCODES.NUMBER9],
               commandDown: POOLVR.commands.toggleVR},
    toggleWireframe: {buttons: [YAWVRB.Keyboard.KEYCODES.B],
                      commandDown: POOLVR.commands.toggleWireframe},
    resetVRSensor: {buttons: [90],
                    commandDown: POOLVR.commands.resetVRSensor},
    resetTable: {buttons: [82],
                 commandDown: POOLVR.commands.resetTable},
    autoPosition: {buttons: [80],
                   commandDown: POOLVR.commands.autoPosition},
    selectNextBall: {buttons: [107],
                     commandDown: POOLVR.commands.selectNextBall},
    selectPrevBall: {buttons: [109],
                     commandDown: POOLVR.commands.selectPrevBall},
    stroke: {buttons: [YAWVRB.Keyboard.KEYCODES.SPACEBAR],
             commandDown: POOLVR.commands.stroke},
    toggleMenu: {buttons: [YAWVRB.Keyboard.KEYCODES.M], commandDown: POOLVR.commands.toggleMenu}
};

POOLVR.keyboard = new YAWVRB.Keyboard(window, POOLVR.keyboardCommands);

POOLVR.gamepadCommands = {
    turnLR: {axes: [YAWVRB.Gamepads.AXES.LSX]},
    moveFB: {axes: [YAWVRB.Gamepads.AXES.LSY]},
    moveLR: {axes: [YAWVRB.Gamepads.AXES.RSX]},
    turnUD: {axes: [YAWVRB.Gamepads.AXES.RSY]},
    toggleFloatMode: {buttons: [YAWVRB.Gamepads.BUTTONS.leftStick]},
    toolTurnLR: {axes: [YAWVRB.Gamepads.AXES.RSX]},
    toolMoveFB:  {axes: [YAWVRB.Gamepads.AXES.RSY]},
    toggleToolFloatMode: {buttons: [YAWVRB.Gamepads.BUTTONS.rightStick]},
    resetVRSensor: {buttons: [YAWVRB.Gamepads.BUTTONS.back],
                    commandDown: POOLVR.commands.resetVRSensor},
    selectNextBall: {buttons: [YAWVRB.Gamepads.BUTTONS.rightBumper],
                     commandDown: POOLVR.commands.selectNextBall},
    selectPrevBall: {buttons: [YAWVRB.Gamepads.BUTTONS.leftBumper],
                     commandDown: POOLVR.commands.selectPrevBall},
    stroke: {buttons: [YAWVRB.Gamepads.BUTTONS.X],
             commandDown: POOLVR.commands.stroke},
    autoPosition: {buttons: [YAWVRB.Gamepads.BUTTONS.Y],
                   commandDown: POOLVR.commands.autoPosition},
    toggleMenu: {buttons: [YAWVRB.Gamepads.BUTTONS.start], commandDown: POOLVR.commands.toggleMenu}
};

POOLVR.vrGamepadACommands = {
    toggleVR: {buttons: [3], commandDown: POOLVR.commands.toggleVR}
};

POOLVR.vrGamepadBCommands = {
    toolTurnLR: {axes: [YAWVRB.Gamepads.AXES.LSX]},
    toolMoveFB:  {axes: [YAWVRB.Gamepads.AXES.LSY], flipAxes: true},
    toggleToolFloatMode: {buttons: [0]},
    resetVRSensor: {buttons: [3], commandDown: POOLVR.commands.resetVRSensor}
};

POOLVR.parseURIConfig = function () {
    "use strict";
    POOLVR.config = POOLVR.config || {};
    if (POOLVR.config.useBasicMaterials) {
        POOLVR.config.useSpotLight = false;
        POOLVR.config.usePointLight = false;
        POOLVR.config.useShadowMap  = false;
    } else {
        POOLVR.config.useSpotLight  = POOLVR.URL_PARAMS.useSpotLight  !== undefined ? POOLVR.URL_PARAMS.useSpotLight  : (POOLVR.config.useSpotLight || true);
        POOLVR.config.usePointLight = POOLVR.URL_PARAMS.usePointLight !== undefined ? POOLVR.URL_PARAMS.usePointLight : POOLVR.config.usePointLight;
        POOLVR.config.useShadowMap  = POOLVR.URL_PARAMS.useShadowMap  !== undefined ? POOLVR.URL_PARAMS.useShadowMap  : POOLVR.config.useShadowMap;
    }
    // Leap Motion config:
    POOLVR.config.toolOptions = POOLVR.config.toolOptions || {};
};


POOLVR.saveConfig = function (profileName) {
    "use strict";
    if (POOLVR.stage) {
        POOLVR.config.stage = POOLVR.stage.save();
    }
    localStorage.setItem(profileName, JSON.stringify(POOLVR.config, undefined, 2));
    console.log('saved configuration for profile "%s":', profileName);
    console.log(localStorage[profileName]);
};


POOLVR.loadConfig = function (profileName) {
    "use strict";
    var localStorageConfig = localStorage.getItem(profileName);
    var config;
    if (localStorageConfig) {
        config = {};
        localStorageConfig = JSON.parse(localStorageConfig);
        for (var k in localStorageConfig) {
            config[k] = localStorageConfig[k];
        }
        console.log('loaded configuration for profile "%s"',  profileName);
        console.log(JSON.stringify(config, undefined, 2));
    }
    return config;
};
