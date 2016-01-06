var app;

var scene;

var avatar = new THREE.Object3D();
if (POOLVR.config.initialPosition) {
    avatar.position.fromArray(POOLVR.config.initialPosition);
} else {
    avatar.position.y = 1.0;
    avatar.position.z = 1.86;
}
avatar.heading = 0;
avatar.floatMode = false;
avatar.toolMode = false;

var mouseStuff = setupMouse(avatar);
var toolRoot;

var synthSpeaker = new SynthSpeaker({volume: POOLVR.config.synthSpeakerVolume, rate: 0.8, pitch: 0.5});

var textGeomLogger;
if (POOLVR.config.useTextGeomLogger) {
   textGeomLogger = new TextGeomLogger();
} else {
    textGeomLogger = {
        root: new THREE.Object3D(),
        log: function (msg) { console.log(msg); }
    };
}

avatar.add(textGeomLogger.root);
textGeomLogger.root.position.set(-2.5, 1.0, -3.5);

var menu = setupMenu(avatar);

function setupMenu(parent) {
    "use strict";
    var menu = new THREE.Object3D();
    var material = new THREE.MeshBasicMaterial({color: 0x22ee33});

    var textGeom = new THREE.TextGeometry('RESET TABLE', {font: 'anonymous pro', size: 0.2, height: 0, curveSegments: 2});
    var textMesh = new THREE.Mesh(textGeom, material);
    textMesh.onSelect = POOLVR.resetTable;
    textMesh.position.set(0, 0.8, -2);
    menu.add(textMesh);

    parent.add(menu);
    menu.visible = false;
    return menu;
}


function startTutorial() {
    "use strict";
    synthSpeaker.speak("Hello.  Welcome. To. Pool-ver.", function () {
        textGeomLogger.log("HELLO.  WELCOME TO POOLVR.");
    });

    synthSpeaker.speak("Please wave a stick-like object in front of your Leap Motion controller.", function () {
        textGeomLogger.log("PLEASE WAVE A STICK-LIKE OBJECT IN FRONT OF YOUR");
        textGeomLogger.log("LEAP MOTION CONTROLLER.");
    });

    synthSpeaker.speak("Keep the stick within the interaction box when you want to make contact with.  A ball.", function () {
        textGeomLogger.log("KEEP THE STICK WITHIN THE INTERACTION BOX WHEN YOU WANT");
        textGeomLogger.log("TO MAKE CONTACT WITH A BALL...");
    });
}



var animate = function (keyboard, gamepad, leapController, animateLeap,
                        toolRoot, useShadowMap,
                        stickMesh, tipMesh,
                        H_table,
                        animateMousePointer) {
    "use strict";

    if (!useShadowMap) {
        // create shadow mesh from projection:
        var stickShadow = new THREE.Object3D();
        stickShadow.position.set(stickMesh.position.x,
            (H_table + 0.001 - toolRoot.position.y - avatar.position.y) / toolRoot.scale.y,
            stickMesh.position.z);
        stickShadow.scale.set(1, 0.001, 1);
        toolRoot.add(stickShadow);
        var stickShadowMaterial = new THREE.MeshBasicMaterial({color: 0x002200});
        var stickShadowGeom = stickMesh.geometry.clone();
        var stickShadowMesh = new THREE.Mesh(stickShadowGeom, stickShadowMaterial);
        stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        stickShadow.add(stickShadowMesh);
        if (POOLVR.config.tipShape === 'Ellipsoid') {
            // TODO: new projection approach for ellipsoid tip
        } else if (POOLVR.config.tipShape === 'Sphere') {
            tipMesh.geometry.computeBoundingSphere();
            var tipShadowGeom = new THREE.CircleBufferGeometry(tipMesh.geometry.boundingSphere.radius).rotateX(-Math.PI / 2);
            var tipShadowMesh = new THREE.Mesh(tipShadowGeom, stickShadowMaterial);
            stickShadow.add(tipShadowMesh);
        }
    }

    var UP = new THREE.Vector3(0, 1, 0),
        walkSpeed = 0.333,
        floatSpeed = 0.1;
    var lastFrameID;
    var lt = 0;

    var position = new THREE.Vector3(),
        direction = new THREE.Vector3(),
        raycaster = new THREE.Raycaster();

    var arrowHelper = new THREE.ArrowHelper(UP, new THREE.Vector3(), 3);
    arrowHelper.visible = false;
    app.scene.add(arrowHelper);

    function animate(t) {
        var dt = (t - lt) * 0.001;
        requestAnimationFrame(animate);

        if (app.vrControls.enabled) {
            app.vrControls.update();
        }
        app.vrManager.render(app.scene, app.camera, t);

        keyboard.update(dt);
        gamepad.update(dt);

        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {
            animateLeap(frame, dt);
            lastFrameID = frame.id;

            if (frame.hands.length === 1) {
                var hand = frame.hands[0];
                if (hand.confidence > 0.2) {
                    var finger = hand.indexFinger;
                    if (finger.extended) {
                        position.fromArray(finger.stabilizedTipPosition);
                        toolRoot.localToWorld(position);
                        direction.fromArray(finger.direction);
                        direction.applyQuaternion(toolRoot.getWorldQuaternion());
                        raycaster.set(position, direction);

                        // var intersects = raycaster.intersectObjects(POOLVR.ballMeshes);
                        // if (intersects.length > 1) {
                        //     mouseStuff.mousePointerMesh.visible = true;
                        //     mouseStuff.mousePointerMesh.position.copy(intersects[1].object.position);
                        // }

                        arrowHelper.visible = true;
                        arrowHelper.position.copy(position);
                        arrowHelper.setDirection(direction);
                    }
                } else {
                    arrowHelper.visible = false;
                }
            } else {
                arrowHelper.visible = false;
            }
        }

        // app.world.step(dt);
        app.world.step(1/75, dt, 5);

        var floatUp = keyboard.getValue("floatUp") + keyboard.getValue("floatDown");
        var drive = keyboard.getValue("driveBack") + keyboard.getValue("driveForward");
        var strafe = keyboard.getValue("strafeRight") + keyboard.getValue("strafeLeft");

        var heading = -0.8 * dt * (keyboard.getValue("turnLeft") + keyboard.getValue("turnRight"));
        if (avatar.floatMode) {
            floatUp += gamepad.getValue("float");
            strafe += gamepad.getValue("strafe");
        } else {
            drive += gamepad.getValue("drive");
            heading += 0.8 * dt * gamepad.getValue("dheading");
        }
        floatUp *= floatSpeed;
        if (strafe || drive) {
            var len = walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive +
                strafe * strafe));
            strafe *= len;
            drive *= len;
        } else {
            strafe = 0;
            drive = 0;
        }

        if (floatUp !== 0 || strafe !== 0 || heading !== 0 || drive !== 0) {
            avatar.heading += heading;
            var cosHeading = Math.cos(avatar.heading),
                sinHeading = Math.sin(avatar.heading);

            avatar.quaternion.setFromAxisAngle(UP, avatar.heading);

            avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
            avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
            avatar.position.y += dt * floatUp;
        }

        if (!useShadowMap) {
            stickShadow.position.set(stickMesh.position.x,
                (H_table + 0.001 - toolRoot.position.y - avatar.position.y) / toolRoot.scale.y,
                stickMesh.position.z);
            stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        }

        // animateMousePointer(t, app.camera);

        lt = t;
    }

    return animate;

};


/* jshint multistr: true */
function onLoad(doTutorial) {
    "use strict";
    pyserver.log("\n\
*********************************************----\n\
*********************************************----\n\
*********************************************----\n\
    ------ starting poolvr... -------------------\n\
*********************************************----\n\
*********************************************----\n\
*********************************************----\n\
    ---------------------------------------------\n");
    pyserver.log('WebVRConfig =\n' + JSON.stringify(WebVRConfig, undefined, 2));
    pyserver.log('userAgent = ' + userAgent);
    if (navigator.getVRDevices) {
        navigator.getVRDevices().then(function (devices) {
            devices.forEach(function (device, i) {
                pyserver.log('\nVR device ' + i + ': ' + device.deviceName);
                console.log(device);
            });
        });
    }
    pyserver.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    scene = THREE.py.parse(JSON_SCENE);

    if (!POOLVR.config.useBasicMaterials) {
        var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 10, 90);
        centerSpotLight.position.set(0, 3, 0);
        centerSpotLight.castShadow = true;
        centerSpotLight.shadowCameraNear = 0.01;
        centerSpotLight.shadowCameraFar = 4;
        centerSpotLight.shadowCameraFov = 90;
        scene.add(centerSpotLight);
    }

    var animateMousePointer = mouseStuff.animateMousePointer;

    var UP = new THREE.Vector3(0, 1, 0);
    var appConfig = combineObjects(POOLVR.config, {
        onResetVRSensor: function (lastRotation, lastPosition) {
            pyserver.log('updating the toolRoot position...');
            // app.camera.updateMatrix();
            avatar.heading += lastRotation - app.camera.rotation.y;
            toolRoot.rotation.y -= (lastRotation - app.camera.rotation.y);
            toolRoot.position.sub(lastPosition);
            toolRoot.position.applyAxisAngle(UP, -lastRotation + app.camera.rotation.y);
            toolRoot.position.add(app.camera.position);
            // toolRoot.updateMatrix();
            avatar.updateMatrixWorld();
        }
    });
    app = new WebVRApplication(scene, appConfig);

    THREE.py.CANNONize(scene, app.world);

    avatar.add(app.camera);
    scene.add(avatar);

    POOLVR.setupMaterials(app.world);

    var toolStuff = addTool(avatar, app.world, POOLVR.toolOptions);

    var leapController = toolStuff.leapController;
    var stickMesh      = toolStuff.stickMesh;
    var animateLeap    = toolStuff.animateLeap;
    var tipBody        = toolStuff.tipBody;
    toolRoot           = toolStuff.toolRoot;

    POOLVR.setupWorld(scene, app.world, tipBody, stickMesh);

    app.start( animate(POOLVR.keyboard, POOLVR.gamepad,
                       leapController, animateLeap,
                       toolRoot, POOLVR.config.useShadowMap,
                       toolStuff.stickMesh, toolStuff.tipMesh,
                       POOLVR.config.H_table,
                       animateMousePointer) );

    if (doTutorial) {
        startTutorial();
    }

    if (POOLVR.profileForm) {
        POOLVR.profileForm.style.display = 'none';
    }
}
