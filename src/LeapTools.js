function addTool(parent, world, options) {
    /*************************************

    parent: THREE.Object3D
    world : CANNON.World

    returns: stuff

    *************************************/
    "use strict";
    options = options || {};

    // parse options:

    var toolLength = options.toolLength || 0.5;
    var toolRadius = options.toolRadius || 0.013;
    // should remove, don't think this matters for cannon.js kinematic body:
    var toolMass   = options.toolMass   || 0.04;

    var tipShape = options.tipShape || 'Sphere';
    var tipRadius,
        tipMinorRadius;
    if (tipShape === 'Cylinder') {
        tipRadius = options.tipRadius || toolRadius;
    } else {
        tipRadius = options.tipRadius || 0.95 * toolRadius;
        if (tipShape === 'Ellipsoid') {
            tipMinorRadius = options.tipMinorRadius || 0.25 * tipRadius;
        }
    }

    var toolOffset = new THREE.Vector3(0, -0.4, -toolLength - 0.2);
    if (options.toolOffset) {
        toolOffset.fromArray(options.toolOffset);
    }
    var toolRotation = options.toolRotation || 0;

    var toolTimeA = options.toolTimeA || 0.25;
    var toolTimeB = options.toolTimeB || toolTimeA + 1.5;

    var minConfidence = options.minConfidence || 0.3;

    var interactionPlaneOpacity = options.interactionPlaneOpacity || (options.useBasicMaterials === false ? 0.18 : 0.25);

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

    var toolRoot = new THREE.Object3D();
    toolRoot.position.copy(toolOffset);
    var scalar = 0.001;
    toolRoot.scale.set(scalar, scalar, scalar);
    parent.add(toolRoot);
    var UP = new THREE.Vector3(0, 1, 0);
    toolRoot.quaternion.setFromAxisAngle(UP, toolRotation);

    // interaction box visual guide:
    var interactionBoxMesh = new THREE.Object3D();
    toolRoot.add(interactionBoxMesh);
    var interactionPlaneMaterial = new THREE.MeshBasicMaterial({color: 0x00dd44, transparent: true, opacity: interactionPlaneOpacity});
    var interactionPlaneGeom = new THREE.PlaneBufferGeometry(1/scalar, 1/scalar);
    var interactionPlaneMesh = new THREE.Mesh(interactionPlaneGeom, interactionPlaneMaterial);
    interactionPlaneMesh.position.z = 1/2/scalar; // - 1/3/scalar;
    interactionBoxMesh.add(interactionPlaneMesh);
    interactionPlaneMesh = interactionPlaneMesh.clone();
    interactionPlaneMesh.position.z = -1/2/scalar; // 1/2/scalar - 2/3/scalar;
    interactionBoxMesh.add(interactionPlaneMesh);
    interactionBoxMesh.visible = false;

    // leap motion controller:
    var boxGeom = new THREE.BoxGeometry(0.0254*3/scalar, 0.0254*0.5/scalar, 0.0254*1.2/scalar);
    var leapGeom = new THREE.BufferGeometry();
    leapGeom.fromGeometry(boxGeom);
    boxGeom.dispose();
    var leapMaterial;
    if (options.useBasicMaterials) {
        leapMaterial = new THREE.MeshBasicMaterial({color: 0x777777});
    } else {
        leapMaterial = new THREE.MeshLambertMaterial({color: 0x777777});
    }
    var leapMesh = new THREE.Mesh(leapGeom, leapMaterial);
    leapMesh.position.y = 0.0254*0.25/scalar;
    toolRoot.add(leapMesh);

    // the stick:
    var stickGeom = new THREE.CylinderGeometry(toolRadius/scalar, toolRadius/scalar, toolLength/scalar, 10, 1, false);
    stickGeom.translate(0, -toolLength/scalar / 2, 0);
    var bufferGeom = new THREE.BufferGeometry();
    bufferGeom.fromGeometry(stickGeom);
    stickGeom.dispose();
    stickGeom = bufferGeom;

    var stickMaterial;
    var tipMaterial;
    if (options.useBasicMaterials) {
        stickMaterial = new THREE.MeshBasicMaterial({color: stickColor, side: THREE.DoubleSide, transparent: true});
        tipMaterial = new THREE.MeshBasicMaterial({color: tipColor, transparent: true});
    }
    else {
        stickMaterial = new THREE.MeshLambertMaterial({color: stickColor, side: THREE.DoubleSide, transparent: true});
        tipMaterial = new THREE.MeshLambertMaterial({color: tipColor, transparent: true});
    }
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    stickMesh.visible = false;
    toolRoot.add(stickMesh);

    var tipBody = new CANNON.Body({mass: toolMass, type: CANNON.Body.KINEMATIC});
    // TODO: rename, avoid confusion b/t cannon and three materials
    tipBody.material = POOLVR.tipMaterial;

    var tipMesh = null;
    if (tipShape !== 'Cylinder') {
        var tipGeom = new THREE.SphereBufferGeometry(tipRadius/scalar, 10);
        if (tipShape === 'Ellipsoid') {
            tipGeom.scale(1, tipMinorRadius / tipRadius, 1);
            // TODO: fix. verify ellipsoid shape:
            tipBody.addShape(new CANNON.Ellipsoid(tipRadius, tipMinorRadius, tipRadius));
        } else {
            tipBody.addShape(new CANNON.Sphere(tipRadius));
        }
        tipMesh = new THREE.Mesh(tipGeom, tipMaterial);
        tipMesh.castShadow = true;
        stickMesh.add(tipMesh);
    } else {
        // whole stick
        var shapeQuaternion = new CANNON.Quaternion();
        shapeQuaternion.setFromEuler(-Math.PI / 2, 0, 0, 'XYZ');
        var shapePosition = new CANNON.Vec3(0, -tipRadius, 0);
        tipBody.addShape(new CANNON.Cylinder(tipRadius, tipRadius, 2*tipRadius, 8), shapePosition, shapeQuaternion);
    }
    world.addBody(tipBody);

    // create shadow mesh from projection:
    var stickShadow = new THREE.Object3D();
    stickShadow.scale.set(1, 0.001, 1);
    toolRoot.add(stickShadow);
    stickShadow.visible = false;
    //stickMesh.add(stickShadow);
    var stickShadowMaterial = new THREE.MeshBasicMaterial({color: 0x002200});
    var stickShadowGeom = stickMesh.geometry.clone();
    var stickShadowMesh = new THREE.Mesh(stickShadowGeom, stickShadowMaterial);
    stickShadow.add(stickShadowMesh);
    if (tipShape === 'Ellipsoid') {
        // TODO: new projection approach for ellipsoid tip
    } else if (tipShape === 'Sphere') {
        tipMesh.geometry.computeBoundingSphere();
        var tipShadowGeom = new THREE.CircleBufferGeometry(tipMesh.geometry.boundingSphere.radius).rotateX(-Math.PI / 2);
        var tipShadowMesh = new THREE.Mesh(tipShadowGeom, stickShadowMaterial);
        stickShadow.add(tipShadowMesh);
    }

    // setup three.js hands:

    // hands don't necessarily correspond the left / right labels, but doesn't matter to me because they look indistinguishable
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    var handRoots = [leftRoot, rightRoot];
    toolRoot.add(leftRoot);
    toolRoot.add(rightRoot);

    var handMaterial = new THREE.MeshBasicMaterial({color: handColor, transparent: true, opacity: 0});

    // arms:
    var armRadius = 0.0216/scalar,
        armLength = 0.22/scalar;
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
    var radius = 0.025/scalar;
    var palmGeom = new THREE.SphereBufferGeometry(radius).scale(1, 0.5, 1);
    var palmMesh = new THREE.Mesh(palmGeom, handMaterial);
    palmMesh.castShadow = true;
    var palms = [palmMesh, palmMesh.clone()];
    leftRoot.add(palms[0]);
    rightRoot.add(palms[1]);
    // fingertips:
    radius = 0.005/scalar;
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


    // var raycaster = new THREE.Raycaster();
    // var arrowHelper = new THREE.ArrowHelper(UP, new THREE.Vector3(), 2.5);
    // arrowHelper.visible = false;
    // app.scene.add(arrowHelper);

    // var numParticles = 50;
    // var particleTexture = '/images/particle.png';
    // var particleGroup = new SPE.Group({
    //     texture: {value: THREE.ImageUtils.loadTexture(particleTexture)},
    //     maxParticleCount: numParticles
    // });
    // var particleEmitter = new SPE.Emitter({
    //     maxAge: {value: 0.5},
    //     position: {value: new THREE.Vector3(0, 0, 0),
    //                spread: new THREE.Vector3(0, 0, 0)},
    //     velocity: {value: new THREE.Vector3(0, 0.2, 0),
    //                spread: new THREE.Vector3(0.4, 0.3, 0.4)},
    //     color: {value: [new THREE.Color('blue'), new THREE.Color('red')]},
    //     opacity: {value: [1, 0.1]},
    //     size: {value: 0.1},
    //     particleCount: numParticles
    // });
    // particleGroup.addEmitter(particleEmitter);
    // var particleMesh = particleGroup.mesh;
    // app.scene.add(particleMesh);
    // particleMesh.visible = false;
    // var pickedBall;

    var H_table = POOLVR.config.H_table;

    function updateGraphics() {
        stickMesh.position.copy(tipBody.interpolatedPosition);
        toolRoot.worldToLocal(stickMesh.position);
        stickShadow.position.set(
            stickMesh.position.x,
            (H_table + 0.001 - toolRoot.position.y - parent.position.y) / toolRoot.scale.y,
            stickMesh.position.z
        );
    }

    var worldQuaternion = new THREE.Quaternion();

    function moveToolRoot(keyboard, gamepad, dt) {
        var toolDrive = 0;
        var toolFloat = 0;
        var toolStrafe = 0;
        var rotateToolCW = 0;
        if (keyboard) {
            toolDrive += keyboard.getValue("moveToolForwards") - keyboard.getValue("moveToolBackwards");
            toolFloat += keyboard.getValue("moveToolUp") - keyboard.getValue("moveToolDown");
            toolStrafe += keyboard.getValue("moveToolRight") - keyboard.getValue("moveToolLeft");
            rotateToolCW += keyboard.getValue("rotateToolCW") - keyboard.getValue("rotateToolCCW");
        }
        if (gamepad) {
            if (parent.toolMode) {
                toolFloat += gamepad.getValue("toolFloat");
                toolStrafe += gamepad.getValue("toolStrafe");
            } else {
                toolDrive -= gamepad.getValue("toolDrive");
                rotateToolCW -= gamepad.getValue("toolStrafe");
            }
        }
        if ((toolDrive !== 0) || (toolStrafe !== 0) || (toolFloat !== 0) || (rotateToolCW !== 0)) {
            toolRoot.position.x +=  0.16 * dt * toolStrafe;
            toolRoot.position.z += -0.16 * dt * toolDrive;
            toolRoot.position.y +=  0.16 * dt * toolFloat;
            toolRotation += 0.15 * dt * rotateToolCW;
            toolRoot.quaternion.setFromAxisAngle(UP, toolRotation);
            if (interactionBoxMesh.visible === false) {
                interactionBoxMesh.visible = true;
                stickMaterial.opacity = tipMaterial.opacity = 1;
                interactionPlaneMaterial.opacity = interactionPlaneOpacity;
            }
        }
    }

    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    var velocity = new THREE.Vector3();

    var cannonUP = new CANNON.Vec3(0, 1, 0);
    var cannonVec = new CANNON.Vec3();

    var useShadowMap = POOLVR.config.useShadowMap;

    var lastFrameID;

    function updateTool(dt) {

        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {

            lastFrameID = frame.id;

            var interactionBox = frame.interactionBox;
            if (interactionBox.valid) {
                interactionBoxMesh.position.fromArray(interactionBox.center);
                interactionBoxMesh.scale.set(interactionBox.width*scalar, interactionBox.height*scalar, interactionBox.depth*scalar);
            }

            toolRoot.getWorldQuaternion(worldQuaternion);

            if (frame.tools.length === 1) {

                var tool = frame.tools[0];

                if (stickMesh.visible === false) {
                    stickMesh.visible = interactionBoxMesh.visible = true;
                    if (!useShadowMap) stickShadow.visible = true;
                }

                position.fromArray(tool.tipPosition);
                // position.fromArray(tool.stabilizedTipPosition);

                toolRoot.localToWorld(position);
                tipBody.position.copy(position);

                direction.fromArray(tool.direction);

                stickMesh.quaternion.setFromUnitVectors(UP, direction);
                stickShadowMesh.quaternion.copy(stickMesh.quaternion);

                direction.applyQuaternion(worldQuaternion);
                cannonVec.copy(direction);
                tipBody.quaternion.setFromVectors(cannonUP, cannonVec);

                velocity.fromArray(tool.tipVelocity);
                velocity.applyQuaternion(worldQuaternion);
                velocity.multiplyScalar(0.001);
                tipBody.velocity.copy(velocity);

                if (tool.timeVisible > toolTimeA) {

                    if (tipBody.sleepState === CANNON.Body.SLEEPING) {
                        // cue becomes collidable
                        tipBody.wakeUp();
                        // TODO: indicator (particle effect)
                        tipMaterial.color.setHex(0xff0000);
                    }

                    if (tool.timeVisible > toolTimeB && interactionPlaneMaterial.opacity > 0.1) {
                        // dim the interaction box:
                        interactionPlaneMaterial.opacity *= 0.93;
                    }

                }

            } else if (tipBody.sleepState === CANNON.Body.AWAKE) {
                // tool detection was just lost
                tipBody.sleep();
                tipMaterial.color.setHex(tipColor);

            } else {
                // tool is already lost
                if (stickMesh.visible && (stickMaterial.opacity > 0.1)) {
                    // fade out tool
                    stickMaterial.opacity *= 0.8;
                    tipMaterial.opacity = stickMaterial.opacity;
                    interactionPlaneMaterial.opacity *= 0.8;
                } else {
                    interactionBoxMesh.visible = stickMesh.visible = false;
                    stickShadow.visible = false;
                    stickMaterial.opacity = tipMaterial.opacity = 1;
                    interactionPlaneMaterial.opacity = interactionPlaneOpacity;
                }
            }

            var hand, finger;
            leftRoot.visible = rightRoot.visible = false;
            for (var i = 0; i < frame.hands.length; i++) {
                hand = frame.hands[i];
                if (hand.confidence > minConfidence) {
                    handRoots[i].visible = true;
                    handMaterial.opacity = 0.5*handMaterial.opacity + 0.5*(hand.confidence - minConfidence) / (1 - minConfidence);
                    direction.fromArray(hand.arm.basis[2]);
                    arms[i].quaternion.setFromUnitVectors(UP, direction);
                    var center = hand.arm.center();
                    arms[i].position.fromArray(center);

                    direction.fromArray(hand.palmNormal);
                    palms[i].quaternion.setFromUnitVectors(UP, direction);
                    palms[i].position.fromArray(hand.palmPosition);

                    for (var j = 0; j < hand.fingers.length; j++) {
                        finger = hand.fingers[j];
                        fingerTips[i][j].position.fromArray(finger.tipPosition);
                        joints[i][j].position.fromArray(finger.bones[1].nextJoint);
                        joint2s[i][j].position.fromArray(finger.bones[2].nextJoint);
                    }
                }
            }

            // if (frame.hands.length === 1) {

            //     hand = frame.hands[0];
            //     if (hand.confidence > minConfidence) {
            //         finger = hand.indexFinger;
            //         if (finger.extended) {
            //             position.fromArray(finger.stabilizedTipPosition);
            //             toolRoot.localToWorld(position);
            //             direction.fromArray(finger.direction);
            //             direction.applyQuaternion(worldQuaternion);
            //             raycaster.set(position, direction);

            //             var intersects = raycaster.intersectObjects(POOLVR.ballMeshes);
            //             if (intersects.length > 0) {
            //                 pickedBall = intersects[0].object;
            //                 particleMesh.visible = true;
            //                 particleMesh.position.copy(pickedBall.position);
            //             } else {
            //                 pickedBall = null;
            //                 particleMesh.visible = false;
            //             }

            //             arrowHelper.visible = true;
            //             arrowHelper.position.copy(position);
            //             arrowHelper.setDirection(direction);
            //         }
            //     } else {
            //         arrowHelper.visible = false;
            //         particleMesh.visible = false;
            //     }

            // } else {

            //     arrowHelper.visible = false;
            //     particleMesh.visible = false;

            // }

        }

    }

    return {
        toolRoot: toolRoot,
        leapController: leapController,
        updateTool: updateTool,
        updateGraphics: updateGraphics,
        moveToolRoot: moveToolRoot
    };
}
