/* global require */
window.POOLVR = window.POOLVR || {};
require('./sounds.js');
require('./actions.js');
require('./config.js');
require('./menu.js');

/* global POOLVR, THREE, YAWVRB, CANNON, THREEPY_SCENE */
window.onLoad = function () {
    "use strict";

    if (YAWVRB.Utils.URL_PARAMS.clearLocalStorage) {
        console.log('clearing localStorage...');
        localStorage.clear();
    }

    THREE.Object3D.DefaultMatrixAutoUpdate = false;

    POOLVR.config = POOLVR.loadConfig(POOLVR.profile) || POOLVR.config;
    POOLVR.parseURIConfig();

    console.log("POOLVR.config:");
    console.log(POOLVR.config);

    var world = POOLVR.world;

    // TODO: return menu items
    POOLVR.setupMenu();

    var rendererOptions = {
        canvas: document.getElementById('webgl-canvas'),
        antialias: (YAWVRB.Utils.URL_PARAMS.antialias !== undefined ? YAWVRB.Utils.URL_PARAMS.antialias : POOLVR.config.antialias) || !YAWVRB.Utils.isMobile()
    };
    var appConfig = {
        onResetVRSensor: function () {
            POOLVR.leapTool.updateToolMapping();
        }
    };
    POOLVR.app = new YAWVRB.App(undefined, appConfig, rendererOptions);

    if (POOLVR.config.useShadowMap) {
        POOLVR.app.renderer.shadowMap.enabled = true;
        POOLVR.app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    POOLVR.app.stage.add(POOLVR.app.camera);

    var leapIndicator = document.getElementById('leapIndicator');

    var leapTool = YAWVRB.LeapMotion.makeTool( YAWVRB.Utils.combineObjects(POOLVR.config.toolOptions, {
        onConnect: function () {
            leapIndicator.innerHTML = 'connected';
            leapIndicator.style['background-color'] = 'rgba(60, 100, 20, 0.8)';
        },
        onStreamingStarted: function () {
            leapIndicator.innerHTML = 'connected, streaming';
            leapIndicator.style['background-color'] = 'rgba(20, 160, 20, 0.8)';
            POOLVR.leapTool.toolRoot.visible = true;
        },
        onStreamingStopped: function () {
            leapIndicator.innerHTML = 'connected, streaming stopped';
            leapIndicator.style['background-color'] = 'rgba(60, 100, 20, 0.8)';
        },
        onDisconnect: function () {
            leapIndicator.innerHTML = 'disconnected';
            leapIndicator.style['background-color'] = 'rgba(60, 20, 20, 0.4)';
            POOLVR.leapTool.toolRoot.visible = false;
        },
        tipMaterial: POOLVR.tipMaterial
    }) );
    leapTool.toolMesh.renderOrder = -1;
    POOLVR.app.stage.add(leapTool.toolRoot);
    leapTool.toolRoot.visible = false;
    world.addBody(leapTool.toolBody);
    leapTool.leapController.connect();
    POOLVR.leapTool = leapTool;

    window.addEventListener("beforeunload", function () {
        leapTool.leapController.disconnect();
    }, false);

    if (POOLVR.config.useTextGeomLogger) {
        var fontLoader = new THREE.FontLoader();
        fontLoader.load('fonts/Anonymous Pro_Regular.js', function (font) {
            var textGeomCacher = new YAWVRB.TextGeomUtils.TextGeomCacher(font, {size: 0.12, curveSegments: 2});
            var textGeomLoggerMaterial = new THREE.MeshBasicMaterial({color: 0xff3210});
            POOLVR.textGeomLogger = new YAWVRB.TextGeomUtils.TextGeomLogger(textGeomCacher,
                {material: textGeomLoggerMaterial, nrows: 8, lineHeight: 1.8 * 0.12});
            POOLVR.app.stage.add(POOLVR.textGeomLogger.root);
            POOLVR.textGeomLogger.root.position.set(-2.7, 0.88, -3.3);
            POOLVR.textGeomLogger.root.updateMatrix();
        });
    } else {
        POOLVR.textGeomLogger = {
            root: new THREE.Object3D(),
            log: function (msg) { console.log(msg); },
            update: function () {},
            clear: function () {}
        };
    }

    POOLVR.synthSpeaker = new YAWVRB.SynthSpeaker({volume: POOLVR.config.synthSpeakerVolume, rate: 0.8, pitch: 0.5});

    var openVRTool = YAWVRB.Gamepads.makeTool(YAWVRB.Utils.combineObjects(POOLVR.config.toolOptions, {
        toolMass: 2,
        tipMaterial: POOLVR.openVRTipMaterial
    }));
    POOLVR.openVRTool = openVRTool;
    POOLVR.app.stage.add(openVRTool.mesh);
    openVRTool.mesh.visible = false;
    var gamepadA;
    function onGamepadConnected(e) {
        var gamepad = e.gamepad;
        if (!gamepad) return;
        if (/openvr/i.test(gamepad.id)) {
            if (gamepadA) {
                console.log('OpenVR controller B connected');
                YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadBCommands);
            } else {
                console.log('OpenVR controller A connected');
                gamepadA = gamepad;
                YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadACommands);
                openVRTool.mesh.visible = true;
                openVRTool.setGamepad(gamepad);
                world.addBody(openVRTool.body);
            }
        }
        else if (/xbox/i.test(gamepad.id) || /xinput/i.test(gamepad.id)) YAWVRB.Gamepads.setGamepadCommands(gamepad.index, POOLVR.gamepadCommands);
    }
    YAWVRB.Gamepads.setOnGamepadConnected(onGamepadConnected);

    THREE.py.parse(THREEPY_SCENE).then( function (scene) {

        scene.autoUpdate = false;

        POOLVR.app.scene = scene;

        POOLVR.app.scene.add(POOLVR.app.stage);

        if (leapTool.toolShadowMesh) {
            POOLVR.app.scene.add(leapTool.toolShadowMesh);
        }

        if (POOLVR.openVRTool && POOLVR.openVRTool.shadowMesh) {
            POOLVR.app.scene.add(POOLVR.openVRTool.shadowMesh);
        }

        var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 8, Math.PI / 4);
        centerSpotLight.position.set(0, 3, 0);
        centerSpotLight.updateMatrix();
        centerSpotLight.castShadow = true;
        centerSpotLight.visible = POOLVR.config.useSpotLight;
        scene.add(centerSpotLight);
        centerSpotLight.shadow.mapSize.set(1024, 1024);
        centerSpotLight.shadow.camera.matrixAutoUpdate = true;
        centerSpotLight.shadow.camera.near = 1;
        centerSpotLight.shadow.camera.far = 4;
        centerSpotLight.shadow.camera.fov = 80;
        centerSpotLight.shadow.camera.updateProjectionMatrix();
        // centerSpotLight.shadow.radius = 0.5;
        POOLVR.centerSpotLight = centerSpotLight;

        var pointLight = new THREE.PointLight(0xaa8866, 0.8, 40);
        pointLight.position.set(4, 5, 2.5);
        scene.add(pointLight);
        pointLight.updateMatrix();
        pointLight.updateMatrixWorld();
        POOLVR.pointLight = pointLight;
        POOLVR.pointLight.visible = POOLVR.config.usePointLight;

        navigator.getVRDisplays().then( function (vrDisplays) {

            var vrDisplay = vrDisplays[0];
            console.log('vrDisplay.displayName = ' + vrDisplay.displayName);
            if (!(vrDisplay.stageParameters && vrDisplay.stageParameters.sittingToStandingTransform)) {
                POOLVR.app.stage.position.y = 1.0;
                POOLVR.app.stage.updateMatrix();
                POOLVR.app.stage.updateMatrixWorld();
            } else {
                var sizeX = vrDisplay.stageParameters.sizeX;
                var sizeZ = vrDisplay.stageParameters.sizeZ;
                // rotate the room if it better fits the stage / play area:
                if (sizeX && sizeZ && sizeX > sizeZ) {
                    var rotation = (new THREE.Matrix4()).makeRotationY(Math.PI / 2);
                    POOLVR.app.scene.children.forEach( function (child) {
                        if (child !== POOLVR.app.stage) {
                            console.log(child);
                            child.matrix.multiplyMatrices(rotation, child.matrix);
                            child.matrix.decompose(child.position, child.quaternion, child.scale);
                            child.updateMatrixWorld(true);
                        }
                    } );
                }
            }

            THREE.py.CANNONize(scene, world);

            POOLVR.ballMeshes = [];
            POOLVR.ballBodies = [];
            POOLVR.initialPositions = [];
            POOLVR.onTable = [true,
                              true, true, true, true, true, true, true,
                              true,
                              true, true, true, true, true, true, true];
            POOLVR.nextBall = 1;
            POOLVR.ballShadowMeshes = [];

            var floorBody, ceilingBody;
            var basicMaterials = {};
            var nonbasicMaterials = {};
            scene.traverse(function (node) {
                if (node instanceof THREE.Mesh) {
                    if ((node.material instanceof THREE.MeshLambertMaterial || node.material instanceof THREE.MeshPhongMaterial) && (basicMaterials[node.material.uuid] === undefined)) {
                        var basicMaterial = new THREE.MeshBasicMaterial({color: node.material.color.getHex(), transparent: node.material.transparent, side: node.material.side});
                        basicMaterials[node.material.uuid] = basicMaterial;
                        nonbasicMaterials[basicMaterial.uuid] = node.material;
                    }
                    var ballNum;
                    if (node.name.startsWith('ballMesh')) {
                        ballNum = Number(node.name.split(' ')[1]);
                        POOLVR.ballMeshes[ballNum] = node;
                        POOLVR.ballBodies[ballNum] = node.body;
                        POOLVR.initialPositions[ballNum] = new THREE.Vector3().copy(node.position);
                        node.body.bounces = 0;
                        node.body.ballNum = ballNum;
                        node.body.material = POOLVR.ballMaterial;
                    }
                    else if (node.name === 'playableSurfaceMesh') {
                        node.body.material = POOLVR.playableSurfaceMaterial;
                    }
                    else if (node.name.endsWith('CushionMesh')) {
                        node.body.material = POOLVR.cushionMaterial;
                    }
                    else if (node.name === 'floorMesh') {
                        floorBody = node.body;
                        floorBody.material = POOLVR.floorMaterial;
                    }
                    else if (node.name === 'ceilingMesh') {
                        ceilingBody = node.body;
                        ceilingBody.material = POOLVR.floorMaterial;
                    }
                    else if (node.name.endsWith('RailMesh')) {
                        node.body.material = POOLVR.railMaterial;
                    }
                }
            });

            POOLVR.switchMaterials = function (useBasicMaterials) {
                var materials = useBasicMaterials ? basicMaterials : nonbasicMaterials;
                POOLVR.app.scene.traverse( function (node) {
                    if (node instanceof THREE.Mesh) {
                        var material = node.material;
                        var uuid = material.uuid;
                        if (materials[uuid]) {
                            node.material = materials[uuid];
                        }
                    }
                } );
            };

            if (!POOLVR.config.useShadowMap) {
                var ballShadowGeom = new THREE.CircleBufferGeometry(0.5*POOLVR.config.ball_diameter, 16);
                ballShadowGeom.rotateX(-0.5*Math.PI);
                POOLVR.ballMeshes.forEach( function (mesh, ballNum) {
                    var ballShadowMesh = new THREE.Mesh(ballShadowGeom, POOLVR.shadowMaterial);
                    ballShadowMesh.position.copy(mesh.position);
                    ballShadowMesh.position.y = POOLVR.config.H_table + 0.0004;
                    POOLVR.ballShadowMeshes[ballNum] = ballShadowMesh;
                    scene.add(ballShadowMesh);
                } );
            }

            // ball-floor collision
            floorBody.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {
                var body = evt.body;
                if (body.ballNum === 0) {
                    POOLVR.textGeomLogger.log("SCRATCH.");
                    POOLVR.synthSpeaker.speak("Scratch.");
                    body.position.copy(POOLVR.initialPositions[0]);
                    body.velocity.set(0, 0, 0);
                    body.angularVelocity.set(0, 0, 0);
                } else if (body.ballNum !== undefined) {
                    body.bounces++;
                    if (body.bounces === 1) {
                        // POOLVR.textGeomLogger.log(body.mesh.name + " HIT THE FLOOR!");
                        POOLVR.playPocketedSound();
                        POOLVR.onTable[body.ballNum] = false;
                        POOLVR.nextBall = POOLVR.onTable.slice(1).indexOf(true) + 1;
                        if (POOLVR.nextBall === 0) {
                            POOLVR.synthSpeaker.speak("You cleared the table.  Well done.");
                            POOLVR.textGeomLogger.log("YOU CLEARED THE TABLE.  WELL DONE.");
                            POOLVR.resetTable();
                        }
                    } else if (body.bounces === 7) {
                        body.sleep();
                        body.mesh.visible = false;
                        var shadowMesh = POOLVR.ballShadowMeshes[body.ballNum];
                        if (shadowMesh) {
                            shadowMesh.visible = false;
                        }
                    }
                }
            });

            var relVelocity = new CANNON.Vec3();
            var tipCollisionCounter = 0;
            world.addEventListener('beginContact', function (evt) {
                var bodyA = evt.bodyA;
                var bodyB = evt.bodyB;
                if (bodyA.material === bodyB.material) {
                    // ball-ball collision
                    bodyA.velocity.vsub(bodyB.velocity, relVelocity);
                    POOLVR.playCollisionSound(relVelocity.lengthSquared());
                } else if (bodyA.material === POOLVR.openVRTipMaterial && bodyB.material === POOLVR.ballMaterial) {
                    if (POOLVR.openVRTool.body.sleepState === CANNON.Body.AWAKE) {
                        gamepadA.vibrate(12);
                        tipCollisionCounter++;
                        if (tipCollisionCounter === 1) {
                            POOLVR.synthSpeaker.speak("You moved a ball.  Good job.");
                        } else if (tipCollisionCounter === 16) {
                            POOLVR.synthSpeaker.speak("You are doing a great job.");
                        }
                    }
                }
            });

            scene.updateMatrixWorld(true);
            POOLVR.leapTool.updateToolMapping();
            POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);
            POOLVR.startAnimateLoop();

        } );
    } );
};

POOLVR.updateBallsPostStep = function () {
    "use strict";
    for (var i = 0; i < POOLVR.ballMeshes.length; i++) {
        var mesh = POOLVR.ballMeshes[i];
        var body = POOLVR.ballBodies[i];
        mesh.position.copy(body.interpolatedPosition);
        mesh.quaternion.copy(body.interpolatedQuaternion);
        mesh.updateMatrix();
        mesh.updateMatrixWorld();
        var shadowMesh = POOLVR.ballShadowMeshes[i];
        if (shadowMesh) {
            shadowMesh.position.x = mesh.position.x;
            shadowMesh.position.z = mesh.position.z;
            shadowMesh.updateMatrix();
            shadowMesh.updateMatrixWorld();
        }
    }
};

POOLVR.moveAvatar = ( function () {
    "use strict";
    var walkSpeed = 0.333,
        floatSpeed = 0.1;
    var euler = new THREE.Euler(0, 0, 0, 'YXZ');
    return function (keyboard, gamepadValues, dt) {
        var avatar = POOLVR.app.stage;
        var floatUp = keyboard.floatUp - keyboard.floatDown;
        var drive = keyboard.driveBack - keyboard.driveForward;
        var strafe = keyboard.strafeRight - keyboard.strafeLeft;
        var heading = -0.8 * dt * (-keyboard.turnLeft + keyboard.turnRight);
        for (var i = 0; i < gamepadValues.length; i++) {
            var values = gamepadValues[i];
            if (values.toggleFloatMode) {
                if (values.moveFB) floatUp -= values.moveFB;
                if (values.turnLR) strafe += values.turnLR;
            } else {
                if (values.moveFB) drive += values.moveFB;
                if (values.turnLR) heading += -0.8 * dt * values.turnLR;
            }
        }
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
            euler.setFromQuaternion(avatar.quaternion);
            euler.y += heading;
            var cosHeading = Math.cos(euler.y),
                sinHeading = Math.sin(euler.y);
            avatar.quaternion.setFromEuler(euler);
            avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
            avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
            avatar.position.y += dt * floatUp;
            avatar.updateMatrix();
        }
    };
} )();

POOLVR.moveToolRoot = ( function () {
    "use strict";
    return function (keyboard, gamepadValues, dt) {
        var moveFB = 0, moveRL = 0, moveUD = 0, turnRL = 0;
        if (keyboard) {
            moveFB += keyboard.moveToolForwards - keyboard.moveToolBackwards;
            moveUD += keyboard.moveToolUp - keyboard.moveToolDown;
            moveRL += keyboard.moveToolRight - keyboard.moveToolLeft;
            turnRL += keyboard.rotateToolCW - keyboard.rotateToolCCW;
        }
        for (var i = 0; i < gamepadValues.length; i++) {
            var values = gamepadValues[i];
            if (values.toggleToolFloatMode) {
                if (values.toolMoveFB) moveUD -= values.toolMoveFB;
                if (values.toolTurnLR) moveRL += values.toolTurnLR;
            } else {
                if (values.toolMoveFB) moveFB -= values.toolMoveFB;
                if (values.toolTurnLR) turnRL += values.toolTurnLR;
            }
        }
        if (moveFB || moveRL || moveUD || turnRL) {
            YAWVRB.Utils.moveObject(POOLVR.leapTool.toolRoot, dt, moveFB, moveRL, moveUD, turnRL, 0);
            POOLVR.leapTool.setDeadtime(0);
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

};

POOLVR.startAnimateLoop = function () {
    "use strict";
    var keyboard = POOLVR.keyboard,
        render = POOLVR.app.render,
        world = POOLVR.world,
        avatar = POOLVR.app.stage,
        updateBallsPostStep = POOLVR.updateBallsPostStep,
        moveToolRoot = POOLVR.moveToolRoot,
        moveAvatar = POOLVR.moveAvatar,
        textGeomLogger = POOLVR.textGeomLogger,
        leapTool = POOLVR.leapTool,
        openVRTool = POOLVR.openVRTool;

    var lt = 0;

    function animate(t) {

        var dt = (t - lt) * 0.001;

        textGeomLogger.update(t);

        leapTool.updateTool(dt);

        var gamepadValues = YAWVRB.Gamepads.update();
        openVRTool.update(dt);

        render();

        world.step(Math.min(1/60, dt), dt, 10);

        leapTool.updateToolPostStep();
        updateBallsPostStep();

        moveAvatar(keyboard, gamepadValues, dt);
        moveToolRoot(keyboard, gamepadValues, dt);
        avatar.updateMatrixWorld();
        leapTool.updateToolMapping();

        lt = t;

        requestAnimationFrame(animate);

    }

    requestAnimationFrame(animate);

};
