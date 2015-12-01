// TODO requires three.js, CANNON.js, settings.js, cardboard.js, WebVRApplication.js, CrapLoader.js, LeapTools.js, pyserver.js
// TODO restructure fdsgbfng

var app;

var scene = CrapLoader.parse(JSON_SCENE);
var H_table = 0.74295; // TODO: coordinate w/ server

var avatar = avatar || new THREE.Object3D();
avatar.position.y = 1.2;
avatar.position.z = 1.9;

var ballMeshes       = [],
    ballStripeMeshes = [];
var stickMesh, tipBody, toolRoot, tipMesh;
var stickShadow, stickShadowMesh;
var dynamicBodies,
    ballBodies;

var mouseParticleGroup = new SPE.Group({
    texture: {value: THREE.ImageUtils.loadTexture('images/particle.png')},
    maxParticleCount: 50});
var mouseParticleEmitter = new SPE.Emitter({maxAge: {value: 0.5},
                                            position: {value: new THREE.Vector3(),
                                                       spread: new THREE.Vector3()},
                                            velocity: {value: new THREE.Vector3(0, 0, 0),
                                                       spread: new THREE.Vector3(0.3, 0.3, 0.3)},
                                            color: {value: [new THREE.Color('white'), new THREE.Color('red')]},
                                            size: {value: 0.1},
                                            particleCount: 50});
mouseParticleGroup.addEmitter(mouseParticleEmitter);
var mousePointer = mouseParticleGroup.mesh;
mousePointer.visible = false;

// TODO: load from JSON config
var ballMaterial            = new CANNON.Material();
var ballBallContactMaterial = new CANNON.ContactMaterial(ballMaterial, ballMaterial, {restitution: 0.91, friction: 0.2});
var playableSurfaceMaterial            = new CANNON.Material();
var ballPlayableSurfaceContactMaterial = new CANNON.ContactMaterial(ballMaterial, playableSurfaceMaterial, {restitution: 0.33, friction: 0.1});
var cushionMaterial            = new CANNON.Material();
var ballCushionContactMaterial = new CANNON.ContactMaterial(ballMaterial, cushionMaterial, {restitution: 0.8, friction: 0.4});
var floorMaterial            = new CANNON.Material();
var floorBallContactMaterial = new CANNON.ContactMaterial(floorMaterial, ballMaterial, {restitution: 0.88, friction: 0.4});

function setupMenu(parent) {
    "use strict";
    var textGeom = new THREE.TextGeometry('RESET TABLE', {font: 'anonymous pro', size: 0.2, height: 0});
    var textMesh = new THREE.Mesh(textGeom);
    textMesh.position.set(0, 1, -2);
    parent.add(textMesh);
}

var leapController;
var animateLeap;

function onLoad() {
    "use strict";
    pyserver.log("starting poolvr...");

    pyserver.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    POOLVR.config.keyboardCommands = POOLVR.keyboardCommands;
    POOLVR.config.gamepadCommands = POOLVR.gamepadCommands;

    app = new WebVRApplication("poolvr", avatar, scene, POOLVR.config);
    avatar.add(app.camera);
    scene.add(avatar);

    function lockChangeAlert() {
        if ( document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement ) {
            pyserver.log('pointer lock status is now locked');
            // mousePointer.visible = true;
        } else {
            pyserver.log('pointer lock status is now unlocked');
            // mousePointer.visible = false;
        }
    }
    if ("onpointerlockchange" in document) {
      document.addEventListener('pointerlockchange', lockChangeAlert, false);
    } else if ("onmozpointerlockchange" in document) {
      document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    } else if ("onwebkitpointerlockchange" in document) {
      document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
    }
    avatar.add(mousePointer);
    mousePointer.position.set(0, 0, -2);
    app.mousePointer = mousePointer;
    app.mouseParticleGroup = mouseParticleGroup;
    var xMax = 2, xMin = -2,
        yMax = 1, yMin = -1;
    // window.addEventListener("mousemove", function (evt) {
    //     if (!mousePointer.visible) return;
    //     var dx = evt.movementX,
    //         dy = evt.movementY;
    //     mousePointer.position.x += 0.0004*dx;
    //     mousePointer.position.y -= 0.0004*dy;
    //     if (mousePointer.position.x > xMax) mousePointer.position.x = xMax;
    //     else if (mousePointer.position.x < xMin) mousePointer.position.x = xMin;
    //     if (mousePointer.position.y > yMax) mousePointer.position.y = yMax;
    //     else if (mousePointer.position.y < yMin) mousePointer.position.y = yMin;
    // });

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

    app.world.addContactMaterial(ballBallContactMaterial);
    app.world.addContactMaterial(ballPlayableSurfaceContactMaterial);
    app.world.addContactMaterial(ballCushionContactMaterial);
    app.world.addContactMaterial(floorBallContactMaterial);

    scene.traverse(function (node) {
        if (node.name.startsWith('ballMesh')) {
            node.body.material = ballMaterial;
            ballMeshes.push(node);
        }
        else if (node.name.startsWith('ballStripeMesh')) {
            ballStripeMeshes.push(node);
        }
        else if (node.name.startsWith('playableSurfaceMesh')) {
            node.body.material = playableSurfaceMaterial;
        }
        else if (node.name.endsWith('CushionMesh')) {
            node.body.material = cushionMaterial;
        }
        else if (node.name === 'floorMesh') {
            node.body.material = floorMaterial;
        }
    });

    var textGeomLogger = new TextGeomLogger();
    app.textGeomLogger = textGeomLogger;
    textGeomLogger.root.position.set(-2.75, 1.5, -3.5);
    avatar.add(textGeomLogger.root);

    var toolOptions = {
        // ##### Desktop mode (default): #####
        transformOptions : POOLVR.config.transformOptions, // || {vr: 'desktop'},
        leapDisabled     : POOLVR.config.leapDisabled,
        leapHandsDisabled: POOLVR.config.leapHandsDisabled,
        useBasicMaterials: POOLVR.config.useBasicMaterials,
        toolLength       : POOLVR.config.toolLength || 0.5,
        toolRadius       : POOLVR.config.toolRadius || 0.013
    };

    if (POOLVR.config.leapVR) {
        // ##### Leap Motion VR tracking mode: #####
        toolOptions.transformOptions = {vr: true, effectiveParent: app.camera};
    }

    pyserver.log('toolOptions =\n' + JSON.stringify(toolOptions, undefined, 2));

    // toolOptions.onStreamingStarted = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS CONNECTED.  GOOD JOB."); };
    // toolOptions.onStreamingStopped = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS DISCONNECTED!  HOW WILL YOU PLAY?!"); };

    var toolStuff = addTool(avatar, app.world, toolOptions);
    stickMesh      = toolStuff.stickMesh;
    tipMesh        = toolStuff.tipMesh;
    tipBody        = toolStuff.tipBody;
    toolRoot       = toolStuff.toolRoot;
    leapController = toolStuff.leapController;
    animateLeap    = toolStuff.animateLeap;

    if (!app.config.shadowMap) {
        // create shadow mesh from projection:
        stickShadow = new THREE.Object3D();
        stickShadow.position.y = -avatar.position.y - toolRoot.position.y + H_table + 0.001;
        stickShadow.scale.set(1, 0.001, 1);
        toolRoot.add(stickShadow);

        var stickShadowMaterial = new THREE.MeshBasicMaterial({color: 0x002200});

        var stickShadowGeom = stickMesh.geometry.clone();
        var toolLength = toolOptions.toolLength;

        stickShadowMesh = new THREE.Mesh(stickShadowGeom, stickShadowMaterial);
        stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        stickShadow.add(stickShadowMesh);

        tipMesh.geometry.computeBoundingSphere();
        var tipShadowGeom = new THREE.CircleBufferGeometry(tipMesh.geometry.boundingSphere.radius).rotateX(-Math.PI / 2);
        var tipShadowMesh = new THREE.Mesh(tipShadowGeom, stickShadowMaterial);
        stickShadow.add(tipShadowMesh);
    }

    dynamicBodies = app.world.bodies.filter(function(body) { return body.mesh && body.type === CANNON.Body.DYNAMIC; });
    ballBodies = dynamicBodies.filter(function(body) { return body.mesh.name.startsWith('ballMesh'); });

    var ballBallBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', 'sounds/ballBall.ogg', true);
    request.onload = function() {
        // chome doesn't support promise-based method?
        // app.audioContext.decodeAudioData(request.response).then(function(buffer) {
        //     ballBallBuffer = buffer;
        // });
        app.audioContext.decodeAudioData(request.response, function(buffer) {
            ballBallBuffer = buffer;
        });
    };
    request.send();
    app.playCollisionSound = function () {
        var source = app.audioContext.createBufferSource();
        source.connect(app.gainNode);
        source.buffer = ballBallBuffer;
        source.start(0);
    };

    // setupMenu(avatar);

    app.synthSpeaker = new SynthSpeaker({volume: 0.5, rate: 0.8, pitch: 0.7});

    textGeomLogger.log("HELLO.  WELCOME TO POOLVR.");
    app.synthSpeaker.speak("Hello.  Welcome to pool-ver");
    textGeomLogger.log("PLEASE WAVE A STICK-LIKE OBJECT IN FRONT OF YOUR LEAP MOTION CONTROLLER.");
    app.synthSpeaker.speak("Please wave a stick-like object in front of your Leap Motion controller.");

    app.start(animate);
}



var UP = new THREE.Vector3(0, 1, 0),
    RIGHT = new THREE.Vector3(1, 0, 0),
    pitchQuat = new THREE.Quaternion(),
    headingQuat = new THREE.Quaternion(),
    strafe,
    drive,
    floatUp,
    walkSpeed = 0.3,
    floatSpeed = 0.1,
    toolDrive, toolStrafe, toolFloat;
var raycaster = new THREE.Raycaster();
var lastFrameID;
function animate(t) {
    "use strict";
    requestAnimationFrame(animate);
    var dt = (t - app.lt) * 0.001;
    app.lt = t;
    if (app.vrControls.enabled) {
        app.vrControls.update();
    }
    app.vrManager.render(app.scene, app.camera, t);
    app.keyboard.update(dt);
    app.gamepad.update(dt);

    floatUp = app.keyboard.getValue("floatUp") + app.keyboard.getValue("floatDown");
    drive = app.keyboard.getValue("driveBack") + app.keyboard.getValue("driveForward");
    strafe = app.keyboard.getValue("strafeRight") + app.keyboard.getValue("strafeLeft");
    avatar.heading += -0.8 * dt * (app.keyboard.getValue("turnLeft") + app.keyboard.getValue("turnRight"));
    if (avatar.floatMode) {
        floatUp += app.gamepad.getValue("float");
        strafe += app.gamepad.getValue("strafe");
    } else {
        drive += app.gamepad.getValue("drive");
        avatar.heading += 0.8 * dt * app.gamepad.getValue("dheading");
    }
    var cosHeading = Math.cos(avatar.heading),
        sinHeading = Math.sin(avatar.heading);
    if (!app.vrControls.enabled) {
        avatar.pitch -= 0.8 * dt * (app.keyboard.getValue("pitchUp") + app.keyboard.getValue("pitchDown"));
        pitchQuat.setFromAxisAngle(RIGHT, avatar.pitch);
    }
    var cosPitch = Math.cos(avatar.pitch),
        sinPitch = Math.sin(avatar.pitch);
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

    toolDrive = app.keyboard.getValue("moveToolForwards") - app.keyboard.getValue("moveToolBackwards");
    toolFloat = app.keyboard.getValue("moveToolUp") - app.keyboard.getValue("moveToolDown");
    toolStrafe = app.keyboard.getValue("moveToolRight") - app.keyboard.getValue("moveToolLeft");
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

    // TODO: resolve problem where all balls randomly bounce straight up really high!!!
    app.world.step(1/60, dt);

    for (var j = 0; j < dynamicBodies.length; ++j) {
        var body = dynamicBodies[j];
        body.mesh.position.copy(body.position);
    }

    for (j = 0; j < ballStripeMeshes.length; j++) {
        var mesh = ballStripeMeshes[j];
        mesh.quaternion.copy(mesh.parent.body.quaternion);
    }

    avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
    avatar.quaternion.multiply(pitchQuat);
    avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
    avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
    avatar.position.y += dt * floatUp;

    toolRoot.position.x += 0.25  * dt * toolStrafe;
    toolRoot.position.z += -0.25 * dt * toolDrive;
    toolRoot.position.y += 0.25  * dt * toolFloat;

    if (!app.config.shadowMap) {
        stickShadow.position.set(stickMesh.position.x,
                                 (H_table + 0.001 - toolRoot.position.y - avatar.position.y)/toolRoot.scale.y,
                                 stickMesh.position.z);
        stickShadowMesh.quaternion.copy(stickMesh.quaternion);
    }

    for (j = 0; j < app.world.contacts.length; j++) {
        var contactEquation = app.world.contacts[j];
        var bi = contactEquation.bi,
            bj = contactEquation.bj;
        if (bi.material === bj.material) {
            // ball-ball collision
            app.playCollisionSound();
        } else if (bi.material === floorMaterial || bj.material === floorMaterial) {
            // ball-floor collision
            var ballBody = (bi.material === ballMaterial ? bi : bj);
            if (!ballBody.bounces) {
                app.textGeomLogger.log(ballBody.mesh.name + " HIT THE FLOOR!");
                ballBody.bounces = 1;
            } else if (ballBody.bounces > 5) {
                ballBody.sleep();
            } else {
                ballBody.bounces++;
            }
        }
    }

    //if (app.mouseParticleGroup) app.mouseParticleGroup.tick(dt);

}

    // if (app.mousePointer && avatar.picking) {
    //     origin.set(0, 0, 0);
    //     direction.set(0, 0, 0);
    //     direction.subVectors(mousePointer.localToWorld(direction), camera.localToWorld(origin)).normalize();
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
