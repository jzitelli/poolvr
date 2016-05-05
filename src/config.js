POOLVR.commands = {
    toggleVRControls: function () { POOLVR.app.toggleVRControls(); POOLVR.app.camera.updateMatrix(); },
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

    toggleVRControls: {buttons: [86],
                       commandDown: POOLVR.commands.toggleVRControls},
    toggleWireframe: {buttons: [96],
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
    stroke: {buttons: [32],
             commandDown: POOLVR.commands.stroke}
};

POOLVR.keyboard = new YAWVRB.Keyboard(window, POOLVR.keyboardCommands);

POOLVR.gamepadCommands = {
    turnLR:   {axes: [YAWVRB.Gamepad.AXES.LSX]},
    moveFB:    {axes: [YAWVRB.Gamepad.AXES.LSY]},
    toggleFloatMode: {buttons: [YAWVRB.Gamepad.BUTTONS.leftStick]},
    toolTurnLR: {axes: [YAWVRB.Gamepad.AXES.RSX]},
    toolMoveFB:  {axes: [YAWVRB.Gamepad.AXES.RSY]},
    toggleToolFloatMode: {buttons: [YAWVRB.Gamepad.BUTTONS.rightStick]},
    resetVRSensor: {buttons: [YAWVRB.Gamepad.BUTTONS.back],
                    commandDown: POOLVR.commands.resetVRSensor},
    selectNextBall: {buttons: [YAWVRB.Gamepad.BUTTONS.rightBumper],
                     commandDown: POOLVR.commands.selectNextBall},
    selectPrevBall: {buttons: [YAWVRB.Gamepad.BUTTONS.leftBumper],
                     commandDown: POOLVR.commands.selectPrevBall},
    stroke: {buttons: [YAWVRB.Gamepad.BUTTONS.X],
             commandDown: POOLVR.commands.stroke},
    autoPosition: {buttons: [YAWVRB.Gamepad.BUTTONS.Y],
                   commandDown: POOLVR.commands.autoPosition}
};

POOLVR.parseURIConfig = function () {
    "use strict";
    POOLVR.config.useTextGeomLogger = false; //URL_PARAMS.useTextGeomLogger !== undefined ? URL_PARAMS.useTextGeomLogger : POOLVR.config.useTextGeomLogger;
    POOLVR.config.synthSpeakerVolume = URL_PARAMS.synthSpeakerVolume || POOLVR.config.synthSpeakerVolume;
    POOLVR.config.useBasicMaterials = URL_PARAMS.useBasicMaterials !== undefined ? URL_PARAMS.useBasicMaterials : POOLVR.config.useBasicMaterials;
    if (POOLVR.config.useBasicMaterials) {
        POOLVR.config.usePointLight = false;
        POOLVR.config.useShadowMap  = false;
    } else {
        POOLVR.config.usePointLight = URL_PARAMS.usePointLight !== undefined ? URL_PARAMS.usePointLight : POOLVR.config.usePointLight;
        POOLVR.config.useShadowMap  = URL_PARAMS.useShadowMap  !== undefined ? URL_PARAMS.useShadowMap  : POOLVR.config.useShadowMap;
    }
    // Leap Motion config:
    POOLVR.config.toolOptions = POOLVR.config.toolOptions || {};
    POOLVR.config.toolOptions.toolLength   = URL_PARAMS.toolLength   || POOLVR.config.toolOptions.toolLength;
    POOLVR.config.toolOptions.toolRadius   = URL_PARAMS.toolRadius   || POOLVR.config.toolOptions.toolRadius;
    POOLVR.config.toolOptions.toolMass     = URL_PARAMS.toolMass     || POOLVR.config.toolOptions.toolMass;
    POOLVR.config.toolOptions.toolOffset   = URL_PARAMS.toolOffset   || POOLVR.config.toolOptions.toolOffset;
    POOLVR.config.toolOptions.toolRotation = URL_PARAMS.toolRotation || POOLVR.config.toolOptions.toolRotation;
    POOLVR.config.toolOptions.tipShape     = URL_PARAMS.tipShape     || POOLVR.config.toolOptions.tipShape;
    POOLVR.config.toolOptions.host         = URL_PARAMS.host         || POOLVR.config.toolOptions.host;
    POOLVR.config.toolOptions.port         = URL_PARAMS.port         || POOLVR.config.toolOptions.port;
    POOLVR.config.toolOptions.interactionPlaneOpacity = URL_PARAMS.interactionPlaneOpacity || 0.22;
};


POOLVR.profile = URL_PARAMS.profile || POOLVR.profile || 'default';


POOLVR.saveConfig = function (profileName) {
    "use strict";
    POOLVR.config.toolOptions.toolOffset = [POOLVR.toolRoot.position.x, POOLVR.toolRoot.position.y, POOLVR.toolRoot.position.z];
    POOLVR.config.toolOptions.toolRotation = POOLVR.toolRoot.heading;
    localStorage.setItem(profileName, JSON.stringify(POOLVR.config));
    console.log("saved configuration for profile '" + profileName + "':");
    console.log(JSON.stringify(POOLVR.config, undefined, 2));
};


POOLVR.loadConfig = function (profileName) {
    "use strict";
    var localStorageConfig = localStorage.getItem(profileName);
    var config;
    if (localStorageConfig) {
        config = {};
        localStorageConfig = JSON.parse(localStorageConfig);
        for (var k in localStorageConfig) {
            if (POOLVR.config.hasOwnProperty(k)) {
                config[k] = localStorageConfig[k];
            }
        }
        console.log("loaded configuration for profile '" + profileName + "'");
    }
    return config;
};
