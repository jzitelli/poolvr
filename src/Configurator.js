var app;


var animate = ( function () {
    "use strict";
    var lt = 0;
    function animate(t) {
        "use strict";
        requestAnimationFrame(animate);
        var dt = (t - lt) * 0.001;
        lt = t;
        if (app.vrControls.enabled) {
            app.vrControls.update();
        }
        app.vrManager.render(app.scene, app.camera, t);
        app.keyboard.update(dt);
        app.gamepad.update(dt);
    }
    return animate;
} )();


function onLoad() {
    "use strict";
    var avatar = new THREE.Object3D();
    avatar.heading = 0;
    avatar.position.y = 0.9;
    avatar.position.z = 0.9;
    var scene = THREE.py.parse(JSON_SCENE);
    console.log(scene.type);
    console.log(scene);
    scene.scale.set(0.01, 0.01, 0.01);
    scene.add(avatar);

    app = new WebVRApplication('poolvr config', avatar, scene, POOLVR.config);
    avatar.add(app.camera);
    app.start(animate);
}
