// TODO requires three.js, CANNON.js, settings.js, cardboard.js, WebVRApplication.js, CrapLoader.js, LeapTools.js, pyserver.js
var app;
var scene = CrapLoader.parse(JSON_SCENE);
var avatar = avatar || new THREE.Object3D();
var H_table = 0.74295; // TODO: coordinate w/ server
avatar.position.y = 1.2;
avatar.position.z = 1.9;

var stickMesh, tipBody, toolRoot;
var stickShadow, stickShadowMesh;
var ballMeshes       = [],
    ballStripeMeshes = [];
var dynamicBodies;

function onLoad() {
    "use strict";
    pyserver.log("starting poolvr...");
    pyserver.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config));
    POOLVR.config.keyboardCommands = POOLVR.keyboardCommands;
    POOLVR.config.gamepadCommands = POOLVR.gamepadCommands;
    
    app = new WebVRApplication("poolvr", avatar, scene, POOLVR.config);
    avatar.add(app.camera);
    scene.add(avatar);

    if (!app.config.useBasicMaterials) {
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

    var toolOptions = {
        // ##### Desktop mode (default): #####
        transformOptions : {vr: 'desktop'},
        leapDisabled     : app.config.leapDisabled,
        leapHandsDisabled: app.config.leapHandsDisabled,
        useBasicMaterials: app.config.useBasicMaterials,
        toolLength       : app.config.toolLength,
        toolRadius       : app.config.toolRadius
    };
    if (app.config.leapVR) {
        // ##### Leap Motion VR tracking mode: #####
        toolOptions.transformOptions = {vr: true, effectiveParent: app.camera};
    }

    CrapLoader.CANNONize(scene, app.world);

    var ballMaterial = new CANNON.Material();
    var ballBallContactMaterial = new CANNON.ContactMaterial(ballMaterial, ballMaterial, {restitution: 0.91, friction: 0.08});
    app.world.addContactMaterial(ballBallContactMaterial);

    var playableSurfaceMaterial = new CANNON.Material();
    var ballPlayableSurfaceContactMaterial = new CANNON.ContactMaterial(ballMaterial, playableSurfaceMaterial, {restitution: 0.3, friction: 0.1});
    app.world.addContactMaterial(ballPlayableSurfaceContactMaterial);
    
    var cushionMaterial = new CANNON.Material();
    var ballCushionContactMaterial = new CANNON.ContactMaterial(ballMaterial, cushionMaterial, {restitution: 0.8, friction: 0.18});
    app.world.addContactMaterial(ballCushionContactMaterial);

    var floorMaterial = new CANNON.Material();
    var floorBallContactMaterial = new CANNON.ContactMaterial(floorMaterial, ballMaterial, {restitution: 0.88, friction: 0.4});
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

    pyserver.log('adding tool...');
    pyserver.log('toolOptions =\n' + JSON.stringify(toolOptions));
    
    var toolStuff = addTool(avatar, app.world, toolOptions);
    
    stickMesh = toolStuff[0];
    tipBody   = toolStuff[1];
    toolRoot  = toolStuff[2];

    if (!app.config.shadowMap) {
        // create shadow mesh from projection:
        stickShadow = new THREE.Object3D();
        stickShadow.position.y = -avatar.position.y - toolRoot.position.y + H_table + 0.001;
        stickShadow.scale.set(1, 0.0004, 1);
        toolRoot.add(stickShadow);
        var stickShadowGeom = stickMesh.geometry.clone();
        var toolLength = toolOptions.toolLength;
        stickShadowGeom.translate(0, -toolLength / 2, 0); // have to do this again because not buffergeometry???
        var stickShadowMaterial = new THREE.MeshBasicMaterial({color: 0x002200});
        stickShadowMesh = new THREE.Mesh(stickShadowGeom, stickShadowMaterial);
        stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        stickShadow.add(stickShadowMesh);
    }

    if (app.config.mouseControlsEnabled) {
        var mousePointer = stickMesh;
        mousePointer.position.y = H_table + 0.1 - avatar.position.y - toolRoot.position.y;
        tipBody.position[1] = H_table + 0.1;
        window.addEventListener("mousemove", function (evt) {
            var dx = evt.movementX,
                dy = evt.movementY;
            mousePointer.position.x += 0.0004*dx;
            if (mousePointer.position.x > 2) mousePointer.position.x = 2;
            else if (mousePointer.position.x < -2) mousePointer.position.x = -2;
            mousePointer.position.z += 0.0004*dy;
            if (mousePointer.position.z > 2) mousePointer.position.z = 2;
            else if (mousePointer.position.z < -2) mousePointer.position.z = -2;
            tipBody.position[0] = mousePointer.position.x;
            tipBody.position[2] = mousePointer.position.z;
        });
    }

    dynamicBodies = app.world.bodies.filter(function(body) { return body.mesh && body.type !== CANNON.Body.STATIC; });

    app.start(animate);
}



var UP = new THREE.Vector3(0, 1, 0),
    RIGHT = new THREE.Vector3(1, 0, 0),
    pitch = 0,
    pitchQuat = new THREE.Quaternion(),
    headingQuat = new THREE.Quaternion(),
    strafe,
    drive,
    floatUp,
    kbpitch = 0,
    walkSpeed = 0.3,
    floatSpeed = 0.1,
    toolDrive, toolStrafe, toolFloat;
var raycaster = new THREE.Raycaster();
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
    if (!app.vrControls.enabled || app.config.vrPitchingEnabled) {
        kbpitch -= 0.8 * dt * (app.keyboard.getValue("pitchUp") + app.keyboard.getValue("pitchDown"));
        pitch = kbpitch;
        pitchQuat.setFromAxisAngle(RIGHT, pitch);
    }
    var cosPitch = Math.cos(pitch),
        sinPitch = Math.sin(pitch);
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

    // TODO: resolve CANNON issues w/ initial low framerate
    app.world.step(Math.min(dt, 1/60));

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
        stickShadow.position.x = stickMesh.position.x;
        stickShadow.position.z = stickMesh.position.z;
        stickShadow.position.y = -avatar.position.y - toolRoot.position.y + H_table + 0.001;
        stickShadowMesh.quaternion.copy(stickMesh.quaternion);
    }
    if (app.mousePointer && avatar.picking) {
        origin.set(0, 0, 0);
        direction.set(0, 0, 0);
        direction.subVectors(mousePointer.localToWorld(direction), camera.localToWorld(origin)).normalize();
        raycaster.set(origin, direction);
        var intersects = raycaster.intersectObjects(app.pickables);
        if (intersects.length > 0) {
            if (app.picked != intersects[0].object) {
                if (app.picked) app.picked.material.color.setHex(app.picked.currentHex);
                app.picked = intersects[0].object;
                app.picked.currentHex = app.picked.material.color.getHex();
                app.picked.material.color.setHex(0xff4444); //0x44ff44);
            }
        } else {
            if (app.picked) app.picked.material.color.setHex(app.picked.currentHex);
            app.picked = null;
        }
    }
}
