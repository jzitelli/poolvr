(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global POOLVR, THREE, YAWVRB */
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
    var key = 'POOLVR' + POOLVR.version + '_' + profileName;
    localStorage.setItem(key, JSON.stringify(POOLVR.config, undefined, 2));
    console.log('saved configuration for profile "%s":', profileName);
    console.log(localStorage[key]);
};


POOLVR.loadConfig = function (profileName) {
    "use strict";
    var localStorageConfig = localStorage.getItem('POOLVR' + POOLVR.version + '_' + profileName);
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


POOLVR.switchMaterials = function (useBasicMaterials) {
    var materials = useBasicMaterials ? POOLVR.basicMaterials : POOLVR.nonBasicMaterials;
    POOLVR.app.scene.traverse( function (node) {
        if (node instanceof THREE.Mesh) {
            var material = node.material;
            var uuid = material.uuid;
            if (materials[uuid]) {
                node.material = materials[uuid];
            }
        }
    } );
};


POOLVR.selectNextBall = function (inc) {
    "use strict";
    inc = inc || 1;
    var next = Math.max(1, Math.min(15, POOLVR.nextBall + inc));
    if (next === POOLVR.nextBall) return;
    while (!POOLVR.onTable[next]) {
        var _next = next;
        next = Math.max(1, Math.min(15, next + inc));
        if (next === _next) {
            break;
        }
    }
    if (POOLVR.nextBall !== next) {
        POOLVR.nextBall = next;
        POOLVR.textGeomLogger.log("BALL " + POOLVR.nextBall + " SELECTED");
    }
};


POOLVR.resetTable = function () {
    "use strict";
    POOLVR.ballBodies.forEach(function (body, ballNum) {
        body.wakeUp();
        body.position.copy(POOLVR.initialPositions[ballNum]);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.bounces = 0;
        POOLVR.onTable[ballNum] = true;
        body.mesh.visible = true;
        var shadowMesh = POOLVR.ballShadowMeshes[ballNum];
        if (shadowMesh) shadowMesh.visible = true;
    });
    if (POOLVR.synthSpeaker.speaking === false) {
        POOLVR.synthSpeaker.speak("Table reset.");
    }
    POOLVR.nextBall = 1;
    POOLVR.textGeomLogger.log("TABLE RESET.");
};


POOLVR.autoPosition = ( function () {
    "use strict";
    var nextVector = new THREE.Vector3();
    var UP = THREE.Object3D.DefaultUp;
    var speakCount = 0;
    return function () {
        if (POOLVR.synthSpeaker.speaking === false) {
            if (speakCount <= 3) {
                POOLVR.synthSpeaker.speak("You are being auto-positioned.");
                if (speakCount === 3) {
                    POOLVR.synthSpeaker.speak("I will stop saying that now.");
                }
                speakCount++;
            }
        }
        var avatar = POOLVR.app.stage;
        var heading = Math.atan2(
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.x - POOLVR.ballMeshes[0].position.x),
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.z - POOLVR.ballMeshes[0].position.z)
        );
        avatar.quaternion.setFromAxisAngle(UP, heading);
        // auto-position so that cue ball is on top of leap controller
        nextVector.copy(POOLVR.leapTool.toolRoot.position);
        nextVector.applyQuaternion(avatar.quaternion);
        nextVector.add(avatar.position);
        nextVector.sub(POOLVR.ballMeshes[0].position);
        nextVector.y = 0;
        avatar.position.sub(nextVector);
        avatar.updateMatrix();
        avatar.updateMatrixWorld();
        POOLVR.leapTool.updateToolMapping();
    };
} )();


POOLVR.stroke = ( function () {
    "use strict";
    var velocity = new THREE.Vector3();
    return function () {
        velocity.set(0, 0, -3.5);
        velocity.applyQuaternion(POOLVR.leapTool.worldQuaternion);
        var body = POOLVR.ballBodies[0];
        body.velocity.copy(velocity);
    };
} )();


POOLVR.moveStage = ( function () {
    "use strict";
    return function (keyboard, gamepadValues, dt) {
        var stage = POOLVR.app.stage;
        var moveFB = 0, moveRL = 0, moveUD = 0, turnRL = 0;
        if (keyboard) {
            moveFB += keyboard.moveForward - keyboard.moveBackward;
            moveUD += keyboard.moveUp - keyboard.moveDown;
            moveRL += keyboard.moveRight - keyboard.moveLeft;
            turnRL += keyboard.turnRight - keyboard.turnLeft;
        }
        for (var i = 0; i < gamepadValues.length; i++) {
            var values = gamepadValues[i];
            if (values.toggleFloatMode) {
                if (values.moveFB) moveUD -= values.moveFB;
                if (values.turnLR) moveRL += values.turnLR;
            } else {
                if (values.moveFB) moveFB -= values.moveFB;
                if (values.turnLR) turnRL += values.turnLR;
            }
            if (values.moveRL) moveRL += values.moveRL;
        }
        if (moveFB || moveRL || moveUD || turnRL) {
            YAWVRB.Utils.moveObject(stage, dt, moveFB, moveRL, moveUD, turnRL, 0);
        }
    };
} )();


POOLVR.moveToolRoot = ( function () {
    "use strict";
    return function (keyboard, gamepadValues, dt) {
        var moveFB = 0, moveRL = 0, moveUD = 0, turnRL = 0;
        if (keyboard) {
            moveFB += keyboard.moveToolForward - keyboard.moveToolBackward;
            moveUD += keyboard.moveToolUp - keyboard.moveToolDown;
            moveRL += keyboard.moveToolRight - keyboard.moveToolLeft;
            turnRL += keyboard.rotateToolCW - keyboard.rotateToolCCW;
        }
        for (var i = 0; i < gamepadValues.length; i++) {
            var values = gamepadValues[i];
            if (values.toggleToolFloatMode) {
                if (values.moveToolFB) moveUD -= values.moveToolFB;
                if (values.turnToolLR) moveRL += values.turnToolLR;
            } else {
                if (values.moveToolFB) moveFB -= values.moveToolFB;
                if (values.turnToolLR) turnRL += values.turnToolLR;
            }
        }
        if (moveFB || moveRL || moveUD || turnRL) {
            YAWVRB.Utils.moveObject(POOLVR.leapTool.toolRoot, dt, moveFB, moveRL, moveUD, turnRL, 0);
            POOLVR.leapTool.setDeadtime(0);
        }
    };
} )();


POOLVR.startTutorial = function () {
    "use strict";
    POOLVR.synthSpeaker.speak("Hello.  Welcome. To. Pool-ver.", function () {
        POOLVR.textGeomLogger.log("HELLO.  WELCOME TO POOLVR.");
    });

    POOLVR.synthSpeaker.speak("Please wave a stick-like object in front of your Leap Motion controller.", function () {
        POOLVR.textGeomLogger.log("PLEASE WAVE A STICK-LIKE OBJECT IN FRONT OF YOUR");
        POOLVR.textGeomLogger.log("LEAP MOTION CONTROLLER.");
    });

    POOLVR.synthSpeaker.speak("Keep the stick within the interaction box when you want to make contact with.  A ball.", function () {
        POOLVR.textGeomLogger.log("KEEP THE STICK WITHIN THE INTERACTION BOX WHEN YOU WANT");
        POOLVR.textGeomLogger.log("TO MAKE CONTACT WITH A BALL...");
    });

};

},{}],2:[function(require,module,exports){
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
    moveForward:  {buttons: [87]},
    moveBackward: {buttons: [83]},
    moveLeft:     {buttons: [65]},
    moveRight:    {buttons: [68]},
    moveUp:       {buttons: [69]},
    moveDown:     {buttons: [67]},

    moveToolUp:        {buttons: [79]},
    moveToolDown:      {buttons: [190]},
    moveToolForward:   {buttons: [73]},
    moveToolBackward:  {buttons: [75]},
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

POOLVR.xboxGamepadCommands = {
    turnLR: {axes: [YAWVRB.Gamepads.AXES.LSX]},
    moveFB: {axes: [YAWVRB.Gamepads.AXES.LSY]},
    toggleFloatMode: {buttons: [YAWVRB.Gamepads.BUTTONS.leftStick]},
    moveToolFB:  {axes: [YAWVRB.Gamepads.AXES.RSY]},
    turnToolLR: {axes: [YAWVRB.Gamepads.AXES.RSX]},
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
    toggleVR: {buttons: [YAWVRB.Gamepads.BUTTONS.start], commandDown: POOLVR.commands.toggleVR}
};

POOLVR.vrGamepadACommands = {
    moveToolFB:  {axes: [YAWVRB.Gamepads.AXES.LSY], flipAxes: true},
    turnToolLR: {axes: [YAWVRB.Gamepads.AXES.LSX]},
    toggleToolFloatMode: {buttons: [0]},
    toggleVR: {buttons: [3], commandDown: POOLVR.commands.toggleVR},
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
        restitution: 0.92,
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
        friction: 0.25,
        contactEquationRelaxation: 1,
        frictionEquationRelaxation: 1,
        contactEquationStiffness: 4e8
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

},{}],3:[function(require,module,exports){
/* global require */
window.POOLVR = window.POOLVR || {};

require('./sounds.js');
require('./actions.js');
require('./config.js');
require('./menu.js');

/* global POOLVR, THREE, YAWVRB, CANNON, THREEPY_SCENE */
window.onLoad = function () {
    "use strict";
    const INCH2METERS = 0.0254;

    if (YAWVRB.Utils.URL_PARAMS.clearLocalStorage) {
        console.log('clearing localStorage...');
        localStorage.clear();
    }

    THREE.Object3D.DefaultMatrixAutoUpdate = false;

    var loadedConfig = POOLVR.loadConfig(POOLVR.profile);
    POOLVR.config = loadedConfig || POOLVR.config;
    POOLVR.parseURIConfig();

    console.log("POOLVR.config:");
    console.log(POOLVR.config);

    POOLVR.synthSpeaker = new YAWVRB.SynthSpeaker({volume: POOLVR.config.synthSpeakerVolume || 0.6, rate: POOLVR.config.synthSpeakerRate || 0.75, pitch: POOLVR.config.synthSpeakerPitch || 0.5});

    // TODO: return menu items
    POOLVR.setupMenu();

    var rendererOptions = {
        canvas: document.getElementById('webgl-canvas'),
        antialias: (YAWVRB.Utils.URL_PARAMS.antialias !== undefined ? YAWVRB.Utils.URL_PARAMS.antialias : POOLVR.config.antialias) || !YAWVRB.Utils.isMobile()
    };

    var appConfig = {
        onResetVRSensor: function () {
            POOLVR.leapTool.updateToolMapping();
        }
    };

    POOLVR.app = new YAWVRB.App(undefined, appConfig, rendererOptions);

    POOLVR.app.stage.add(POOLVR.app.camera);

    if (POOLVR.config.useShadowMap) {
        POOLVR.app.renderer.shadowMap.enabled = true;
        POOLVR.app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    if (POOLVR.config.useTextGeomLogger) {
        var fontLoader = new THREE.FontLoader();
        fontLoader.load('fonts/Anonymous Pro_Regular.js', function (font) {
            var textGeomCacher = new YAWVRB.TextGeomUtils.TextGeomCacher(font, {size: 0.12, curveSegments: 2});
            var textGeomLoggerMaterial = new THREE.MeshBasicMaterial({color: 0xff3210});
            POOLVR.textGeomLogger = new YAWVRB.TextGeomUtils.TextGeomLogger(textGeomCacher,
                {material: textGeomLoggerMaterial, nrows: 8, lineHeight: 1.8 * 0.12});
            POOLVR.app.stage.add(POOLVR.textGeomLogger.root);
            POOLVR.textGeomLogger.root.position.set(-2.7, 0.88, -3.3);
            POOLVR.textGeomLogger.root.updateMatrix();
        });
    } else {
        POOLVR.textGeomLogger = {
            root: new THREE.Object3D(),
            log: function (msg) { console.log(msg); },
            update: function () {},
            clear: function () {}
        };
    }

    if (!loadedConfig) {
        POOLVR.synthSpeaker.speak("Hello. Welcome. To. Pool-ver.");
    }

    var leapIndicator = document.getElementById('leapIndicator');
    POOLVR.leapTool = YAWVRB.LeapMotion.makeTool( YAWVRB.Utils.combineObjects(POOLVR.config.toolOptions, {
        onConnect: function () {
            leapIndicator.innerHTML = 'connected';
            leapIndicator.style['background-color'] = 'rgba(60, 100, 20, 0.8)';
            POOLVR.app.stage.add(POOLVR.leapTool.toolRoot);
            POOLVR.world.addBody(POOLVR.leapTool.toolBody);
        },
        onStreamingStarted: function () {
            leapIndicator.innerHTML = 'connected, streaming';
            leapIndicator.style['background-color'] = 'rgba(20, 160, 20, 0.8)';
            POOLVR.leapTool.toolRoot.visible = true;
            POOLVR.app.vrControls.update();
            POOLVR.leapTool.toolRoot.position.y = POOLVR.app.camera.position.y - 2*INCH2METERS;
            POOLVR.leapTool.toolRoot.updateMatrix();
            POOLVR.leapTool.toolRoot.updateMatrixWorld();
        },
        onStreamingStopped: function () {
            leapIndicator.innerHTML = 'connected, streaming stopped';
            leapIndicator.style['background-color'] = 'rgba(60, 100, 20, 0.8)';
            POOLVR.leapTool.toolRoot.visible = false;
        },
        onDisconnect: function () {
            leapIndicator.innerHTML = 'disconnected';
            leapIndicator.style['background-color'] = 'rgba(60, 20, 20, 0.4)';
            POOLVR.leapTool.toolRoot.visible = false;
        },
        tipMaterial: POOLVR.tipMaterial
    }) );
    POOLVR.leapTool.toolMesh.renderOrder = -1;
    POOLVR.leapTool.toolRoot.visible = false;
    POOLVR.leapTool.leapController.connect();

    window.addEventListener("beforeunload", function () {
        POOLVR.leapTool.leapController.disconnect();
    }, false);

    POOLVR.openVRTool = YAWVRB.Gamepads.makeTool(YAWVRB.Utils.combineObjects(POOLVR.config.toolOptions, {
        tipMaterial: POOLVR.openVRTipMaterial
    }));
    POOLVR.openVRTool.mesh.visible = false;
    if (POOLVR.openVRTool.shadowMesh) POOLVR.openVRTool.shadowMesh.visible = false;
    POOLVR.app.stage.add(POOLVR.openVRTool.mesh);
    var gamepadA;
    YAWVRB.Gamepads.setOnGamepadConnected(onGamepadConnected);
    function onGamepadConnected(e) {
        var gamepad = e.gamepad;
        if (!gamepad) return;
        if (/openvr/i.test(gamepad.id)) {
            if (gamepadA) {
                console.log('OpenVR controller B connected');
                YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadBCommands);
            } else {
                console.log('OpenVR controller A connected');
                gamepadA = gamepad;
                YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadACommands);
                POOLVR.openVRTool.mesh.visible = true;
                if (POOLVR.openVRTool.shadowMesh) POOLVR.openVRTool.shadowMesh.visible = true;
                POOLVR.openVRTool.setGamepad(gamepad);
                POOLVR.world.addBody(POOLVR.openVRTool.body);
            }
        } else if (/xbox/i.test(gamepad.id) || /xinput/i.test(gamepad.id)) {
            YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.xboxGamepadCommands);
        } else if (/3232/i.test(gamepad.id) || /b629/i.test(gamepad.id)) {
            YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.destekGamepadCommands);
        }
    }
    YAWVRB.Gamepads.setOnGamepadDisconnected( function (evt) {
        if (gamepadA && gamepadA.index === evt.gamepad.index) {
            POOLVR.openVRTool.mesh.visible = false;
            if (POOLVR.openVRTool.shadowMesh) POOLVR.openVRTool.shadowMesh.visible = false;
        }
    } );

    THREE.py.parse(THREEPY_SCENE).then( function (scene) {

        scene.autoUpdate = false;

        POOLVR.app.scene = scene;

        POOLVR.app.scene.add(POOLVR.app.stage);

        if (POOLVR.leapTool.toolShadowMesh) {
            POOLVR.app.scene.add(POOLVR.leapTool.toolShadowMesh);
        }

        if (POOLVR.openVRTool && POOLVR.openVRTool.shadowMesh) {
            POOLVR.app.scene.add(POOLVR.openVRTool.shadowMesh);
        }

        var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 8, Math.PI / 4);
        centerSpotLight.position.set(0, 3, 0);
        centerSpotLight.updateMatrix();
        centerSpotLight.castShadow = true;
        centerSpotLight.visible = POOLVR.config.useSpotLight;
        scene.add(centerSpotLight);
        centerSpotLight.shadow.mapSize.set(1024, 1024);
        centerSpotLight.shadow.camera.matrixAutoUpdate = true;
        centerSpotLight.shadow.camera.near = 1;
        centerSpotLight.shadow.camera.far = 4;
        centerSpotLight.shadow.camera.fov = 80;
        centerSpotLight.shadow.camera.updateProjectionMatrix();
        // centerSpotLight.shadow.radius = 0.5;
        POOLVR.centerSpotLight = centerSpotLight;

        var pointLight = new THREE.PointLight(0xaa8866, 0.8, 40);
        pointLight.position.set(4, 5, 2.5);
        pointLight.updateMatrix();
        pointLight.updateMatrixWorld();
        scene.add(pointLight);
        POOLVR.pointLight = pointLight;
        POOLVR.pointLight.visible = POOLVR.config.usePointLight;

        navigator.getVRDisplays().then( function (vrDisplays) {
            var vrDisplay = vrDisplays[0];
            var isVive = /vive/i.test(vrDisplay.displayName);
            if (!(vrDisplay.stageParameters && vrDisplay.stageParameters.sittingToStandingTransform)) {
                POOLVR.app.vrControls.update();
                POOLVR.leapTool.toolRoot.position.y = POOLVR.app.camera.position.y - 2*INCH2METERS;
                POOLVR.leapTool.toolRoot.updateMatrix();
                POOLVR.app.stage.position.y = 45.5 * INCH2METERS;
                POOLVR.app.stage.position.z = 0.5 * POOLVR.config.L_table + 12 * INCH2METERS;
                POOLVR.app.stage.updateMatrix();
                POOLVR.app.stage.updateMatrixWorld();
                // POOLVR.app.vrControls.standing = false;
            } else {
                var sizeX = vrDisplay.stageParameters.sizeX;
                var sizeZ = vrDisplay.stageParameters.sizeZ;
                // rotate the room if it better fits the stage / play area:
                if (sizeX && sizeZ && sizeX > sizeZ) {
                    var rotation = (new THREE.Matrix4()).makeRotationY(Math.PI / 2);
                    POOLVR.app.scene.children.forEach( function (child) {
                        if (child !== POOLVR.app.stage) {
                            child.matrix.multiplyMatrices(rotation, child.matrix);
                            child.matrix.decompose(child.position, child.quaternion, child.scale);
                            child.updateMatrixWorld(true);
                        }
                    } );
                }
            }

            THREE.py.CANNONize(scene, POOLVR.world);

            POOLVR.ballMeshes = [];
            POOLVR.ballBodies = [];
            POOLVR.initialPositions = [];
            POOLVR.onTable = [true,
                              true, true, true, true, true, true, true,
                              true,
                              true, true, true, true, true, true, true];
            POOLVR.nextBall = 1;
            POOLVR.ballShadowMeshes = [];

            var floorBody, ceilingBody;

            scene.traverse( function (node) {
                if (node instanceof THREE.Mesh) {
                    var ballNum;
                    if (node.name.startsWith('ballMesh')) {
                        ballNum = Number(node.name.split(' ')[1]);
                        POOLVR.ballMeshes[ballNum] = node;
                        POOLVR.ballBodies[ballNum] = node.body;
                        POOLVR.initialPositions[ballNum] = new THREE.Vector3().copy(node.position);
                        node.body.bounces = 0;
                        node.body.ballNum = ballNum;
                        node.body.material = POOLVR.ballMaterial;
                    }
                    else if (node.name === 'playableSurfaceMesh') {
                        node.body.material = POOLVR.playableSurfaceMaterial;
                    }
                    else if (node.name.endsWith('CushionMesh')) {
                        node.body.material = POOLVR.cushionMaterial;
                    }
                    else if (node.name === 'floorMesh') {
                        floorBody = node.body;
                        floorBody.material = POOLVR.floorMaterial;
                    }
                    else if (node.name === 'ceilingMesh') {
                        ceilingBody = node.body;
                        ceilingBody.material = POOLVR.floorMaterial;
                    }
                    else if (node.name.endsWith('RailMesh')) {
                        node.body.material = POOLVR.railMaterial;
                    }
                }
            });

            if (!POOLVR.config.useShadowMap) {
                var ballShadowGeom = new THREE.CircleBufferGeometry(0.5*POOLVR.config.ball_diameter, 16);
                ballShadowGeom.rotateX(-0.5*Math.PI);
                POOLVR.ballMeshes.forEach( function (mesh, ballNum) {
                    var ballShadowMesh = new THREE.Mesh(ballShadowGeom, POOLVR.shadowMaterial);
                    ballShadowMesh.position.copy(mesh.position);
                    ballShadowMesh.position.y = POOLVR.config.H_table + 0.0004;
                    POOLVR.ballShadowMeshes[ballNum] = ballShadowMesh;
                    scene.add(ballShadowMesh);
                } );
            }

            // ball-floor collision
            floorBody.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {
                var body = evt.body;
                if (body.ballNum === 0) {
                    POOLVR.textGeomLogger.log("SCRATCH.");
                    POOLVR.synthSpeaker.speak("Scratch.");
                    body.position.copy(POOLVR.initialPositions[0]);
                    body.velocity.set(0, 0, 0);
                    body.angularVelocity.set(0, 0, 0);
                } else if (body.ballNum !== undefined) {
                    body.bounces++;
                    if (body.bounces === 1) {
                        // POOLVR.textGeomLogger.log(body.mesh.name + " HIT THE FLOOR!");
                        POOLVR.playPocketedSound();
                        POOLVR.onTable[body.ballNum] = false;
                        POOLVR.nextBall = POOLVR.onTable.slice(1).indexOf(true) + 1;
                        if (POOLVR.nextBall === 0) {
                            POOLVR.synthSpeaker.speak("You cleared the table.  Well done.");
                            POOLVR.textGeomLogger.log("YOU CLEARED THE TABLE.  WELL DONE.");
                            POOLVR.resetTable();
                        }
                    } else if (body.bounces === 7) {
                        body.sleep();
                        body.mesh.visible = false;
                        var shadowMesh = POOLVR.ballShadowMeshes[body.ballNum];
                        if (shadowMesh) {
                            shadowMesh.visible = false;
                        }
                    }
                }
            });

            var relVelocity = new CANNON.Vec3();
            var tipCollisionCounter = 0;
            POOLVR.world.addEventListener('beginContact', function (evt) {
                var bodyA = evt.bodyA;
                var bodyB = evt.bodyB;
                if (bodyA.material === bodyB.material) {
                    // ball-ball collision
                    bodyA.velocity.vsub(bodyB.velocity, relVelocity);
                    POOLVR.playCollisionSound(relVelocity.lengthSquared());
                } else if (bodyA.material === POOLVR.openVRTipMaterial && bodyB.material === POOLVR.ballMaterial) {
                    if (POOLVR.openVRTool.body.sleepState === CANNON.Body.AWAKE) {
                        if (gamepadA && gamepadA.vibrate) gamepadA.vibrate(10);
                        tipCollisionCounter++;
                        if (tipCollisionCounter === 1) {
                            POOLVR.synthSpeaker.speak("You moved a ball.  Good job.");
                        } else if (tipCollisionCounter === 16) {
                            POOLVR.synthSpeaker.speak("You are doing a great job.");
                        }
                    }
                }
            });

            scene.updateMatrixWorld(true);

            POOLVR.leapTool.updateToolMapping();

            if (isVive) {

                var loader = new THREE.OBJLoader();
                loader.setPath( '/node_modules/three.js/examples/models/obj/vive-controller/' );
                loader.load( 'vr_controller_vive_1_5.obj', function ( object ) {
                    var loader = new THREE.TextureLoader();
                    loader.setPath('/node_modules/three.js/examples/models/obj/vive-controller/');
                    var viveDiffuseMap = loader.load('onepointfive_texture.png');
                    var viveSpecularMap = loader.load('onepointfive_spec.png');
                    var controller = object.children[ 0 ];
                    controller.material.map = viveDiffuseMap;
                    controller.material.specularMap = viveSpecularMap;
                    var controllerMesh = object.clone();
                    POOLVR.openVRTool.mesh.add(controllerMesh);
                    setTimeout( function () {
                        POOLVR.openVRTool.mesh.remove(controllerMesh);
                    }, 14000);
                    POOLVR.startAnimateLoop();
                } );

            } else {

                POOLVR.startAnimateLoop();

            }
        } );
    } );
};


POOLVR.startAnimateLoop = function () {
    "use strict";
    POOLVR.app.scene.traverse( function (node) {
        if (node instanceof THREE.Mesh) {
            if ((node.material instanceof THREE.MeshLambertMaterial || node.material instanceof THREE.MeshPhongMaterial) && (POOLVR.basicMaterials[node.material.uuid] === undefined)) {
                var basicMaterial = new THREE.MeshBasicMaterial({color: node.material.color.getHex(), transparent: node.material.transparent, side: node.material.side, map: node.material.map});
                POOLVR.basicMaterials[node.material.uuid] = basicMaterial;
                POOLVR.nonBasicMaterials[basicMaterial.uuid] = node.material;
            }
        }
    } );

    POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);

    function updateBallsPostStep() {
        "use strict";
        for (var i = 0; i < POOLVR.ballMeshes.length; i++) {
            var mesh = POOLVR.ballMeshes[i];
            var body = POOLVR.ballBodies[i];
            mesh.position.copy(body.interpolatedPosition);
            mesh.quaternion.copy(body.interpolatedQuaternion);
            mesh.updateMatrix();
            mesh.updateMatrixWorld();
            var shadowMesh = POOLVR.ballShadowMeshes[i];
            if (shadowMesh) {
                shadowMesh.position.x = mesh.position.x;
                shadowMesh.position.z = mesh.position.z;
                shadowMesh.updateMatrix();
                shadowMesh.updateMatrixWorld();
            }
        }
    }

    var keyboard = POOLVR.keyboard,
        render = POOLVR.app.render,
        world = POOLVR.world,
        stage = POOLVR.app.stage,
        moveToolRoot = POOLVR.moveToolRoot,
        moveStage = POOLVR.moveStage,
        textGeomLogger = POOLVR.textGeomLogger,
        leapTool = POOLVR.leapTool,
        openVRTool = POOLVR.openVRTool;

    var lt = 0;

    function animate(t) {

        var dt = (t - lt) * 0.001;

        textGeomLogger.update(t);

        leapTool.updateTool(dt);

        var gamepadValues = YAWVRB.Gamepads.update();
        openVRTool.update(dt);

        render();

        world.step(Math.min(1/60, dt), dt, 10);

        leapTool.updateToolPostStep();
        updateBallsPostStep();

        moveStage(keyboard, gamepadValues, dt);
        stage.updateMatrixWorld();
        moveToolRoot(keyboard, gamepadValues, dt);
        leapTool.updateToolMapping();

        lt = t;

        requestAnimationFrame(animate);

    }

    requestAnimationFrame(animate);

};

},{"./actions.js":1,"./config.js":2,"./menu.js":4,"./sounds.js":5}],4:[function(require,module,exports){
/* global POOLVR */

// TODO: use angular.js or some other MVC framework

POOLVR.setupMenu = function () {
    "use strict";

    var overlay = document.getElementById('overlay');

    POOLVR.toggleMenu = function () {
        if (overlay.style.display === 'none') {
            overlay.style.display = 'block';
        } else {
            overlay.style.display = 'none';
        }
    };

    function onFocus() {
        POOLVR.keyboard.enabled = false;
    }
    function onBlur() {
        POOLVR.keyboard.enabled = true;
    }

    var inputs = document.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('focus', onFocus, false);
        inputs[i].addEventListener('blur', onBlur, false);
    }

    var useBasicMaterialsInput = document.getElementById('useBasicMaterials');
    useBasicMaterialsInput.checked = POOLVR.config.useBasicMaterials;

    var useShadowMapInput = document.getElementById('useShadowMap');
    useShadowMapInput.checked = POOLVR.config.useShadowMap;

    var usePointLightInput = document.getElementById('usePointLight');
    usePointLightInput.checked = POOLVR.config.usePointLight;

    var useSpotLightInput = document.getElementById('useSpotLight');
    useSpotLightInput.checked = POOLVR.config.useSpotLight;

    useBasicMaterialsInput.addEventListener('change', function () {
        POOLVR.config.useBasicMaterials = useBasicMaterialsInput.checked;
        if (!POOLVR.config.useBasicMaterials && !(POOLVR.config.useSpotLight || POOLVR.config.usePointLight)) {
            useSpotLightInput.checked = true;
            POOLVR.config.useSpotLight = true;
            POOLVR.centerSpotLight.visible = true;
        }
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);
    }, false);

    useShadowMapInput.addEventListener('change', function () {
        POOLVR.config.useShadowMap = useShadowMapInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
    }, false);

    usePointLightInput.addEventListener('change', function () {
        POOLVR.config.usePointLight = usePointLightInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.pointLight.visible = POOLVR.config.usePointLight;
    }, false);

    useSpotLightInput.addEventListener('change', function () {
        POOLVR.config.useSpotLight = useSpotLightInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.centerSpotLight.visible = POOLVR.config.useSpotLight;
    }, false);

    // TODO: regular expression format check
    var leapAddressInput = document.getElementById('leapAddress');
    leapAddressInput.value = POOLVR.config.toolOptions.host || 'localhost';
    leapAddressInput.addEventListener('change', onLeapAddressChange, false);
    function onLeapAddressChange() {
        var host = leapAddressInput.value;
        POOLVR.config.toolOptions.host = host;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.leapTool.leapController.connection.host = host;
        POOLVR.leapTool.leapController.connection.disconnect(true);
        POOLVR.leapTool.leapController.connect();
    }

    var vrButton = document.getElementById('vrButton');
    vrButton.addEventListener('click', function () {
        POOLVR.app.toggleVR();
        vrButton.blur();
        overlay.style.display = 'none';
    }, false);

    var fsButton = document.getElementById('fsButton');
    fsButton.addEventListener('click', function () {
        POOLVR.app.toggleFullscreen();
    }, false);

    var vrDisplay = null;

    if (!navigator.getVRDisplays) {

        vrButton.style.display = 'none';
        vrButton.disabled = true;
        console.warn('navigator does not provide getVRDisplays');

    } else {

        navigator.getVRDisplays().then( function (vrDisplays) {

            for (var i = 0; i < vrDisplays.length; i++) {
                console.log(vrDisplays[i]);
                if (vrDisplays[i].capabilities && vrDisplays[i].capabilities.canPresent) {
                    vrDisplay = vrDisplays[i];
                    break;
                }
            }
            if (!vrDisplay) {

                vrButton.style.display = 'none';
                vrButton.disabled = true;

            }

        } ).catch( function (err) {

            vrButton.style.display = 'none';
            vrButton.disabled = true;
            console.error(err);

        } );
    }
};

},{}],5:[function(require,module,exports){
/* global POOLVR, YAWVRB */
POOLVR.playCollisionSound = (function () {
    "use strict";
    var ballBallBuffer;
    var filename = (!/Edge/.test(navigator.userAgent)) ? 'sounds/ballBall.ogg' : 'sounds/ballBall.mp3';
    YAWVRB.Audio.loadBuffer(filename, function (buffer) {
        ballBallBuffer = buffer;
    });
    var playCollisionSound = function (v) {
        YAWVRB.Audio.playBuffer(ballBallBuffer, Math.min(1, v / 10));
    };
    return playCollisionSound;
})();

POOLVR.playPocketedSound = (function () {
    "use strict";
    var ballPocketedBuffer;
    var filename = (!/Edge/.test(navigator.userAgent)) ? 'sounds/ballPocketed.ogg' : 'sounds/ballPocketed.mp3';
    YAWVRB.Audio.loadBuffer(filename, function (buffer) {
        ballPocketedBuffer = buffer;
    });
    var playPocketedSound = function () {
        YAWVRB.Audio.playBuffer(ballPocketedBuffer, 0.5);
    };
    return playPocketedSound;
})();

},{}]},{},[3]);
