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
    var initialPosition = POOLVR.config.initialPosition || [0, 0.9, 0.9];
    avatar.position.fromArray(initialPosition);

    var textGeomLogger = new TextGeomLogger();
    avatar.add(textGeomLogger.root);
    textGeomLogger.root.position.set(-2.5, 1.5, -3.5);

    var scene = THREE.py.parse(JSON_SCENE);
    scene.add(avatar);

    app = new WebVRApplication('poolvr config', avatar, scene, POOLVR.config);
    avatar.add(app.camera);

    textGeomLogger.log(JSON.stringify(POOLVR, undefined, 2));

    app.start(animate);
}
