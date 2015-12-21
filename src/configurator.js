var app;

var avatar = new THREE.Object3D();
var initialPosition = POOLVR.config.initialPosition || [0, 0.9, 0.9];
avatar.position.fromArray(initialPosition);
avatar.heading = 0;
avatar.floatMode = false;
avatar.toolMode = false;

var textGeomLogger = new TextGeomLogger(undefined, {nrows: 20, size: 0.043});
avatar.add(textGeomLogger.root);
textGeomLogger.root.position.set(-1.5, -0.23, -2);

var toolRoot;


function setupMenu(parent) {
    "use strict";
    var menu = new THREE.Object3D();
    var textGeom = new THREE.TextGeometry('RESET TABLE', {font: 'anonymous pro', size: 0.2, height: 0, curveSegments: 2});
    var textMesh = new THREE.Mesh(textGeom);
    textMesh.position.set(0, 1, -2);
    menu.add(textMesh);
    parent.add(menu);
    menu.visible = true;
    return menu;
}
var menu = setupMenu(avatar);


var animate = function (avatar, keyboard, gamepad, leapController, animateLeap,
                        toolRoot, stickMesh,
                        animateMousePointer,
                        shadowMap) {
    "use strict";
    var H_table = POOLVR.config.H_table;
    if (!shadowMap) {
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
    }
    var UP = new THREE.Vector3(0, 1, 0);
    var walkSpeed = 0.333,
        floatSpeed = 0.1;
    var lt = 0,
        lastFrameID;
    function animate(t) {
        requestAnimationFrame(animate);
        var dt = (t - lt) * 0.001;
        if (app.vrControls.enabled) {
            app.vrControls.update();
        }
        app.vrManager.render(app.scene, app.camera, t);
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
        if (strafe || drive) {
            var len = walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive +
                strafe * strafe));
            strafe *= len;
            drive *= len;
        } else {
            strafe = 0;
            drive = 0;
        }
        floatUp *= floatSpeed;

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


        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {
            animateLeap(frame, dt);
            lastFrameID = frame.id;
        }

        if (!shadowMap) {
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


function onLoad() {
    "use strict";
    var scene = THREE.py.parse(JSON_SCENE);

    if (!POOLVR.config.useBasicMaterials) {
        // would rather add the spot lights via three.py generated JSON_SCENE, but I'm having problems getting shadows frm them:
        var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 10, 90);
        centerSpotLight.position.set(0, 3, 0);
        centerSpotLight.castShadow = true;
        centerSpotLight.shadowCameraNear = 0.01;
        centerSpotLight.shadowCameraFar = 4;
        centerSpotLight.shadowCameraFov = 90;
        scene.add(centerSpotLight);
        // var centerSpotLightHelper = new THREE.SpotLightHelper(centerSpotLight);
        // scene.add(centerSpotLightHelper);
        // centerSpotLightHelper.visible = false;
    }

    textGeomLogger.log(JSON.stringify(POOLVR.config, undefined, 2));

    var mouseStuff = setupMouse(avatar, undefined, '../images/mouseParticle.png');

    var UP = new THREE.Vector3(0, 1, 0);
    var appConfig = combineObjects(POOLVR.config, {
        onResetVRSensor: function (lastRotation, lastPosition) {
            // TODO
            pyserver.log('updating the toolRoot position...');
            app.camera.updateMatrix();
            avatar.heading += lastRotation - app.camera.rotation.y;
            toolRoot.rotation.y -= (lastRotation - app.camera.rotation.y);
            toolRoot.position.sub(lastPosition);
            toolRoot.position.applyAxisAngle(UP, -lastRotation + app.camera.rotation.y);
            toolRoot.position.add(app.camera.position);
            toolRoot.updateMatrix();
        }
    });
    app = new WebVRApplication(scene, appConfig);

    THREE.py.CANNONize(scene, app.world);

    scene.add(avatar);
    avatar.add(app.camera);

    var toolStuff = addTool(avatar, app.world, POOLVR.toolOptions);
    toolRoot = toolStuff.toolRoot;

    app.start( animate(avatar, POOLVR.keyboard, POOLVR.gamepad,
                       toolStuff.leapController,
                       toolStuff.animateLeap,
                       toolStuff.toolRoot,
                       toolStuff.stickMesh,
                       mouseStuff.animateMousePointer,
                       POOLVR.config.shadowMap) );
}
