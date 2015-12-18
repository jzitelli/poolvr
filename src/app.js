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


POOLVR.ballMeshes = [];
POOLVR.ballBodies = [];
POOLVR.initialPositions = [];
POOLVR.onTable = [false,
                  true, true, true, true, true, true, true,
                  true,
                  true, true, true, true, true, true, true];
POOLVR.nextBall = 1;

// POOLVR.config.onfullscreenchange = function (fullscreen) {
//     if (fullscreen) pyserver.log('going fullscreen');
//     else pyserver.log('exiting fullscreen');
// };
var synthSpeaker = new SynthSpeaker({volume: 0.75, rate: 0.8, pitch: 0.5});

var textGeomLogger = new TextGeomLogger();
avatar.add(textGeomLogger.root);
textGeomLogger.root.position.set(-2.5, 1.0, -3.5);


function resetTable() {
    "use strict";
    POOLVR.ballBodies.forEach(function (body, ballNum) {
        body.position.copy(POOLVR.initialPositions[ballNum]);
        body.wakeUp();
    });
    if (synthSpeaker.speaking === false) {
        synthSpeaker.speak("Table reset.");
    }
    POOLVR.nextBall = 1;
    textGeomLogger.log("TABLE RESET.");
}


var autoPosition = ( function () {
    "use strict";
    var nextVector = new THREE.Vector3();
    var UP = new THREE.Vector3(0, 1, 0);
    function autoPosition(avatar) {
        textGeomLogger.log("YOU ARE BEING AUTO-POSITIONED.");
        // if (synthSpeaker.speaking === false) {
        //     synthSpeaker.speak("You are being auto-positioned.");
        // }
        nextVector.copy(POOLVR.ballMeshes[POOLVR.nextBall].position);
        nextVector.sub(POOLVR.ballMeshes[0].position);
        nextVector.y = 0;
        nextVector.normalize();
        // reposition and move back:
        avatar.position.x = POOLVR.ballMeshes[0].position.x;
        avatar.position.z = POOLVR.ballMeshes[0].position.z;
        nextVector.multiplyScalar(0.42);
        avatar.position.sub(nextVector);
        // avatar.position.y = POOLVR.config.H_table + 0.24;
        avatar.heading = Math.atan2(
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.x - avatar.position.x),
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.z - avatar.position.z)
        );
        avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
        avatar.updateMatrixWorld();

        nextVector.copy(toolRoot.position);
        avatar.localToWorld(nextVector);
        nextVector.sub(POOLVR.ballMeshes[0].position);
        nextVector.y = 0;
        avatar.position.sub(nextVector);

        pyserver.log('position: ' + avatar.position.x +', ' + avatar.position.y + ', ' +  avatar.position.z);
    }
    return autoPosition;
} )();


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
        textGeomLogger.log("TO MAKE CONTACT WITH A BALL...");
    });
}



var animate = function (leapController, animateLeap,
                        toolRoot, shadowMap,
                        stickMesh, tipMesh,
                        H_table,
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
        //headingQuat = new THREE.Quaternion(),
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
        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {
            animateLeap(frame, dt);
            lastFrameID = frame.id;
        }

        app.world.step(1/75, dt, 5);

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
            //     pitch -= 0.8 * dt * (app.keyboard.getValue("pitchUp") + app.keyboard.getValue("pitchDown"));
            //     pitchQuat.setFromAxisAngle(RIGHT, pitch);
            // }
            // var cosPitch = Math.cos(pitch),
            //     sinPitch = Math.sin(pitch);

            avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
            // headingQuat.setFromAxisAngle(UP, heading);
            // avatar.quaternion.multiply(headingQuat);
            // avatar.quaternion.multiply(pitchQuat);

            avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
            avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
            avatar.position.y += dt * floatUp;
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

    POOLVR.config.keyboardCommands = POOLVR.keyboardCommands;
    POOLVR.config.gamepadCommands = POOLVR.gamepadCommands;

    var toolOptions = {
        // ##### Desktop mode (default): #####
        transformOptions : POOLVR.config.transformOptions, // || {vr: 'desktop'},
        useBasicMaterials: POOLVR.config.useBasicMaterials,
        toolLength       : POOLVR.config.toolLength,
        toolRadius       : POOLVR.config.toolRadius,
        toolMass         : POOLVR.config.toolMass,
        toolOffset       : POOLVR.config.toolOffset,
        toolRotation     : POOLVR.config.toolRotation,
        tipShape         : POOLVR.config.tipShape
    };
    if (POOLVR.config.vrLeap) {
        // ##### Leap Motion VR tracking mode: #####
        toolOptions.transformOptions = {vr: true, effectiveParent: app.camera};
    }
    // toolOptions.onStreamingStarted = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS CONNECTED.  GOOD JOB."); };
    // toolOptions.onStreamingStopped = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS DISCONNECTED!  HOW WILL YOU PLAY?!"); };
    pyserver.log('toolOptions =\n' + JSON.stringify(toolOptions, undefined, 2));


    var UP = new THREE.Vector3(0, 1, 0);
    POOLVR.config.onResetVRSensor = function (lastRotation, lastPosition) {
        pyserver.log('updating the toolRoot position...');
        app.camera.updateMatrix();
        avatar.heading += lastRotation - app.camera.rotation.y;
        toolRoot.rotation.y -= (lastRotation - app.camera.rotation.y);
        toolRoot.position.sub(lastPosition);
        toolRoot.position.applyAxisAngle(UP, -lastRotation + app.camera.rotation.y);
        toolRoot.position.add(app.camera.position);
        toolRoot.updateMatrix();
    };


    var menu = setupMenu(avatar);
    //POOLVR.config.menu = menu;


    app = new WebVRApplication("poolvr", avatar, scene, POOLVR.config);
    avatar.add(app.camera);
    scene.add(avatar);


    THREE.py.CANNONize(scene, app.world);

    app.world.addMaterial(POOLVR.ballMaterial);
    app.world.addMaterial(POOLVR.playableSurfaceMaterial);
    app.world.addMaterial(POOLVR.cushionMaterial);
    app.world.addMaterial(POOLVR.floorMaterial);
    app.world.addMaterial(POOLVR.tipMaterial);
    app.world.addContactMaterial(POOLVR.ballBallContactMaterial);
    app.world.addContactMaterial(POOLVR.ballPlayableSurfaceContactMaterial);
    app.world.addContactMaterial(POOLVR.ballCushionContactMaterial);
    app.world.addContactMaterial(POOLVR.floorBallContactMaterial);
    app.world.addContactMaterial(POOLVR.tipBallContactMaterial);


    toolOptions.keyboard = app.keyboard;
    toolOptions.gamepad = app.gamepad;

    var toolStuff = addTool(avatar, app.world, toolOptions);

    var leapController = toolStuff.leapController;
    var stickMesh      = toolStuff.stickMesh;
    var animateLeap    = toolStuff.animateLeap;
    var leftRoot       = toolStuff.leftRoot;
    var rightRoot      = toolStuff.rightRoot;
    var tipBody        = toolStuff.tipBody;
    toolRoot           = toolStuff.toolRoot;

    tipBody.material = POOLVR.tipMaterial;


    // referenced by cannon.js callbacks:
    var ballStripeMeshes = [],
        ballShadowMeshes = [];
    // first pass:
    scene.traverse(function (node) {
        if (node instanceof THREE.Mesh) {
            var ballNum;
            if (node.name.startsWith('ball ')) {
                ballNum = Number(node.name.split(' ')[1]);
                POOLVR.ballMeshes[ballNum] = node;
                POOLVR.ballBodies[ballNum] = node.body;
                POOLVR.initialPositions[ballNum] = new THREE.Vector3().copy(node.position);
                node.body.bounces = 0;
                node.body.ballNum = ballNum;
                node.body.material = POOLVR.ballMaterial;
            }
            else if (node.name.startsWith('ballStripeMesh')) {
                ballNum = Number(node.name.split(' ')[1]);
                ballStripeMeshes[ballNum] = node;
            }
            else if (node.name.startsWith('ballShadowMesh')) {
                ballNum = Number(node.name.split(' ')[1]);
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
        if (node instanceof THREE.Mesh && node.name.startsWith('ball ')) {
            var ballBum = node.body.ballNum;
            var body = node.body;
            var mesh = node;
            body.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function(evt) {
                var body = evt.body;
                var contact = evt.contact;
                // ball-ball collision:
                if (contact.bi === body && contact.bi.material === contact.bj.material) {
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
                if (shadowMesh) {
                    shadowMesh.position.y = -(this.position.y - H_table) + 0.0004;
                }
                // var awakes = false;
                // for (var j = 0; j < ballBodies.length; ++j) {
                //     // if (body.sleepState === CANNON.Body.AWAKE) {
                //     //     awakes = true;
                //     //     doAutoPosition = true;
                //     // }
                // }
            }.bind(mesh));
        }
        else if (node instanceof THREE.Mesh && node.name === 'floorMesh') {
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
                        POOLVR.onTable[body.ballNum] = false;
                        POOLVR.nextBall = POOLVR.onTable.indexOf(true);
                        if (POOLVR.nextBall === -1) {
                            synthSpeaker.speak("You cleared the table.  Well done.");
                            textGeomLogger.log("YOU CLEARED THE TABLE.  WELL DONE.");
                            resetTable();
                        }
                    } else if (body.bounces === 7) {
                        body.sleep();
                        // autoPosition(avatar, 5);
                    }
                }
            });
        }
    });
    var tipEventCounter = 0;
    tipBody.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {
        tipEventCounter++;
        if (tipEventCounter === 1) {
            synthSpeaker.speak("You moved a ball.  Good job.");
        }
        else if (tipEventCounter === 16) {
            synthSpeaker.speak("Hi.");
        }
        else if (tipEventCounter === 8) {
            // synthSpeaker.speak("I have something else to tell you. Again.");
        }
        else if (tipEventCounter === 30) {
            // synthSpeaker.speak("I have something else to tell you. For the third, and final time.");
        }
    });

    var mouseStuff = setupMouse(avatar);
    var animateMousePointer = mouseStuff.animateMousePointer;

    app.start( animate(leapController, animateLeap,
                       toolRoot, POOLVR.config.shadowMap,
                       toolStuff.stickMesh, toolStuff.tipMesh,
                       POOLVR.config.H_table,
                       animateMousePointer) );

    startTutorial();
}
