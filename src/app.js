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

var toolRoot;

// POOLVR.config.onfullscreenchange = function (fullscreen) {
//     if (fullscreen) pyserver.log('going fullscreen');
//     else pyserver.log('exiting fullscreen');
// };

var synthSpeaker = new SynthSpeaker({volume: 0.5, rate: 0.8, pitch: 0.5});

var textGeomLogger;
if (POOLVR.config.textGeomLogger) {
   textGeomLogger = new TextGeomLogger();
} else {
    textGeomLogger = {
        root: new THREE.Object3D(),
        log: function (msg) { console.log(msg); }
    };
}

avatar.add(textGeomLogger.root);
textGeomLogger.root.position.set(-2.5, 1.0, -3.5);


function setupMenu(parent) {
    "use strict";
    var menu = new THREE.Object3D();
    var textGeom = new THREE.TextGeometry('RESET TABLE', {font: 'anonymous pro', size: 0.2, height: 0, curveSegments: 2});
    var textMesh = new THREE.Mesh(textGeom);
    textMesh.position.set(0, 1, -2);
    menu.add(textMesh);
    parent.add(menu);
    menu.visible = false;
    return menu;
}
var menu = setupMenu(avatar);


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
    function animate(t) {
        var dt = (t - lt) * 0.001;
        requestAnimationFrame(animate);

        app.vrManager.render(app.scene, app.camera, t);

        if (app.vrControls.enabled) {
            app.vrControls.update();
        }
        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {
            animateLeap(frame, dt);
            lastFrameID = frame.id;
        }

        app.world.step(1/75, dt, 10);

        keyboard.update(dt);
        gamepad.update(dt);

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

            // if (!app.vrControls.enabled) {
            //     pitch -= 0.8 * dt * (keyboard.getValue("pitchUp") + keyboard.getValue("pitchDown"));
            //     pitchQuat.setFromAxisAngle(RIGHT, pitch);
            // }
            // var cosPitch = Math.cos(pitch),
            //     sinPitch = Math.sin(pitch);

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

        animateMousePointer(t);

        lt = t;
    }

    return animate;

};


/* jshint multistr: true */
function onLoad() {
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


    var mouseStuff = setupMouse(avatar);
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

    POOLVR.setupWorld(scene, app.world, tipBody);

    app.start( animate(POOLVR.keyboard, POOLVR.gamepad,
                       leapController, animateLeap,
                       toolRoot, POOLVR.config.useShadowMap,
                       toolStuff.stickMesh, toolStuff.tipMesh,
                       POOLVR.config.H_table,
                       animateMousePointer) );

    startTutorial();
}
