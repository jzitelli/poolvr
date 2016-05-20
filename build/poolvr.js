(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.WebVRSound = ( function (numGainNodes) {
    "use strict";
    numGainNodes = numGainNodes || 4;

    var audioContext = new AudioContext();

    var gainNodes = [];
    for (var i = 0; i < numGainNodes; i++) {
        var gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 1;
        gainNodes.push(gainNode);
    }

    var iGainNode = 0;
    function getNextGainNode() {
        var node = gainNodes[iGainNode];
        iGainNode = (iGainNode + 1) % numGainNodes;
        return node;
    }

    var playBuffer = function (buffer, vol) {
        var source = audioContext.createBufferSource();
        var gainNode = getNextGainNode();
        gainNode.gain.value = vol;
        source.connect(gainNode);
        source.buffer = buffer;
        source.start(0);
    };

    return {
        audioContext: audioContext,
        getNextGainNode: getNextGainNode,
        playBuffer: playBuffer
    };

} )();

/* global POOLVR, WebVRSound */
POOLVR.playCollisionSound = (function () {
    "use strict";
    var ballBallBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    var filename = (!/Edge/.test(navigator.userAgent)) ? 'sounds/ballBall.ogg' : 'sounds/ballBall.mp3';
    request.open('GET', filename);
    request.onload = function() {
        WebVRSound.audioContext.decodeAudioData(this.response, function(buffer) {
            ballBallBuffer = buffer;
        });
    };
    request.send();
    var playCollisionSound = function (v) {
        WebVRSound.playBuffer(ballBallBuffer, Math.min(1, v / 10));
    };
    return playCollisionSound;
})();

POOLVR.playPocketedSound = (function () {
    "use strict";
    var ballPocketedBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    var filename = (!/Edge/.test(navigator.userAgent)) ? 'sounds/ballPocketed.ogg' : 'sounds/ballPocketed.mp3';
    request.open('GET', filename);
    request.onload = function() {
        WebVRSound.audioContext.decodeAudioData(this.response, function(buffer) {
            ballPocketedBuffer = buffer;
        });
    };
    request.send();
    var playPocketedSound = function () {
        WebVRSound.playBuffer(ballPocketedBuffer, 0.5);
    };
    return playPocketedSound;
})();

},{}],2:[function(require,module,exports){
/* global POOLVR, THREE */
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

        var avatar = POOLVR.avatar;
        var heading = Math.atan2(
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.x - POOLVR.ballMeshes[0].position.x),
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.z - POOLVR.ballMeshes[0].position.z)
        );
        avatar.quaternion.setFromAxisAngle(UP, heading);

        // nextVector.copy(POOLVR.toolRoot.worldPosition);
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

},{}],3:[function(require,module,exports){
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
    toggleVR: {buttons: [3], commandDown: POOLVR.commands.toggleVR},
    moveLR: {axes: [YAWVRB.Gamepads.AXES.LSX]},
    moveFB: {axes: [YAWVRB.Gamepads.AXES.LSY]},
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

},{}],4:[function(require,module,exports){
/* global require */
window.POOLVR = window.POOLVR || {};
require('./utils.js');
require('./WebVRSound.js');
require('./actions.js');
require('./config.js');
require('./menu.js');

/* global POOLVR, THREE, YAWVRB, CANNON, THREEPY_SCENE */
window.onLoad = function () {
    "use strict";

    if (POOLVR.URL_PARAMS.clearLocalStorage) {
        console.log('clearing localStorage...');
        localStorage.clear();
    }

    THREE.Object3D.DefaultMatrixAutoUpdate = false;

    POOLVR.avatar = new THREE.Object3D();
    var avatar = POOLVR.avatar;

    POOLVR.config = POOLVR.loadConfig(POOLVR.profile) || POOLVR.config;
    POOLVR.parseURIConfig();
    console.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    var didA = false;
    for (var i = 0; i < YAWVRB.Gamepads.vrGamepads.length; i++) {
        var gamepad = YAWVRB.Gamepads.vrGamepads[i];
        if (!gamepad) continue;
        if (i === 0) {
            YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadACommands);
            didA = true;
        } else if (i === 1) {
            YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadBCommands);
        }
    }
    YAWVRB.Gamepads.setOnGamepadConnected( function (e) {
        var gamepad = e.gamepad;
        if (!gamepad) return;
        if (/openvr/i.test(gamepad.id)) {
            if (didA) {
                YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadBCommands);
            } else {
                YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadACommands);
                didA = true;
            }
        }
        else if (/xbox/i.test(gamepad.id) || /xinput/i.test(gamepad.id)) YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.gamepadCommands);
    } );

    // TODO: load from JSON config
    var world = new CANNON.World();
    world.gravity.set( 0, -POOLVR.config.gravity, 0 );
    world.defaultContactMaterial.contactEquationStiffness   = 1e7;
    world.defaultContactMaterial.frictionEquationStiffness  = 2e6;
    world.defaultContactMaterial.contactEquationRelaxation  = 2;
    world.defaultContactMaterial.frictionEquationRelaxation = 3;
    world.broadphase = new CANNON.SAPBroadphase( world );
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
    world.addMaterial(POOLVR.ballMaterial);
    world.addMaterial(POOLVR.playableSurfaceMaterial);
    world.addMaterial(POOLVR.cushionMaterial);
    world.addMaterial(POOLVR.floorMaterial);
    world.addMaterial(POOLVR.tipMaterial);
    world.addMaterial(POOLVR.railMaterial);
    world.addContactMaterial(POOLVR.ballBallContactMaterial);
    world.addContactMaterial(POOLVR.ballPlayableSurfaceContactMaterial);
    world.addContactMaterial(POOLVR.ballCushionContactMaterial);
    world.addContactMaterial(POOLVR.floorBallContactMaterial);
    world.addContactMaterial(POOLVR.tipBallContactMaterial);
    world.addContactMaterial(POOLVR.railBallContactMaterial);

    POOLVR.stage = new YAWVRB.Stage();

    POOLVR.objectSelector = new YAWVRB.Utils.ObjectSelector();
    POOLVR.shadowMaterial = new THREE.MeshBasicMaterial({color: 0x002200});

    if (POOLVR.config.useTextGeomLogger) {
        var fontLoader = new THREE.FontLoader();
        fontLoader.load('fonts/Anonymous Pro_Regular.js', function (font) {
            var textGeomCacher = new YAWVRB.TextGeomUtils.TextGeomCacher(font, {size: 0.12, curveSegments: 3});
            var textGeomLoggerMaterial = new THREE.MeshBasicMaterial({color: 0xff3210});
            POOLVR.textGeomLogger = new YAWVRB.TextGeomUtils.TextGeomLogger(textGeomCacher,
                {material: textGeomLoggerMaterial, nrows: 8, lineHeight: 1.8 * 0.12});
            avatar.add(POOLVR.textGeomLogger.root);
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

    POOLVR.synthSpeaker = new YAWVRB.SynthSpeaker({volume: POOLVR.config.synthSpeakerVolume, rate: 0.8, pitch: 0.5});

    POOLVR.setupMenu();

    POOLVR.leapIndicator = document.getElementById('leapIndicator');

    var leapTool = YAWVRB.LeapMotion.makeTool( POOLVR.combineObjects(POOLVR.config.toolOptions, {
        onConnect: function () {
            POOLVR.leapIndicator.innerHTML = 'Leap Motion: websocket connected';
            POOLVR.leapIndicator.style['background-color'] = 'rgba(60, 100, 20, 0.8)';
        },
        onStreamingStarted: function () {
            POOLVR.leapIndicator.innerHTML = 'Leap Motion: websocket connected, streaming';
            POOLVR.leapIndicator.style['background-color'] = 'rgba(20, 160, 20, 0.8)';
        },
        onStreamingStopped: function () {
            POOLVR.leapIndicator.innerHTML = 'Leap Motion: websocket connected, streaming stopped';
            POOLVR.leapIndicator.style['background-color'] = 'rgba(60, 100, 20, 0.8)';
        },
        onDisconnect: function () {
            POOLVR.leapIndicator.innerHTML = 'Leap Motion: websocket disconnected';
            POOLVR.leapIndicator.style['background-color'] = 'rgba(60, 20, 20, 0.4)';
        },
        useShadowMesh: !POOLVR.config.useShadowMap,
        shadowMaterial: POOLVR.shadowMaterial,
        shadowPlane: POOLVR.config.H_table + 0.001,
        tipMaterial: POOLVR.tipMaterial
    }) );
    POOLVR.leapTool = leapTool;
    leapTool.toolMesh.renderOrder = -1;
    avatar.add(leapTool.toolRoot);
    world.addBody(leapTool.toolBody);
    leapTool.leapController.connect();
    POOLVR.objectSelector.addSelectable(POOLVR.leapTool.toolRoot);
    leapTool.toolRoot.name = 'toolRoot';

    avatar.add(POOLVR.leapTool.toolRoot);

    if (YAWVRB.Gamepads.vrGamepads[0]) {
        var openVRTool = YAWVRB.Gamepads.makeTool(YAWVRB.Gamepads.vrGamepads[0], YAWVRB.Utils.combineObjects(POOLVR.config.toolOptions, {
            useShadowMesh: !POOLVR.config.useShadowMap,
            shadowMaterial: POOLVR.shadowMaterial,
            shadowPlane: POOLVR.config.H_table + 0.001,
            tipMaterial: POOLVR.tipMaterial
        }));
        avatar.add(openVRTool.mesh);
        world.addBody(openVRTool.body);
        POOLVR.openVRTool = openVRTool;
    }

    var rendererOptions = {
        canvas: document.getElementById('webgl-canvas'),
        antialias: (POOLVR.URL_PARAMS.antialias !== undefined ? POOLVR.URL_PARAMS.antialias : POOLVR.config.antialias) || !POOLVR.isMobile()
    };

    var euler = new THREE.Euler(0, 0, 0, 'YXZ');
    var appConfig = {
        onResetVRSensor: function (lastRotation, lastPosition) {
            // maintain correspondence between virtual / physical leap motion controller:
            console.log('lastRotation: %f\nlastPosition: %s', lastRotation, JSON.stringify(lastPosition));
            var camera = POOLVR.app.camera;
            var toolRoot = POOLVR.leapTool.toolRoot;
            euler.setFromQuaternion(toolRoot.quaternion);
            euler.y -= lastRotation;
            toolRoot.quaternion.setFromAxisAngle(THREE.Object3D.DefaultUp, euler.y);
            toolRoot.position.sub(lastPosition);
            toolRoot.position.applyAxisAngle(THREE.Object3D.DefaultUp, -lastRotation);
            toolRoot.position.add(camera.position);
            toolRoot.updateMatrix();
            euler.setFromQuaternion(avatar.quaternion);
            euler.y += lastRotation;
            avatar.quaternion.setFromAxisAngle(THREE.Object3D.DefaultUp, euler.y);
            avatar.updateMatrix();
            avatar.updateMatrixWorld();
            POOLVR.leapTool.updateToolMapping();
        }
    };

    POOLVR.app = new YAWVRB.App(undefined, appConfig, rendererOptions);
    var app = POOLVR.app;
    if (POOLVR.config.useShadowMap) {
        app.renderer.shadowMap.enabled = true;
    }

    avatar.add(POOLVR.app.camera);
    avatar.position.set(0, 0.98295, 1.0042);

    THREE.py.parse(THREEPY_SCENE).then( function (scene) {

        scene.autoUpdate = false;

        POOLVR.app.scene = scene;

        if (leapTool.toolShadowMesh) {
            POOLVR.app.scene.add(leapTool.toolShadowMesh);
        }

        var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 8, Math.PI / 2);
        centerSpotLight.position.set(0, 3, 0);
        centerSpotLight.castShadow = true;
        centerSpotLight.shadow.camera.matrixAutoUpdate = true;
        centerSpotLight.shadow.camera.near = 1;
        centerSpotLight.shadow.camera.far = 3;
        centerSpotLight.shadow.camera.fov = 80;
        //centerSpotLight.shadow.radius = 0.5;
        scene.add(centerSpotLight);
        centerSpotLight.updateMatrix();
        centerSpotLight.updateMatrixWorld();
        POOLVR.centerSpotLight = centerSpotLight;
        POOLVR.centerSpotLight.visible = POOLVR.config.useSpotLight;

        if (POOLVR.config.usePointLight) {
            var pointLight = new THREE.PointLight(0xaa8866, 0.8, 40);
            pointLight.position.set(4, 5, 2.5);
            scene.add(pointLight);
            pointLight.updateMatrix();
            pointLight.updateMatrixWorld();
        }

        scene.add(avatar);
        avatar.updateMatrix();
        avatar.updateMatrixWorld();

        THREE.py.CANNONize(scene, world);

        POOLVR.ballMeshes = [];
        POOLVR.ballBodies = [];
        POOLVR.initialPositions = [];
        POOLVR.onTable = [true,
                          true, true, true, true, true, true, true,
                          true,
                          true, true, true, true, true, true, true];
        POOLVR.nextBall = 1;

        var floorBody, ceilingBody;
        var basicMaterials = {};
        var nonbasicMaterials = {};
        scene.traverse(function (node) {
            if (node instanceof THREE.Mesh) {
                if ((node.material instanceof THREE.MeshLambertMaterial || node.material instanceof THREE.MeshPhongMaterial) && (basicMaterials[node.material.uuid] === undefined)) {
                    var basicMaterial = new THREE.MeshBasicMaterial({color: node.material.color.getHex(), transparent: node.material.transparent, side: node.material.side});
                    basicMaterials[node.material.uuid] = basicMaterial;
                    nonbasicMaterials[basicMaterial.uuid] = node.material;
                }
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

        POOLVR.switchMaterials = function (useBasicMaterials) {
            var materials = useBasicMaterials ? basicMaterials : nonbasicMaterials;
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

        var H_table = POOLVR.config.H_table;
        if (!POOLVR.config.useShadowMap) {
            var ballShadowMeshes = [];
            var ballShadowGeom = new THREE.CircleBufferGeometry(0.5*POOLVR.config.ball_diameter, 16);
            ballShadowGeom.rotateX(-0.5*Math.PI);
            POOLVR.ballMeshes.forEach( function (mesh, ballNum) {
                var ballShadowMesh = new THREE.Mesh(ballShadowGeom, POOLVR.shadowMaterial);
                ballShadowMesh.position.copy(mesh.position);
                ballShadowMesh.position.y = H_table + 0.0004;
                ballShadowMeshes[ballNum] = ballShadowMesh;
                scene.add(ballShadowMesh);
            } );
        }

        POOLVR.updateBallsPostStep = function () {
            for (var i = 0; i < POOLVR.ballMeshes.length; i++) {
                var mesh = POOLVR.ballMeshes[i];
                var body = POOLVR.ballBodies[i];
                mesh.position.copy(body.interpolatedPosition);
                mesh.quaternion.copy(body.interpolatedQuaternion);
                mesh.updateMatrix();
                mesh.updateMatrixWorld();
                if (!POOLVR.config.useShadowMap) {
                    var shadowMesh = ballShadowMeshes[i];
                    shadowMesh.position.x = mesh.position.x;
                    shadowMesh.position.z = mesh.position.z;
                    shadowMesh.updateMatrix();
                    shadowMesh.updateMatrixWorld();
                }
            }
        };

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
                }
            }
        });

        var relVelocity = new CANNON.Vec3();
        world.addEventListener('beginContact', function (evt) {
            var bodyA = evt.bodyA;
            var bodyB = evt.bodyB;
            if (bodyA.material === bodyB.material) {
                // ball-ball collision
                bodyA.velocity.vsub(bodyB.velocity, relVelocity);
                POOLVR.playCollisionSound(relVelocity.lengthSquared());
            }
        });

        POOLVR.stage.load(POOLVR.config.stage);

        scene.updateMatrixWorld(true);

        POOLVR.leapTool.updateToolMapping();

        POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);

        POOLVR.startAnimateLoop();
    } );
};

POOLVR.moveAvatar = ( function () {
    "use strict";
    var UP = THREE.Object3D.DefaultUp,
        walkSpeed = 0.333,
        floatSpeed = 0.1;
    var euler = new THREE.Euler(0, 0, 0, 'YXZ');

    return function (keyboard, gamepadValues, dt) {
        var avatar = POOLVR.avatar;

        var floatUp = keyboard.floatUp - keyboard.floatDown;
        var drive = keyboard.driveBack - keyboard.driveForward;
        var strafe = keyboard.strafeRight - keyboard.strafeLeft;
        var heading = -0.8 * dt * (-keyboard.turnLeft + keyboard.turnRight);

        for (var i = 0; i < gamepadValues.length; i++) {
            var values = gamepadValues[i];
            if (values.toggleFloatMode) {
                if (values.moveFB) floatUp -= values.moveFB;
                if (values.turnLR) strafe += values.turnLR;
            } else {
                if (values.moveFB) drive += values.moveFB;
                if (values.turnLR) heading += -0.8 * dt * values.turnLR;
            }
        }

        floatUp *= floatSpeed;

        if (strafe || drive) {
            var len = walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive + strafe * strafe));
            strafe *= len;
            drive *= len;
        } else {
            strafe = 0;
            drive = 0;
        }
        if (floatUp !== 0 || strafe !== 0 || heading !== 0 || drive !== 0) {
            euler.setFromQuaternion(avatar.quaternion);
            euler.y += heading;
            var cosHeading = Math.cos(euler.y),
                sinHeading = Math.sin(euler.y);
            avatar.quaternion.setFromAxisAngle(UP, euler.y);
            avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
            avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
            avatar.position.y += dt * floatUp;

            avatar.updateMatrix();
        }
    };
} )();

POOLVR.moveToolRoot = ( function () {
    "use strict";
    var UP = THREE.Object3D.DefaultUp;
    var euler = new THREE.Euler(0, 0, 0, 'YXZ');
    return function (keyboard, gamepadValues, dt) {
        var leapTool = POOLVR.leapTool;
        var toolRoot = leapTool.toolRoot;
        var toolDrive = 0;
        var toolFloat = 0;
        var toolStrafe = 0;
        var rotateToolCW = 0;
        if (keyboard) {
            toolDrive += keyboard.moveToolForwards - keyboard.moveToolBackwards;
            toolFloat += keyboard.moveToolUp - keyboard.moveToolDown;
            toolStrafe += keyboard.moveToolRight - keyboard.moveToolLeft;
            rotateToolCW += keyboard.rotateToolCW - keyboard.rotateToolCCW;
        }
        for (var i = 0; i < gamepadValues.length; i++) {
            var values = gamepadValues[i];
            if (values.toggleToolFloatMode) {
                if (values.toolMoveFB) toolFloat -= values.toolMoveFB;
                if (values.toolTurnLR) toolStrafe += values.toolTurnLR;
            } else {
                if (values.toolMoveFB) toolDrive -= values.toolMoveFB;
                if (values.toolTurnLR) rotateToolCW += values.toolTurnLR;
            }
        }
        if ((toolDrive !== 0) || (toolStrafe !== 0) || (toolFloat !== 0) || (rotateToolCW !== 0)) {
            toolRoot.position.x +=  0.16 * dt * toolStrafe;
            toolRoot.position.z += -0.16 * dt * toolDrive;
            toolRoot.position.y +=  0.16 * dt * toolFloat;
            euler.setFromQuaternion(toolRoot.quaternion);
            euler.y -= 0.15 * dt * rotateToolCW;
            toolRoot.quaternion.setFromAxisAngle(UP, euler.y);
            toolRoot.updateMatrix();
            leapTool.setDeadtime(0);
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

    POOLVR.synthSpeaker.speak("If you are playing in VR, try using the I, J, K, and L keys.  To move the virtual. Leap Motion Controller.  So that it coincides with the controller in your physical environment.", function () {
        POOLVR.textGeomLogger.log("IF YOU ARE PLAYING IN VR, TRY USING THE");
        POOLVR.textGeomLogger.log("I / J / K / L / O / . / Y / U KEYS");
        POOLVR.textGeomLogger.log("TO MOVE THE VIRTUAL LEAP MOTION CONTROLLER");
        POOLVR.textGeomLogger.log("SO THAT IT COINCIDES WITH THE CONTROLLER");
        POOLVR.textGeomLogger.log("IN YOUR PHYSICAL ENVIRONMENT.");
    });

};

POOLVR.startAnimateLoop = function () {
    "use strict";
    var keyboard = POOLVR.keyboard,
        app      = POOLVR.app,
        world    = POOLVR.world,
        avatar   = POOLVR.avatar,
        updateTool          = POOLVR.leapTool.updateTool,
        updateToolPostStep  = POOLVR.leapTool.updateToolPostStep,
        updateToolMapping   = POOLVR.leapTool.updateToolMapping,
        updateBallsPostStep = POOLVR.updateBallsPostStep,
        moveToolRoot        = POOLVR.moveToolRoot,
        moveAvatar          = POOLVR.moveAvatar;

    var lt = 0;

    function animate(t) {

        var dt = (t - lt) * 0.001;

        POOLVR.textGeomLogger.update(t);

        updateTool(dt);

        if (POOLVR.openVRTool) POOLVR.openVRTool.update(dt);

        app.render();

        world.step(Math.min(1/60, dt), dt, 10);

        updateToolPostStep();
        updateBallsPostStep();

        var gamepadValues = YAWVRB.Gamepads.update();

        moveAvatar(keyboard, gamepadValues, dt);
        moveToolRoot(keyboard, gamepadValues, dt);
        avatar.updateMatrixWorld();
        updateToolMapping();

        lt = t;

        requestAnimationFrame(animate);

    }

    requestAnimationFrame(animate);

};

},{"./WebVRSound.js":1,"./actions.js":2,"./config.js":3,"./menu.js":5,"./utils.js":6}],5:[function(require,module,exports){
/* global POOLVR */
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
        POOLVR.saveConfig(POOLVR.profile);
        if (!POOLVR.config.useBasicMaterials && !(POOLVR.config.useSpotLight || POOLVR.config.usePointLight)) {
            useSpotLightInput.checked = true;
            POOLVR.config.useSpotLight = true;
            POOLVR.centerSpotLight.visible = true;
        }
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
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
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
        POOLVR.leapTool.leapController.connection.host = host;
        POOLVR.leapTool.leapController.connection.disconnect(true);
        POOLVR.leapTool.leapController.connect();
    }

    var profileNameInput = document.getElementById('profileName');
    POOLVR.profile = profileNameInput.value || 'default';
    profileNameInput.value = POOLVR.profile;
    profileNameInput.addEventListener('change', function () {
        POOLVR.profile = profileNameInput.value;
    }, false);

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

    var saveProfileButton = document.getElementById('saveProfileButton');
    saveProfileButton.addEventListener('click', function () {
        POOLVR.saveConfig(POOLVR.profile);
    }, false);

    var loadProfileButton = document.getElementById('loadProfileButton');
    loadProfileButton.addEventListener('click', function () {
        var config = POOLVR.loadConfig(POOLVR.profile);
        if (config) {
            console.log('loaded configuration for "%s":', POOLVR.profile);
            console.log(JSON.stringify(config, undefined, 2));
            POOLVR.config = config;
            POOLVR.stage.load(POOLVR.config.stage);
        }
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

},{}],6:[function(require,module,exports){
/* global POOLVR */
POOLVR.URL_PARAMS = ( function () {
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
        if (params[k].length === 1)
            params[k] = params[k][0];
        if (params[k] === 'true')
            params[k] = true;
        else if (params[k] === 'false')
            params[k] = false;
    }
    return params;
} )();


POOLVR.combineObjects = function (a, b) {
    "use strict";
    var c = {},
        k;
    for (k in a) {
        c[k] = a[k];
    }
    for (k in b) {
        if (!c.hasOwnProperty(k)) {
            c[k] = b[k];
        }
    }
    return c;
};


POOLVR.makeObjectArray = function (obj, keyKey) {
    "use strict";
    keyKey = keyKey || "key";
    return Object.keys(obj).map(function (k) {
        var item = {};
        item[keyKey] = k;
        for (var p in obj[k]) {
            item[p] = obj[k][p];
        }
        return item;
    });
};


// adapted from detectmobilebrowsers.com
POOLVR.isMobile = function () {
    "use strict";
    var a = navigator.userAgent || navigator.vendor || window.opera;
    return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)));
};

},{}]},{},[4]);
