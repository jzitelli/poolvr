var URL_PARAMS = (function () {
    "use strict";
    var params = {};
    location.search.substr(1).split("&").forEach(function(item) {
        var k = item.split("=")[0],
            v = decodeURIComponent(item.split("=")[1]);
        if (k in params) {
            params[k].push(v);
        } else {
            params[k] = [v];
        }
    });
    for (var k in params) {
        if (params[k].length == 1) {
            params[k] = params[k][0];
        }
    }
    return params;
})();

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
    if (URL_PARAMS.vr) {
      addTool(avatar, application.world, {useTransform: true, transformOptions: {vr: true, effectiveParent: application.camera}});
    }
    // ##### Desktop mode: #####
    else {
      addTool(avatar, application.world, {useTransform: true, transformOptions: {vr: 'desktop'}});
    }

    application.start();
}
