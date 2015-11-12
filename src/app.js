var app;

var scene = CrapLoader.parse(JSON_SCENE);
// would rather add the spot light via three.py generated JSON_SCENE, but I'm having problems:
var spotLight = new THREE.SpotLight(0xffffff);
spotLight.position.set(0, 3, 0);
spotLight.castShadow = true;
spotLight.shadowCameraNear = 0.02;
spotLight.shadowCameraFar = 4;
spotLight.shadowCameraFov = 90;
scene.add(spotLight);

var avatar = new THREE.Object3D();
avatar.position.y = 1.2;
avatar.position.z = 2;

// window.addEventListener('keydown', function (evt) {
//   if ()
// });
options.keyboardCommands = {logVars: {buttons: [Primrose.Input.Keyboard.Q],
                                      commandDown: logVars}};

var stickMesh;
function logVars() {
    console.log(stickMesh.position);
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

    // ##### VR mode: #####
    if (URL_PARAMS.vr) {
        stickMesh = addTool(avatar, app.world, {useTransform: true, transformOptions: {vr: true, effectiveParent: app.camera}});
    }
    // ##### Desktop mode: #####
    else {
        stickMesh = addTool(avatar, app.world, {useTransform: true, transformOptions: {vr: 'desktop'}});
    }
    console.log(stickMesh);

    app.start();
}
