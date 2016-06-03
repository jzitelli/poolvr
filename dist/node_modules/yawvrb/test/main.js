/* global THREE, YAWVRB */
window.onLoad = function () {
    "use strict";

    THREE.Object3D.DefaultMatrixAutoUpdate = false;

    // create app:

    var app = ( function () {
        //var euler = new THREE.Euler(0, 0, 0, 'YXZ');
        return new YAWVRB.App(undefined, undefined, {
            canvas: document.getElementById('webgl-canvas'),
            antialias: !YAWVRB.Utils.isMobile(),
            alpha: true
        });
    } )();

    app.stage.rootObject.add(app.camera);

    var objectSelector = new YAWVRB.Utils.ObjectSelector();
    var selectionEnabled = false;

    // keyboard:

    var keyboardCommands = {
        moveF: {buttons: [YAWVRB.Keyboard.KEYCODES.W]},
        moveB: {buttons: [YAWVRB.Keyboard.KEYCODES.S]},
        moveL: {buttons: [YAWVRB.Keyboard.KEYCODES.A]},
        moveR: {buttons: [YAWVRB.Keyboard.KEYCODES.D]},
        moveU: {buttons: [YAWVRB.Keyboard.KEYCODES.Q]},
        moveD: {buttons: [YAWVRB.Keyboard.KEYCODES.Z]},
        turnL: {buttons: [YAWVRB.Keyboard.KEYCODES.LEFTARROW]},
        turnR: {buttons: [YAWVRB.Keyboard.KEYCODES.RIGHTARROW]},
        turnU: {buttons: [YAWVRB.Keyboard.KEYCODES.UPARROW]},
        turnD: {buttons: [YAWVRB.Keyboard.KEYCODES.DOWNARROW]},
        toggleSelect: {buttons: [YAWVRB.Keyboard.KEYCODES.N], commandDown: function () { selectionEnabled = !selectionEnabled; }},
        cycleSelection: {buttons: [YAWVRB.Keyboard.KEYCODES[']']], commandDown: objectSelector.cycleSelection},
        cyclePrevSelection: {buttons: [YAWVRB.Keyboard.KEYCODES['[']], commandDown: objectSelector.cycleSelection.bind(objectSelector, -1)}
    };
    var keyboard = new YAWVRB.Keyboard(window, keyboardCommands);

    var visualKeyboard = YAWVRB.Keyboard.makeStageObject();
    app.stage.rootObject.add(visualKeyboard);
    objectSelector.addSelectable(visualKeyboard);

    // xbox gamepad:

    var xboxGamepadCommands = {
        toggleVR: {buttons: [YAWVRB.Gamepads.BUTTONS.start], commandDown: app.toggleVR},
        resetVRSensor: {buttons: [YAWVRB.Gamepads.BUTTONS.back], commandDown: app.resetVRSensor},
        cycleSelection: {buttons: [YAWVRB.Gamepads.BUTTONS.right], commandDown: objectSelector.cycleSelection},
        cyclePrevSelection: {buttons: [YAWVRB.Gamepads.BUTTONS.left], commandDown: objectSelector.cycleSelection.bind(objectSelector, -1)},
        moveFB: {axes: [YAWVRB.Gamepads.AXES.LSY]},
        moveRL: {axes: [YAWVRB.Gamepads.AXES.LSX]},
        turnRL: {axes: [YAWVRB.Gamepads.AXES.RSX]},
        turnUD: {axes: [YAWVRB.Gamepads.AXES.RSY]},
        toggleFloat: {buttons: [YAWVRB.Gamepads.BUTTONS.leftStick]}
    };

    // vive controller 1:

    var viveAGamepadCommands = {
        toggleVR: {buttons: [3], commandDown: app.toggleVR},
        moveFB: {axes: [YAWVRB.Gamepads.AXES.LSY], flipAxes: true},
        moveRL: {axes: [YAWVRB.Gamepads.AXES.LSX]},
        toggleFloat: {buttons: [0]}
    };
    var viveATool = YAWVRB.Gamepads.makeTool();
    viveATool.mesh.visible = false;
    var viveAConnected = false;
    app.stage.rootObject.add(viveATool.mesh);

    // vive controller 2:

    var viveBGamepadCommands = {
        toggleUseImmediatePose: {buttons: [3], commandDown: app.toggleUseImmediatePose},
        turnRL: {axes: [YAWVRB.Gamepads.AXES.LSX]},
        turnUD: {axes: [YAWVRB.Gamepads.AXES.LSY]}
    };
    var viveBTool = YAWVRB.Gamepads.makeTool();
    viveBTool.mesh.visible = false;
    app.stage.rootObject.add(viveBTool.mesh);

    YAWVRB.Gamepads.setOnGamepadConnected( function (e) {
        if (/xbox/i.test(e.gamepad.id) || /xinput/i.test(e.gamepad.id)) {
            YAWVRB.Gamepads.setGamepadCommands(e.gamepad.index, xboxGamepadCommands);
        } else if (/openvr/i.test(e.gamepad.id)) {
            if (!viveAConnected) {
                viveAConnected = true;
                selectionEnabled = true;
                YAWVRB.Gamepads.setGamepadCommands(e.gamepad.index, viveAGamepadCommands);
                viveATool.setGamepad(e.gamepad);
                viveATool.mesh.visible = true;
            } else {
                YAWVRB.Gamepads.setGamepadCommands(e.gamepad.index, viveBGamepadCommands);
                viveBTool.setGamepad(e.gamepad);
                viveBTool.mesh.visible = true;
            }
        }
    } );

    // leap motion controller:

    var leapTool = YAWVRB.LeapMotion.makeTool();
    leapTool.leapController.connect();
    app.stage.rootObject.add(leapTool.toolRoot);
    app.scene.add(leapTool.toolShadowMesh);
    objectSelector.addSelectable(leapTool.toolRoot);

    app.stage.load();

    ( function () {
        // load the WebVRDesk scene and start
        var objectLoader = new THREE.ObjectLoader();
        var textureLoader = new THREE.TextureLoader();
        var deskTexture = textureLoader.load('/test/models/textures/deskTexture.png');
        var deskMaterial = new THREE.MeshBasicMaterial({map: deskTexture});
        var roomTexture = textureLoader.load('/test/models/textures/roomTexture.png');
        var roomMaterial = new THREE.MeshBasicMaterial({map: roomTexture});
        var chairTexture = textureLoader.load('/test/models/textures/chairTexture.png');
        var chairMaterial = new THREE.MeshBasicMaterial({map: chairTexture});

        objectLoader.load("/test/models/WebVRDesk.json", function (scene) {
            while (scene.children.length > 0) {
                var child = scene.children[0];
                scene.remove(child);
                if (child instanceof THREE.Mesh) {
                    if (child.name === 'desk') child.material = deskMaterial;
                    else if (child.name === 'chair') child.material = chairMaterial;
                    else child.material = roomMaterial;
                }
                child.updateMatrix();
                app.scene.add(child);
            }
            app.scene.updateMatrixWorld(true);

            app.renderer.setSize(window.innerWidth, window.innerHeight);

            startAnimateLoop();

            function startAnimateLoop() {
                var lt = 0;

                requestAnimationFrame(animate);

                function animate(t) {

                    var dt = 0.001 * (t - lt);

                    var moveFB = keyboard.moveF - keyboard.moveB,
                        moveRL = keyboard.moveR - keyboard.moveL,
                        moveUD = keyboard.moveU - keyboard.moveD,
                        turnRL = keyboard.turnR - keyboard.turnL,
                        turnUD = 0;

                    var values = YAWVRB.Gamepads.update();

                    for (var i = 0; i < values.length; i++) {
                        var vals = values[i];
                        if (vals.moveFB) {
                            if (vals.toggleFloat) {
                                moveUD -= vals.moveFB;
                            } else {
                                moveFB -= vals.moveFB;
                            }
                        }
                        if (vals.moveRL) moveRL += vals.moveRL;
                        if (vals.turnRL) turnRL += vals.turnRL;
                        if (vals.turnUD) turnUD += vals.turnUD;
                    }

                    if (selectionEnabled && objectSelector.selection) {
                        YAWVRB.Utils.moveObject(objectSelector.selection, dt, moveFB, moveRL, moveUD, turnRL, turnUD);
                    } else {
                        YAWVRB.Utils.moveObject(app.stage.rootObject, dt, moveFB, moveRL, moveUD, turnRL, 0);
                    }

                    viveATool.update(dt);
                    viveBTool.update(dt);

                    leapTool.updateTool(dt);

                    app.render();

                    lt = t;
                    requestAnimationFrame(animate);
                }

            }

        });

    } )();

};
