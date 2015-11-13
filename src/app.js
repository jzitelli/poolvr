var app;

var scene = CrapLoader.parse(JSON_SCENE);

// would rather add the spot lights via three.py generated JSON_SCENE, but I'm having problems getting shadows frm them:
var centerSpotLight = new THREE.SpotLight(0xffffee);
centerSpotLight.position.set(0, 2, 0);
centerSpotLight.castShadow = true;
centerSpotLight.shadowCameraNear = 0.01;
centerSpotLight.shadowCameraFar = 3;
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
                                      commandDown: logVars}};

var stickMesh, tipBody;

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

    app.start();
}
