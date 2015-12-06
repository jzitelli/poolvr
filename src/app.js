var app;

var scene = THREE.py.parse(JSON_SCENE);

var avatar = avatar || new THREE.Object3D();
avatar.position.y = 1.1;
avatar.position.z = 1.86;

var textGeomLogger = new TextGeomLogger();
avatar.add(textGeomLogger.root);
textGeomLogger.root.position.set(-2.75, 1.5, -3.5);

var synthSpeaker = new SynthSpeaker({volume: 0.4, rate: 0.8, pitch: 0.5});


function onLoad() {
    "use strict";
    pyserver.log("starting poolvr...");
    pyserver.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    app = new WebVRApplication("poolvr", avatar, scene, POOLVR.config);
    avatar.add(app.camera);
    scene.add(avatar);

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

    THREE.py.CANNONize(scene, app.world);

    app.world.addContactMaterial(POOLVR.ballBallContactMaterial);
    app.world.addContactMaterial(POOLVR.ballPlayableSurfaceContactMaterial);
    app.world.addContactMaterial(POOLVR.ballCushionContactMaterial);
    app.world.addContactMaterial(POOLVR.floorBallContactMaterial);

    var ballStripeMeshes = [];
    scene.traverse(function (node) {
        if (node.name.startsWith('ballMesh')) {
            node.body.material = POOLVR.ballMaterial;
            node.body.bounces = 0;
        }
        else if (node.name.startsWith('ballStripeMesh')) {
            ballStripeMeshes.push(node);
        }
        else if (node.name.startsWith('playableSurfaceMesh')) {
            node.body.material = POOLVR.playableSurfaceMaterial;
        }
        else if (node.name.endsWith('CushionMesh')) {
            node.body.material = POOLVR.cushionMaterial;
        }
        else if (node.name === 'floorMesh') {
            node.body.material = POOLVR.floorMaterial;
        }
    });

    var toolOptions = {
        // ##### Desktop mode (default): #####
        transformOptions : POOLVR.config.transformOptions, // || {vr: 'desktop'},
        useBasicMaterials: POOLVR.config.useBasicMaterials,
        toolLength       : POOLVR.config.toolLength,
        toolRadius       : POOLVR.config.toolRadius,
        toolMass         : POOLVR.config.toolMass,
        toolOffset       : POOLVR.config.toolOffset
    };
    if (POOLVR.config.vrLeap) {
        // ##### Leap Motion VR tracking mode: #####
        toolOptions.transformOptions = {vr: true, effectiveParent: app.camera};
    }
    pyserver.log('toolOptions =\n' + JSON.stringify(toolOptions, undefined, 2));
    // toolOptions.onStreamingStarted = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS CONNECTED.  GOOD JOB."); };
    // toolOptions.onStreamingStopped = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS DISCONNECTED!  HOW WILL YOU PLAY?!"); };
    var toolStuff = addTool(avatar, app.world, toolOptions);
    var toolRoot       = toolStuff.toolRoot;
    var leapController = toolStuff.leapController;
    var stickMesh      = toolStuff.stickMesh;
    var animateLeap    = toolStuff.animateLeap;

    var dynamicBodies = app.world.bodies.filter(function(body) { return body.mesh && body.type === CANNON.Body.DYNAMIC; });

    var animateMousePointer = setupMouse(avatar);

    // setupMenu(avatar);

    app.start( animate(leapController, animateLeap,
                       dynamicBodies, ballStripeMeshes,
                       toolRoot, POOLVR.config.shadowMap,
                       toolStuff.stickMesh, toolStuff.tipMesh,
                       POOLVR.config.H_table, POOLVR.floorMaterial, POOLVR.ballMaterial,
                       animateMousePointer) );

    startTutorial();
}


function setupMenu(parent) {
    "use strict";
    var textGeom = new THREE.TextGeometry('RESET TABLE', {font: 'anonymous pro', size: 0.2, height: 0});
    var textMesh = new THREE.Mesh(textGeom);
    textMesh.position.set(0, 1, -2);
    parent.add(textMesh);
}


function startTutorial() {
    "use strict";
    synthSpeaker.speak("Hello.  Welcome to pool-ver", function () {
        textGeomLogger.log("HELLO.  WELCOME TO POOLVR.");
    });

    synthSpeaker.speak("Please wave a stick-like object in front of your Leap Motion controller.", function () {
        textGeomLogger.log("PLEASE WAVE A STICK-LIKE OBJECT IN FRONT OF YOUR LEAP MOTION CONTROLLER.");
    });

    synthSpeaker.speak("Keep the stick within the interaction box when you want to make contact with.  A ball.", function () {
        textGeomLogger.log("KEEP THE STICK WITHIN THE INTERACTION BOX WHEN YOU WANT TO MAKE CONTACT WITH A BALL.");
    });

    // synthSpeaker.speak("You moved a ball.  Good job.");
}


var animate = function (leapController, animateLeap,
                        dynamicBodies, ballStripeMeshes,
                        toolRoot, shadowMap,
                        stickMesh, tipMesh,
                        H_table, floorMaterial, ballMaterial,
                        animateMousePointer) {
    "use strict";
    if (!shadowMap) {
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
        // TODO: new projection approach for ellipsoid tip
        // tipMesh.geometry.computeBoundingSphere();
        // var tipShadowGeom = new THREE.CircleBufferGeometry(tipMesh.geometry.boundingSphere.radius).rotateX(-Math.PI / 2);
        // var tipShadowMesh = new THREE.Mesh(tipShadowGeom, stickShadowMaterial);
        // stickShadow.add(tipShadowMesh);
    }

    var UP = new THREE.Vector3(0, 1, 0),
        RIGHT = new THREE.Vector3(1, 0, 0),
        heading = 0,
        headingQuat = new THREE.Quaternion(),
        // pitch = 0,
        // pitchQuat = new THREE.Quaternion(),
        walkSpeed = 0.333,
        floatSpeed = 0.1;
    var lastFrameID;
    var lt = 0;
    function animate(t) {
        var dt = (t - lt) * 0.001;
        requestAnimationFrame(animate);
        if (app.vrControls.enabled) {
            app.vrControls.update();
        }
        app.vrManager.render(app.scene, app.camera, t);

        app.keyboard.update(dt);
        app.gamepad.update(dt);

        var floatUp = app.keyboard.getValue("floatUp") + app.keyboard.getValue("floatDown");
        var drive = app.keyboard.getValue("driveBack") + app.keyboard.getValue("driveForward");
        var strafe = app.keyboard.getValue("strafeRight") + app.keyboard.getValue("strafeLeft");
        heading += -0.8 * dt * (app.keyboard.getValue("turnLeft") + app.keyboard.getValue("turnRight"));
        if (avatar.floatMode) {
            floatUp += app.gamepad.getValue("float");
            strafe += app.gamepad.getValue("strafe");
        } else {
            drive += app.gamepad.getValue("drive");
            heading += 0.8 * dt * app.gamepad.getValue("dheading");
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
        var cosHeading = Math.cos(heading),
            sinHeading = Math.sin(heading);
        // if (!app.vrControls.enabled) {
        //     pitch -= 0.8 * dt * (app.keyboard.getValue("pitchUp") + app.keyboard.getValue("pitchDown"));
        //     pitchQuat.setFromAxisAngle(RIGHT, pitch);
        // }
        // var cosPitch = Math.cos(pitch),
        //     sinPitch = Math.sin(pitch);

        var toolDrive = app.keyboard.getValue("moveToolForwards") - app.keyboard.getValue("moveToolBackwards");
        var toolFloat = app.keyboard.getValue("moveToolUp") - app.keyboard.getValue("moveToolDown");
        var toolStrafe = app.keyboard.getValue("moveToolRight") - app.keyboard.getValue("moveToolLeft");
        toolStrafe += app.gamepad.getValue("toolStrafe");
        if (avatar.toolMode) {
            toolFloat += app.gamepad.getValue("toolFloat");
        } else {
            toolDrive -= app.gamepad.getValue("toolDrive");
        }

        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {
            animateLeap(frame, dt);
            lastFrameID = frame.id;
        }

        app.world.step(1/60, dt);

        for (var j = 0; j < dynamicBodies.length; ++j) {
            var body = dynamicBodies[j];
            body.mesh.position.copy(body.position);
        }

        for (j = 0; j < ballStripeMeshes.length; j++) {
            var mesh = ballStripeMeshes[j];
            mesh.quaternion.copy(mesh.parent.body.quaternion);
        }

        avatar.quaternion.setFromAxisAngle(UP, heading);
        // avatar.quaternion.multiply(pitchQuat);

        avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
        avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
        avatar.position.y += dt * floatUp;

        toolRoot.position.x += 0.25  * dt * toolStrafe;
        toolRoot.position.z += -0.25 * dt * toolDrive;
        toolRoot.position.y += 0.25  * dt * toolFloat;

        if (!shadowMap) {
            stickShadow.position.set(stickMesh.position.x,
                (H_table + 0.001 - toolRoot.position.y - avatar.position.y) / toolRoot.scale.y,
                stickMesh.position.z);
            stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        }

        // TODO: use callbacks
        for (j = 0; j < app.world.contacts.length; j++) {
            var contactEquation = app.world.contacts[j];
            var bi = contactEquation.bi,
                bj = contactEquation.bj;
            if (bi.material === bj.material) {
                // ball-ball collision
                var impactVelocity = contactEquation.getImpactVelocityAlongNormal();
                playCollisionSound(impactVelocity);
            } else if (bi.material === floorMaterial || bj.material === floorMaterial) {
                // ball-floor collision
                var ballBody = (bi.material === ballMaterial ? bi : bj);
                ballBody.bounces++;
                if (ballBody.bounces === 1) {
                    //textGeomLogger.log(ballBody.mesh.name + " HIT THE FLOOR!");
                } else if (ballBody.bounces === 7) {
                    ballBody.sleep();
                }
            }
        }

        if (animateMousePointer) animateMousePointer(t);

        lt = t;
    }

    return animate;
};
