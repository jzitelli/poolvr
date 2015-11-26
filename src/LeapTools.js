function addTool(parent, world, options) {
    "use strict";
    options = options || {};

    var toolLength = options.toolLength || 0.5;
    var toolRadius = options.toolRadius || 0.013;
    var toolMass   = options.toolMass   || 0.06;

    var toolOffset = options.toolOffset || new THREE.Vector3(0, -0.4, -toolLength - 0.2);
    var handOffset = options.handOffset || new THREE.Vector3(0, -0.25, -0.4);

    var toolTime      = options.toolTime  || 0.25;
    var toolTimeB     = options.toolTimeB || toolTime + 1;
    var minConfidence = options.minConfidence || 0.3;

    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});

    var scalar;
    var transformOptions = options.transformOptions;
    if (transformOptions) {
        leapController.use('transform', transformOptions);
        pyserver.log("transformOptions =\n" + JSON.stringify(transformOptions, undefined, 2));
        if (transformOptions.vr === true) {
            toolOffset.set(0, 0, 0);
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
    var onDeviceConnected = options.onDeviceConnected || function () {
        pyserver.log('Leap Motion controller connected');
    };
    var onDeviceDisconnected = options.onDeviceDisconnected || function () {
        pyserver.log('Leap Motion controller disconnected');
    };

    leapController.on('connect', onConnect);
    // deprecated, use streamingStarted / streamingStopped:
    // leapController.on('deviceConnected', onDeviceConnected);
    // leapController.on('deviceDisconnected', onDeviceDisconnected);

    leapController.connect();

    // three.js tool: ########################################################################
    var toolRoot = new THREE.Object3D();
    toolRoot.position.copy(toolOffset);
    toolRoot.scale.set(scalar, scalar, scalar);
    parent.add(toolRoot);

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
        stickMaterial = new THREE.MeshBasicMaterial({color: stickColor, side: THREE.DoubleSide});
        tipMaterial = new THREE.MeshBasicMaterial({color: tipColor});
    }
    else {
        stickMaterial = new THREE.MeshLambertMaterial({color: stickColor, side: THREE.DoubleSide});
        tipMaterial = new THREE.MeshLambertMaterial({color: tipColor});
    }
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    toolRoot.add(stickMesh);
    var tipMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(0.95*toolRadius/scalar, 10), tipMaterial);
    tipMesh.castShadow = true;
    stickMesh.add(tipMesh);
    // TODO: mass
    var tipBody = new CANNON.Body({mass: toolMass, type: CANNON.Body.KINEMATIC});
    tipBody.addShape(new CANNON.Sphere(toolRadius));
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
    leftRoot.visible = rightRoot.visible = false;

    if (!options.leapHandsDisabled) {
        var handMaterial = new THREE.MeshBasicMaterial({color: 0x113399, transparent: true, opacity: 0});
        // arms:
        var armRadius = 0.0276/scalar,
            armLength = 0.26/scalar;

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
    }

    var UP = new THREE.Vector3(0, 1, 0);
    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    var velocity = new THREE.Vector3();

    function animateLeap(frame) {
        // TOOL + HANDS VERSION:
        if (frame.tools.length === 1) {
            toolRoot.visible = true;
            var tool = frame.tools[0];
            if (tool.timeVisible > toolTime) {
                stickMesh.position.fromArray(tool.tipPosition); // stickMesh.position.fromArray(tool.stabilizedTipPosition);
                direction.fromArray(tool.direction);
                stickMesh.quaternion.setFromUnitVectors(UP, direction);

                if (tool.timeVisible > toolTimeB) {
                    if (tipBody.sleepState === CANNON.Body.SLEEPING) {
                        // cue becomes collidable
                        tipBody.wakeUp();
                        // TODO: indicator (particle effect)
                        tipMaterial.color.setHex(0xff0000);
                    }
                    position.set(0, 0, 0);
                    stickMesh.localToWorld(position);
                    tipBody.position.copy(position);

                    velocity.set(tool.tipVelocity[0] * 0.001, tool.tipVelocity[1] * 0.001, tool.tipVelocity[2] * 0.001);
                    velocity.applyQuaternion(parent.quaternion);
                    tipBody.velocity.copy(velocity);
                }
            }
        } else if (tipBody.sleepState === CANNON.Body.AWAKE) {
            tipBody.sleep();
            tipMaterial.color.setHex(tipColor);
        }
        leftRoot.visible = rightRoot.visible = false;
        for (var i = 0; i < frame.hands.length; i++) {
            var hand = frame.hands[i];
            if (hand.confidence > minConfidence) {
                handRoots[i].visible = true;
                handMaterial.opacity = (hand.confidence - minConfidence) / (1 - minConfidence);
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
    }

    // leapController.on('frame', animateLeap);

    return {
        stickMesh: stickMesh,
        tipMesh: tipMesh,
        tipBody: tipBody,
        toolRoot: toolRoot,
        leapController: leapController,
        animateLeap: animateLeap
    };
}
