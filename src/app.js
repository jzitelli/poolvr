var app;

var avatar = new THREE.Object3D();
if (POOLVR.config.initialPosition) {
    avatar.position.fromArray(POOLVR.config.initialPosition);
} else {
    avatar.position.y = 1.0;
    avatar.position.z = 1.86;
}
avatar.heading = 0;
avatar.floatMode = false;
avatar.toolMode = false;

// var menu = setupMenu(avatar);

function setupMenu(parent) {
    "use strict";
    var menu = new THREE.Object3D();
    var material = new THREE.MeshBasicMaterial({color: 0x22ee33});

    var textGeom = new THREE.TextGeometry('RESET TABLE', {font: THREE.py.fonts.anonymous_pro, size: 0.2, height: 0, curveSegments: 2});
    var textMesh = new THREE.Mesh(textGeom, material);
    textMesh.onSelect = POOLVR.resetTable;
    textMesh.position.set(0, 0.8, -2);
    menu.add(textMesh);

    parent.add(menu);
    menu.visible = false;
    return menu;
}


function startTutorial() {
    "use strict";
    POOLVR.synthSpeaker.speak("Hello.  Welcome. To. Pool-ver.", function () {
        POOLVR.textGeomLogger.log("HELLO.  WELCOME TO POOLVR.");
    });

    POOLVR.synthSpeaker.speak("Please wave a stick-like object in front of your Leap Motion controller.", function () {
        POOLVR.textGeomLogger.log("PLEASE WAVE A STICK-LIKE OBJECT IN FRONT OF YOUR");
        POOLVR.textGeomLogger.log("LEAP MOTION CONTROLLER.");
    });

    POOLVR.synthSpeaker.speak("Keep the stick within the interaction box when you want to make contact with.  A ball.", function () {
        POOLVR.textGeomLogger.log("KEEP THE STICK WITHIN THE INTERACTION BOX WHEN YOU WANT");
        POOLVR.textGeomLogger.log("TO MAKE CONTACT WITH A BALL...");
    });
}



var animate = function (world, keyboard, gamepad, updateTool, updateGraphics) {
    "use strict";
    var UP = new THREE.Vector3(0, 1, 0),
        walkSpeed = 0.333,
        floatSpeed = 0.1;
    var lt = 0;

    function animate(t) {
        var dt = (t - lt) * 0.001;
        requestAnimationFrame(animate);

        updateTool(dt);

        // world.step(dt);
        world.step(1/75, dt, 5);

        updateGraphics();

        if (app.vrControls.enabled) {
            app.vrControls.update();
        }
        app.vrManager.render(app.scene, app.camera, t);

        keyboard.update(dt);
        gamepad.update(dt);

        var floatUp = keyboard.getValue("floatUp") + keyboard.getValue("floatDown");
        var drive = keyboard.getValue("driveBack") + keyboard.getValue("driveForward");
        var strafe = keyboard.getValue("strafeRight") + keyboard.getValue("strafeLeft");

        var heading = -0.8 * dt * (keyboard.getValue("turnLeft") + keyboard.getValue("turnRight"));
        if (avatar.floatMode) {
            floatUp += gamepad.getValue("float");
            strafe += gamepad.getValue("strafe");
        } else {
            drive += gamepad.getValue("drive");
            heading += 0.8 * dt * gamepad.getValue("dheading");
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

        if (floatUp !== 0 || strafe !== 0 || heading !== 0 || drive !== 0) {
            avatar.heading += heading;
            var cosHeading = Math.cos(avatar.heading),
                sinHeading = Math.sin(avatar.heading);

            avatar.quaternion.setFromAxisAngle(UP, avatar.heading);

            avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
            avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
            avatar.position.y += dt * floatUp;
        }

        lt = t;
    }

    return animate;

};


/* jshint multistr: true */
function onLoad() {
    "use strict";
    pyserver.log("\n\
*********************************************----\n\
*********************************************----\n\
*********************************************----\n\
    ------ starting poolvr... -------------------\n\
*********************************************----\n\
*********************************************----\n\
*********************************************----\n\
    ---------------------------------------------\n");
    pyserver.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    POOLVR.synthSpeaker = new SynthSpeaker({volume: POOLVR.config.synthSpeakerVolume, rate: 0.8, pitch: 0.5});

    POOLVR.textGeomLogger = {
        root: new THREE.Object3D(),
        log: function (msg) { console.log(msg); },
        clear: function () {}
    };
    if (POOLVR.config.useTextGeomLogger) {
        var fontLoader = new THREE.FontLoader();
        fontLoader.load('fonts/Anonymous Pro_Regular.js', function (font) {
            var textGeomCacher = new TextGeomUtils.TextGeomCacher(font, {size: 0.12});
            var textGeomLoggerMaterial = new THREE.MeshBasicMaterial({color: 0xff3210});
            POOLVR.textGeomLogger = new TextGeomUtils.TextGeomLogger(textGeomCacher,
                {material: textGeomLoggerMaterial, nrows: 7, lineHeight: 1.8 * 0.12});
            avatar.add(POOLVR.textGeomLogger.root);
            POOLVR.textGeomLogger.root.position.set(-2.5, 1.0, -3.5);
        });
    }

    THREE.py.parse(THREEPY_SCENE).then( function (scene) {

        if (!POOLVR.config.useBasicMaterials) {
            var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 10, 90);
            centerSpotLight.position.set(0, 3, 0);
            centerSpotLight.castShadow = true;
            centerSpotLight.shadowCameraNear = 0.01;
            centerSpotLight.shadowCameraFar = 4;
            centerSpotLight.shadowCameraFov = 90;
            scene.add(centerSpotLight);
        }

        if (POOLVR.config.usePointLight) {
            var pointLight = new THREE.PointLight(0xaa8866, 0.8, 40);
            pointLight.position.set(4, 5, 2.5);
            scene.add(pointLight);
        }

        var UP = new THREE.Vector3(0, 1, 0);
        var appConfig = combineObjects(POOLVR.config, {
            onResetVRSensor: function (lastRotation, lastPosition) {
                // app.camera.updateMatrix();
                avatar.heading += lastRotation - app.camera.rotation.y;
                POOLVR.toolRoot.rotation.y -= (lastRotation - app.camera.rotation.y);
                POOLVR.toolRoot.position.sub(lastPosition);
                POOLVR.toolRoot.position.applyAxisAngle(UP, -lastRotation + app.camera.rotation.y);
                POOLVR.toolRoot.position.add(app.camera.position);
                // POOLVR.toolRoot.updateMatrix();
                avatar.updateMatrixWorld();
            }
        });

        app = new WebVRApplication(scene, appConfig);

        var world = new CANNON.World();
        world.gravity.set( 0, -POOLVR.config.gravity, 0 );
        //world.broadphase = new CANNON.SAPBroadphase( world );
        world.defaultContactMaterial.contactEquationStiffness   = 1e6;
        world.defaultContactMaterial.frictionEquationStiffness  = 1e6;
        world.defaultContactMaterial.contactEquationRelaxation  = 3;
        world.defaultContactMaterial.frictionEquationRelaxation = 3;
        world.solver.iterations = 9;

        THREE.py.CANNONize(scene, world);

        avatar.add(app.camera);
        scene.add(avatar);

        POOLVR.setupMaterials(world);
        POOLVR.setupWorld(scene, world);

        var leapTool = addTool(avatar, world, POOLVR.toolOptions);
        POOLVR.toolRoot = leapTool.toolRoot;

        requestAnimationFrame( animate(world, POOLVR.keyboard, POOLVR.gamepad, leapTool.updateTool, leapTool.updateGraphics) );

        startTutorial();

    } );

}
