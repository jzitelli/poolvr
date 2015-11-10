WebVRConfig = {
  // Forces cardboard distortion in VR mode.
  FORCE_DISTORTION: true // Default: false.
  // Prevents cardboard distortion in VR mode
  //PREVENT_DISTORTION: true, // Default: false.
  // Override the cardboard distortion background color.
  //DISTORTION_BGCOLOR: {x: 1, y: 0, z: 0, w: 1}, // Default: (0,0,0,1).
};

var application;
var options = {
    gravity: 9.8,
    shadowMap: true
};

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

function onLoad() {
    "use strict";
    application = new WebVRApplication("poolvr", avatar, scene, options);
    avatar.add(application.camera);
    application.scene.add(avatar);

    // ##### VR mode: #####
    addTool(avatar, application.world, {useTransform: true, transformOptions: {vr: true, effectiveParent: application.camera}});

    // ##### Desktop mode: #####
    // addTool(avatar, application.world);
    // addTool(avatar, application.world, {useTransform: true, transformOptions: {vr: 'desktop'}});

    var fullscreenButton = document.getElementById('goRegular');
    fullscreenButton.addEventListener('click', function (evt) {
      application.vrManager.enterImmersive();
    });

    var vrButton = document.getElementById('goVR');
    vrButton.addEventListener('click', function (evt) {
      application.vrManager.enterVR();
    });

    application.start();
}
