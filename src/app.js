var app;

var scene = THREE.py.parse(JSON_SCENE);

var avatar = window.avatar || new THREE.Object3D();
avatar.position.y = 1.1;
avatar.position.z = 1.86;

var textGeomLogger = window.textGeomLogger || new TextGeomLogger();
avatar.add(textGeomLogger.root);
textGeomLogger.root.position.set(-2.75, 1.5, -3.5);

var synthSpeaker = new SynthSpeaker({volume: 0.4, rate: 0.8, pitch: 0.5});


function onLoad() {
    "use strict";
    pyserver.log("starting poolvr...");
    pyserver.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    //POOLVR.config.onfullscreenchange = function (fullscreen) { if (fullscreen) autoPosition(avatar, 2); };

    var UP = new THREE.Vector3(0, 1, 0);
    POOLVR.config.onResetVRSensor = function () {
        toolRoot.position.applyAxisAngle(UP, -avatar.heading);
        scene.updateMatrixWorld();
    };

    var menu = setupMenu(avatar);
    POOLVR.config.menu = menu;

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
    POOLVR.ballBodies = [];
    POOLVR.ballMeshes = [];
    scene.traverse(function (node) {
        if (node.name.startsWith('ball ')) {
            node.body.material = POOLVR.ballMaterial;
            node.body.bounces = 0;
            POOLVR.ballMeshes.push(node);
            POOLVR.ballBodies.push(node.body);
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
    var leftRoot       = toolStuff.leftRoot;
    var rightRoot      = toolStuff.rightRoot;

    var dynamicBodies = app.world.bodies.filter(function(body) { return body.mesh && body.type === CANNON.Body.DYNAMIC; });

    var animateMousePointer = setupMouse(avatar);

    app.start( animate(leapController, animateLeap,
                       dynamicBodies, ballStripeMeshes,
                       toolRoot, POOLVR.config.shadowMap,
                       toolStuff.stickMesh, toolStuff.tipMesh,
                       POOLVR.config.H_table, POOLVR.floorMaterial, POOLVR.ballMaterial,
                       animateMousePointer, leftRoot, rightRoot) );


    startTutorial();
}


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


function startTutorial() {
    "use strict";
    synthSpeaker.speak("Hello.  Welcome to pool-ver", function () {
        textGeomLogger.log("HELLO.  WELCOME TO POOLVR.");
    });

    synthSpeaker.speak("Please wave a stick-like object in front of your Leap Motion controller.", function () {
        textGeomLogger.log("PLEASE WAVE A STICK-LIKE OBJECT IN FRONT OF YOUR");
        textGeomLogger.log("LEAP MOTION CONTROLLER.");
    });

    synthSpeaker.speak("Keep the stick within the interaction box when you want to make contact with.  A ball.", function () {
        textGeomLogger.log("KEEP THE STICK WITHIN THE INTERACTION BOX WHEN YOU WANT");
        textGeomLogger.log("TO MAKE CONTACT WITH A BALL.");
    });

    // synthSpeaker.speak("You moved a ball.  Good job.");
}


var animate = function (leapController, animateLeap,
                        dynamicBodies, ballStripeMeshes,
                        toolRoot, shadowMap,
                        stickMesh, tipMesh,
                        H_table, floorMaterial, ballMaterial,
                        animateMousePointer,
                        leftRoot, rightRoot) {
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
        headingQuat = new THREE.Quaternion(),
        // pitchQuat = new THREE.Quaternion(),
        walkSpeed = 0.333,
        floatSpeed = 0.1;
    var lastFrameID;
    var lt = 0;
    avatar.heading = avatar.heading || 0;
    var doAutoPosition = true;
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

        avatar.heading += -0.8 * dt * (app.keyboard.getValue("turnLeft") + app.keyboard.getValue("turnRight"));
        if (avatar.floatMode) {
            floatUp += app.gamepad.getValue("float");
            strafe += app.gamepad.getValue("strafe");
        } else {
            drive += app.gamepad.getValue("drive");
            avatar.heading += 0.8 * dt * app.gamepad.getValue("dheading");
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
        var toolRotY = 0;
        if (avatar.toolMode) {
            toolFloat += app.gamepad.getValue("toolFloat");
            toolStrafe += app.gamepad.getValue("toolStrafe");
        } else {
            toolDrive -= app.gamepad.getValue("toolDrive");
            toolRotY += app.gamepad.getValue("toolStrafe");
        }

        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {
            animateLeap(frame, dt);
            lastFrameID = frame.id;
        }


        app.world.step(1/75, dt, 4);

        // var awakes = false;
        for (var j = 0; j < dynamicBodies.length; ++j) {
            var body = dynamicBodies[j];
            body.mesh.position.copy(body.position);
            // if (body.sleepState === CANNON.Body.AWAKE) {
            //     awakes = true;
            //     body.mesh.position.copy(body.position);
            //     doAutoPosition = true;
            // }
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
                    if (!synthSpeaker.speaking) {
                        synthSpeaker.speak(ballBody.mesh.name + " hit the floor.");
                    }
                    // textGeomLogger.log(ballBody.mesh.name + " HIT THE FLOOR!");
                } else if (ballBody.bounces === 7) {
                    ballBody.sleep();
                    POOLVR.deadBalls.push(POOLVR.ballBodies.indexOf(ballBody));
                    // autoPosition(avatar, 5);
                }
            }
        }
        // if (doAutoPosition && awakes === false) {
        //     autoPosition(avatar);
        //     doAutoPosition = false;
        // }

        for (j = 0; j < ballStripeMeshes.length; j++) {
            var mesh = ballStripeMeshes[j];
            mesh.quaternion.copy(mesh.parent.body.quaternion);
        }

        avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
        // avatar.quaternion.multiply(pitchQuat);

        avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
        avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
        avatar.position.y += dt * floatUp;

        toolRoot.position.x += 0.25  * dt * toolStrafe;
        toolRoot.position.z += -0.25 * dt * toolDrive;
        toolRoot.position.y += 0.25  * dt * toolFloat;
        leftRoot.position.copy(toolRoot.position);
        rightRoot.position.copy(toolRoot.position);

        toolRoot.rotation.y += 0.1 * dt * toolRotY;
        leftRoot.rotation.y = rightRoot.rotation.y = toolRoot.rotation.y;

        if (!shadowMap) {
            stickShadow.position.set(stickMesh.position.x,
                (H_table + 0.001 - toolRoot.position.y - avatar.position.y) / toolRoot.scale.y,
                stickMesh.position.z);
            stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        }

        //if (animateMousePointer) animateMousePointer(t);

        lt = t;
    }

    return animate;
};


POOLVR.nextBall = 1;
POOLVR.nextVector = new THREE.Vector3();
POOLVR.horizontal = new THREE.Vector3();
POOLVR.deadBalls = [];
function autoPosition(avatar) {
    "use strict";

    if (POOLVR.deadBalls.length > 0) {
        POOLVR.nextBall = POOLVR.deadBalls[0] + 1;
        for (var iball = 1; iball < POOLVR.deadBalls.length; iball++) {
            POOLVR.nextBall = Math.min(POOLVR.nextBall, POOLVR.deadBalls[iball] + 1);
        }
    }

    textGeomLogger.log("YOU ARE BEING AUTO-POSITIONED.");
    textGeomLogger.log("NEXT BALL: " + POOLVR.nextBall);
    if (synthSpeaker.speaking === false) {
        synthSpeaker.speak("You are being auto-positioned.");
    }
    pyserver.log("autoPositioning, next ball: " + POOLVR.nextBall);
    //pyserver.log(JSON.stringify(POOLVR.ballMeshes[POOLVR.nextBall], undefined, 2));
    POOLVR.nextVector.copy(POOLVR.ballMeshes[POOLVR.nextBall].position);
    POOLVR.nextVector.sub(POOLVR.ballMeshes[0].position);
    POOLVR.nextVector.y = 0;
    POOLVR.nextVector.normalize();
    // reposition and move back:
    avatar.position.x = POOLVR.ballMeshes[0].position.x;
    avatar.position.z = POOLVR.ballMeshes[0].position.z;
    POOLVR.nextVector.multiplyScalar(0.5);
    avatar.position.sub(POOLVR.nextVector);
    avatar.position.y = POOLVR.config.H_table + 0.3;
    // look at next ball:
    POOLVR.horizontal.copy(POOLVR.ballMeshes[POOLVR.nextBall].position);
    POOLVR.horizontal.y = avatar.position.y;
    avatar.lookAt(POOLVR.horizontal);
    scene.updateWorldMatrix();
    avatar.heading = -avatar.rotation.y;
}
