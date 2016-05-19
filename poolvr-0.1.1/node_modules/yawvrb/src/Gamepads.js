/* global THREE, CANNON */
module.exports = ( function () {
    "use strict";

    const DEADZONE = 0.145;

    var gamepads;
    var buttonsPresseds = [];
    var gamepadCommands = [];
    var xboxGamepads = [];
    var vrGamepads = [];
    var viveMeshA = new THREE.Mesh(new THREE.BoxBufferGeometry(0.06, 0.06, 0.13), new THREE.MeshLambertMaterial({color: 0xff2222}));
    var viveMeshB = new THREE.Mesh(new THREE.BoxBufferGeometry(0.06, 0.06, 0.13), new THREE.MeshLambertMaterial({color: 0x22ff22}));
    viveMeshA.matrixAutoUpdate = false;
    viveMeshB.matrixAutoUpdate = false;
    var vrGamepadMeshes = [viveMeshA, viveMeshB];

    const DEFAULT_OPTIONS = {
        toolLength: 0.15,
        toolRadius: 0.0034,
        toolMass: 0.04,
        tipShape: 'Cylinder',
        tipRadius: 0.0034,
        toolColor: 0xeebb99,
        tipColor: 0x99bbee,
        useShadowMesh: true,
        shadowPlane: 0.001,
        shadowMaterial: new THREE.MeshBasicMaterial({color: 0x333333}),
        shadowLightPosition: new THREE.Vector4(3, 7, 0, 0.1),
        tipMaterial: new CANNON.Material()
    };
    function makeTool(vrGamepad, options) {
        var _options = {};
        options = options || _options;
        for (var kwarg in options) {
            _options[kwarg] = options[kwarg];
        }
        for (kwarg in DEFAULT_OPTIONS) {
            if (_options[kwarg] === undefined) _options[kwarg] = DEFAULT_OPTIONS[kwarg];
        }
        options = _options;
        var toolGeom = new THREE.CylinderGeometry(options.toolRadius, options.toolRadius, options.toolLength, 10, 1, false);
        toolGeom.translate(0, -0.5 * options.toolLength, 0);
        toolGeom.rotateX(-0.5 * Math.PI);
        var bufferGeom = new THREE.BufferGeometry();
        bufferGeom.fromGeometry(toolGeom);
        toolGeom.dispose();
        toolGeom = bufferGeom;
        var toolMaterial = new THREE.MeshLambertMaterial({color: options.toolColor, transparent: true});
        var toolMesh = new THREE.Mesh(toolGeom, toolMaterial);
        var toolBody = new CANNON.Body({mass: options.toolMass, type: CANNON.Body.KINEMATIC});
        toolBody.material = options.tipMaterial;
        toolBody.addShape(new CANNON.Cylinder(options.tipRadius, options.tipRadius, 2*options.tipRadius, 8),
            new CANNON.Vec3(0, 0, options.tipRadius));
        var position = new THREE.Vector3();
        var velocity = new THREE.Vector3();
        var quaternion = new THREE.Quaternion();
        var worldPosition = new THREE.Vector3();
        var worldQuaternion = new THREE.Quaternion();
        var worldScale = new THREE.Vector3();
        // var matrixWorldInverse = new THREE.Matrix4();
        var lt = 0;
        function update(t) {
            var dt = 0.001 * (t - lt);
            if (vrGamepad && vrGamepad.pose) {
                toolMesh.position.fromArray(vrGamepad.pose.position);
                toolMesh.quaternion.fromArray(vrGamepad.pose.orientation);
                var parent = toolMesh.parent;
                var body = toolBody;
                position.copy(toolMesh.position);
                velocity.copy(body.position);
                if (parent) {
                    parent.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
                    position.applyMatrix4(parent.matrixWorld);
                    quaternion.multiplyQuaternions(worldQuaternion, toolMesh.quaternion);
                }
                body.position.copy(position);
                body.quaternion.copy(quaternion);
                velocity.sub(position);
                velocity.multiplyScalar(-1 / dt);
                body.velocity.copy(velocity);
            } else {
                // update mesh based on kinematic projection:
                toolBody.sleep();
                // toolMesh.position.copy(toolBody.interpolatedPosition);
                // matrixWorldInverse.getInverse(toolMesh.parent.matrixWorld);
                // toolMesh.position.applyMatrix4(matrixWorldInverse);
            }
            toolMesh.updateMatrix();
            toolMesh.updateMatrixWorld();
            lt = t;
        }
        return {
            body: toolBody,
            mesh: toolMesh,
            update: update
        };
    }

    function pollGamepads() {
        gamepads = navigator.getGamepads();
        for (var i = 0; i < gamepads.length; i++) {
            var gamepad = gamepads[i];
            if (!gamepad) continue;
            if (buttonsPresseds[i] === undefined) {
                console.log('new gamepad: %s', gamepad.id);
                if (/openvr/i.test(gamepad.id)) {
                    vrGamepads.push(gamepad);
                } else if (/xbox/i.test(gamepad.id) || /xinput/i.test(gamepad.id)) {
                    xboxGamepads.push(gamepad);
                }
                buttonsPresseds[i] = [];
                for (var j = 0; j < gamepad.buttons.length; j++) {
                    buttonsPresseds[i].push(false);
                }
                onGamepadConnected({gamepad: gamepad});
            }
        }
    }

    function setGamepadCommands(index, commands) {
        gamepadCommands[index] = commands;
    }

    var _onGamepadConnected = null;

    function setOnGamepadConnected(onGamepadConnected) {
        _onGamepadConnected = onGamepadConnected;
    }

    function onGamepadConnected(e) {
        console.log("Gamepad connected at index %d: %s - %d buttons, %d axes", e.gamepad.index, e.gamepad.id, e.gamepad.buttons.length, e.gamepad.axes.length);
        if (_onGamepadConnected) {
            _onGamepadConnected(e);
        }
    }
    window.addEventListener("gamepadconnected", onGamepadConnected);

    function onGamepadDisconnected(e) {
        console.log("Gamepad disconnected from index %d: %s", e.gamepad.index, e.gamepad.id);
        var i = e.gamepad.index;
        for (var j = 0; j < buttonsPresseds[i].length; j++) {
            buttonsPresseds[i][j] = false;
        }
    }
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);

    function update() {
        var values = [];
        pollGamepads();
        for (var i = 0; i < gamepads.length; ++i) {
            var gamepad = gamepads[i];
            if (!gamepad) continue;
            var buttonsPressed = buttonsPresseds[i];
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

    pollGamepads();

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
        viveMeshA: viveMeshA,
        viveMeshB: viveMeshB,
        vrGamepadMeshes: vrGamepadMeshes,
        setGamepadCommands: setGamepadCommands,
        setOnGamepadConnected: setOnGamepadConnected,
        update: update,
        makeTool: makeTool,
        vrGamepads: vrGamepads,
        xboxGamepads: xboxGamepads
    };

} )();
