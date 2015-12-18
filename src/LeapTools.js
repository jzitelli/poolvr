function addTool(parent, world, options) {
    /*************************************

    parent: THREE.Object3D
    world : CANNON.World

    returns: stuff

    *************************************/
    "use strict";
    options = options || {};

    var toolLength = options.toolLength || 0.5;
    var toolRadius = options.toolRadius || 0.013;
    var toolMass   = options.toolMass   || 0.04;

    var tipShape = options.tipShape || 'Sphere';
    var tipRadius = options.tipRadius;
    var tipMinorRadius = options.tipMinorRadius;
    if (tipShape === 'Cylinder') {
        tipRadius = tipRadius || toolRadius;
    } else {
        tipRadius = tipRadius || 0.95 * toolRadius;
        if (tipShape === 'Ellipsoid') {
            tipMinorRadius = tipMinorRadius || 0.25 * tipRadius;
        }
    }

    var toolOffset = new THREE.Vector3(0, -0.4, -toolLength - 0.2);
    if (options.toolOffset) {
        toolOffset.fromArray(options.toolOffset);
    }
    var toolRotation = options.toolRotation || 0;

    var handOffset = options.handOffset || new THREE.Vector3().copy(toolOffset);
    var handRotation = options.handRotation || toolRotation;

    var toolTime  = options.toolTime  || 0.25;
    var toolTimeB = options.toolTimeB || toolTime + 0.5;
    var toolTimeC = options.toolTimeC || toolTimeB + 1.5;

    var minConfidence = options.minConfidence || 0.3;

    var interactionBoxOpacity   = options.interactionBoxOpacity || (options.useBasicMaterials === false ? 0.1 : 0.25);
    var interactionPlaneOpacity = options.interactionPlaneOpacity || interactionBoxOpacity;


    var keyboard = options.keyboard;
    var gamepad = options.gamepad;

    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});

    var scalar;
    var transformOptions = options.transformOptions;
    if (transformOptions) {
        leapController.use('transform', transformOptions);
        pyserver.log("transformOptions =\n" + JSON.stringify(transformOptions, undefined, 2));
        if (transformOptions.vr === true) {
            toolOffset.set(0, 0, 0);
            toolRotation = 0;
            handOffset.set(0, 0, 0);
        }
        scalar = 1; // transform plugin takes care of scaling
    } else {
        scalar = 0.001;
    }

    // leap motion event callbacks:
    var onConnect = options.onConnect || function () {
        pyserver.log('Leap Motion WebSocket connected');
    };
    leapController.on('connect', onConnect);
    if (options.onStreamingStarted) {
        leapController.on('streamingStarted', options.onStreamingStarted);
    }
    if (options.onStreamingStopped) {
        leapController.on('streamingStopped', options.onStreamingStopped);
    }

    leapController.connect();

    // three.js tool: ########################################################################
    var toolRoot = new THREE.Object3D();
    toolRoot.position.copy(toolOffset);
    toolRoot.scale.set(scalar, scalar, scalar);
    parent.add(toolRoot);
    var UP = new THREE.Vector3(0, 1, 0);
    toolRoot.quaternion.setFromAxisAngle(UP, toolRotation);

    // interaction box visual guide:
    var boxGeom = new THREE.BoxGeometry(1/scalar, 1/scalar, 1/scalar);
    var interactionBoxGeom = new THREE.BufferGeometry();
    interactionBoxGeom.fromGeometry(boxGeom);
    boxGeom.dispose();
    //var interactionBoxMaterial = new THREE.MeshBasicMaterial({color: 0xaa8800, transparent: true, opacity: interactionBoxOpacity, side: THREE.BackSide});
    var interactionBoxMaterial = new THREE.MeshBasicMaterial({color: 0x00dd44, transparent: true, opacity: interactionPlaneOpacity, side: THREE.BackSide});
    var interactionBoxMesh = new THREE.Mesh(interactionBoxGeom, interactionBoxMaterial);
    toolRoot.add(interactionBoxMesh);
    var zeroPlaneMaterial = new THREE.MeshBasicMaterial({color: 0x00dd44, transparent: true, opacity: interactionPlaneOpacity});
    var zeroPlaneGeom = new THREE.PlaneBufferGeometry(1/scalar, 1/scalar);
    var zeroPlaneMesh = new THREE.Mesh(zeroPlaneGeom, zeroPlaneMaterial);
    zeroPlaneMesh.position.z = 1/2/scalar - 0.9/3/scalar;
    interactionBoxMesh.add(zeroPlaneMesh);
    zeroPlaneMesh = zeroPlaneMesh.clone();
    zeroPlaneMesh.position.z = 1/2/scalar - 2*0.9/3/scalar;
    interactionBoxMesh.add(zeroPlaneMesh);
    zeroPlaneMesh = zeroPlaneMesh.clone();
    zeroPlaneMesh.position.z = 1/2/scalar - 0.9/scalar;
    interactionBoxMesh.add(zeroPlaneMesh);

    boxGeom = new THREE.BoxGeometry(0.0254*3/scalar, 0.0254*0.5/scalar, 0.0254*1.2/scalar);
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

    var stickGeom = new THREE.CylinderGeometry(toolRadius/scalar, toolRadius/scalar, toolLength/scalar, 10, 1, false);
    stickGeom.translate(0, -toolLength/scalar / 2, 0);
    var bufferGeom = new THREE.BufferGeometry();
    bufferGeom.fromGeometry(stickGeom);
    stickGeom.dispose();
    stickGeom = bufferGeom;

    var stickMaterial;
    var stickColor = 0xeebb99;
    var tipColor = 0x004488;
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
    toolRoot.add(stickMesh);

    var tipBody = new CANNON.Body({mass: toolMass, type: CANNON.Body.KINEMATIC});
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
    toolRoot.visible = false;

    // three.js hands: ############################
    // hands don't necessarily correspond the left / right labels, but doesn't matter to me because they look indistinguishable
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    leftRoot.position.copy(handOffset);
    leftRoot.scale.set(scalar, scalar, scalar);
    rightRoot.position.copy(handOffset);
    rightRoot.scale.set(scalar, scalar, scalar);
    var handRoots = [leftRoot, rightRoot];
    parent.add(leftRoot);
    parent.add(rightRoot);
    // leftRoot.visible = rightRoot.visible = false;

    var handMaterial = new THREE.MeshBasicMaterial({color: 0x113399, transparent: true, opacity: 0});
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

    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    var velocity = new THREE.Vector3();

    // TODO: restructure w/ mixin pattern
    function animateLeap(frame, dt) {

        var interactionBox = frame.interactionBox;
        if (interactionBox.valid) {
            interactionBoxMesh.position.fromArray(interactionBox.center);
            interactionBoxMesh.scale.set(interactionBox.width*scalar, interactionBox.height*scalar, interactionBox.depth*scalar);
        }

        if (frame.tools.length === 1) {

            var tool = frame.tools[0];

            if (tool.timeVisible > toolTime) {

                // position.fromArray(tool.tipPosition);
                position.fromArray(tool.stabilizedTipPosition);

                stickMesh.position.copy(position);

                direction.fromArray(tool.direction);

                stickMesh.quaternion.setFromUnitVectors(UP, direction);

                if (tool.timeVisible > toolTimeB) {

                    if (tipBody.sleepState === CANNON.Body.SLEEPING) {
                        // cue becomes collidable
                        tipBody.wakeUp();
                        // TODO: indicator (particle effect)
                        tipMaterial.color.setHex(0xff0000);
                    }

                    toolRoot.localToWorld(position);
                    tipBody.position.copy(position);

                    tipBody.quaternion.copy(stickMesh.getWorldQuaternion());

                    velocity.fromArray(tool.tipVelocity);
                    toolRoot.localToWorld(velocity);
                    tipBody.velocity.copy(velocity);

                    if (interactionBoxMaterial.opacity > 0.1 && tool.timeVisible > toolTimeC) {
                        // dim the interaction box:
                        interactionBoxMaterial.opacity *= 0.93;
                        zeroPlaneMaterial.opacity = interactionBoxMaterial.opacity;
                    }

                }

                if (toolRoot.visible === false || stickMaterial.opacity !== 1) {
                    toolRoot.visible = true;
                    stickMaterial.opacity = tipMaterial.opacity = 1;
                    interactionBoxMaterial.opacity = interactionBoxOpacity;
                    zeroPlaneMaterial.opacity = interactionPlaneOpacity;
                }

            }

        } else if (tipBody.sleepState === CANNON.Body.AWAKE) {

            tipBody.sleep();
            tipMaterial.color.setHex(tipColor);

        } else {

            // fade out stick
            if (tipMaterial.opacity > 0.1) {
                stickMaterial.opacity *= 0.9;
                tipMaterial.opacity = stickMaterial.opacity;
                interactionBoxMaterial.opacity *= 0.9;
                zeroPlaneMaterial.opacity = interactionBoxMaterial.opacity;
            } else {
                toolRoot.visible = false;
            }

        }

        leftRoot.visible = rightRoot.visible = false;
        for (var i = 0; i < frame.hands.length; i++) {
            var hand = frame.hands[i];
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
                    var finger = hand.fingers[j];
                    fingerTips[i][j].position.fromArray(finger.tipPosition);
                    joints[i][j].position.fromArray(finger.bones[1].nextJoint);
                    joint2s[i][j].position.fromArray(finger.bones[2].nextJoint);
                }
            }
        }


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
        if (toolDrive !== 0 || toolStrafe !== 0 || toolFloat !== 0 || rotateToolCW !== 0) {
            toolRoot.position.x += 0.25  * dt * toolStrafe;
            toolRoot.position.z += -0.25 * dt * toolDrive;
            toolRoot.position.y += 0.25  * dt * toolFloat;
            leftRoot.position.copy(toolRoot.position);
            rightRoot.position.copy(toolRoot.position);
            toolRoot.rotation.y += 0.15 * dt * rotateToolCW;
            leftRoot.rotation.y = rightRoot.rotation.y = toolRoot.rotation.y;

            if (toolRoot.visible === false || stickMaterial.opacity !== 1) {
                toolRoot.visible = true;
                stickMaterial.opacity = tipMaterial.opacity = 1;
                interactionBoxMaterial.opacity = interactionBoxOpacity;
                zeroPlaneMaterial.opacity = interactionPlaneOpacity;
            }
        }
    }

    // leapController.on('frame', animateLeap);

    return {
        stickMesh: stickMesh,
        tipMesh: tipMesh,
        tipBody: tipBody,
        toolRoot: toolRoot,
        leapController: leapController,
        animateLeap: animateLeap,
        leftRoot: leftRoot,
        rightRoot: rightRoot
    };
}
