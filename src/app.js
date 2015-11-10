// webvr-boilerplate:
WebVRConfig = {
  // Forces cardboard distortion in VR mode.
  FORCE_DISTORTION: true, // Default: false.
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

var avatar = new THREE.Object3D();
avatar.position.y = 1.2;
avatar.position.z = 2;

function setupMenu() {
    "use strict";
    var menu = new THREE.Object3D();
    return menu;
}

function onLoad() {
    "use strict";
    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(0, 3, 0);
    spotLight.castShadow = true;
    spotLight.shadowCameraNear = 0.02;
    spotLight.shadowCameraFar = 4;
    spotLight.shadowCameraFov = 90;
    scene.add(spotLight);

    application = new WebVRApplication("poolvr", avatar, scene, options);
    avatar.add(application.camera);
    application.scene.add(avatar);

    // ##### VR mode: #####
    addTool(avatar, application.world, {useTransform: true, transformOptions: {vr: true, effectiveParent: application.camera}});

    // ##### Desktop mode: #####
    // # no plugin: tool ok, hands no
    // addTool(avatar, application.world);
    // addTool(avatar, application.world, {useTransform: true, transformOptions: {vr: 'desktop'}});

    application.start();
}
