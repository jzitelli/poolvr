var app;

var scene = CrapLoader.parse(JSON_SCENE);

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

    CrapLoader.CANNONize(scene, app.world);

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

    // setupMouse();

    // setupMenu(avatar);

    app.start( animate(leapController, animateLeap,
                       dynamicBodies, ballStripeMeshes,
                       toolRoot, POOLVR.config.shadowMap,
                       toolStuff.stickMesh, toolStuff.tipMesh,
                       POOLVR.config.H_table, POOLVR.floorMaterial, POOLVR.ballMaterial) );

    startTutorial();
}


var playCollisionSound = (function () {
    "use strict";
    var ballBallBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', 'sounds/ballBall.ogg', true);
    request.onload = function() {
        WebVRSound.audioContext.decodeAudioData(request.response, function(buffer) {
            ballBallBuffer = buffer;
        });
    };
    request.send();
    var playCollisionSound = function (v) {
        WebVRSound.playBuffer(ballBallBuffer, Math.min(1, v / 5));
    };
    return playCollisionSound;
})();


function setupMouse() {
    // function lockChangeAlert() {
    //     if ( document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement ) {
    //         pyserver.log('pointer lock status is now locked');
    //         // mousePointerMesh.visible = true;
    //     } else {
    //         pyserver.log('pointer lock status is now unlocked');
    //         // mousePointerMesh.visible = false;
    //     }
    // }
    // if ("onpointerlockchange" in document) {
    //   document.addEventListener('pointerlockchange', lockChangeAlert, false);
    // } else if ("onmozpointerlockchange" in document) {
    //   document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    // } else if ("onwebkitpointerlockchange" in document) {
    //   document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
    // }

    // avatar.add(mousePointerMesh);
    // mousePointerMesh.position.set(0, 0, -2);
    // var xMax = 2, xMin = -2,
    //     yMax = 1, yMin = -1;
    // window.addEventListener("mousemove", function (evt) {
    //     if (!mousePointerMesh.visible) return;
    //     var dx = evt.movementX,
    //         dy = evt.movementY;
    //     mousePointerMesh.position.x += 0.0004*dx;
    //     mousePointerMesh.position.y -= 0.0004*dy;
    //     if (mousePointerMesh.position.x > xMax) mousePointerMesh.position.x = xMax;
    //     else if (mousePointerMesh.position.x < xMin) mousePointerMesh.position.x = xMin;
    //     if (mousePointerMesh.position.y > yMax) mousePointerMesh.position.y = yMax;
    //     else if (mousePointerMesh.position.y < yMin) mousePointerMesh.position.y = yMin;
    // });

    // POOLVR.mouseParticleGroup = new SPE.Group({
    //     texture: {value: THREE.ImageUtils.loadTexture('images/particle.png')},
    //     maxParticleCount: 50
    // });
    // POOLVR.mouseParticleEmitter = new SPE.Emitter({
    //     maxAge: {value: 0.5},
    //     position: {value: new THREE.Vector3(),
    //                spread: new THREE.Vector3()},
    //     velocity: {value: new THREE.Vector3(0, 0, 0),
    //                spread: new THREE.Vector3(0.3, 0.3, 0.3)},
    //     color: {value: [new THREE.Color('white'), new THREE.Color('red')]},
    //     size: {value: 0.075},
    //     particleCount: 50
    // });
    // POOLVR.mouseParticleGroup.addEmitter(POOLVR.mouseParticleEmitter);
    // POOLVR.mousePointerMesh = POOLVR.mouseParticleGroup.mesh;
    // POOLVR.mousePointerMesh.visible = false;
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

    synthSpeaker.speak("Keep the stick within the interaction box when you want to make contact with a ball.", function () {
        textGeomLogger.log("KEEP THE STICK WITHIN THE INTERACTION BOX WHEN YOU WANT TO MAKE CONTACT WITH A BALL.");
    });

    // synthSpeaker.speak("You moved a ball.  Good job.");
}


var animate = function (leapController, animateLeap,
                        dynamicBodies, ballStripeMeshes,
                        toolRoot, shadowMap,
                        stickMesh, tipMesh,
                        H_table, floorMaterial, ballMaterial) {
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
        // pitch = 0,
        // pitchQuat = new THREE.Quaternion(),
        heading = 0,
        headingQuat = new THREE.Quaternion(),
        walkSpeed = 0.333,
        floatSpeed = 0.1;
    var lastFrameID;
    var lt = 0;
    var raycaster = new THREE.Raycaster();
    function animate(t) {
        requestAnimationFrame(animate);
        var dt = (t - lt) * 0.001;
        lt = t;
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

        // if (mouseParticleGroup) mouseParticleGroup.tick(dt);

    }

    return animate;
};


    // if (mousePointerMesh && avatar.picking) {
    //     origin.set(0, 0, 0);
    //     direction.set(0, 0, 0);
    //     direction.subVectors(mousePointerMesh.localToWorld(direction), camera.localToWorld(origin)).normalize();
    //     raycaster.set(origin, direction);
    //     var intersects = raycaster.intersectObjects(app.pickables);
    //     if (intersects.length > 0) {
    //         if (app.picked != intersects[0].object) {
    //             if (app.picked) app.picked.material.color.setHex(app.picked.currentHex);
    //             app.picked = intersects[0].object;
    //             app.picked.currentHex = app.picked.material.color.getHex();
    //             app.picked.material.color.setHex(0xff4444); //0x44ff44);
    //         }
    //     } else {
    //         if (app.picked) app.picked.material.color.setHex(app.picked.currentHex);
    //         app.picked = null;
    //     }
    // }
