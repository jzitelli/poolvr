POOLVR.moveAvatar = ( function () {
    "use strict";
    var UP = THREE.Object3D.DefaultUp,
        walkSpeed = 0.333,
        floatSpeed = 0.1;

    return function (keyboard, gamepad, dt) {
        var avatar = POOLVR.avatar;

        var floatUp = keyboard.floatUp - keyboard.floatDown;
        var drive = keyboard.driveBack - keyboard.driveForward;
        var strafe = keyboard.strafeRight - keyboard.strafeLeft;
        var heading = -0.8 * dt * (-keyboard.turnLeft + keyboard.turnRight);
        // if (avatar.floatMode) {
        //     floatUp += gamepad.getValue("float");
        //     strafe += gamepad.getValue("strafe");
        // } else {
        //     drive += gamepad.getValue("drive");
        //     heading += 0.8 * dt * gamepad.getValue("dheading");
        // }
        floatUp *= floatSpeed;
        if (strafe || drive) {
            var len = walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive + strafe * strafe));
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

            avatar.updateMatrix();
        }
    };
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

    POOLVR.synthSpeaker.speak("If you are playing in VR, try using the I, J, K, and L keys.  To move the virtual. Leap Motion Controller.  So that it coincides with the controller in your physical environment.", function () {
        POOLVR.textGeomLogger.log("IF YOU ARE PLAYING IN VR, TRY USING THE");
        POOLVR.textGeomLogger.log("I / J / K / L / O / . / Y / U KEYS");
        POOLVR.textGeomLogger.log("TO MOVE THE VIRTUAL LEAP MOTION CONTROLLER");
        POOLVR.textGeomLogger.log("SO THAT IT COINCIDES WITH THE CONTROLLER");
        POOLVR.textGeomLogger.log("IN YOUR PHYSICAL ENVIRONMENT.");
    });

};


POOLVR.startAnimateLoop = function () {
    "use strict";
    var keyboard = POOLVR.keyboard,
        gamepad  = POOLVR.gamepad,
        app      = POOLVR.app,
        world    = POOLVR.world,
        avatar   = POOLVR.avatar,
        updateTool          = POOLVR.updateTool,
        updateToolPostStep  = POOLVR.updateToolPostStep,
        moveToolRoot        = POOLVR.moveToolRoot,
        moveAvatar          = POOLVR.moveAvatar,
        updateBallsPostStep = POOLVR.updateBallsPostStep,
        updateToolMapping   = POOLVR.updateToolMapping;

    var glS, rS;
    if (URL_PARAMS.rstats) {
        /* jshint ignore:start */
        var tS = new threeStats( POOLVR.app.renderer );
        glS = new glStats();
        rS  = new rStats({
            CSSPath: "lib/rstats/",
            values: {
                frame: { caption: 'Total frame time (ms)' },
                calls: { caption: 'Calls (three.js)' },
                raf: { caption: 'Time since last rAF (ms)' },
                // rstats: { caption: 'rStats update (ms)' }, // no worky?
                updatetool: { caption: 'Leap frame update (ms)' },
                updatevrcontrols: { caption: 'VRControls update (ms)' },
                step: { caption: 'Cannon step (ms)' },
                poststep: { caption: 'Cannon post-step (ms)' },
                updatekeyboardgamepad: { caption: 'Move avatar / Leap (ms)' }
            },
            fractions: [
                { base: 'frame', steps: [ 'updatetool', 'updatevrcontrols', 'render', 'step', 'poststep', 'updatekeyboardgamepad' ] }
            ],
            plugins: [tS, glS]
        });
        /* jshint ignore:end */
    } else {
        glS = {start: function () {}};
        rS  = function (id) { return {start:  function () {},
                                      end:    function () {},
                                      tick:   function () {},
                                      frame:  function () {},
                                      update: function () {}}; };
    }

    var lt = 0;

    function animate(t) {
        rS('frame').start();
        glS.start();
        rS('raf').tick();
        rS('fps').frame();

        var dt = (t - lt) * 0.001;

        rS('updatetool').start();
        updateTool(dt);
        rS('updatetool').end();

        rS('updatevrcontrols').start();
        if (app.vrControlsEnabled) {
            app.vrControls.update();
            app.camera.updateMatrixWorld();
        }
        rS('updatevrcontrols').end();

        rS('render').start();
        app.vrEffect.render(app.scene, app.camera);
        rS('render').end();

        rS('step').start();
        world.step(Math.min(1/60, dt), dt, 10);
        rS('step').end();

        rS('poststep').start();
        updateToolPostStep();
        updateBallsPostStep();
        rS('poststep').end();

        rS('updatekeyboardgamepad').start();
        // keyboard.update(dt);
        // gamepad.update(dt);

        moveAvatar(keyboard, gamepad, dt);
        moveToolRoot(keyboard, gamepad, dt);

        avatar.updateMatrixWorld();
        updateToolMapping();
        rS('updatekeyboardgamepad').end();

        lt = t;

        requestAnimationFrame(animate);

        rS('frame').end();
        rS().update();
    }

    requestAnimationFrame(animate);

};


function onLoad() {
    "use strict";
    POOLVR.config = POOLVR.loadConfig(POOLVR.profile) || POOLVR.config;
    POOLVR.parseURIConfig();

    console.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    THREE.Object3D.DefaultMatrixAutoUpdate = false;

    POOLVR.avatar = new THREE.Object3D();
    var avatar = POOLVR.avatar;

    avatar.position.fromArray(POOLVR.config.initialPosition);

    avatar.heading = 0;
    avatar.floatMode = false;
    avatar.toolMode = false;

    POOLVR.synthSpeaker = new SynthSpeaker({volume: POOLVR.config.synthSpeakerVolume, rate: 0.8, pitch: 0.5});

    if (POOLVR.config.useTextGeomLogger) {
        var fontLoader = new THREE.FontLoader();
        fontLoader.load('fonts/Anonymous Pro_Regular.js', function (font) {
            var textGeomCacher = new TextGeomUtils.TextGeomCacher(font, {size: 0.12});
            var textGeomLoggerMaterial = new THREE.MeshBasicMaterial({color: 0xff3210});
            POOLVR.textGeomLogger = new TextGeomUtils.TextGeomLogger(textGeomCacher,
                {material: textGeomLoggerMaterial, nrows: 8, lineHeight: 1.8 * 0.12});
            avatar.add(POOLVR.textGeomLogger.root);
            POOLVR.textGeomLogger.root.position.set(-2.7, 0.88, -3.3);
            POOLVR.textGeomLogger.root.updateMatrix();
        });
    } else {
        POOLVR.textGeomLogger = {
            root: new THREE.Object3D(),
            log: function (msg) { console.log(msg); },
            clear: function () {}
        };
    }

    THREE.py.parse(THREEPY_SCENE).then( function (scene) {

        scene.autoUpdate = false;

        var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 8, Math.PI / 2);
        centerSpotLight.position.set(0, 3, 0);
        centerSpotLight.castShadow = true;
        centerSpotLight.shadow.camera.matrixAutoUpdate = true;
        centerSpotLight.shadow.camera.near = 1;
        centerSpotLight.shadow.camera.far = 3;
        centerSpotLight.shadow.camera.fov = 80;
        //centerSpotLight.shadow.radius = 0.5;
        scene.add(centerSpotLight);
        centerSpotLight.updateMatrix();
        centerSpotLight.updateMatrixWorld();

        POOLVR.centerSpotLight = centerSpotLight;

        if (POOLVR.config.usePointLight) {
            var pointLight = new THREE.PointLight(0xaa8866, 0.8, 40);
            pointLight.position.set(4, 5, 2.5);
            scene.add(pointLight);
            pointLight.updateMatrix();
            pointLight.updateMatrixWorld();
        }

        var appConfig = {
            fsButton: document.getElementById('fsButton'),
            vrButton: document.getElementById('vrButton'),
            useShadowMap: POOLVR.config.useShadowMap,

            onResetVRSensor: function (lastRotation, lastPosition) {
                // maintain correspondence between virtual / physical leap motion controller:
                var camera = POOLVR.app.camera;
                var toolRoot = POOLVR.toolRoot;
                toolRoot.heading -= lastRotation;
                toolRoot.quaternion.setFromAxisAngle(THREE.Object3D.DefaultUp, toolRoot.heading);

                toolRoot.position.sub(lastPosition);
                toolRoot.position.applyAxisAngle(THREE.Object3D.DefaultUp, -lastRotation);
                toolRoot.position.add(camera.position);

                toolRoot.updateMatrix();

                avatar.heading += lastRotation;
                avatar.quaternion.setFromAxisAngle(THREE.Object3D.DefaultUp, avatar.heading);
                avatar.updateMatrix();
                avatar.updateMatrixWorld();
                POOLVR.updateToolMapping();
            }

        };

        // THREE.WebGLRenderer options:
        var rendererOptions = {
            canvas: document.getElementById('webgl-canvas'),
            antialias: URL_PARAMS.antialias !== undefined ? URL_PARAMS.antialias : (isMobile() === false)
        };

        POOLVR.app = new WebVRApp(scene, appConfig, rendererOptions);

        avatar.add(POOLVR.app.camera);

        scene.add(avatar);

        avatar.updateMatrix();
        avatar.updateMatrixWorld();

        POOLVR.setupMenu();

        POOLVR.setup();

        scene.updateMatrixWorld(true);

        POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);

        POOLVR.startAnimateLoop();

    } );

}
