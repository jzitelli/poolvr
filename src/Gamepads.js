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
