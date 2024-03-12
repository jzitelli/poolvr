/* global Gamepads, Keyboard */
window.Gamepads = require('./Gamepads.js');
window.Keyboard = require('./Keyboard.js');

/* global POOLVR, CANNON, THREE */
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
    moveForward:  {buttons: [87]},
    moveBackward: {buttons: [83]},
    moveLeft:     {buttons: [65]},
    moveRight:    {buttons: [68]},
    moveUp:       {buttons: [69]},
    moveDown:     {buttons: [67]},

    toggleVR: {buttons: [Keyboard.KEYCODES.NUMBER9],
               commandDown: POOLVR.commands.toggleVR},
    toggleWireframe: {buttons: [Keyboard.KEYCODES.B],
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
    stroke: {buttons: [Keyboard.KEYCODES.SPACEBAR],
             commandDown: POOLVR.commands.stroke},
    toggleMenu: {buttons: [Keyboard.KEYCODES.M], commandDown: POOLVR.commands.toggleMenu}
};

POOLVR.keyboard = new Keyboard(window, POOLVR.keyboardCommands);

POOLVR.xboxGamepadCommands = {
    turnLR: {axes: [Gamepads.AXES.LSX]},
    moveFB: {axes: [Gamepads.AXES.LSY]},
    toggleFloatMode: {buttons: [Gamepads.BUTTONS.leftStick]},
    resetVRSensor: {buttons: [Gamepads.BUTTONS.back],
                    commandDown: POOLVR.commands.resetVRSensor},
    selectNextBall: {buttons: [Gamepads.BUTTONS.rightBumper],
                     commandDown: POOLVR.commands.selectNextBall},
    selectPrevBall: {buttons: [Gamepads.BUTTONS.leftBumper],
                     commandDown: POOLVR.commands.selectPrevBall},
    stroke: {buttons: [Gamepads.BUTTONS.X],
             commandDown: POOLVR.commands.stroke},
    autoPosition: {buttons: [Gamepads.BUTTONS.Y],
                   commandDown: POOLVR.commands.autoPosition},
    toggleVR: {buttons: [Gamepads.BUTTONS.start], commandDown: POOLVR.commands.toggleVR}
};

POOLVR.vrGamepadACommands = {
    //toggleVR: {buttons: [3], commandDown: POOLVR.commands.toggleVR},
    resetTable: {buttons: [2], commandDown: POOLVR.commands.resetTable}
    //autoPosition: {buttons: [2], commandDown: POOLVR.commands.autoPosition.bind(null, true)}
};

POOLVR.vrGamepadBCommands = {
    resetVRSensor: {buttons: [3], commandDown: POOLVR.commands.resetVRSensor}
};

POOLVR.destekGamepadCommands = {
    moveFB: {axes: [0]},
    moveRL: {axes: [1], flipAxes: true},
    autoPosition: {buttons: [0], commandDown: POOLVR.commands.autoPosition}
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
    world.solver.iterations = 15;
    POOLVR.world = world;

    POOLVR.ballMaterial            = new CANNON.Material();
    POOLVR.ballBallContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.ballMaterial, {
        restitution: 0.93,
        friction: 0.14
    });
    POOLVR.playableSurfaceMaterial            = new CANNON.Material();
    POOLVR.ballPlayableSurfaceContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.playableSurfaceMaterial, {
        restitution: 0.24,
        friction: 0.16,
        contactEquationStiffness: 7e8
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
        restitution: 0.95,
        friction: 0.65,
        contactEquationRelaxation: 2,
        frictionEquationRelaxation: 2,
        contactEquationStiffness: 1e9
        //frictionEquationStiffness: 1e7
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

POOLVR.basicMaterials = {};
POOLVR.nonBasicMaterials = {};

POOLVR.profile = 'default';
