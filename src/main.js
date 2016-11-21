window.POOLVR = window.POOLVR || {};

/* global App, Gamepads, LeapMotion, SynthSpeaker, TextGeomUtils, Utils */
window.App = require('./App.js');
window.Gamepads = require('./Gamepads.js');
window.LeapMotion = require('./LeapMotion.js');
window.SynthSpeaker = require('./SynthSpeaker.js');
window.TextGeomUtils = require('./TextGeomUtils.js');
window.Utils = require('./Utils.js');

require('./sounds.js');
require('./actions.js');
require('./config.js');
require('./menu.js');

/* global POOLVR, THREE, CANNON, THREEPY_SCENE */
window.onLoad = function () {
    "use strict";
    const INCH2METERS = 0.0254;

    if (Utils.URL_PARAMS.clearLocalStorage) {
        console.log('clearing localStorage...');
        localStorage.clear();
    }

    THREE.Object3D.DefaultMatrixAutoUpdate = false;

    var loadedConfig = POOLVR.loadConfig(POOLVR.profile);
    POOLVR.config = loadedConfig || POOLVR.config;
    POOLVR.parseURIConfig();

    console.log("POOLVR.config:");
    console.log(POOLVR.config);

    POOLVR.synthSpeaker = new SynthSpeaker({volume: POOLVR.config.synthSpeakerVolume || 0.6, rate: POOLVR.config.synthSpeakerRate || 0.75, pitch: POOLVR.config.synthSpeakerPitch || 0.5});

    // TODO: return menu items
    POOLVR.setupMenu();

    var rendererOptions = {
        canvas: document.getElementById('webgl-canvas'),
        antialias: (Utils.URL_PARAMS.antialias !== undefined ? Utils.URL_PARAMS.antialias : POOLVR.config.antialias) || !Utils.isMobile(),
        alpha: false
    };

    var appConfig = {
        onResetVRSensor: function () {
            POOLVR.leapTool.updateToolMapping();
        }
    };

    POOLVR.app = new App(undefined, appConfig, rendererOptions);

    POOLVR.app.stage.add(POOLVR.app.camera);

    if (POOLVR.config.useShadowMap) {
        POOLVR.app.renderer.shadowMap.enabled = true;
        POOLVR.app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    if (!loadedConfig) {
        POOLVR.synthSpeaker.speak("Hello. Welcome. To. Pool-ver.");
    }

    var leapIndicator = document.getElementById('leapIndicator');
    POOLVR.leapTool = LeapMotion.makeTool( Utils.combineObjects(POOLVR.config.toolOptions, {
        onConnect: function () {
            leapIndicator.innerHTML = 'connected';
            leapIndicator.style['background-color'] = 'rgba(60, 100, 20, 0.8)';
            POOLVR.app.stage.add(POOLVR.leapTool.toolRoot);
            POOLVR.world.addBody(POOLVR.leapTool.toolBody);
        },
        onStreamingStarted: function () {
            leapIndicator.innerHTML = 'connected, streaming';
            leapIndicator.style['background-color'] = 'rgba(20, 160, 20, 0.8)';
            POOLVR.leapTool.toolRoot.visible = true;
            POOLVR.app.vrControls.update();
            POOLVR.leapTool.toolRoot.position.y = POOLVR.app.camera.position.y - 2*INCH2METERS;
            POOLVR.leapTool.toolRoot.updateMatrix();
            POOLVR.leapTool.toolRoot.updateMatrixWorld();
        },
        onStreamingStopped: function () {
            leapIndicator.innerHTML = 'connected, streaming stopped';
            leapIndicator.style['background-color'] = 'rgba(60, 100, 20, 0.8)';
            POOLVR.leapTool.toolRoot.visible = false;
        },
        onDisconnect: function () {
            leapIndicator.innerHTML = 'disconnected';
            leapIndicator.style['background-color'] = 'rgba(60, 20, 20, 0.4)';
            POOLVR.leapTool.toolRoot.visible = false;
        }
    }) );
    POOLVR.leapTool.toolBody.material = POOLVR.tipMaterial;
    POOLVR.leapTool.toolMesh.renderOrder = -1;
    POOLVR.leapTool.toolRoot.visible = false;
    POOLVR.leapTool.leapController.connect();

    window.addEventListener("beforeunload", function () {
        POOLVR.leapTool.leapController.disconnect();
    }, false);

    POOLVR.openVRTool = Gamepads.makeTool(Utils.combineObjects(POOLVR.config.toolOptions, {
        tipMaterial: POOLVR.openVRTipMaterial
    }));
    POOLVR.openVRTool.mesh.visible = false;
    if (POOLVR.openVRTool.shadowMesh) POOLVR.openVRTool.shadowMesh.visible = false;
    POOLVR.app.stage.add(POOLVR.openVRTool.mesh);
    var gamepadA;
    Gamepads.setOnGamepadConnected(onGamepadConnected);
    function onGamepadConnected(e) {
        var gamepad = e.gamepad;
        if (!gamepad) return;
        if (/openvr/i.test(gamepad.id)) {
            if (gamepadA) {
                console.log('OpenVR controller B connected');
                Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadBCommands);
            } else {
                console.log('OpenVR controller A connected');
                gamepadA = gamepad;
                Gamepads.setGamepadCommands(gamepad.index, POOLVR.vrGamepadACommands);
                POOLVR.openVRTool.mesh.visible = true;
                if (POOLVR.openVRTool.shadowMesh) POOLVR.openVRTool.shadowMesh.visible = true;
                POOLVR.openVRTool.setGamepad(gamepad);
                POOLVR.world.addBody(POOLVR.openVRTool.body);
            }
        } else if (/xbox/i.test(gamepad.id) || /xinput/i.test(gamepad.id)) {
            Gamepads.setGamepadCommands(gamepad.index, POOLVR.xboxGamepadCommands);
        } else if (/3232/i.test(gamepad.id) || /b629/i.test(gamepad.id)) {
            Gamepads.setGamepadCommands(gamepad.index, POOLVR.destekGamepadCommands);
        }
    }
    Gamepads.setOnGamepadDisconnected( function (evt) {
        if (gamepadA && gamepadA.index === evt.gamepad.index) {
            POOLVR.openVRTool.mesh.visible = false;
            if (POOLVR.openVRTool.shadowMesh) POOLVR.openVRTool.shadowMesh.visible = false;
        }
    } );

    THREE.py.parse(THREEPY_SCENE).then( function (scene) {

        // add balls:
        var ballColors = [0xddddde,  // white
                          0xeeee00,  // yellow
                          0x0000ee,  // blue
                          0xee0000,  // red
                          0xee00ee,  // purple
                          0xee7700,  // orange
                          0x00ee00,  // green
                          0xbb2244,  // maroon
                          0x111111]; // black
        var ballMaterials = ballColors.map( function (color) { return new THREE.MeshPhongMaterial({color: color}); } );
        function linspace(a, b, n) {
            var r = [];
            for (var i = 0; i < n; i++) {
                r.push(i * (b - a) / (n - 1) + a);
            }
            return r;
        }
        var ballDiameter = POOLVR.config.ball_diameter;
        var ballRadius = ballDiameter / 2;
        var d = 0.04 * ballRadius;
        var rackSideLength = 4 * (ballDiameter + d);
        var xPositions = [0];
        Array.prototype.push.apply(xPositions, linspace(0,                         0.5 * rackSideLength,                          5));
        Array.prototype.push.apply(xPositions, linspace(-0.5 * (ballDiameter + d), 0.5 * rackSideLength - 1 * (ballDiameter + d), 4));
        Array.prototype.push.apply(xPositions, linspace(-1.0 * (ballDiameter + d), 0.5 * rackSideLength - 2 * (ballDiameter + d), 3));
        Array.prototype.push.apply(xPositions, linspace(-1.5 * (ballDiameter + d), 0.5 * rackSideLength - 3 * (ballDiameter + d), 2));
        xPositions.push(-2 * (ballDiameter + d));
        var zPositions = [0];
        Array.prototype.push.apply(zPositions, linspace(0,                                       0.5 * Math.sqrt(3) * rackSideLength, 5));
        Array.prototype.push.apply(zPositions, linspace(0.5 * Math.sqrt(3) * (ballDiameter + d), 0.5 * Math.sqrt(3) * rackSideLength, 4));
        Array.prototype.push.apply(zPositions, linspace(1.0 * Math.sqrt(3) * (ballDiameter + d), 0.5 * Math.sqrt(3) * rackSideLength, 3));
        Array.prototype.push.apply(zPositions, linspace(1.5 * Math.sqrt(3) * (ballDiameter + d), 0.5 * Math.sqrt(3) * rackSideLength, 2));
        zPositions.push(0.5 * Math.sqrt(3) * rackSideLength);
        zPositions = zPositions.map( function (z) { return -z - POOLVR.config.L_table / 8; } );
        zPositions[0] = POOLVR.config.L_table / 4;
        var ballGeom = new THREE.SphereBufferGeometry(ballRadius, 16, 12);
        var stripeGeom = new THREE.SphereBufferGeometry(1.012 * ballRadius, 16, 8, 0, 2*Math.PI, Math.PI / 3, Math.PI / 3);
        ballMaterials.forEach( function (material, i) {
            var ballMesh = new THREE.Mesh(ballGeom, material);
            ballMesh.castShadow = true;
            ballMesh.name = 'ballMesh ' + i;
            ballMesh.position.set(xPositions[i], POOLVR.config.H_table + ballRadius + 0.0001, zPositions[i]);
            ballMesh.updateMatrix();
            ballMesh.updateMatrixWorld();
            ballMesh.userData = {cannonData: {mass: 0.17, shapes: ['Sphere'], linearDamping: 0.27, angularDamping: 0.34}};
            scene.add(ballMesh);
        } );
        ballMaterials.slice(1, -1).forEach( function (material, i) {
            i = i + ballMaterials.length;
            var ballMesh = new THREE.Mesh(ballGeom, ballMaterials[0]);
            ballMesh.castShadow = true;
            ballMesh.name = 'ballMesh ' + i;
            var stripeMesh = new THREE.Mesh(stripeGeom, material);
            stripeMesh.name = 'ballStripeMesh ' + i;
            ballMesh.add(stripeMesh);
            ballMesh.position.set(xPositions[i], POOLVR.config.H_table + ballRadius + 0.0001, zPositions[i]);
            ballMesh.updateMatrix();
            ballMesh.updateMatrixWorld();
            ballMesh.userData = {cannonData: {mass: 0.17, shapes: ['Sphere'], linearDamping: 0.27, angularDamping: 0.34}};
            scene.add(ballMesh);
        } );

        scene.autoUpdate = false;

        POOLVR.app.scene = scene;

        POOLVR.app.scene.add(POOLVR.app.stage);

        if (POOLVR.leapTool.toolShadowMesh) {
            POOLVR.app.scene.add(POOLVR.leapTool.toolShadowMesh);
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
        pointLight.updateMatrix();
        pointLight.updateMatrixWorld();
        scene.add(pointLight);
        POOLVR.pointLight = pointLight;
        POOLVR.pointLight.visible = POOLVR.config.usePointLight;

        navigator.getVRDisplays().then( function (vrDisplays) {
            var vrDisplay = vrDisplays[0];
            var isVive = /vive/i.test(vrDisplay.displayName);
            if (!(vrDisplay.stageParameters && vrDisplay.stageParameters.sittingToStandingTransform)) {
                POOLVR.app.vrControls.update();
                POOLVR.leapTool.toolRoot.position.y = POOLVR.app.camera.position.y - 2*INCH2METERS;
                POOLVR.leapTool.toolRoot.updateMatrix();
                POOLVR.app.stage.position.y = 45.5 * INCH2METERS;
                POOLVR.app.stage.position.z = 0.5 * POOLVR.config.L_table + 12 * INCH2METERS;
                POOLVR.app.stage.updateMatrix();
                POOLVR.app.stage.updateMatrixWorld();
                // POOLVR.app.vrControls.standing = false;
            } else {
                var sizeX = vrDisplay.stageParameters.sizeX;
                var sizeZ = vrDisplay.stageParameters.sizeZ;
                // rotate the room if it better fits the stage / play area:
                if (sizeX && sizeZ && sizeX > sizeZ) {
                    var rotation = (new THREE.Matrix4()).makeRotationY(Math.PI / 2);
                    POOLVR.app.scene.children.forEach( function (child) {
                        if (child !== POOLVR.app.stage) {
                            child.matrix.multiplyMatrices(rotation, child.matrix);
                            child.matrix.decompose(child.position, child.quaternion, child.scale);
                            child.updateMatrixWorld(true);
                        }
                    } );
                }
            }

            THREE.py.CANNONize(scene, POOLVR.world);

            POOLVR.ballMeshes = [];
            POOLVR.ballBodies = [];
            POOLVR.initialPositions = [];
            POOLVR.onTable = [true,
                              true, true, true, true, true, true, true,
                              true,
                              true, true, true, true, true, true, true];
            POOLVR.nextBall = 1;
            POOLVR.ballShadowMeshes = [];

            var floorBody, ceilingBody, floorMesh;
            var cushionMeshes = [];
            var railMeshes = [];
            scene.traverse( function (node) {
                if (node instanceof THREE.Mesh) {
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
                        cushionMeshes.push(node);
                    }
                    else if (node.name === 'floorMesh') {
                        floorBody = node.body;
                        floorBody.material = POOLVR.floorMaterial;
                        floorMesh = node;
                    }
                    else if (node.name === 'ceilingMesh') {
                        ceilingBody = node.body;
                        ceilingBody.material = POOLVR.floorMaterial;
                    }
                    else if (node.name.endsWith('RailMesh')) {
                        node.body.material = POOLVR.railMaterial;
                        railMeshes.push(node);
                    }
                }
            });

            for (var i = 1; i < cushionMeshes.length; i++) {
                cushionMeshes[0].geometry.merge(cushionMeshes[i].geometry);
                scene.remove(cushionMeshes[i]);
            }
            for (i = 1; i < railMeshes.length; i++) {
                railMeshes[0].geometry.merge(railMeshes[i].geometry);
                scene.remove(railMeshes[i]);
            }

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
            POOLVR.world.addEventListener('beginContact', function (evt) {
                var bodyA = evt.bodyA;
                var bodyB = evt.bodyB;
                bodyA.velocity.vsub(bodyB.velocity, relVelocity);
                if (bodyA.material === bodyB.material) {
                    // ball-ball collision
                    POOLVR.playCollisionSound(relVelocity.lengthSquared());
                } else if (bodyA.material === POOLVR.openVRTipMaterial && bodyB.material === POOLVR.ballMaterial) {
                    if (POOLVR.openVRTool.body.sleepState === CANNON.Body.AWAKE) {
                        if (gamepadA && "haptics" in gamepadA && gamepadA.haptics.length > 0) {
                            gamepadA.haptics[0].vibrate(relVelocity.lengthSquared() / 5, 11);
                        } else if (gamepadA && "hapticActuators" in gamepadA && gamepadA.hapticActuators.length > 0) {
                            gamepadA.hapticActuators[0].pulse(relVelocity.lengthSquared() / 5, 11);
                        }
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

            if (POOLVR.config.useTextGeomLogger) {
                var fontLoader = new THREE.FontLoader();
                fontLoader.load('fonts/Anonymous Pro_Regular.js', function (font) {
                    var textGeomCacher = new TextGeomUtils.TextGeomCacher(font, {size: 0.12, curveSegments: 2});
                    var textGeomLoggerMaterial = new THREE.MeshBasicMaterial({color: 0xff3210});
                    POOLVR.textGeomLogger = new TextGeomUtils.TextGeomLogger(textGeomCacher,
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

            if (isVive) {
                var loader = new THREE.OBJLoader();
                loader.setPath( 'node_modules/three/examples/models/obj/vive-controller/' );
                loader.load( 'vr_controller_vive_1_5.obj', function ( object ) {
                    var loader = new THREE.TextureLoader();
                    loader.setPath('node_modules/three/examples/models/obj/vive-controller/');
                    var viveDiffuseMap = loader.load('onepointfive_texture.png');
                    var viveSpecularMap = loader.load('onepointfive_spec.png');
                    var controller = object.children[ 0 ];
                    controller.material.map = viveDiffuseMap;
                    controller.material.specularMap = viveSpecularMap;
                    var controllerMesh = object.clone();
                    POOLVR.openVRTool.mesh.add(controllerMesh);
                    setTimeout( function () {
                        POOLVR.openVRTool.mesh.remove(controllerMesh);
                    }, 14000);
                    POOLVR.startAnimateLoop();
                } );
            } else {
                if (Utils.isMobile()) {
                    scene.remove(floorMesh);
                }
                POOLVR.startAnimateLoop();
            }

        } );
    } );

};


POOLVR.startAnimateLoop = function () {
    "use strict";

    POOLVR.app.scene.traverse( function (node) {
        if (node instanceof THREE.Mesh) {
            if ((node.material instanceof THREE.MeshLambertMaterial || node.material instanceof THREE.MeshPhongMaterial) && (POOLVR.basicMaterials[node.material.uuid] === undefined)) {
                var basicMaterial = new THREE.MeshBasicMaterial({color: node.material.color.getHex(), transparent: node.material.transparent, side: node.material.side, map: node.material.map});
                POOLVR.basicMaterials[node.material.uuid] = basicMaterial;
                POOLVR.nonBasicMaterials[basicMaterial.uuid] = node.material;
            }
        }
    } );

    POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);

    /* global Stats */
    if (Utils.URL_PARAMS.stats) {
        var stats = new Stats();
        stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
        document.body.appendChild( stats.dom );
    } else {
        stats = {begin: function () {}, end: function () {}};
    }

    var keyboard = POOLVR.keyboard,
        render = POOLVR.app.render,
        world = POOLVR.world,
        stage = POOLVR.app.stage,
        moveToolRoot = POOLVR.moveToolRoot,
        moveStage = POOLVR.moveStage,
        leapTool = POOLVR.leapTool,
        openVRTool = POOLVR.openVRTool;

    var lt = window.performance.now();

    function animate(t) {

        stats.begin();

        t = window.performance.now();
        var dt = (t - lt) * 0.001;
        lt = t;

        if (POOLVR.textGeomLogger) POOLVR.textGeomLogger.update(dt);

        leapTool.updateTool(dt);

        var gamepadValues = Gamepads.update();
        openVRTool.update(dt);

        world.step(Math.min(1/60, dt), dt, 10);

        leapTool.updateToolPostStep();
        updateBallsPostStep();

        render();

        moveStage(keyboard, gamepadValues, dt);
        stage.updateMatrixWorld();
        moveToolRoot(keyboard, gamepadValues, dt);
        leapTool.updateToolMapping();

        stats.end();

        if (POOLVR.app.vrDisplay.isPresenting) {
            POOLVR.requestID = POOLVR.app.vrEffect.requestAnimationFrame(animate);
        } else {
            POOLVR.requestID = window.requestAnimationFrame(animate);
        }

    }

    function updateBallsPostStep() {
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
    }

    POOLVR.animate = animate;
    POOLVR.requestID = window.requestAnimationFrame(animate);

};
