var app;

var scene = CrapLoader.parse(JSON_SCENE);

// would rather add the spot lights via three.py generated JSON_SCENE, but I'm having problems getting shadows frm them:
var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 10, 90);
centerSpotLight.position.set(0, 3, 0);
centerSpotLight.castShadow = true;
centerSpotLight.shadowCameraNear = 0.01;
centerSpotLight.shadowCameraFar = 4;
centerSpotLight.shadowCameraFov = 90;
scene.add(centerSpotLight);
var centerSpotLightHelper = new THREE.SpotLightHelper(centerSpotLight);
scene.add(centerSpotLightHelper);
centerSpotLightHelper.visible = false;

// var spotLight = new THREE.SpotLight(0xddffdd,
//                                     0.7, // intensity
//                                     10); // distance
// spotLight.position.set(-5/2, 3/2, 4/2);
// spotLight.castShadow = true;
// spotLight.shadowCameraNear = 0.01;
// spotLight.shadowCameraFar = 10;
// spotLight.shadowCameraFov = 50;
// spotLight.shadowDarkness = 0.4;
// scene.add(spotLight);
// var spotLightHelper = new THREE.SpotLightHelper(spotLight);
// scene.add(spotLightHelper);
// spotLightHelper.visible = false;

var avatar = new THREE.Object3D();
avatar.position.y = 1.2;
avatar.position.z = 2;

options.keyboardCommands = {logVars: {buttons: [Primrose.Input.Keyboard.Q],
                                      commandDown: logVars},
                            moveToolForwards: {buttons: [Primrose.Input.Keyboard.I]},
                            moveToolBackwards: {buttons: [Primrose.Input.Keyboard.K]},
                            moveToolLeft: {buttons: [Primrose.Input.Keyboard.J]},
                            moveToolRight: {buttons: [Primrose.Input.Keyboard.L]}};

var stickMesh, tipBody, toolRoot;

function logVars() {
    "use strict";
    console.log(tipBody.position);
}

var ballMaterial = new CANNON.Material();
var feltMaterial = new CANNON.Material();
var cushionMaterial = new CANNON.Material();

var ballBallContactMaterial = new CANNON.ContactMaterial(ballMaterial, ballMaterial, {restitution: 0.9});

function onLoad() {
    "use strict";
    app = new WebVRApplication("poolvr", avatar, scene, options);
    avatar.add(app.camera);
    app.scene.add(avatar);

    // ##### Desktop mode (default): #####
    var toolOptions = {transformOptions: {vr: 'desktop'},
                       leapDisabled    : options.leapDisabled};

    // ##### VR mode: #####
    if (URL_PARAMS.vr) {
        toolOptions.transformOptions = {vr: true, effectiveParent: app.camera};
    }

    console.log(toolOptions);
    var toolStuff;
    toolStuff = addTool(avatar, app.world, toolOptions);
    stickMesh = toolStuff[0];
    tipBody   = toolStuff[1];
    toolRoot  = toolStuff[2];

    if (options.mouseControls) {
        var mousePointer = stickMesh;
        //mousePointer.position.y = 0.74295 + 0.05715 / 2 + 0.0001;
        mousePointer.position.y -= 0.01;
        tipBody.position[1] -= 0.01;
        window.addEventListener("mousemove", function (evt) {
            var dx = evt.movementX,
                dy = evt.movementY;
            mousePointer.position.x += 0.001*dx;
            mousePointer.position.x = Math.max(Math.min(mousePointer.position.x, 2.25), -2.25);
            mousePointer.position.z += 0.001*dy;
            mousePointer.position.z = Math.max(Math.min(mousePointer.position.z, 1.5), -1);
            tipBody.position[0] = mousePointer.position.x;
            tipBody.position[2] = mousePointer.position.z;
        });
    }

    app.start(animate);
}



var UP = new THREE.Vector3(0, 1, 0),
    RIGHT = new THREE.Vector3(1, 0, 0),
    heading = 0,
    pitch = 0,
    pitchQuat = new THREE.Quaternion(),
    strafe,
    drive,
    floatUp,
    kbheading = 0,
    kbpitch = 0,
    walkSpeed = 0.3,
    floatSpeed = 0.1,
    toolDrive, toolStrafe;
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
    kbheading += -0.8 * dt * (app.keyboard.getValue("turnLeft") +
        app.keyboard.getValue("turnRight"));
    heading = kbheading + app.gamepad.getValue("heading");
    var cosHeading = Math.cos(heading),
        sinHeading = Math.sin(heading);
    if (!app.vrControls.enabled || options.vrPitching) {
        kbpitch -= 0.8 * dt * (app.keyboard.getValue("pitchUp") + app.keyboard.getValue("pitchDown"));
        pitch = -(app.gamepad.getValue("pitch") + kbpitch);
        pitchQuat.setFromAxisAngle(RIGHT, pitch);
    }
    var cosPitch = Math.cos(pitch),
        sinPitch = Math.sin(pitch);
    strafe = app.keyboard.getValue("strafeRight") +
        app.keyboard.getValue("strafeLeft") +
        app.gamepad.getValue("strafe");
    floatUp = app.keyboard.getValue("floatUp") + app.keyboard.getValue("floatDown");
    drive = app.keyboard.getValue("driveBack") + app.keyboard.getValue("driveForward");
    if (app.avatar.floatMode) {
        floatUp += app.gamepad.getValue("float");
    } else {
        drive += app.gamepad.getValue("drive");
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

    toolStrafe = app.keyboard.getValue("moveToolRight") -
        app.keyboard.getValue("moveToolLeft");
    toolDrive = app.keyboard.getValue("moveToolForwards") - app.keyboard.getValue("moveToolBackwards");

    // if (app.mousePointer.visible && picking) {
    //     origin.set(0, 0, 0);
    //     direction.set(0, 0, 0);
    //     direction.subVectors(mousePointer.localToWorld(direction), camera.localToWorld(origin)).normalize();
    //     raycaster.set(origin, direction);
    //     var intersects = raycaster.intersectObjects(pickables);
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

    // TODO: resolve CANNON issues w/ initial low framerate
    app.world.step(1/60);

    avatar.quaternion.setFromAxisAngle(UP, heading);
    avatar.quaternion.multiply(pitchQuat);
    avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
    avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
    avatar.position.y += dt * floatUp;

    toolRoot.position.x += dt * 0.25*(toolStrafe * cosHeading + toolDrive * sinHeading);
    toolRoot.position.z += dt * 0.25*(-toolDrive * cosHeading + toolStrafe * sinHeading);

    for (var j = 0; j < app.world.bodies.length; ++j) {
        var body = app.world.bodies[j];
        if (body.mesh && body.type !== CANNON.Body.STATIC) {
            body.mesh.position.copy(body.position);
            body.mesh.quaternion.copy(body.quaternion);
        }
    }
}