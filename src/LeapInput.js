// TODO: refactor, more generic
function makeTool(parent, world, options) {
    /*************************************

    parent: THREE.Object3D
    world : CANNON.World

    returns: stuff

    *************************************/
    "use strict";
    options = options || {};

    var UP = THREE.Object3D.DefaultUp;
    var FORWARD = new THREE.Vector3(0, 0, -1);

    // coordinate transformations are performed via three.js scene graph
    var toolRoot = new THREE.Object3D();
    var LEAP2METERS = 0.001;
    var METERS2LEAP = 1000;
    toolRoot.scale.set(LEAP2METERS, LEAP2METERS, LEAP2METERS);
    parent.add(toolRoot);

    // parse options:

    toolRoot.heading = options.toolRotation || 0;
    toolRoot.quaternion.setFromAxisAngle(UP, toolRoot.heading);
    toolRoot.position.fromArray(options.toolOffset || [0, -0.42, -0.42]);

    var toolLength = options.toolLength || 0.5;
    var toolRadius = options.toolRadius || 0.013;
    // should remove, don't think this matters for cannon.js kinematic body:
    var toolMass   = options.toolMass   || 0.04;

    var tipShape = options.tipShape || 'Cylinder';
    var tipRadius,
        tipMinorRadius;
    if (tipShape === 'Cylinder') {
        tipRadius = options.tipRadius || toolRadius;
    } else {
        tipRadius = options.tipRadius || 0.95 * toolRadius;
        // if (tipShape === 'Ellipsoid') {
        //     tipMinorRadius = options.tipMinorRadius || 0.25 * tipRadius;
        // }
    }

    var toolTimeA = options.toolTimeA || 0.25;
    var toolTimeB = options.toolTimeB || toolTimeA + 1.5;

    var minConfidence = options.minConfidence || 0.3;

    var interactionPlaneOpacity = options.interactionPlaneOpacity || 0.23;

    var stickColor = options.stickColor || 0xeebb99;
    var tipColor   = options.tipColor   || 0x004488;
    var handColor  = options.handColor  || 0x113399;

    var host = options.host || '127.0.0.1';
    var port = options.port || 6437;

    // set up / connect to leap controller:

    var leapController = new Leap.Controller({background: true,
                                              host: host, port: port});

    // leap motion event callbacks:
    var onConnect = options.onConnect || function () {
        console.log('Leap Motion WebSocket connected');
    };
    leapController.on('connect', onConnect);

    var onDisconnect = options.onDisconnect || function () {
        console.log('Leap Motion WebSocket disconnected');
    };
    leapController.on('disconnect', onDisconnect);

    var onStreamingStarted = options.onStreamingStarted || function () {
        console.log('Leap Motion streaming started');
    };
    leapController.on('streamingStarted', onStreamingStarted);

    var onStreamingStopped = options.onStreamingStopped || function () {
        console.warn('Leap Motion streaming stopped');
    };
    leapController.on('streamingStopped', onStreamingStopped);

    leapController.connect();

    // setup three.js tool graphics:

    // interaction box visual guide:
    var interactionBoxRoot = new THREE.Object3D();
    toolRoot.add(interactionBoxRoot);

    var interactionPlaneMaterial = new THREE.MeshBasicMaterial({color: 0x00dd44, transparent: true, opacity: interactionPlaneOpacity});
    var interactionPlaneGeom = new THREE.PlaneBufferGeometry(METERS2LEAP, METERS2LEAP);

    var interactionPlaneMesh = new THREE.Mesh(interactionPlaneGeom, interactionPlaneMaterial);
    interactionBoxRoot.add(interactionPlaneMesh);

    interactionPlaneMesh = interactionPlaneMesh.clone();
    interactionPlaneMesh.position.z = METERS2LEAP * 0.5;
    interactionPlaneMesh.updateMatrix();
    interactionBoxRoot.add(interactionPlaneMesh);

    interactionPlaneMesh = interactionPlaneMesh.clone();
    interactionPlaneMesh.position.z = METERS2LEAP * (-0.5);
    interactionPlaneMesh.updateMatrix();
    interactionBoxRoot.add(interactionPlaneMesh);
    interactionBoxRoot.renderOrder = 2;

    // leap motion controller:
    var IN2METER = 0.0254;
    var leapGeom = new THREE.BoxBufferGeometry(METERS2LEAP*IN2METER*3, METERS2LEAP*IN2METER*0.5, METERS2LEAP*IN2METER*1.2);
    var leapMaterial = new THREE.MeshLambertMaterial({color: 0x777777});
    var leapMesh = new THREE.Mesh(leapGeom, leapMaterial);
    leapMesh.position.y = METERS2LEAP*IN2METER*0.25;
    leapMesh.updateMatrix();
    toolRoot.add(leapMesh);

    // the stick:
    var stickGeom = new THREE.CylinderGeometry(METERS2LEAP*toolRadius, METERS2LEAP*toolRadius, METERS2LEAP*toolLength, 10, 1, false);
    stickGeom.translate(0, -0.5*METERS2LEAP*toolLength, 0);
    stickGeom.rotateX(-0.5 * Math.PI);
    var bufferGeom = new THREE.BufferGeometry();
    bufferGeom.fromGeometry(stickGeom);
    stickGeom.dispose();
    stickGeom = bufferGeom;
    var stickMaterial = new THREE.MeshLambertMaterial({color: stickColor, transparent: true});
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    toolRoot.add(stickMesh);

    var useShadowMap = POOLVR.config.useShadowMap;
    var stickShadowMesh;
    if (!useShadowMap) {
        stickShadowMesh = new THREE.ShadowMesh(stickMesh, POOLVR.shadowMaterial);
        POOLVR.app.scene.add(stickShadowMesh);
        var shadowPlane = new THREE.Plane(UP, (POOLVR.config.H_table + 0.001));
        var shadowLightPosition = new THREE.Vector4(0, 5, 0, 0.01);
        stickShadowMesh.updateShadowMatrix(shadowPlane, shadowLightPosition);
    }

    var tipBody = new CANNON.Body({mass: toolMass, type: CANNON.Body.KINEMATIC});
    // TODO: rename, avoid confusion b/t cannon and three materials
    tipBody.material = POOLVR.tipMaterial;
    var tipMesh = null;
    if (tipShape !== 'Cylinder') {
        var tipGeom = new THREE.SphereBufferGeometry(METERS2LEAP*tipRadius, 10);

        // TODO: implement cannon.js ellipsoid shape
        // if (tipShape === 'Ellipsoid') {
        //     tipGeom.scale(1, tipMinorRadius / tipRadius, 1);
        //     tipBody.addShape(new CANNON.Ellipsoid(tipRadius, tipMinorRadius, tipRadius));
        // } else {
        //     tipBody.addShape(new CANNON.Sphere(tipRadius));
        // }
        tipBody.addShape(new CANNON.Sphere(tipRadius));

        var tipMaterial = new THREE.MeshLambertMaterial({color: tipColor, transparent: true});
        tipMesh = new THREE.Mesh(tipGeom, tipMaterial);
        tipMesh.castShadow = true;
        stickMesh.add(tipMesh);
    } else {
        // whole stick
        //var shapeQuaternion = new CANNON.Quaternion();
        //shapeQuaternion.setFromEuler(-Math.PI / 2, 0, 0, 'XYZ');
        //var shapePosition = new CANNON.Vec3(0, -tipRadius, 0);
        var shapePosition = new CANNON.Vec3(0, 0, tipRadius);
        //tipBody.addShape(new CANNON.Cylinder(tipRadius, tipRadius, 2*tipRadius, 8), shapePosition, shapeQuaternion);
        tipBody.addShape(new CANNON.Cylinder(tipRadius, tipRadius, 2*tipRadius, 8), shapePosition);
    }
    world.addBody(tipBody);

    // setup three.js hands:

    // hands don't necessarily correspond the left / right labels, but doesn't matter to me because they look indistinguishable
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    var handRoots = [leftRoot, rightRoot];
    toolRoot.add(leftRoot);
    toolRoot.add(rightRoot);

    var handMaterial = new THREE.MeshBasicMaterial({color: handColor, transparent: true, opacity: 0});

    // arms:
    var armRadius = METERS2LEAP*0.0216,
        armLength = METERS2LEAP*0.22;
    var armGeom = new THREE.CylinderGeometry(armRadius, armRadius, armLength);
    bufferGeom = new THREE.BufferGeometry();
    bufferGeom.fromGeometry(armGeom);
    armGeom.dispose();
    armGeom = bufferGeom;
    var armMesh = new THREE.Mesh(armGeom, handMaterial);
    var arms = [armMesh, armMesh.clone()];
    leftRoot.add(arms[0]);
    rightRoot.add(arms[1]);
    // palms:
    var radius = METERS2LEAP*0.025;
    var palmGeom = new THREE.SphereBufferGeometry(radius).scale(1, 0.5, 1);
    var palmMesh = new THREE.Mesh(palmGeom, handMaterial);
    palmMesh.castShadow = true;
    var palms = [palmMesh, palmMesh.clone()];
    leftRoot.add(palms[0]);
    rightRoot.add(palms[1]);
    // fingertips:
    radius = METERS2LEAP*0.005;
    var fingerTipGeom = new THREE.SphereBufferGeometry(radius);
    var fingerTipMesh = new THREE.Mesh(fingerTipGeom, handMaterial);
    var fingerTips = [[fingerTipMesh, fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone()],
                      [fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone()]];
    leftRoot.add(fingerTips[0][0], fingerTips[0][1], fingerTips[0][2], fingerTips[0][3], fingerTips[0][4]);
    rightRoot.add(fingerTips[1][0], fingerTips[1][1], fingerTips[1][2], fingerTips[1][3], fingerTips[1][4]);
    // finger joints:
    var jointMesh = fingerTipMesh.clone();
    jointMesh.scale.set(7/5, 7/5, 7/5);
    var joints = [[jointMesh, jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone()],
                  [jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone()]];
    leftRoot.add(joints[0][0], joints[0][1], joints[0][2], joints[0][3], joints[0][4]);
    rightRoot.add(joints[1][0], joints[1][1], joints[1][2], joints[1][3], joints[1][4]);
    // TODO: use the anatomical names
    // TODO: reduce fractions
    var joint2Mesh = fingerTipMesh.clone();
    joint2Mesh.scale.set(55/50, 55/50, 55/50);
    var joint2s = [[joint2Mesh, joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone()],
                  [joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone()]];
    leftRoot.add(joint2s[0][0], joint2s[0][1], joint2s[0][2], joint2s[0][3], joint2s[0][4]);
    rightRoot.add(joint2s[1][0], joint2s[1][1], joint2s[1][2], joint2s[1][3], joint2s[1][4]);

    interactionBoxRoot.visible = false;

    stickMesh.visible = false;

    leftRoot.visible  = false;
    rightRoot.visible = false;

    // to store decomposed toolRoot world matrix, used to convert three.js local coords to cannon.js world coords:
    toolRoot.worldPosition = new THREE.Vector3();
    toolRoot.worldQuaternion = new THREE.Quaternion();
    toolRoot.worldScale = new THREE.Vector3();
    // inverse of toolRoot.matrixWorld, used for converting cannon.js world coords to three.js local coords:
    toolRoot.matrixWorldInverse = new THREE.Matrix4();

    function updateToolMapping() {
        toolRoot.matrixWorld.decompose(toolRoot.worldPosition, toolRoot.worldQuaternion, toolRoot.worldScale);
        toolRoot.matrixWorldInverse.getInverse(toolRoot.matrixWorld);
    }

    // initialize matrices now:
    toolRoot.updateMatrix();
    toolRoot.updateMatrixWorld();

    updateToolMapping();

    if (!useShadowMap) {
        stickShadowMesh.updateMatrix();
        stickShadowMesh.updateMatrixWorld();
        stickShadowMesh.visible = false;
    }


    var tipCollisionCounter = 0;
    tipBody.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {
        // TODO: move this function definition elsewhere, pass as option
        tipCollisionCounter++;
        if (tipCollisionCounter === 1) {
            setTimeout(function () {
                POOLVR.synthSpeaker.speak("You moved a ball.  Good job.");
            }, 250);
        }
        else if (tipCollisionCounter === 16) {
            setTimeout(function () {
                POOLVR.synthSpeaker.speak("You are doing a great job.");
            }, 3000);
        }
    });


    function updateToolPostStep() {
        stickMesh.position.copy(tipBody.interpolatedPosition);
        stickMesh.position.applyMatrix4(toolRoot.matrixWorldInverse);
        stickMesh.updateMatrix();
        //stickMesh.updateMatrixWorld();

        if (!useShadowMap) {
            stickShadowMesh.updateMatrix();
            //stickShadowMesh.updateMatrixWorld();
        }
    }


    var deadtime = 0;

    function moveToolRoot(keyboard, gamepad, dt) {
        var toolDrive = 0;
        var toolFloat = 0;
        var toolStrafe = 0;
        var rotateToolCW = 0;
        if (keyboard) {
            toolDrive += keyboard.moveToolForwards - keyboard.moveToolBackwards;
            toolFloat += keyboard.moveToolUp - keyboard.moveToolDown;
            toolStrafe += keyboard.moveToolRight - keyboard.moveToolLeft;
            rotateToolCW += keyboard.rotateToolCW - keyboard.rotateToolCCW;
        }
        if (gamepad) {
            // if (POOLVR.toolFloatMode) {
            //     toolFloat += gamepad.getValue("toolFloat");
            //     toolStrafe += gamepad.getValue("toolStrafe");
            // } else {
            //     toolDrive -= gamepad.getValue("toolDrive");
            //     rotateToolCW -= gamepad.getValue("toolStrafe");
            // }
        }
        if ((toolDrive !== 0) || (toolStrafe !== 0) || (toolFloat !== 0) || (rotateToolCW !== 0)) {
            toolRoot.position.x +=  0.16 * dt * toolStrafe;
            toolRoot.position.z += -0.16 * dt * toolDrive;
            toolRoot.position.y +=  0.16 * dt * toolFloat;
            toolRoot.heading -= 0.15 * dt * rotateToolCW;
            toolRoot.quaternion.setFromAxisAngle(UP, toolRoot.heading);

            toolRoot.updateMatrix();

            if (interactionBoxRoot.visible === false) {
                interactionBoxRoot.visible = true;
                interactionPlaneMaterial.opacity = interactionPlaneOpacity;
            }

            deadtime = 0;

        }
    }

    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    var velocity = new THREE.Vector3();
    var quaternion = new THREE.Quaternion();
    var lastFrameID;

    function updateTool(dt) {

        deadtime += dt;

        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {

            lastFrameID = frame.id;

            var interactionBox = frame.interactionBox;
            if (interactionBox.valid) {
                interactionBoxRoot.position.fromArray(interactionBox.center);
                interactionBoxRoot.scale.set(interactionBox.width*LEAP2METERS, interactionBox.height*LEAP2METERS, interactionBox.depth*LEAP2METERS);
                interactionBoxRoot.updateMatrix();
                interactionBoxRoot.updateMatrixWorld();
            }

            if (frame.tools.length === 1) {

                deadtime = 0;

                var tool = frame.tools[0];

                if (stickMesh.visible === false || stickMesh.material.opacity < 1) {
                    stickMesh.visible = true;

                    if (!useShadowMap) stickShadowMesh.visible = true;

                    stickMesh.material.opacity = 1;
                    if (tipMesh) tipMesh.material.opacity = 1;
                    interactionBoxRoot.visible = true;
                    interactionPlaneMaterial.opacity = interactionPlaneOpacity;
                }

                position.fromArray(tool.tipPosition);
                //position.fromArray(tool.stabilizedTipPosition);
                direction.fromArray(tool.direction);

                stickMesh.position.copy(position);
                position.applyMatrix4(toolRoot.matrixWorld);
                tipBody.position.copy(position);

                stickMesh.quaternion.setFromUnitVectors(FORWARD, direction);

                quaternion.multiplyQuaternions(toolRoot.worldQuaternion, stickMesh.quaternion);
                tipBody.quaternion.copy(quaternion);

                stickMesh.updateMatrix();
                stickMesh.updateMatrixWorld();

                if (!useShadowMap) {
                    stickShadowMesh.updateMatrix();
                    stickShadowMesh.updateMatrixWorld();
                }

                velocity.fromArray(tool.tipVelocity);
                velocity.applyQuaternion(toolRoot.worldQuaternion);
                velocity.multiplyScalar(LEAP2METERS);
                tipBody.velocity.copy(velocity);

                if (tool.timeVisible > toolTimeA) {
                    // stick becomes collidable once it has been detected for duration `toolTimeA`
                    if (tipBody.sleepState === CANNON.Body.SLEEPING) {
                        tipBody.wakeUp();
                        // TODO: indicator (particle effect)
                        if (tipMesh) tipMesh.material.color.setHex(0xff0000);
                    }

                    if (tool.timeVisible > toolTimeB && interactionPlaneMaterial.opacity > 0.1) {
                        // dim the interaction box:
                        interactionPlaneMaterial.opacity *= 0.94;
                    }

                }

            } else if (tipBody.sleepState === CANNON.Body.AWAKE) {
                // tool detection was just lost
                tipBody.sleep();
                if (tipMesh) tipMesh.material.color.setHex(tipColor);

            } else {
                // tool is already lost
                if (stickMesh.visible && stickMesh.material.opacity > 0.1) {
                    // fade out tool
                    stickMesh.material.opacity *= 0.8;
                    if (tipMesh) tipMesh.material.opacity = stickMesh.material.opacity;
                } else {
                    stickMesh.visible = false;
                    if (!useShadowMap) stickShadowMesh.visible = false;
                }
            }

            updateHands(frame);

        }

        if ( deadtime > 1.5 && interactionBoxRoot.visible ) {
            interactionPlaneMaterial.opacity *= 0.93;
            if (interactionPlaneMaterial.opacity < 0.02) interactionBoxRoot.visible = false;
        }

    }

    function updateHands(frame) {
        leftRoot.visible = rightRoot.visible = false;
        for (var i = 0; i < frame.hands.length; i++) {
            var hand = frame.hands[i];
            if (hand.confidence > minConfidence) {

                handRoots[i].visible = true;
                handMaterial.opacity = 0.7*handMaterial.opacity + 0.3*(hand.confidence - minConfidence) / (1 - minConfidence);

                var arm = arms[i];
                direction.fromArray(hand.arm.basis[2]);
                arm.quaternion.setFromUnitVectors(UP, direction);
                arm.position.fromArray(hand.arm.center());
                arm.updateMatrix();

                var palm = palms[i];
                direction.fromArray(hand.palmNormal);
                palm.quaternion.setFromUnitVectors(UP, direction);
                palm.position.fromArray(hand.palmPosition);
                palm.updateMatrix();

                var handFingerTips = fingerTips[i];
                var handJoints = joints[i];
                var handJoint2s = joint2s[i];
                for (var j = 0; j < hand.fingers.length; j++) {
                    var finger = hand.fingers[j];
                    handFingerTips[j].position.fromArray(finger.tipPosition);
                    handFingerTips[j].updateMatrix();
                    handJoints[j].position.fromArray(finger.bones[1].nextJoint);
                    handJoints[j].updateMatrix();
                    handJoint2s[j].position.fromArray(finger.bones[2].nextJoint);
                    handJoint2s[j].updateMatrix();
                }
            }
        }
    }

    return {
        toolRoot:           toolRoot,
        leapController:     leapController,
        updateTool:         updateTool,
        updateToolPostStep: updateToolPostStep,
        moveToolRoot:       moveToolRoot,
        updateToolMapping:  updateToolMapping,
        updateHands:        updateHands
    };
}
