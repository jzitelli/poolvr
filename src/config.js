/* global POOLVR, YAWVRB, CANNON, THREE */
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
    toggleVR: {buttons: [3], commandDown: POOLVR.commands.toggleVR},
    toggleFloatMode: {buttons: [0]},
    moveLR: {axes: [YAWVRB.Gamepads.AXES.LSX]},
    moveFB: {axes: [YAWVRB.Gamepads.AXES.LSY], flipAxes: true},
    autoPosition: {buttons: [2], commandDown: POOLVR.commands.autoPosition}
};

POOLVR.vrGamepadBCommands = {
    toolTurnLR: {axes: [YAWVRB.Gamepads.AXES.LSX]},
    toolMoveFB:  {axes: [YAWVRB.Gamepads.AXES.LSY], flipAxes: true},
    toggleToolFloatMode: {buttons: [0]},
    resetVRSensor: {buttons: [3], commandDown: POOLVR.commands.resetVRSensor},
    resetTable: {buttons: [2], commandDown: POOLVR.commands.resetTable}
};


POOLVR.parseURIConfig = function () {
    "use strict";
    POOLVR.config = POOLVR.config || {};
    if (POOLVR.config.useBasicMaterials) {
        POOLVR.config.useSpotLight = false;
        POOLVR.config.usePointLight = false;
        POOLVR.config.useShadowMap  = false;
    } else {
        POOLVR.config.useSpotLight  = YAWVRB.Utils.URL_PARAMS.useSpotLight  !== undefined ? YAWVRB.Utils.URL_PARAMS.useSpotLight  : (POOLVR.config.useSpotLight || true);
        POOLVR.config.usePointLight = YAWVRB.Utils.URL_PARAMS.usePointLight !== undefined ? YAWVRB.Utils.URL_PARAMS.usePointLight : POOLVR.config.usePointLight;
        POOLVR.config.useShadowMap  = YAWVRB.Utils.URL_PARAMS.useShadowMap  !== undefined ? YAWVRB.Utils.URL_PARAMS.useShadowMap  : POOLVR.config.useShadowMap;
    }
    // Leap Motion config:
    POOLVR.config.toolOptions = POOLVR.config.toolOptions || {};
    POOLVR.config.toolOptions.useShadowMesh  = !POOLVR.config.useShadowMap;
    POOLVR.config.toolOptions.shadowPlane    = POOLVR.config.H_table + 0.001;
    POOLVR.config.toolOptions.shadowMaterial = POOLVR.shadowMaterial;
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
    }
    return config;
};


( function () {
    "use strict";
    // TODO: load from JSON config
    var world = new CANNON.World();
    world.gravity.set( 0, -POOLVR.config.gravity, 0 );
    world.defaultContactMaterial.contactEquationStiffness   = 2e7;
    world.defaultContactMaterial.frictionEquationStiffness  = 2e6;
    world.defaultContactMaterial.contactEquationRelaxation  = 2;
    world.defaultContactMaterial.frictionEquationRelaxation = 3;
    //world.broadphase = new CANNON.SAPBroadphase( world );
    world.solver.iterations = 10;
    POOLVR.world = world;

    POOLVR.ballMaterial            = new CANNON.Material();
    POOLVR.ballBallContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.ballMaterial, {
        restitution: 0.92,
        friction: 0.14
    });
    POOLVR.playableSurfaceMaterial            = new CANNON.Material();
    POOLVR.ballPlayableSurfaceContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.playableSurfaceMaterial, {
        restitution: 0.3,
        friction: 0.21
    });
    POOLVR.cushionMaterial            = new CANNON.Material();
    POOLVR.ballCushionContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.cushionMaterial, {
        restitution: 0.8,
        friction: 0.12
    });
    POOLVR.floorMaterial            = new CANNON.Material();
    POOLVR.floorBallContactMaterial = new CANNON.ContactMaterial(POOLVR.floorMaterial, POOLVR.ballMaterial, {
        restitution: 0.86,
        friction: 0.4
    });
    POOLVR.railMaterial            = new CANNON.Material();
    POOLVR.railBallContactMaterial = new CANNON.ContactMaterial(POOLVR.railMaterial, POOLVR.ballMaterial, {
        restitution: 0.7,
        friction: 0.07
    });
    POOLVR.tipMaterial            = new CANNON.Material();
    POOLVR.tipBallContactMaterial = new CANNON.ContactMaterial(POOLVR.tipMaterial, POOLVR.ballMaterial, {
        restitution: 0.01,
        friction: 0.13,
        contactEquationRelaxation: 2,
        frictionEquationRelaxation: 2
    });
    POOLVR.openVRTipMaterial            = new CANNON.Material();
    POOLVR.openVRTipBallContactMaterial = new CANNON.ContactMaterial(POOLVR.openVRTipMaterial, POOLVR.ballMaterial, {
        restitution: 1,
        friction: 0.25,
        contactEquationRelaxation: 1,
        frictionEquationRelaxation: 1,
        contactEquationStiffness: 1e9,
        frictionEquationStiffness: 1e8
    });

    world.addMaterial(POOLVR.playableSurfaceMaterial);
    world.addMaterial(POOLVR.cushionMaterial);
    world.addMaterial(POOLVR.railMaterial);
    world.addMaterial(POOLVR.floorMaterial);
    world.addMaterial(POOLVR.ballMaterial);
    world.addMaterial(POOLVR.tipMaterial);
    world.addMaterial(POOLVR.openVRTipMaterial);

    world.addContactMaterial(POOLVR.ballBallContactMaterial);
    world.addContactMaterial(POOLVR.ballPlayableSurfaceContactMaterial);
    world.addContactMaterial(POOLVR.ballCushionContactMaterial);
    world.addContactMaterial(POOLVR.floorBallContactMaterial);
    world.addContactMaterial(POOLVR.railBallContactMaterial);
    world.addContactMaterial(POOLVR.tipBallContactMaterial);
    world.addContactMaterial(POOLVR.openVRTipBallContactMaterial);
} )();

POOLVR.shadowMaterial = new THREE.MeshBasicMaterial({color: 0x002200});
