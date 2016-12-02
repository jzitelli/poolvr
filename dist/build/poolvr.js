(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global THREE */
var Utils = require('./Utils.js');

const DEFAULT_OPTIONS = {
    onResetVRSensor: function (lastRotation, lastPosition) {
        console.log('lastRotation: ' + lastRotation);
        console.log('lastPosition: ' + lastPosition);
    }
};

module.exports = function (scene, config, rendererOptions) {
    "use strict";
    config = Utils.combineObjects(DEFAULT_OPTIONS, config || {});

    this.config = config;

    scene = scene || new THREE.Scene();

    this.scene = scene;

    rendererOptions = rendererOptions || {};

    this.renderer = new THREE.WebGLRenderer(rendererOptions);

    var domElement = this.renderer.domElement;

    if (!rendererOptions.canvas) {
        document.body.appendChild(domElement);
        domElement.id = 'webgl-canvas';
    }

    this.renderer.setPixelRatio(window.devicePixelRadio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.matrixAutoUpdate = true;

    this.vrEffect = new THREE.VREffect(this.renderer, function(error) { throw new Error(error); });

    this.vrControls = new THREE.VRControls(this.camera, function(error) { throw new Error(error); });
    this.vrControlsEnabled = true;

    this.stage = new THREE.Object3D();
    this.stage.matrixAutoUpdate = false;

    this.scene.add(this.stage);

    // public methods:

    this.render = function () {
        if (this.vrControlsEnabled) this.vrControls.update();
        this.vrEffect.render(this.scene, this.camera);
    }.bind(this);

    this.toggleVRControls = function () {
        if (this.vrControlsEnabled) {
            this.vrControlsEnabled = false;
            this.camera.position.set(0, 0, 0);
            this.camera.quaternion.set(0, 0, 0, 1);
            this.camera.updateMatrixWorld();
        } else {
            this.vrControlsEnabled = true;
        }
    }.bind(this);

    this.resetVRSensor = ( function () {
        var lastPosition = new THREE.Vector3();
        var euler = new THREE.Euler(0, 0, 0, 'YXZ');
        var onResetVRSensor = config.onResetVRSensor;
        return function () {
            if (this.vrControlsEnabled) {
                this.vrControls.update(true);
                lastPosition.copy(this.camera.position);
                var lastRotation = this.camera.rotation.y;
                this.vrControls.resetPose();
                this.vrControls.update(true);

                // maintain correspondence between virtual / physical poses of stage objects:
                this.stage.children.forEach( function (object) {
                    // maintain rotation of object (relative heading of object w.r.t. HMD):
                    if (object === this.camera) return;
                    euler.setFromQuaternion(object.quaternion);
                    euler.y -= lastRotation;
                    object.quaternion.setFromEuler(euler);
                    // maintain position of object w.r.t. HMD:
                    object.position.sub(lastPosition);
                    object.position.applyAxisAngle(THREE.Object3D.DefaultUp, -lastRotation);
                    object.position.add(this.camera.position);
                    object.updateMatrix();
                }.bind(this) );

                this.stage.updateMatrixWorld(true);

                // this.stage.children.forEach( function (child) {
                //     euler.setFromQuaternion(child.quaternion);
                //     euler.y -= lastRotation;
                //     child.quaternion.setFromAxisAngle(THREE.Object3D.DefaultUp, euler.y);
                //     child.position.sub(lastPosition);
                //     child.position.applyAxisAngle(THREE.Object3D.DefaultUp, -lastRotation);
                //     child.position.add(this.camera.position);
                //     child.updateMatrix();
                // } );

                if (onResetVRSensor) {
                    onResetVRSensor(lastRotation, lastPosition);
                }
            }
        };
    } )().bind(this);

    this.toggleFullscreen = function (options) {
        if (!isFullscreen()) {
            requestFullscreen(options);
            // requestPointerLock();
        } else {
            exitFullscreen();
            // releasePointerLock();
        }
    };

    this.toggleWireframe = ( function () {
        var wireframeMaterial = new THREE.MeshBasicMaterial({color: 0xeeddaa, wireframe: true});
        return function () {
            if (this.scene.overrideMaterial === wireframeMaterial) {
                this.scene.overrideMaterial = null;
            } else {
                this.scene.overrideMaterial = wireframeMaterial;
            }
        };
    } )().bind(this);

    this.toggleNormalMaterial = ( function () {
        var normalMaterial = new THREE.MeshNormalMaterial();
        return function () {
            if (this.scene.overrideMaterial === normalMaterial) {
                this.scene.overrideMaterial = null;
            } else {
                this.scene.overrideMaterial = normalMaterial;
            }
        };
    } )().bind(this);

    this.vrDisplay = null;

    // WebVR setup:

    if (navigator.getVRDisplays) {
        navigator.getVRDisplays().then( function (displays) {
            if (displays.length > 0) {
                this.vrDisplay = displays[0];
                if (this.vrDisplay.stageParameters && this.vrDisplay.stageParameters.sittingToStandingTransform) {
                    this.stage.matrix.fromArray(this.vrDisplay.stageParameters.sittingToStandingTransform);
                    this.stage.matrix.decompose(this.stage.position, this.stage.quaternion, this.stage.scale);
                    this.stage.matrixWorldNeedsUpdate = true;
                }
                if (config.onGotVRDisplay) {
                    config.onGotVRDisplay(this.vrDisplay);
                }
            }
        }.bind(this) );
    } else {
        console.error('WebVR API is not supported');
    }

    // resize, fullscreen/VR listener functions and other useful functions:

    var onResize = function () {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }.bind(this);

    var onFullscreenChange = function () {
        onResize();
    };

    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
    }

    function requestFullscreen(options) {
        if (domElement.requestFullscreen) {
            domElement.requestFullscreen(options);
        } else if (domElement.msRequestFullscreen) {
            domElement.msRequestFullscreen();
        } else if (domElement.mozRequestFullScreen) {
            domElement.mozRequestFullScreen(options);
        } else if (domElement.webkitRequestFullscreen) {
            domElement.webkitRequestFullscreen();
        } else {
            throw 'Fullscreen API is not supported';
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else {
            console.warn('exitFullscreen is not supported');
        }
    }

    // function requestPointerLock() {
    //     if (domElement.requestPointerLock) {
    //         domElement.requestPointerLock();
    //     } else if (domElement.mozRequestPointerLock) {
    //         domElement.mozRequestPointerLock();
    //     } else if (domElement.webkitRequestPointerLock) {
    //         domElement.webkitRequestPointerLock();
    //     }
    // }

    // function releasePointerLock() {
    //     if (document.exitPointerLock) {
    //         document.exitPointerLock();
    //     } else if (document.mozExitPointerLock) {
    //         document.mozExitPointerLock();
    //     } else if (document.webkitExitPointerLock) {
    //         document.webkitExitPointerLock();
    //     }
    // }

    var beforeUnload = function () {
        // stop VR presenting when exiting the app
        if (this.vrDisplay && this.vrDisplay.isPresenting) {
            this.vrEffect.exitPresent();
        }
    }.bind(this);

    // add standard event listeners

    window.addEventListener('resize', onResize, false);
    document.addEventListener(domElement.mozRequestFullScreen ? 'mozfullscreenchange' : 'webkitfullscreenchange',
        onFullscreenChange, false);
    window.addEventListener("beforeunload", beforeUnload, false);
};

},{"./Utils.js":8}],2:[function(require,module,exports){
module.exports = ( function () {
    "use strict";
    var numGainNodes = 4;

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

    var loadBuffer = function (url, onLoad) {
        var request = new XMLHttpRequest();
        request.responseType = 'arraybuffer';
        request.open('GET', url);
        request.onload = function () {
            audioContext.decodeAudioData(this.response, onLoad);
        };
        request.send();
    };

    return {
        audioContext: audioContext,
        getNextGainNode: getNextGainNode,
        playBuffer: playBuffer,
        loadBuffer: loadBuffer
    };
} )();

},{}],3:[function(require,module,exports){
/* global THREE, CANNON */
var Utils = require('./Utils.js');

module.exports = ( function () {
    "use strict";

    const DEADZONE = 0.15;

    var gamepads;
    var buttonsPresseds = [];
    var gamepadCommands = [];
    var xboxGamepads = [];
    var vrGamepads = [];

    const DEFAULT_OPTIONS = {
        toolLength: 0.15,
        toolRadius: 0.0034,
        tipLength: 0.15,
        tipRadius: 0.0034,
        toolMass: 0.04,
        toolColor: 0xeebb99,
        tipColor: 0x99bbee,
        tipMaterial: new CANNON.Material(),
        useShadowMesh: true,
        shadowMaterial: new THREE.MeshBasicMaterial({color: 0x212121}),
        shadowLightPosition: new THREE.Vector4(0, 7, 0, 0.1),
        shadowPlane: 0.002,
        numSegments: 10,
        offset: undefined
    };
    function makeTool(options) {
        options = Utils.combineObjects(DEFAULT_OPTIONS, options || {});
        console.log('OpenVR tool options:');
        console.log(options);
        var toolGeom = new THREE.CylinderBufferGeometry(options.toolRadius, options.toolRadius, options.toolLength, options.numSegments, 1, false);
        toolGeom.rotateX(-0.5 * Math.PI);
        if (options.offset) {
            toolGeom.translate(options.offset[0], options.offset[1], options.offset[2]);
            options.offset = new CANNON.Vec3(options.offset[0], options.offset[1], options.offset[2]);
        }
        var toolMaterial = new THREE.MeshLambertMaterial({color: options.toolColor, transparent: true});
        var toolMesh = new THREE.Mesh(toolGeom, toolMaterial);
        var toolShadowMesh;
        if (options.useShadowMesh) {
            toolShadowMesh = new THREE.ShadowMesh(toolMesh, options.shadowMaterial);
            var shadowPlane = new THREE.Plane(THREE.Object3D.DefaultUp, options.shadowPlane);
            toolShadowMesh.updateShadowMatrix(shadowPlane, options.shadowLightPosition);
        } else {
            toolMesh.castShadow = true;
        }
        var toolBody = new CANNON.Body({mass: options.toolMass, type: CANNON.Body.KINEMATIC});
        toolBody.material = options.tipMaterial;

        if (options.useImplicitCylinder) {
            toolBody.addShape(new CANNON.ImplicitCylinder(options.tipRadius, options.tipLength),
                options.offset, (new CANNON.Quaternion()).setFromAxisAngle(CANNON.Vec3.UNIT_X, 0.5*Math.PI));
        } else {
            toolBody.addShape(new CANNON.Cylinder(options.tipRadius, options.tipRadius, options.tipLength, options.numSegments), options.offset);
        }

        var vrGamepad;
        function setGamepad(gamepad) {
            vrGamepad = gamepad;
        }
        var velocity = new THREE.Vector3();
        var worldPosition = new THREE.Vector3();
        var worldQuaternion = new THREE.Quaternion();
        var worldScale = new THREE.Vector3();
        var lastPosition = new THREE.Vector3();
        function update(dt) {
            if (vrGamepad && vrGamepad.pose && vrGamepad.pose.position) {
                toolMesh.position.fromArray(vrGamepad.pose.position);
                toolMesh.quaternion.fromArray(vrGamepad.pose.orientation);
                toolMesh.updateMatrix();
                toolMesh.updateMatrixWorld();
                toolMesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
                toolBody.position.copy(worldPosition);
                velocity.subVectors(worldPosition, lastPosition);
                velocity.multiplyScalar(1 / dt);
                toolBody.velocity.copy(velocity);
                toolBody.quaternion.copy(worldQuaternion);
                lastPosition.copy(worldPosition);
                if (toolShadowMesh) {
                    toolShadowMesh.updateMatrix();
                    toolShadowMesh.updateMatrixWorld();
                }
            }
        }
        return {
            body: toolBody,
            mesh: toolMesh,
            shadowMesh: toolShadowMesh,
            update: update,
            setGamepad: setGamepad
        };
    }

    var _onGamepadConnected = null;
    var _onGamepadDisconnected = null;

    function setOnGamepadConnected(onGamepadConnected) {
        _onGamepadConnected = onGamepadConnected;
    }

    function setOnGamepadDisconnected(onGamepadDisconnected) {
        _onGamepadDisconnected = onGamepadDisconnected;
    }

    function pollGamepads() {
        gamepads = navigator.getGamepads();
        for (var i = 0; i < gamepads.length; i++) {
            var gamepad = gamepads[i];
            if (!gamepad || !gamepad.id) continue;
            if (buttonsPresseds[i] === undefined) {
                console.log('new gamepad: %s - %d buttons - %d axes', gamepad.id, gamepad.buttons.length, gamepad.axes.length);
                if (/openvr/i.test(gamepad.id)) {
                    vrGamepads.push(gamepad);
                } else if (/xbox/i.test(gamepad.id) || /xinput/i.test(gamepad.id)) {
                    xboxGamepads.push(gamepad);
                }
                buttonsPresseds[i] = [];
                for (var j = 0; j < gamepad.buttons.length; j++) {
                    buttonsPresseds[i].push(false);
                }
                if (_onGamepadConnected) _onGamepadConnected({gamepad: gamepad});
            }
        }
    }

    function setGamepadCommands(index, commands) {
        gamepadCommands[index] = commands;
    }

    function onGamepadConnected(e) {
        console.log("Gamepad connected at index %d: %s - %d buttons, %d axes", e.gamepad.index, e.gamepad.id, e.gamepad.buttons.length, e.gamepad.axes.length);
    }
    window.addEventListener("gamepadconnected", onGamepadConnected);

    function onGamepadDisconnected(e) {
        console.log("Gamepad disconnected from index %d: %s", e.gamepad.index, e.gamepad.id);
        var i = e.gamepad.index;
        for (var j = 0; j < buttonsPresseds[i].length; j++) {
            buttonsPresseds[i][j] = false;
        }
        if (_onGamepadDisconnected) _onGamepadDisconnected(e);
    }
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);

    function update() {
        var values = [];
        pollGamepads();
        for (var i = 0; i < gamepads.length; ++i) {
            var gamepad = gamepads[i];
            var buttonsPressed = buttonsPresseds[i];
            if (!gamepad || !buttonsPressed) continue;
            var commands = gamepadCommands[i] || {};
            // get all button/axes values:
            var axesValues = {};
            for (var name in commands) {
                axesValues[name] = 0;
                var command = commands[name];
                if (command.axes) {
                    for (var j = 0; j < gamepad.axes.length; j++) {
                        var axis = gamepad.axes[j];
                        if (Math.abs(axis) > DEADZONE) {
                            if (command.axes.indexOf(j) !== -1) {
                                axesValues[name] = gamepad.axes[j];
                                if (command.flipAxes) {
                                    axesValues[name] *= -1;
                                }
                                break;
                            }
                        }
                    }
                } else if (command.buttons) {
                    for (j = 0; j < command.buttons.length; j++) {
                        if (gamepad.buttons[command.buttons[j]] && gamepad.buttons[command.buttons[j]].pressed) {
                            axesValues[name] = 1;
                            break;
                        }
                    }
                }
            }
            values.push(axesValues);
            for (j = 0; j < gamepad.buttons.length; j++) {
                if (gamepad.buttons[j]) {
                    if (gamepad.buttons[j].pressed && !buttonsPressed[j]) {
                        buttonsPressed[j] = true;
                        for (name in commands) {
                            command = commands[name];
                            if (command.commandDown && command.buttons && command.buttons.indexOf(j) !== -1) {
                                command.commandDown(j, gamepad.axes);
                            }
                        }
                    } else if (!gamepad.buttons[j].pressed && buttonsPressed[j]) {
                        buttonsPressed[j] = false;
                        for (name in commands) {
                            command = commands[name];
                            if (command.commandUp && command.buttons && command.buttons.indexOf(j) !== -1) {
                                command.commandUp(j, gamepad.axes);
                            }
                        }
                    }
                }
            }
        }
        return values;
    }

    return {
        BUTTONS: {
            A: 0,
            B: 1,
            X: 2,
            Y: 3,
            leftBumper: 4,
            rightBumper: 5,
            leftTrigger: 6,
            rightTrigger: 7,
            back: 8,
            start: 9,
            leftStick: 10,
            rightStick: 11,
            up: 12,
            down: 13,
            left: 14,
            right: 15
        },
        AXES: {
            LSX: 0,
            LSY: 1,
            RSX: 2,
            RSY: 3
        },
        setGamepadCommands: setGamepadCommands,
        setOnGamepadConnected: setOnGamepadConnected,
        setOnGamepadDisconnected: setOnGamepadDisconnected,
        update: update,
        makeTool: makeTool,
        vrGamepads: vrGamepads,
        xboxGamepads: xboxGamepads
    };

} )();

},{"./Utils.js":8}],4:[function(require,module,exports){
module.exports = ( function () {
    "use strict";

    function Keyboard(eventTarget, commands) {

        this.enabled = true;

        eventTarget.addEventListener("keydown", onKeyDown.bind(this), false);
        eventTarget.addEventListener("keyup", onKeyUp, false);

        var keyDown = [];
        var commandDowns = [];

        function onKeyDown(evt) {
            if (this.enabled) {
                keyDown[evt.keyCode] = true;
                if (commandDowns[evt.keyCode]) commandDowns[evt.keyCode](evt.keyCode);
            }
        }

        function onKeyUp(evt) {
            keyDown[evt.keyCode] = false;
        }

        function getState(buttons) {
            if (!this.enabled) return 0;
            for (var i = 0; i < buttons.length; i++) {
                if (keyDown[buttons[i]]) return 1;
            }
            return 0;
        }

        for (var name in commands) {
            var buttons = commands[name].buttons;
            Object.defineProperty(this, name, {
                enumerable: true,
                get: getState.bind(this, buttons)
            });
            var commandDown = commands[name].commandDown;
            if (commandDown) {
                for (var i = 0; i < buttons.length; i++) {
                    commandDowns[buttons[i]] = commandDown;
                }
            }
        }

    }

    Keyboard.KEYCODES = {
        BACKSPACE: 8,
        TAB: 9,
        ENTER: 13,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        PAUSEBREAK: 19,
        CAPSLOCK: 20,
        ESCAPE: 27,
        SPACEBAR: 32,
        PAGEUP: 33,
        PAGEDOWN: 34,
        END: 35,
        HOME: 36,
        LEFTARROW: 37,
        UPARROW: 38,
        RIGHTARROW: 39,
        DOWNARROW: 40,
        INSERT: 45,
        DELETE: 46,
        NUMBER0: 48,
        NUMBER1: 49,
        NUMBER2: 50,
        NUMBER3: 51,
        NUMBER4: 52,
        NUMBER5: 53,
        NUMBER6: 54,
        NUMBER7: 55,
        NUMBER8: 56,
        NUMBER9: 57,
        A: 65,
        B: 66,
        C: 67,
        D: 68,
        E: 69,
        F: 70,
        G: 71,
        H: 72,
        I: 73,
        J: 74,
        K: 75,
        L: 76,
        M: 77,
        N: 78,
        O: 79,
        P: 80,
        Q: 81,
        R: 82,
        S: 83,
        T: 84,
        U: 85,
        V: 86,
        W: 87,
        X: 88,
        Y: 89,
        Z: 90,
        LEFTWINDOWKEY: 91,
        RIGHTWINDOWKEY: 92,
        SELECTKEY: 93,
        NUMPAD0: 96,
        NUMPAD1: 97,
        NUMPAD2: 98,
        NUMPAD3: 99,
        NUMPAD4: 100,
        NUMPAD5: 101,
        NUMPAD6: 102,
        NUMPAD7: 103,
        NUMPAD8: 104,
        NUMPAD9: 105,
        MULTIPLY: 106,
        ADD: 107,
        SUBTRACT: 109,
        DECIMALPOINT: 110,
        DIVIDE: 111,
        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123,
        NUMLOCK: 144,
        SCROLLLOCK: 145,
        SEMICOLON: 186,
        EQUALSIGN: 187,
        COMMA: 188,
        DASH: 189,
        PERIOD: 190,
        FORWARDSLASH: 191,
        GRAVEACCENT: 192,
        OPENBRACKET: 219,
        BACKSLASH: 220,
        CLOSEBRACKET: 221,
        SINGLEQUOTE: 222
    };

    Keyboard.KEYCODES['1'] = Keyboard.KEYCODES.NUMBER1;
    Keyboard.KEYCODES['2'] = Keyboard.KEYCODES.NUMBER2;
    Keyboard.KEYCODES['3'] = Keyboard.KEYCODES.NUMBER3;
    Keyboard.KEYCODES['4'] = Keyboard.KEYCODES.NUMBER4;
    Keyboard.KEYCODES['5'] = Keyboard.KEYCODES.NUMBER5;
    Keyboard.KEYCODES['6'] = Keyboard.KEYCODES.NUMBER6;
    Keyboard.KEYCODES['7'] = Keyboard.KEYCODES.NUMBER7;
    Keyboard.KEYCODES['8'] = Keyboard.KEYCODES.NUMBER8;
    Keyboard.KEYCODES['9'] = Keyboard.KEYCODES.NUMBER9;
    Keyboard.KEYCODES['0'] = Keyboard.KEYCODES.NUMBER0;
    Keyboard.KEYCODES['-'] = Keyboard.KEYCODES.DASH;
    Keyboard.KEYCODES['='] = Keyboard.KEYCODES.EQUALSIGN;
    Keyboard.KEYCODES[';'] = Keyboard.KEYCODES.SEMICOLON;
    Keyboard.KEYCODES["'"] = Keyboard.KEYCODES.SINGLEQUOTE;
    Keyboard.KEYCODES["\\"] = Keyboard.KEYCODES.BACKSLASH;
    Keyboard.KEYCODES["["] = Keyboard.KEYCODES.OPENBRACKET;
    Keyboard.KEYCODES["]"] = Keyboard.KEYCODES.CLOSEBRACKET;
    Keyboard.KEYCODES["`"] = Keyboard.KEYCODES.GRAVEACCENT;
    Keyboard.KEYCODES["/"] = Keyboard.KEYCODES.FORWARDSLASH;
    Keyboard.KEYCODES["."] = Keyboard.KEYCODES.PERIOD;
    Keyboard.KEYCODES[","] = Keyboard.KEYCODES.COMMA;

    Keyboard.CODEKEYS = [];
    for (var k in Keyboard.KEYCODES) {
        Keyboard.CODEKEYS[Keyboard.KEYCODES[k]] = k;
    }

    return Keyboard;
} )();

},{}],5:[function(require,module,exports){
/* *********************************************************************************************

   To connect to remote Leap Motion controllers, add this to the host's Leap Motion config.json:
     "websockets_allow_remote": true

   ********************************************************************************************* */

/* global Leap, THREE, CANNON */
var Utils = require('./Utils.js');

module.exports = ( function () {
    "use strict";

    const INCH2METERS = 0.0254;
    const LEAP2METERS = 0.001;
    const METERS2LEAP = 1000;
    const UP = THREE.Object3D.DefaultUp;
    const FORWARD = new THREE.Vector3(0, 0, -1);

    const DEFAULT_OPTIONS = {
        toolLength: 0.15,
        toolRadius: 0.0034,
        tipRadius: 0.0034,
        toolMass: 0.04,
        tipShape: 'ImplicitCylinder',
        interactionBoxColor: 0x99eebb,
        leapColor: 0x777777,
        toolColor: 0xeebb99,
        tipColor: 0x99bbee,
        handColor: 0x113399,
        useShadowMesh: true,
        shadowMaterial: new THREE.MeshBasicMaterial({color: 0x333333}),
        shadowLightPosition: new THREE.Vector4(0, 7, 0, 0.1),
        shadowPlane: 0.002,
        numSegments: 10,
        interactionPlaneOpacity: 0.22,
        timeA: 0.25,
        timeB: 0.25 + 1.5,
        minConfidence: 0.13,
        host: '127.0.0.1',
        port: 6437
    };

    function makeTool(options) {
        options = Utils.combineObjects(DEFAULT_OPTIONS, options || {});
        console.log('Leap Motion tool options:');
        console.log(options);

        // coordinate transformations are performed via three.js scene graph
        var toolRoot = new THREE.Object3D();
        toolRoot.scale.set(LEAP2METERS, LEAP2METERS, LEAP2METERS);

        toolRoot.position.set(0, -18 * 0.0254, -0.49);

        // set up / connect to leap controller:

        var leapController = new Leap.Controller({background: true,
                                                  host: options.host,
                                                  port: options.port});

        // leap motion event callbacks:
        var onConnect = options.onConnect || function () {
            console.log('Leap Motion WebSocket connected (host: %s, port: %d)', options.host, options.port);
        };
        leapController.on('connect', onConnect);

        var onDisconnect = options.onDisconnect || function () {
            console.log('Leap Motion WebSocket disconnected (host: %s, port: %d)', options.host, options.port);
        };
        leapController.on('disconnect', onDisconnect);

        var onStreamingStarted = options.onStreamingStarted || function () {
            console.log('Leap Motion streaming started (host: %s, port: %d)', options.host, options.port);
        };
        leapController.on('streamingStarted', onStreamingStarted);

        var onStreamingStopped = options.onStreamingStopped || function () {
            console.warn('Leap Motion streaming stopped (host: %s, port: %d)', options.host, options.port);
        };
        leapController.on('streamingStopped', onStreamingStopped);

        // setup tool visuals:

        // interaction box visual guide:
        var interactionBoxRoot = new THREE.Object3D();
        toolRoot.add(interactionBoxRoot);

        var interactionPlaneMaterial = new THREE.MeshBasicMaterial({color: options.interactionBoxColor, transparent: true, opacity: options.interactionPlaneOpacity});
        var interactionPlaneGeom = new THREE.PlaneBufferGeometry(METERS2LEAP, METERS2LEAP);

        var interactionPlaneMesh = new THREE.Mesh(interactionPlaneGeom, interactionPlaneMaterial);
        interactionBoxRoot.add(interactionPlaneMesh);

        interactionPlaneMesh = interactionPlaneMesh.clone();
        interactionPlaneMesh.position.z = METERS2LEAP * 0.5;
        interactionPlaneMesh.updateMatrix();
        interactionBoxRoot.add(interactionPlaneMesh);

        interactionPlaneMesh = interactionPlaneMesh.clone();
        interactionPlaneMesh.position.z = METERS2LEAP * (-0.5);
        interactionPlaneMesh.updateMatrix();
        interactionBoxRoot.add(interactionPlaneMesh);

        // leap motion controller:
        var boxGeom = new THREE.BoxGeometry(METERS2LEAP*INCH2METERS*(3+1/8), METERS2LEAP*INCH2METERS*7/16, METERS2LEAP*INCH2METERS*(1 + 3/16));
        var leapGeom = new THREE.BufferGeometry();
        leapGeom.fromGeometry(boxGeom);
        boxGeom.dispose();
        var leapMaterial = new THREE.MeshLambertMaterial({color: options.leapColor});
        var leapMesh = new THREE.Mesh(leapGeom, leapMaterial);
        leapMesh.position.y = METERS2LEAP*INCH2METERS*(7/32);
        leapMesh.updateMatrix();
        toolRoot.add(leapMesh);

        // the stick:
        var toolGeom = new THREE.CylinderGeometry(METERS2LEAP*options.toolRadius, METERS2LEAP*options.toolRadius, METERS2LEAP*options.toolLength, 10, 1, false);
        toolGeom.translate(0, -0.5*METERS2LEAP*options.toolLength, 0);
        toolGeom.rotateX(-0.5 * Math.PI);
        var bufferGeom = new THREE.BufferGeometry();
        bufferGeom.fromGeometry(toolGeom);
        toolGeom.dispose();
        toolGeom = bufferGeom;
        var toolMaterial = new THREE.MeshLambertMaterial({color: options.toolColor, transparent: true});
        var toolMesh = new THREE.Mesh(toolGeom, toolMaterial);
        toolRoot.add(toolMesh);

        var toolShadowMesh;
        if (options.useShadowMesh) {
            toolShadowMesh = new THREE.ShadowMesh(toolMesh, options.shadowMaterial);
            var shadowPlane = new THREE.Plane(UP, options.shadowPlane);
            toolShadowMesh.updateShadowMatrix(shadowPlane, options.shadowLightPosition);
        } else {
            toolMesh.castShadow = true;
        }

        var toolBody = new CANNON.Body({mass: options.toolMass, type: CANNON.Body.KINEMATIC});

        var tipMesh = null;
        if (options.tipShape === 'Sphere') {
            var tipGeom = new THREE.SphereBufferGeometry(METERS2LEAP*options.tipRadius, 10);
            toolBody.addShape(new CANNON.Sphere(options.tipRadius));
            var tipMaterial = new THREE.MeshLambertMaterial({color: options.tipColor, transparent: true});
            tipMesh = new THREE.Mesh(tipGeom, tipMaterial);
            tipMesh.castShadow = true;
            toolMesh.add(tipMesh);
        } else {
            // cannon body is a cylinder at end of tool
            var cylLength = options.toolLength;
            var shapePosition = new CANNON.Vec3(0, 0, 0.5*cylLength);
            if (options.tipShape === 'ImplicitCylinder') {
                toolBody.addShape(new CANNON.ImplicitCylinder(options.tipRadius, cylLength), shapePosition, (new CANNON.Quaternion()).setFromAxisAngle(CANNON.Vec3.UNIT_X, 0.5*Math.PI));
            } else {
                toolBody.addShape(new CANNON.Cylinder(options.tipRadius, options.tipRadius, cylLength, options.numSegments), shapePosition);
            }
        }

        // to store decomposed toolRoot world matrix, used to convert three.js local coords to cannon.js world coords:
        var worldPosition = new THREE.Vector3();
        var worldQuaternion = new THREE.Quaternion();
        var worldScale = new THREE.Vector3();
        // inverse of toolRoot.matrixWorld, used for converting cannon.js world coords to three.js local coords:
        var matrixWorldInverse = new THREE.Matrix4();

        function updateToolMapping() {
            toolRoot.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
            matrixWorldInverse.getInverse(toolRoot.matrixWorld);
        }

        function updateToolPostStep() {
            toolMesh.position.copy(toolBody.interpolatedPosition);
            toolMesh.position.applyMatrix4(matrixWorldInverse);
            toolMesh.updateMatrix();
            if (toolShadowMesh) {
                toolShadowMesh.updateMatrix();
            }
        }

        var direction = new THREE.Vector3();
        var position = new THREE.Vector3();
        var velocity = new THREE.Vector3();
        var quaternion = new THREE.Quaternion();

        var deadtime = 0;

        var lastFrameID;

        function setDeadtime(t) {
            deadtime = t;
            if (deadtime === 0) {
                interactionBoxRoot.visible = true;
                interactionPlaneMaterial.opacity = options.interactionPlaneOpacity;
            }
        }

        function updateTool(dt) {

            deadtime += dt;

            var frame = leapController.frame();
            if (frame.valid && frame.id !== lastFrameID) {

                lastFrameID = frame.id;

                var interactionBox = frame.interactionBox;
                if (interactionBox.valid) {
                    interactionBoxRoot.position.fromArray(interactionBox.center);
                    interactionBoxRoot.scale.set(interactionBox.width*LEAP2METERS, interactionBox.height*LEAP2METERS, interactionBox.depth*LEAP2METERS);
                    interactionBoxRoot.updateMatrix();
                    interactionBoxRoot.updateMatrixWorld();
                }

                if (frame.tools.length === 1) {

                    deadtime = 0;

                    var tool = frame.tools[0];

                    if (toolMesh.visible === false || toolMesh.material.opacity < 1) {
                        toolMesh.visible = true;

                        if (toolShadowMesh) toolShadowMesh.visible = true;

                        toolMesh.material.opacity = 1;
                        if (tipMesh) tipMesh.material.opacity = 1;
                        interactionBoxRoot.visible = true;
                        interactionPlaneMaterial.opacity = options.interactionPlaneOpacity;
                    }

                    position.fromArray(tool.tipPosition);
                    //position.fromArray(tool.stabilizedTipPosition);
                    direction.fromArray(tool.direction);

                    toolMesh.position.copy(position);
                    position.applyMatrix4(toolRoot.matrixWorld);
                    toolBody.position.copy(position);

                    toolMesh.quaternion.setFromUnitVectors(FORWARD, direction);

                    quaternion.multiplyQuaternions(worldQuaternion, toolMesh.quaternion);
                    toolBody.quaternion.copy(quaternion);

                    toolMesh.updateMatrix();
                    toolMesh.updateMatrixWorld();

                    if (toolShadowMesh) {
                        toolShadowMesh.updateMatrix();
                        toolShadowMesh.updateMatrixWorld();
                    }

                    velocity.fromArray(tool.tipVelocity);
                    velocity.applyQuaternion(worldQuaternion);
                    velocity.multiplyScalar(LEAP2METERS);
                    toolBody.velocity.copy(velocity);

                    if (tool.timeVisible > options.timeA) {
                        // stick becomes collidable once it has been detected for some time
                        if (toolBody.sleepState === CANNON.Body.SLEEPING) {
                            toolBody.wakeUp();
                            // TODO: indicator (particle effect)
                            if (tipMesh) tipMesh.material.color.setHex(0xff0000);
                        }

                        if (tool.timeVisible > options.timeB && interactionPlaneMaterial.opacity > 0.1) {
                            // dim the interaction box:
                            interactionPlaneMaterial.opacity *= 0.94;
                        }

                    }

                } else if (toolBody.sleepState === CANNON.Body.AWAKE) {
                    // tool detection was just lost
                    toolBody.sleep();
                    if (tipMesh) tipMesh.material.color.setHex(options.tipColor);

                } else {
                    // tool is already lost
                    if (toolMesh.visible && toolMesh.material.opacity > 0.1) {
                        // fade out tool
                        toolMesh.material.opacity *= 0.8;
                        if (tipMesh) tipMesh.material.opacity = toolMesh.material.opacity;
                    } else {
                        toolMesh.visible = false;
                        if (toolShadowMesh) toolShadowMesh.visible = false;
                    }
                }

                updateHands(frame);

            }

            if ( deadtime > 1.5 && interactionBoxRoot.visible ) {
                interactionPlaneMaterial.opacity *= 0.93;
                if (interactionPlaneMaterial.opacity < 0.02) interactionBoxRoot.visible = false;
            }

        }

        // setup hands:

        // hands don't necessarily correspond the left / right labels, but doesn't matter in this case because they look indistinguishable
        var leftRoot = new THREE.Object3D(),
            rightRoot = new THREE.Object3D();
        var handRoots = [leftRoot, rightRoot];
        toolRoot.add(leftRoot);
        toolRoot.add(rightRoot);

        var handMaterial = new THREE.MeshBasicMaterial({color: options.handColor, transparent: true, opacity: 0});

        // arms:
        var armRadius = METERS2LEAP*0.021,
            armLength = METERS2LEAP*0.22;
        var armGeom = new THREE.CylinderGeometry(armRadius, armRadius, armLength);
        bufferGeom = new THREE.BufferGeometry();
        bufferGeom.fromGeometry(armGeom);
        armGeom.dispose();
        armGeom = bufferGeom;
        var armMesh = new THREE.Mesh(armGeom, handMaterial);
        var arms = [armMesh, armMesh.clone()];
        leftRoot.add(arms[0]);
        rightRoot.add(arms[1]);
        // palms:
        var radius = METERS2LEAP*0.02;
        var palmGeom = new THREE.SphereBufferGeometry(radius).scale(1, 0.4, 1);
        var palmMesh = new THREE.Mesh(palmGeom, handMaterial);
        var palms = [palmMesh, palmMesh.clone()];
        leftRoot.add(palms[0]);
        rightRoot.add(palms[1]);

        // var textureLoader = new THREE.TextureLoader();
        // var spriteTexture = textureLoader.load('/node_modules/three/examples/textures/sprite1.png'); , function (texture) {
        // } );
        // var spriteMaterial = new THREE.SpriteMaterial({map: spriteTexture});
        // var sphereSprite = new THREE.Sprite(spriteMaterial);

        // fingertips:
        radius = METERS2LEAP*0.005;
        var fingerTipGeom = new THREE.SphereBufferGeometry(radius);
        var fingerTipMesh = new THREE.Mesh(fingerTipGeom, handMaterial);
        // var fingerTipMesh = sphereSprite.clone();
        // fingerTipMesh.scale.set(radius, radius, radius);
        var fingerTips = [[fingerTipMesh, fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone()],
                          [fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone()]];
        leftRoot.add(fingerTips[0][0], fingerTips[0][1], fingerTips[0][2], fingerTips[0][3], fingerTips[0][4]);
        rightRoot.add(fingerTips[1][0], fingerTips[1][1], fingerTips[1][2], fingerTips[1][3], fingerTips[1][4]);
        // finger joints:
        var jointMesh = fingerTipMesh.clone();
        jointMesh.scale.set(7/5, 7/5, 7/5);
        var joints = [[jointMesh, jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone()],
                      [jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone()]];
        leftRoot.add(joints[0][0], joints[0][1], joints[0][2], joints[0][3], joints[0][4]);
        rightRoot.add(joints[1][0], joints[1][1], joints[1][2], joints[1][3], joints[1][4]);
        var joint2Mesh = fingerTipMesh.clone();
        joint2Mesh.scale.set(55/50, 55/50, 55/50);
        var joint2s = [[joint2Mesh, joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone()],
                       [joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone()]];
        leftRoot.add(joint2s[0][0], joint2s[0][1], joint2s[0][2], joint2s[0][3], joint2s[0][4]);
        rightRoot.add(joint2s[1][0], joint2s[1][1], joint2s[1][2], joint2s[1][3], joint2s[1][4]);
        var joint3Mesh = fingerTipMesh.clone();
        joint3Mesh.scale.set(7/5, 7/5, 7/5);
        var joint3s = [[joint3Mesh, joint3Mesh.clone(), joint3Mesh.clone(), joint3Mesh.clone()],
                       [joint3Mesh.clone(), joint3Mesh.clone(), joint3Mesh.clone(), joint3Mesh.clone()]];
        leftRoot.add(joint3s[0][0], joint3s[0][1], joint3s[0][2], joint3s[0][3]);
        rightRoot.add(joint3s[1][0], joint3s[1][1], joint3s[1][2], joint3s[1][3]);

        function updateHands(frame) {
            leftRoot.visible = rightRoot.visible = false;
            for (var i = 0; i < frame.hands.length; i++) {
                var hand = frame.hands[i];
                if (hand.confidence > options.minConfidence) {

                    handRoots[i].visible = true;
                    handMaterial.opacity = 0.5*handMaterial.opacity + 0.5*(hand.confidence - options.minConfidence) / (1 - options.minConfidence);

                    var arm = arms[i];
                    direction.fromArray(hand.arm.basis[2]);
                    arm.quaternion.setFromUnitVectors(UP, direction);
                    arm.position.fromArray(hand.arm.center());
                    arm.updateMatrix();

                    var palm = palms[i];
                    direction.fromArray(hand.palmNormal);
                    palm.quaternion.setFromUnitVectors(UP, direction);
                    palm.position.fromArray(hand.palmPosition);
                    palm.updateMatrix();

                    var handFingerTips = fingerTips[i];
                    var handJoints = joints[i];
                    var handJoint2s = joint2s[i];
                    var handJoint3s = joint3s[i];
                    for (var j = 0; j < hand.fingers.length; j++) {
                        var finger = hand.fingers[j];
                        handFingerTips[j].position.fromArray(finger.tipPosition);
                        handFingerTips[j].updateMatrix();
                        handJoints[j].position.fromArray(finger.bones[1].nextJoint);
                        handJoints[j].updateMatrix();
                        handJoint2s[j].position.fromArray(finger.bones[2].nextJoint);
                        handJoint2s[j].updateMatrix();
                    }
                    for (j = 0; j < 4; j++) {
                        finger = hand.fingers[j+1];
                        handJoint3s[j].position.fromArray(finger.bones[1].prevJoint);
                        handJoint3s[j].updateMatrix();
                    }
                }
            }
        }

        // initialize matrices:
        toolRoot.traverse( function (node) {
            node.matrixAutoUpdate = false;
            node.updateMatrix();
        } );

        interactionBoxRoot.visible = false;
        toolMesh.visible = false;
        if (toolShadowMesh) toolShadowMesh.visible = false;
        leftRoot.visible  = false;
        rightRoot.visible = false;

        return {
            leapController:     leapController,
            toolRoot:           toolRoot,
            toolMesh:           toolMesh,
            toolBody:           toolBody,
            updateTool:         updateTool,
            updateToolPostStep: updateToolPostStep,
            updateToolMapping:  updateToolMapping,
            setDeadtime:        setDeadtime,
            toolShadowMesh: toolShadowMesh,
            worldQuaternion: worldQuaternion,
            worldPosition: worldPosition
        };
    }

    return {
        makeTool: makeTool
    };

} )();

},{"./Utils.js":8}],6:[function(require,module,exports){
module.exports = ( function() {
    "use strict";
    function SynthSpeaker(options) {
        options = options || {};
        this.volume = options.volume || 1;
        this.rate   = options.rate || 1;
        this.pitch  = options.pitch || 1;

        this.queue = [];
        this.onBegins = [];
        this.onEnds = [];
        this.speaking = false;

        var onend = function () {
            var onEnd = this.onEnds.shift();
            if (onEnd) {
                onEnd();
            }
            this.utterance = new SpeechSynthesisUtterance();
            this.utterance.volume = this.volume;
            this.utterance.rate = this.rate;
            this.utterance.pitch = this.pitch;
            this.utterance.onend = onend;
            if (this.queue.length > 0) {
                this.utterance.text = this.queue.shift();
                var onBegin = this.onBegins.shift();
                if (onBegin) {
                    onBegin();
                }
                speechSynthesis.speak(this.utterance);
            } else {
                this.speaking = false;
            }
        }.bind(this);

        this.utterance = new SpeechSynthesisUtterance();
        this.utterance.onend = onend;
        this.utterance.volume = this.volume;
        this.utterance.rate = this.rate;
        this.utterance.pitch = this.pitch;

    }

    SynthSpeaker.prototype.speak = function(text, onBegin, onEnd) {
        this.onEnds.push(onEnd);
        if (this.speaking) {
            this.queue.push(text);
            this.onBegins.push(onBegin);
        } else {
            if (onBegin) {
                onBegin();
            }
            this.utterance.text = text;
            this.speaking = true;
            speechSynthesis.speak(this.utterance);
        }
    };

    if (window.speechSynthesis) {
        return SynthSpeaker;
    } else {
        console.warn("speechSynthesis not supported");
        return function () {
            this.volume = 0;
            this.rate = 1;
            this.pitch = 1;
            this.speak = function (text, onBegin, onEnd) {
                if (onBegin) onBegin();
                if (onEnd) onEnd();
            };
        };
    }
} )();

},{}],7:[function(require,module,exports){
/* global THREE */
module.exports = ( function () {
    "use strict";
    var alphas  = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var digits  = "0123456789";
    var symbols = ",./;'[]\\-=<>?:\"{}|_+~!@#$%^&*()";
    var chars   = alphas + digits + symbols;

    function TextGeomCacher(font, options) {
        options = options || {};
        var textGeomParams = {
            font:          font,
            size:          options.size || 0.12,
            height:        options.height || 0,
            curveSegments: options.curveSegments || 2
        };

        this.geometries = {};
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i];
            var geom = new THREE.TextGeometry(c, textGeomParams);
            var bufferGeom = new THREE.BufferGeometry();
            bufferGeom.fromGeometry(geom);
            geom.dispose();
            this.geometries[c] = bufferGeom;
        }

        this.makeObject = function (text, material) {
            var object = new THREE.Object3D();
            object.matrixAutoUpdate = false;
            for (var j = 0; j < text.length; j++) {
                var c = text[j];
                if (c !== ' ') {
                    var mesh = new THREE.Mesh(this.geometries[c], material);
                    mesh.matrixAutoUpdate = false;
                    mesh.position.x = 0.8*textGeomParams.size * j;
                    mesh.updateMatrix();
                    object.add(mesh);
                }
            }
            return object;
        }.bind(this);
    }

    function TextGeomLogger(textGeomCacher, options) {
        options = options || {};
        var material   = options.material || new THREE.MeshBasicMaterial({color: 0xff2201});
        var nrows      = options.nrows || 20;
        //var ncols      = options.ncols || 30;
        var lineHeight = options.lineHeight || 1.8 * 0.12;

        var lineObjects = {};

        this.root = new THREE.Object3D();
        this.root.matrixAutoUpdate = false;

        this.log = function (msg) {
            var lines = msg.split(/\n/);
            var y = 0;
            var lastLineObject = this.root.children[this.root.children.length - 1];
            if (lastLineObject) y = lastLineObject.position.y;
            // create / clone lines:
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var lineObject = lineObjects[line];
                if (lineObject) {
                    lineObject = lineObject.clone();
                    this.root.add(lineObject);
                } else {
                    lineObject = textGeomCacher.makeObject(line, material);
                    lineObjects[line] = lineObject;
                    this.root.add(lineObject);
                }
                lineObject.position.y = y - (i + 1) * lineHeight;
                lineObject.updateMatrix();
            }
            this.root.updateMatrixWorld(true);
        }.bind(this);

        this.update = function (dt) {
            var numChildren = this.root.children.length;
            if (numChildren === 0) return;
            var lastLineObject = this.root.children[numChildren-1];
            if (lastLineObject.position.y < 0) {
                for (var i = 0; i < numChildren; i++) {
                    this.root.children[i].position.y += 2 * lineHeight * dt;
                    this.root.children[i].updateMatrix();
                }
            }
            // remove rows exceeding max display
            if (lastLineObject.position.y >= 0) {
                for (i = numChildren - 1; i >= nrows; i--) {
                    this.root.remove(this.root.children[0]);
                }
            }
        }.bind(this);

        this.clear = function () {
            for (var i = this.root.children.length - 1; i >= 0; i--) {
                this.root.remove(this.root.children[this.root.children.length - 1]);
            }
        }.bind(this);
    }

    return {
        TextGeomCacher: TextGeomCacher,
        TextGeomLogger: TextGeomLogger
    };

} )();

},{}],8:[function(require,module,exports){
/* global THREE */
module.exports = ( function () {
    "use strict";

    var combineObjects = function (a, b) {
        var c = {}, k;
        for (k in a) {
            c[k] = a[k];
        }
        for (k in b) {
            c[k] = b[k];
        }
        return c;
    };

    var moveObject = ( function () {
        const MOVESPEED = 0.3;
        var euler = new THREE.Euler(0, 0, 0, 'YXZ');
        return function (object, dt, moveFB, moveRL, moveUD, turnRL, turnUD) {
            if (moveFB || moveRL || moveUD || turnRL || turnUD) {
                euler.setFromQuaternion(object.quaternion);
                euler.y -= (turnRL) * dt;
                euler.x -= (turnUD) * dt;
                object.quaternion.setFromEuler(euler);
                var cos = Math.cos(euler.y),
                    sin = Math.sin(euler.y);
                object.position.z -= dt * MOVESPEED * ((moveFB) * cos + (moveRL) * sin);
                object.position.x += dt * MOVESPEED * ((moveRL) * cos - (moveFB) * sin);
                object.position.y += dt * MOVESPEED * moveUD;
                object.updateMatrix();
                object.updateMatrixWorld();
            }
        };
    } )();

    function ObjectSelector() {
        this.selection;
        var selectables = [];

        this.addSelectable = function (obj) {
            selectables.push(obj);
            if (!this.selection) this.selection = obj;
        }.bind(this);

        this.cycleSelection = ( function () {
            var i = 0;
            return function (inc) {
                i = (i + inc) % selectables.length;
                if (i < 0) i += selectables.length;
                this.selection = selectables[i];
            };
        } )().bind(this);
    }

    var TextLabel = ( function () {
        var DEADSCENE = new THREE.Scene();
        DEADSCENE.name = 'DEADSCENE';
        const DEFAULT_OPTIONS = {
            object: DEADSCENE,
            position: [0, 0.05, -0.05],
            quaternion: [0, 0, 0, 1],
            coordSystem: 'local',
            textSize: 21
        };
        return function (options) {
            options = combineObjects(DEFAULT_OPTIONS, options || {});
            var canvas = document.createElement('canvas');
            canvas.height = 2 * options.textSize;
            canvas.width = 256; //2*ctx.measureText(text).width;
            var ctx = canvas.getContext('2d');
            ctx.font = String(options.textSize) + "px serif";
            ctx.fillStyle   = 'rgb(255, 72, 23)';
            ctx.strokeStyle = 'rgb(240, 70, 20)';
            var texture = new THREE.Texture(canvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);
            var aspect = canvas.width / canvas.height;
            var material = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture, transparent: true});
            var quadGeom = new THREE.PlaneBufferGeometry(1, 1);
            quadGeom.translate(0.5, 0.5, 0);
            var mesh = new THREE.Mesh(quadGeom, material);
            if (options.coordSystem === 'local') {
                options.object.add(mesh);
                mesh.position.fromArray(options.position);
                mesh.quaternion.fromArray(options.quaternion);
                var worldScale = options.object.getWorldScale();
                mesh.scale.set(aspect * 0.075 / worldScale.x, 0.075 / worldScale.y, 1 / worldScale.z);
                mesh.updateMatrix();
            }
            this.mesh = mesh;
            this.setText = function (text) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillText(  text, 0, options.textSize);
                ctx.strokeText(text, 0, options.textSize);
                material.map.needsUpdate = true;
            };
        };
    } )();

    var URL_PARAMS = ( function () {
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

    var makeObjectArray = function (obj, keyKey) {
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
    var isMobile = function () {
        var a = navigator.userAgent || navigator.vendor || window.opera;
        return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)));
    };

    return {
        ObjectSelector: ObjectSelector,
        moveObject: moveObject,
        TextLabel: TextLabel,
        URL_PARAMS: URL_PARAMS,
        combineObjects: combineObjects,
        makeObjectArray: makeObjectArray,
        isMobile: isMobile
    };

} )();

},{}],9:[function(require,module,exports){
/* global POOLVR, THREE, Utils */
POOLVR.parseURIConfig = function () {
    "use strict";
    POOLVR.config = POOLVR.config || {};
    if (POOLVR.config.useBasicMaterials) {
        POOLVR.config.useSpotLight = false;
        POOLVR.config.usePointLight = false;
        POOLVR.config.useShadowMap  = false;
    } else {
        POOLVR.config.useSpotLight  = Utils.URL_PARAMS.useSpotLight  !== undefined ? Utils.URL_PARAMS.useSpotLight  : (POOLVR.config.useSpotLight || true);
        POOLVR.config.usePointLight = Utils.URL_PARAMS.usePointLight !== undefined ? Utils.URL_PARAMS.usePointLight : POOLVR.config.usePointLight;
        POOLVR.config.useShadowMap  = Utils.URL_PARAMS.useShadowMap  !== undefined ? Utils.URL_PARAMS.useShadowMap  : POOLVR.config.useShadowMap;
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
        velocity.set(0, 0, -3.9);
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
            Utils.moveObject(stage, dt, moveFB, moveRL, moveUD, turnRL, 0);
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
            Utils.moveObject(POOLVR.leapTool.toolRoot, dt, moveFB, moveRL, moveUD, turnRL, 0);
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

},{}],10:[function(require,module,exports){
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

    moveToolUp:        {buttons: [79]},
    moveToolDown:      {buttons: [190]},
    moveToolForward:   {buttons: [73]},
    moveToolBackward:  {buttons: [75]},
    moveToolLeft:      {buttons: [74]},
    moveToolRight:     {buttons: [76]},
    rotateToolCW:      {buttons: [85]},
    rotateToolCCW:     {buttons: [89]},

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
    moveToolFB:  {axes: [Gamepads.AXES.RSY]},
    turnToolLR: {axes: [Gamepads.AXES.RSX]},
    toggleToolFloatMode: {buttons: [Gamepads.BUTTONS.rightStick]},
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
    moveToolFB:  {axes: [Gamepads.AXES.LSY], flipAxes: true},
    turnToolLR: {axes: [Gamepads.AXES.LSX]},
    toggleToolFloatMode: {buttons: [0]},
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

},{"./Gamepads.js":3,"./Keyboard.js":4}],11:[function(require,module,exports){
window.POOLVR = window.POOLVR || {};

/* global App, Gamepads, LeapMotion, SynthSpeaker, TextGeomUtils, Utils */
window.App = require('./App.js');
window.Gamepads = require('./Gamepads.js');
window.LeapMotion = require('./LeapMotion.js');
window.SynthSpeaker = require('./SynthSpeaker.js');
window.TextGeomUtils = require('./TextGeomUtils.js');
window.Utils = require('./Utils.js');

require('./sounds.js');
require('./actions.js');
require('./config.js');
require('./menu.js');

/* global POOLVR, THREE, CANNON, THREEPY_SCENE */
window.onLoad = function () {
    "use strict";
    const INCH2METERS = 0.0254;

    if (Utils.URL_PARAMS.clearLocalStorage) {
        console.log('clearing localStorage...');
        localStorage.clear();
    }

    THREE.Object3D.DefaultMatrixAutoUpdate = false;

    var loadedConfig = POOLVR.loadConfig(POOLVR.profile);
    POOLVR.config = loadedConfig || POOLVR.config;
    POOLVR.parseURIConfig();

    console.log("POOLVR.config:");
    console.log(POOLVR.config);

    POOLVR.synthSpeaker = new SynthSpeaker({volume: POOLVR.config.synthSpeakerVolume || 0.6, rate: POOLVR.config.synthSpeakerRate || 0.75, pitch: POOLVR.config.synthSpeakerPitch || 0.5});

    // TODO: return menu items
    POOLVR.setupMenu();

    var rendererOptions = {
        canvas: document.getElementById('webgl-canvas'),
        antialias: (Utils.URL_PARAMS.antialias !== undefined ? Utils.URL_PARAMS.antialias : POOLVR.config.antialias) || !Utils.isMobile(),
        alpha: false
    };

    var appConfig = {
        onResetVRSensor: function () {
            POOLVR.leapTool.updateToolMapping();
        }
    };

    POOLVR.app = new App(undefined, appConfig, rendererOptions);

    POOLVR.app.stage.add(POOLVR.app.camera);

    if (POOLVR.config.useShadowMap) {
        POOLVR.app.renderer.shadowMap.enabled = true;
        POOLVR.app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    if (!loadedConfig) {
        POOLVR.synthSpeaker.speak("Hello. Welcome. To. Pool-ver.");
    }

    var leapIndicator = document.getElementById('leapIndicator');
    POOLVR.leapTool = LeapMotion.makeTool( Utils.combineObjects(POOLVR.config.toolOptions, {
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
        }
    }) );
    POOLVR.leapTool.toolBody.material = POOLVR.tipMaterial;
    POOLVR.leapTool.toolMesh.renderOrder = -1;
    POOLVR.leapTool.toolRoot.visible = false;
    POOLVR.leapTool.leapController.connect();

    window.addEventListener("beforeunload", function () {
        POOLVR.leapTool.leapController.disconnect();
    }, false);

    POOLVR.openVRTool = Gamepads.makeTool(Utils.combineObjects(POOLVR.config.toolOptions, {
        tipMaterial: POOLVR.openVRTipMaterial
    }));
    POOLVR.openVRTool.mesh.visible = false;
    if (POOLVR.openVRTool.shadowMesh) POOLVR.openVRTool.shadowMesh.visible = false;
    POOLVR.app.stage.add(POOLVR.openVRTool.mesh);
    var gamepadA;
    Gamepads.setOnGamepadConnected(onGamepadConnected);
    function onGamepadConnected(e) {
        var gamepad = e.gamepad;
        if (!gamepad) return;
        if (/openvr/i.test(gamepad.id)) {
            if (gamepadA) {
                console.log('OpenVR controller B connected');
                Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadBCommands);
            } else {
                console.log('OpenVR controller A connected');
                gamepadA = gamepad;
                Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadACommands);
                POOLVR.openVRTool.mesh.visible = true;
                if (POOLVR.openVRTool.shadowMesh) POOLVR.openVRTool.shadowMesh.visible = true;
                POOLVR.openVRTool.setGamepad(gamepad);
                POOLVR.world.addBody(POOLVR.openVRTool.body);
            }
        } else if (/xbox/i.test(gamepad.id) || /xinput/i.test(gamepad.id)) {
            Gamepads.setGamepadCommands(gamepad.index, POOLVR.xboxGamepadCommands);
        } else if (/3232/i.test(gamepad.id) || /b629/i.test(gamepad.id)) {
            Gamepads.setGamepadCommands(gamepad.index, POOLVR.destekGamepadCommands);
        }
    }
    Gamepads.setOnGamepadDisconnected( function (evt) {
        if (gamepadA && gamepadA.index === evt.gamepad.index) {
            POOLVR.openVRTool.mesh.visible = false;
            if (POOLVR.openVRTool.shadowMesh) POOLVR.openVRTool.shadowMesh.visible = false;
        }
    } );

    THREE.py.parse(THREEPY_SCENE).then( function (scene) {

        // add balls:
        var ballColors = [0xddddde,  // white
                          0xeeee00,  // yellow
                          0x0000ee,  // blue
                          0xee0000,  // red
                          0xee00ee,  // purple
                          0xee7700,  // orange
                          0x00ee00,  // green
                          0xbb2244,  // maroon
                          0x111111]; // black
        var ballMaterials = ballColors.map( function (color) { return new THREE.MeshPhongMaterial({color: color}); } );
        function linspace(a, b, n) {
            var r = [];
            for (var i = 0; i < n; i++) {
                r.push(i * (b - a) / (n - 1) + a);
            }
            return r;
        }
        var ballDiameter = POOLVR.config.ball_diameter;
        var ballRadius = ballDiameter / 2;
        var d = 0.04 * ballRadius;
        var rackSideLength = 4 * (ballDiameter + d);
        var xPositions = [0];
        Array.prototype.push.apply(xPositions, linspace(0,                         0.5 * rackSideLength,                          5));
        Array.prototype.push.apply(xPositions, linspace(-0.5 * (ballDiameter + d), 0.5 * rackSideLength - 1 * (ballDiameter + d), 4));
        Array.prototype.push.apply(xPositions, linspace(-1.0 * (ballDiameter + d), 0.5 * rackSideLength - 2 * (ballDiameter + d), 3));
        Array.prototype.push.apply(xPositions, linspace(-1.5 * (ballDiameter + d), 0.5 * rackSideLength - 3 * (ballDiameter + d), 2));
        xPositions.push(-2 * (ballDiameter + d));
        var zPositions = [0];
        Array.prototype.push.apply(zPositions, linspace(0,                                       0.5 * Math.sqrt(3) * rackSideLength, 5));
        Array.prototype.push.apply(zPositions, linspace(0.5 * Math.sqrt(3) * (ballDiameter + d), 0.5 * Math.sqrt(3) * rackSideLength, 4));
        Array.prototype.push.apply(zPositions, linspace(1.0 * Math.sqrt(3) * (ballDiameter + d), 0.5 * Math.sqrt(3) * rackSideLength, 3));
        Array.prototype.push.apply(zPositions, linspace(1.5 * Math.sqrt(3) * (ballDiameter + d), 0.5 * Math.sqrt(3) * rackSideLength, 2));
        zPositions.push(0.5 * Math.sqrt(3) * rackSideLength);
        zPositions = zPositions.map( function (z) { return -z - POOLVR.config.L_table / 8; } );
        zPositions[0] = POOLVR.config.L_table / 4;
        var ballGeom = new THREE.SphereBufferGeometry(ballRadius, 16, 12);
        var stripeGeom = new THREE.SphereBufferGeometry(1.012 * ballRadius, 16, 8, 0, 2*Math.PI, Math.PI / 3, Math.PI / 3);
        ballMaterials.forEach( function (material, i) {
            var ballMesh = new THREE.Mesh(ballGeom, material);
            ballMesh.castShadow = true;
            ballMesh.name = 'ballMesh ' + i;
            ballMesh.position.set(xPositions[i], POOLVR.config.H_table + ballRadius + 0.0001, zPositions[i]);
            ballMesh.updateMatrix();
            ballMesh.updateMatrixWorld();
            ballMesh.userData = {cannonData: {mass: 0.17, shapes: ['Sphere'], linearDamping: 0.27, angularDamping: 0.34}};
            scene.add(ballMesh);
        } );
        ballMaterials.slice(1, -1).forEach( function (material, i) {
            i = i + ballMaterials.length;
            var ballMesh = new THREE.Mesh(ballGeom, ballMaterials[0]);
            ballMesh.castShadow = true;
            ballMesh.name = 'ballMesh ' + i;
            var stripeMesh = new THREE.Mesh(stripeGeom, material);
            stripeMesh.name = 'ballStripeMesh ' + i;
            ballMesh.add(stripeMesh);
            ballMesh.position.set(xPositions[i], POOLVR.config.H_table + ballRadius + 0.0001, zPositions[i]);
            ballMesh.updateMatrix();
            ballMesh.updateMatrixWorld();
            ballMesh.userData = {cannonData: {mass: 0.17, shapes: ['Sphere'], linearDamping: 0.27, angularDamping: 0.34}};
            scene.add(ballMesh);
        } );

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

            var floorBody, ceilingBody, floorMesh;
            var cushionMeshes = [];
            var railMeshes = [];
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
                        cushionMeshes.push(node);
                    }
                    else if (node.name === 'floorMesh') {
                        floorBody = node.body;
                        floorBody.material = POOLVR.floorMaterial;
                        floorMesh = node;
                    }
                    else if (node.name === 'ceilingMesh') {
                        ceilingBody = node.body;
                        ceilingBody.material = POOLVR.floorMaterial;
                    }
                    else if (node.name.endsWith('RailMesh')) {
                        node.body.material = POOLVR.railMaterial;
                        railMeshes.push(node);
                    }
                }
            });

            // for (var i = 1; i < cushionMeshes.length; i++) {
            //     cushionMeshes[0].geometry.merge(cushionMeshes[i].geometry);
            //     scene.remove(cushionMeshes[i]);
            // }
            // for (var i = 1; i < railMeshes.length; i++) {
            //     railMeshes[0].geometry.merge(railMeshes[i].geometry);
            //     scene.remove(railMeshes[i]);
            // }

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
                bodyA.velocity.vsub(bodyB.velocity, relVelocity);
                if (bodyA.material === bodyB.material) {
                    // ball-ball collision
                    POOLVR.playCollisionSound(relVelocity.lengthSquared());
                } else if (bodyA.material === POOLVR.openVRTipMaterial && bodyB.material === POOLVR.ballMaterial) {
                    if (POOLVR.openVRTool.body.sleepState === CANNON.Body.AWAKE) {
                        if (gamepadA && "haptics" in gamepadA && gamepadA.haptics.length > 0) {
                            gamepadA.haptics[0].vibrate(relVelocity.lengthSquared() / 5, 11);
                        } else if (gamepadA && "hapticActuators" in gamepadA && gamepadA.hapticActuators.length > 0) {
                            gamepadA.hapticActuators[0].pulse(relVelocity.lengthSquared() / 5, 11);
                        }
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

            if (POOLVR.config.useTextGeomLogger) {
                var fontLoader = new THREE.FontLoader();
                fontLoader.load('fonts/Anonymous Pro_Regular.js', function (font) {
                    var textGeomCacher = new TextGeomUtils.TextGeomCacher(font, {size: 0.12, curveSegments: 2});
                    var textGeomLoggerMaterial = new THREE.MeshBasicMaterial({color: 0xff3210});
                    POOLVR.textGeomLogger = new TextGeomUtils.TextGeomLogger(textGeomCacher,
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

            if (isVive) {
                var loader = new THREE.OBJLoader();
                loader.setPath( 'node_modules/three/examples/models/obj/vive-controller/' );
                loader.load( 'vr_controller_vive_1_5.obj', function ( object ) {
                    var loader = new THREE.TextureLoader();
                    loader.setPath('node_modules/three/examples/models/obj/vive-controller/');
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
                if (Utils.isMobile()) {
                    scene.remove(floorMesh);
                }
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

    /* global Stats */
    if (Utils.URL_PARAMS.stats) {
        var stats = new Stats();
        stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
        document.body.appendChild( stats.dom );
    } else {
        stats = {begin: function () {}, end: function () {}};
    }

    var keyboard = POOLVR.keyboard,
        render = POOLVR.app.render,
        world = POOLVR.world,
        stage = POOLVR.app.stage,
        moveToolRoot = POOLVR.moveToolRoot,
        moveStage = POOLVR.moveStage,
        leapTool = POOLVR.leapTool,
        openVRTool = POOLVR.openVRTool;

    var lt = window.performance.now();

    function animate(t) {

        stats.begin();

        t = window.performance.now();
        var dt = (t - lt) * 0.001;
        lt = t;

        if (POOLVR.textGeomLogger) POOLVR.textGeomLogger.update(dt);

        leapTool.updateTool(dt);

        var gamepadValues = Gamepads.update();
        openVRTool.update(dt);

        world.step(Math.min(1/60, dt), dt, 10);

        leapTool.updateToolPostStep();
        updateBallsPostStep();

        render();

        moveStage(keyboard, gamepadValues, dt);
        stage.updateMatrixWorld();
        moveToolRoot(keyboard, gamepadValues, dt);
        leapTool.updateToolMapping();

        stats.end();

        if (POOLVR.app.vrDisplay.isPresenting) {
            POOLVR.requestID = POOLVR.app.vrEffect.requestAnimationFrame(animate);
        } else {
            POOLVR.requestID = window.requestAnimationFrame(animate);
        }

    }

    function updateBallsPostStep() {
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

    POOLVR.animate = animate;
    POOLVR.requestID = window.requestAnimationFrame(animate);

};

},{"./App.js":1,"./Gamepads.js":3,"./LeapMotion.js":5,"./SynthSpeaker.js":6,"./TextGeomUtils.js":7,"./Utils.js":8,"./actions.js":9,"./config.js":10,"./menu.js":12,"./sounds.js":13}],12:[function(require,module,exports){
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
        if (!POOLVR.app.vrDisplay.isPresenting) {
            window.cancelAnimationFrame(POOLVR.requestID);
            POOLVR.app.vrEffect.requestPresent().then( function () {
                POOLVR.app.vrEffect.requestAnimationFrame(POOLVR.animate);
            } );
        } else {
            POOLVR.app.vrEffect.cancelAnimationFrame(POOLVR.requestID);
            POOLVR.app.vrEffect.exitPresent().then( function () {
                window.requestAnimationFrame(POOLVR.animate);
            } );
        }
        vrButton.blur();
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

},{}],13:[function(require,module,exports){
window.Audio = require('./Audio.js');

/* global POOLVR */
POOLVR.playCollisionSound = (function () {
    "use strict";
    var ballBallBuffer;
    var filename = (!/Edge/.test(navigator.userAgent)) ? 'sounds/ballBall.ogg' : 'sounds/ballBall.mp3';
    Audio.loadBuffer(filename, function (buffer) {
        ballBallBuffer = buffer;
    });
    var playCollisionSound = function (v) {
        Audio.playBuffer(ballBallBuffer, Math.min(1, v / 10));
    };
    return playCollisionSound;
})();

POOLVR.playPocketedSound = (function () {
    "use strict";
    var ballPocketedBuffer;
    var filename = (!/Edge/.test(navigator.userAgent)) ? 'sounds/ballPocketed.ogg' : 'sounds/ballPocketed.mp3';
    Audio.loadBuffer(filename, function (buffer) {
        ballPocketedBuffer = buffer;
    });
    var playPocketedSound = function () {
        Audio.playBuffer(ballPocketedBuffer, 0.5);
    };
    return playPocketedSound;
})();

},{"./Audio.js":2}]},{},[11]);
