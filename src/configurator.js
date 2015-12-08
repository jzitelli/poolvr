var app;


var animate = function (avatar, leapController, animateLeap,
                        toolRoot, leftRoot, rightRoot, animateMousePointer) {
    "use strict";
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
        app.keyboard.update(dt);
        app.gamepad.update(dt);

        var floatUp = app.keyboard.getValue("floatUp") + app.keyboard.getValue("floatDown");
        var drive = app.keyboard.getValue("driveBack") + app.keyboard.getValue("driveForward");
        var strafe = app.keyboard.getValue("strafeRight") + app.keyboard.getValue("strafeLeft");
        var heading = -0.8 * dt * (app.keyboard.getValue("turnLeft") + app.keyboard.getValue("turnRight"));
        if (avatar.floatMode) {
            floatUp += app.gamepad.getValue("float");
            strafe += app.gamepad.getValue("strafe");
        } else {
            drive += app.gamepad.getValue("drive");
            heading += 0.8 * dt * app.gamepad.getValue("dheading");
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
        //     pitch -= 0.8 * dt * (app.keyboard.getValue("pitchUp") + app.keyboard.getValue("pitchDown"));
        //     pitchQuat.setFromAxisAngle(RIGHT, pitch);
        // }
        // var cosPitch = Math.cos(pitch),
        //     sinPitch = Math.sin(pitch);

        var toolDrive = app.keyboard.getValue("moveToolForwards") - app.keyboard.getValue("moveToolBackwards");
        var toolFloat = app.keyboard.getValue("moveToolUp") - app.keyboard.getValue("moveToolDown");
        var toolStrafe = app.keyboard.getValue("moveToolRight") - app.keyboard.getValue("moveToolLeft");
        var rotateToolCW = app.keyboard.getValue("rotateToolCW") - app.keyboard.getValue("rotateToolCCW");
        if (avatar.toolMode) {
            toolFloat += app.gamepad.getValue("toolFloat");
            toolStrafe += app.gamepad.getValue("toolStrafe");
        } else {
            toolDrive -= app.gamepad.getValue("toolDrive");
            rotateToolCW -= app.gamepad.getValue("toolStrafe");
        }

        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {
            animateLeap(frame, dt);
            lastFrameID = frame.id;
        }

        avatar.quaternion.setFromAxisAngle(UP, avatar.heading);

        avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
        avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
        avatar.position.y += dt * floatUp;

        toolRoot.position.x += 0.25  * dt * toolStrafe;
        toolRoot.position.z += -0.25 * dt * toolDrive;
        toolRoot.position.y += 0.25  * dt * toolFloat;
        leftRoot.position.copy(toolRoot.position);
        rightRoot.position.copy(toolRoot.position);

        toolRoot.rotation.y += 0.15 * dt * rotateToolCW;
        leftRoot.rotation.y = rightRoot.rotation.y = toolRoot.rotation.y;

        // if (!shadowMap) {
        //     stickShadow.position.set(stickMesh.position.x,
        //         (H_table + 0.001 - toolRoot.position.y - avatar.position.y) / toolRoot.scale.y,
        //         stickMesh.position.z);
        //     stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        // }

        animateMousePointer(t);

        lt = t;
    }
    return animate;
};


function onLoad() {
    "use strict";
    var avatar = new THREE.Object3D();
    var initialPosition = POOLVR.config.initialPosition || [0, 0.9, 0.9];
    avatar.position.fromArray(initialPosition);
    avatar.heading = 0;
    avatar.floatMode = false;

    var textGeomLogger = new TextGeomLogger();
    avatar.add(textGeomLogger.root);
    textGeomLogger.root.position.set(-2.5, 1.5, -3.5);

    var scene = THREE.py.parse(JSON_SCENE);
    scene.add(avatar);

    POOLVR.config.keyboardCommands = POOLVR.keyboardCommands;
    POOLVR.config.gamepadCommands = POOLVR.gamepadCommands;

    app = new WebVRApplication('poolvr config', avatar, scene, POOLVR.config);
    avatar.add(app.camera);

    textGeomLogger.log(JSON.stringify(POOLVR.config, undefined, 2));

    var toolStuff = addTool(avatar, app.world);

    var animateMousePointer = setupMouse(avatar);

    app.start( animate(avatar,
                       toolStuff.leapController,
                       toolStuff.animateLeap,
                       toolStuff.toolRoot,
                       toolStuff.leftRoot,
                       toolStuff.rightRoot,
                       animateMousePointer) );
}
