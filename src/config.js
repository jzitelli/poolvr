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

// TODO: remove Primrose dependency for keyboard / gamepad input, it seems overkill for just this functionality + my Primrose version is very outdated.

// TODO: control customization menu

POOLVR.keyboardCommands = {
    turnLeft:     {buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
    turnRight:    {buttons: [ Primrose.Input.Keyboard.RIGHTARROW]},
    driveForward: {buttons: [-Primrose.Input.Keyboard.W]},
    driveBack:    {buttons: [ Primrose.Input.Keyboard.S]},
    strafeLeft:   {buttons: [-Primrose.Input.Keyboard.A]},
    strafeRight:  {buttons: [ Primrose.Input.Keyboard.D]},
    floatUp:      {buttons: [ Primrose.Input.Keyboard.E]},
    floatDown:    {buttons: [-Primrose.Input.Keyboard.C]},

    moveToolUp:        {buttons: [Primrose.Input.Keyboard.O]},
    moveToolDown:      {buttons: [Primrose.Input.Keyboard.PERIOD]},
    moveToolForwards:  {buttons: [Primrose.Input.Keyboard.I]},
    moveToolBackwards: {buttons: [Primrose.Input.Keyboard.K]},
    moveToolLeft:      {buttons: [Primrose.Input.Keyboard.J]},
    moveToolRight:     {buttons: [Primrose.Input.Keyboard.L]},
    rotateToolCW:      {buttons: [Primrose.Input.Keyboard.U]},
    rotateToolCCW:     {buttons: [Primrose.Input.Keyboard.Y]},

    toggleVRControls: {buttons: [Primrose.Input.Keyboard.V],
                       commandDown: POOLVR.commands.toggleVRControls, dt: 0.25},
    toggleWireframe: {buttons: [Primrose.Input.Keyboard.NUMBER0],
                      commandDown: POOLVR.commands.toggleWireframe, dt: 0.25},
    resetVRSensor: {buttons: [Primrose.Input.Keyboard.Z],
                    commandDown: POOLVR.commands.resetVRSensor, dt: 0.25},
    resetTable: {buttons: [Primrose.Input.Keyboard.R],
                 commandDown: POOLVR.commands.resetTable, dt: 0.5},
    autoPosition: {buttons: [Primrose.Input.Keyboard.P],
                   commandDown: POOLVR.commands.autoPosition, dt: 0.5},
    selectNextBall: {buttons: [Primrose.Input.Keyboard.ADD],
                     commandDown: POOLVR.commands.selectNextBall, dt: 0.5},
    selectPrevBall: {buttons: [Primrose.Input.Keyboard.SUBTRACT],
                     commandDown: POOLVR.commands.selectPrevBall, dt: 0.5},
    stroke: {buttons: [Primrose.Input.Keyboard.SPACEBAR],
             commandDown: POOLVR.commands.stroke, dt: 0.25}
};

POOLVR.keyboardCommands = makeObjectArray(POOLVR.keyboardCommands, 'name');

POOLVR.keyboard = new Primrose.Input.Keyboard('keyboard', document, POOLVR.keyboardCommands);


var DEADZONE = 0.2;
POOLVR.gamepadCommands = {
    strafe:   {axes: [ Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    drive:    {axes: [ Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    float:    {axes: [-Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    dheading: {axes: [-Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    pitch:    {axes: [ Primrose.Input.Gamepad.LSY], deadzone: DEADZONE,
               integrate: true, max: 0.5 * Math.PI, min: -0.5 * Math.PI},
    toggleFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
                      commandDown: function () { POOLVR.avatar.floatMode = true; },
                      commandUp:   function () { POOLVR.avatar.floatMode = false; }},

    toolStrafe: {axes: [ Primrose.Input.Gamepad.RSX], deadzone: DEADZONE},
    toolDrive:  {axes: [ Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toolFloat:  {axes: [-Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toggleToolFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightStick],
                          commandDown: function () { POOLVR.avatar.toolMode = true; },
                          commandUp:   function () { POOLVR.avatar.toolMode = false; }},

    resetVRSensor: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                    commandDown: POOLVR.commands.resetVRSensor, dt: 0.25},
    selectNextBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightBumper],
                     commandDown: POOLVR.commands.selectNextBall, dt: 0.25},
    selectPrevBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftBumper],
                     commandDown: POOLVR.commands.selectPrevBall, dt: 0.25},
    autoPosition: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.Y],
                   commandDown: POOLVR.commands.autoPosition, dt: 0.25}
};


POOLVR.gamepadCommands = makeObjectArray(POOLVR.gamepadCommands, 'name');
POOLVR.gamepad = new Primrose.Input.Gamepad("gamepad", POOLVR.gamepadCommands);
POOLVR.gamepad.addEventListener("gamepadconnected", function(id) {
    if (!this.isGamepadSet()) {
        this.setGamepad(id);
        console.log("gamepad " + id + " connected");
    }
}.bind(POOLVR.gamepad), false);


POOLVR.parseURIConfig = function () {
    "use strict";
    POOLVR.config.useTextGeomLogger = false; //URL_PARAMS.useTextGeomLogger !== undefined ? URL_PARAMS.useTextGeomLogger : POOLVR.config.useTextGeomLogger;
    POOLVR.config.synthSpeakerVolume = URL_PARAMS.synthSpeakerVolume || POOLVR.config.synthSpeakerVolume;
    POOLVR.config.initialPosition = POOLVR.config.initialPosition;
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
    // application graphics config:
    POOLVR.config.useBasicMaterials = URL_PARAMS.useBasicMaterials !== undefined ? URL_PARAMS.useBasicMaterials : POOLVR.config.useBasicMaterials;
    if (POOLVR.config.useBasicMaterials) {
        POOLVR.config.usePointLight = false;
        POOLVR.config.useShadowMap  = false;
    } else {
        POOLVR.config.usePointLight = URL_PARAMS.usePointLight !== undefined ? URL_PARAMS.usePointLight : POOLVR.config.usePointLight;
        POOLVR.config.useShadowMap  = URL_PARAMS.useShadowMap  !== undefined ? URL_PARAMS.useShadowMap  : POOLVR.config.useShadowMap;
    }
    // THREE.WebGLRenderer config:
    POOLVR.config.rendererOptions = {
        antialias: URL_PARAMS.antialias !== undefined ? URL_PARAMS.antialias : (isMobile() === false)
    };
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
