/* global WebVRApplication, CrapLoader, THREE, CANNON, URL_PARAMS, JSON_SCENE */

var application;
var options = {
    gravity: 9.8,
    shadowMap: true
};

var scene = CrapLoader.parse(JSON_SCENE);

var avatar = new THREE.Object3D();
avatar.position.y = 1.2;
avatar.position.z = 2;

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

    // ##### Desktop mode: #####
    // # no plugin: tool ok, hands no
    // # plugin: hands ok, tool no
    addTool(avatar, application.world);
    // addTool(avatar, application.world, true, {vr: 'desktop'});

    // ##### HMD mode: #####
    // # plugin: hands ok, tool no - need to modify leap.transform.js
    // addTool(avatar, application.world, true, {vr: true, effectiveParent: application.camera});

    application.start();
}

function setupMenu() {
    "use strict";
    var menu = new THREE.Object3D();
    return menu;
}
