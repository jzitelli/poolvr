var app;


POOLVR.ballMeshes = [];
POOLVR.ballBodies = [];
POOLVR.initialPositions = [];
POOLVR.onTable = [false,
                  true, true, true, true, true, true, true,
                  true,
                  true, true, true, true, true, true, true];
POOLVR.nextBall = 1;


POOLVR.selectNextBall = function (inc) {
    "use strict";
    inc = inc || 1;
    var next = Math.max(1, Math.min(15, POOLVR.nextBall + inc));
    while (!POOLVR.onTable[next]) {
        next = Math.max(1, Math.min(15, next + inc));
        if (next === POOLVR.nextBall) {
            break;
        }
    }
    if (POOLVR.nextBall != next) {
        POOLVR.nextBall = next;
        POOLVR.textGeomLogger.log("BALL " + POOLVR.nextBall + " SELECTED");
    }
};


POOLVR.resetTable = function () {
    "use strict";
    POOLVR.ballBodies.forEach(function (body, ballNum) {
        body.wakeUp();
        body.position.copy(POOLVR.initialPositions[ballNum]);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        // body.bounces = 0;
        body.mesh.visible = true;
    });
    if (POOLVR.synthSpeaker.speaking === false) {
        POOLVR.synthSpeaker.speak("Table reset.");
    }
    POOLVR.nextBall = 1;
    POOLVR.textGeomLogger.log("TABLE RESET.");
};


POOLVR.autoPosition = ( function () {
    "use strict";
    var nextVector = new THREE.Vector3();
    var UP = new THREE.Vector3(0, 1, 0);
    function autoPosition(avatar) {
        POOLVR.textGeomLogger.log("YOU ARE BEING AUTO-POSITIONED.  NEXT BALL: " + POOLVR.nextBall);

        avatar.heading = Math.atan2(
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.x - POOLVR.ballMeshes[0].position.x),
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.z - POOLVR.ballMeshes[0].position.z)
        );
        avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
        avatar.updateMatrixWorld();

        nextVector.copy(POOLVR.toolRoot.position);
        avatar.localToWorld(nextVector);
        nextVector.sub(POOLVR.ballMeshes[0].position);
        nextVector.y = 0;
        avatar.position.sub(nextVector);
    }
    return autoPosition;
} )();


POOLVR.startTutorial = function () {
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
};


var animate = function (world, keyboard, gamepad, updateTool, updateGraphics, moveToolRoot) {
    "use strict";
    var UP = new THREE.Vector3(0, 1, 0),
        walkSpeed = 0.333,
        floatSpeed = 0.1;
    var avatar = POOLVR.avatar;
    var lt = 0;

    function animate(t) {
        var dt = (t - lt) * 0.001;
        requestAnimationFrame(animate);

        updateTool(dt);

        updateGraphics();

        if (app.vrControls.enabled) {
            app.vrControls.update();
        }
        app.vrManager.render(app.scene, app.camera, t);

        //world.step(dt);
        //world.step(1/75, dt, 5);
        world.step(1/60, dt, 5);
        
        keyboard.update(dt);
        gamepad.update(dt);

        moveToolRoot(keyboard, gamepad, dt);

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

    POOLVR.loadConfig();
    console.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    var avatar = new THREE.Object3D();
    avatar.position.fromArray(POOLVR.config.initialPosition);
    avatar.heading = 0;
    avatar.floatMode = false;
    avatar.toolMode = false;
    POOLVR.avatar = avatar;

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
            var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 8, Math.PI / 2);
            centerSpotLight.position.set(0, 3, 0);
            centerSpotLight.castShadow = true;
            centerSpotLight.shadow.camera.near = 0.01;
            centerSpotLight.shadow.camera.far = 4;
            centerSpotLight.shadow.camera.fov = 90;
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

        requestAnimationFrame( animate(world, POOLVR.keyboard, POOLVR.gamepad, leapTool.updateTool, leapTool.updateGraphics, leapTool.moveToolRoot) );

        POOLVR.startTutorial();

    } );

}
