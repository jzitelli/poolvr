var app;

var scene = THREE.py.parse(JSON_SCENE);

var avatar = new THREE.Object3D();
avatar.position.y = 1.1;
avatar.position.z = 1.86;

var textGeomLogger = textGeomLogger || new TextGeomLogger();
avatar.add(textGeomLogger.root);
textGeomLogger.root.position.set(-2.5, 1.5, -3.5);

var synthSpeaker = new SynthSpeaker({volume: 0.75, rate: 0.8, pitch: 0.5});

POOLVR.ballMeshes = [];
POOLVR.ballBodies = [];
POOLVR.initialPositions = [];
POOLVR.nextBall = 1;
POOLVR.config.onfullscreenchange = function (fullscreen) {
    if (fullscreen) pyserver.log('going fullscreen');
    else pyserver.log('exiting fullscreen');
};


POOLVR.nextVector = new THREE.Vector3();
POOLVR.horizontal = new THREE.Vector3();
function autoPosition(avatar) {
    "use strict";
    textGeomLogger.log("YOU ARE BEING AUTO-POSITIONED.");
    if (synthSpeaker.speaking === false) {
        synthSpeaker.speak("You are being auto-positioned.");
    }
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
    scene.updateMatrixWorld();
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
    synthSpeaker.speak("Hello.  Welcome. To. Pool-ver.", function () {
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
                        ballBodies, ballStripeMeshes,
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
        headingQuat = new THREE.Quaternion(),
        //RIGHT = new THREE.Vector3(1, 0, 0),
        // pitchQuat = new THREE.Quaternion(),
        walkSpeed = 0.333,
        floatSpeed = 0.1;
    var lastFrameID;
    var lt = 0;
    //var doAutoPosition = true;
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

        var heading = avatar.rotation.y;
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


        app.world.step(1/75, dt, 5);

        avatar.quaternion.setFromAxisAngle(UP, heading);
        // avatar.quaternion.multiply(pitchQuat);

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

    POOLVR.config.keyboardCommands = POOLVR.keyboardCommands;
    POOLVR.config.gamepadCommands = POOLVR.gamepadCommands;

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
    // toolOptions.onStreamingStarted = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS CONNECTED.  GOOD JOB."); };
    // toolOptions.onStreamingStopped = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS DISCONNECTED!  HOW WILL YOU PLAY?!"); };
    pyserver.log('toolOptions =\n' + JSON.stringify(toolOptions, undefined, 2));


    //var UP = new THREE.Vector3(0, 1, 0);
    POOLVR.config.onResetVRSensor = function (dheading, lastPosition) {
        // TODO: reposition toolRoot correctly
        // toolRoot.position.applyAxisAngle(UP, -dheading);
        // toolRoot.position.sub(lastPosition);
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


    // referenced by cannon.js callbacks:
    var onTable = [false,
                   true, true, true, true, true, true, true,
                   true,
                   true, true, true, true, true, true, true],
        ballStripeMeshes = [],
        ballShadowMeshes = [];
    // first pass:
    scene.traverse(function (node) {
        if (node instanceof THREE.Mesh) {
            if (node.name.startsWith('ball ')) {
                var ballNum = Number(node.name.split(' ')[1]);
                POOLVR.ballMeshes[ballNum] = node;
                POOLVR.ballBodies[ballNum] = node.body;
                POOLVR.initialPositions[ballNum] = new THREE.Vector3().copy(node.position);
                node.body.bounces = 0;
                node.body.ballNum = ballNum;
                node.body.material = POOLVR.ballMaterial;
            }
            else if (node.name.startsWith('ballStripeMesh')) {
                var ballNum = Number(node.name.split(' ')[1]);
                ballStripeMeshes[ballNum] = node;
            }
            else if (node.name.startsWith('ballShadowMesh')) {
                var ballNum = Number(node.name.split(' ')[1]);
                ballShadowMeshes[ballNum] = node;
            }

            else if (node.name === 'playableSurfaceMesh') {
                node.body.material = POOLVR.playableSurfaceMaterial;
            }

            else if (node.name.endsWith('CushionMesh')) {
                node.body.material = POOLVR.cushionMaterial;
            }

            else if (node.name === 'floorMesh') {
                node.body.material = POOLVR.floorMaterial;
            }
        }
    });
    // second pass:
    var H_table     = POOLVR.config.H_table,
        ball_radius = POOLVR.config.ball_diameter / 2;
    scene.traverse(function (node) {
        if (node instanceof THREE.Mesh) {
            if (node.name.startsWith('ball ')) {
                // ball-ball collision callback:
                node.body.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function(evt) {
                    var body = evt.body;
                    var contact = evt.contact;
                    if (contact.bi === body && contact.bi.material === contact.bj.material) {
                        // ball-ball collision:
                        var impactVelocity = contact.getImpactVelocityAlongNormal();
                        playCollisionSound(impactVelocity);
                    }
                });
                // post step callback: reposition mesh, shadow, stripe
                app.world.addEventListener("postStep", function () {
                    this.position.copy(this.body.position);
                    var ballNum = this.body.ballNum;
                    var stripeMesh = ballStripeMeshes[ballNum];
                    if (stripeMesh !== undefined) {
                        stripeMesh.quaternion.copy(this.body.quaternion);
                    }
                    var shadowMesh = ballShadowMeshes[ballNum];
                    shadowMesh.position.y = -(this.position.y - H_table) + 0.0004;
                    // var awakes = false;
                    // for (var j = 0; j < ballBodies.length; ++j) {
                    //     // if (body.sleepState === CANNON.Body.AWAKE) {
                    //     //     awakes = true;
                    //     //     doAutoPosition = true;
                    //     // }
                    // }
                }.bind(node));
            } else if (node.name === 'floorMesh') {
                // ball-floor collision
                node.body.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {
                    var body = evt.body;
                    if (body.ballNum === 0) {
                        textGeomLogger.log("SCRATCH.");
                        synthSpeaker.speak("Scratch.");
                        body.position.copy(POOLVR.initialPositions[0]);
                        body.velocity.set(0, 0, 0);
                    } else {
                        body.bounces++;
                        if (body.bounces === 1) {
                            textGeomLogger.log(body.mesh.name + " HIT THE FLOOR!");
                            playPocketedSound();
                            onTable[body.ballNum] = false;
                            POOLVR.nextBall = onTable.indexOf(true);
                            if (POOLVR.nextBall === -1) {
                                synthSpeaker.speak("You cleared the table.  Well done.");
                                textGeomLogger.log("YOU CLEARED THE TABLE.  WELL DONE.");
                            }
                        } else if (body.bounces === 7) {
                            body.sleep();
                            // autoPosition(avatar, 5);
                        }
                    }
                });

            }

        }
    });

    var toolStuff = addTool(avatar, app.world, toolOptions);
    var toolRoot       = toolStuff.toolRoot;
    var leapController = toolStuff.leapController;
    var stickMesh      = toolStuff.stickMesh;
    var animateLeap    = toolStuff.animateLeap;
    var leftRoot       = toolStuff.leftRoot;
    var rightRoot      = toolStuff.rightRoot;

    var mouseStuff = setupMouse(avatar);
    var animateMousePointer = mouseStuff.animateMousePointer;
    var mousePointerMesh    = mouseStuff.mousePointerMesh;

    app.start( animate(leapController, animateLeap,
                       POOLVR.ballBodies, ballStripeMeshes,
                       toolRoot, POOLVR.config.shadowMap,
                       toolStuff.stickMesh, toolStuff.tipMesh,
                       POOLVR.config.H_table, POOLVR.floorMaterial, POOLVR.ballMaterial,
                       animateMousePointer,
                       leftRoot, rightRoot) );


    startTutorial();
}
