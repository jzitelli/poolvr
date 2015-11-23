function addTool(parent, world, options) {
    "use strict";
    options = options || {};

    var toolLength = options.toolLength || 0.5;
    var toolRadius = options.toolRadius || 0.013;
    var toolOffset = options.toolOffset || new THREE.Vector3(0, -0.46, -toolLength - 0.15);
    var toolMass   = options.toolMass || 0.06;
    var handOffset = options.handOffset || new THREE.Vector3(0, -0.25, -0.4);

    var toolTime      = options.toolTime  || 0.04;
    var toolTimeB     = options.toolTimeB || toolTime + 0.1;
    var minConfidence = options.minConfidence || 0.3;

    var transformOptions = options.transformOptions || {};

    // tool:
    var toolRoot = new THREE.Object3D();
    toolRoot.position.copy(toolOffset);
    parent.add(toolRoot);
    var stickGeom = new THREE.CylinderGeometry(toolRadius, toolRadius, toolLength, 10, 1, false);
    stickGeom.translate(0, -toolLength / 2, 0);
    var stickMaterial;
    var tipMaterial;
    if (options.useBasicMaterials) {
        stickMaterial = new THREE.MeshBasicMaterial({color: 0xeebb99, side: THREE.DoubleSide});
        tipMaterial = new THREE.MeshBasicMaterial({color: 0x004488});
    }
    else {
        stickMaterial = new THREE.MeshLambertMaterial({color: 0xeebb99, side: THREE.DoubleSide});
        tipMaterial = new THREE.MeshLambertMaterial({color: 0x004488});
    }
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    toolRoot.add(stickMesh);
    var tipMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(0.95*toolRadius, 10), tipMaterial);
    tipMesh.castShadow = true;
    stickMesh.add(tipMesh);
    // TODO: mass
    var tipBody = new CANNON.Body({mass: toolMass, type: CANNON.Body.KINEMATIC});
    tipBody.addShape(new CANNON.Sphere(toolRadius));
    world.addBody(tipBody);
    toolRoot.visible = false;

    // setup hands: ############################
    // hands don't necessarily correspond the left / right labels, but doesn't matter to me because they look indistinguishable
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    leftRoot.position.copy(handOffset);
    rightRoot.position.copy(handOffset);
    var handRoots = [leftRoot, rightRoot];
    parent.add(leftRoot);
    parent.add(rightRoot);
    leftRoot.visible = rightRoot.visible = false;

    if (!options.leapHandsDisabled) {
        var handMaterial = new THREE.MeshBasicMaterial({color: 0x113399, transparent: true, opacity: 0});
        // arms:
        var armRadius = 0.0276,
            armLength = 0.26;
        var armGeom = new THREE.CylinderGeometry(armRadius, armRadius, armLength);
        var armMesh = new THREE.Mesh(armGeom, handMaterial);
        var arms = [armMesh, armMesh.clone()];
        leftRoot.add(arms[0]);
        rightRoot.add(arms[1]);
        // palms:
        var radius = 0.025;
        var palmGeom = new THREE.SphereBufferGeometry(radius).scale(1, 0.5, 1);
        var palmMesh = new THREE.Mesh(palmGeom, handMaterial);
        palmMesh.castShadow = true;
        var palms = [palmMesh, palmMesh.clone()];
        leftRoot.add(palms[0]);
        rightRoot.add(palms[1]);
        // fingertips:
        radius = 0.005;
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

    if (!options.leapDisabled) {

        var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
        if (transformOptions.vr === true) {
            toolTime *= 2;
        }
        pyserver.log("transformOptions =\n" + JSON.stringify(transformOptions, undefined, 2));
        leapController.use('transform', transformOptions).connect();
        var onFrame = (function () {
            var UP = new THREE.Vector3(0, 1, 0);
            var direction = new THREE.Vector3();
            var position = new THREE.Vector3();
            var velocity = new THREE.Vector3();

            if (options.leapHandsDisabled) {
                // onFrame (tool only): ########################################
                return function (frame) {
                    if (frame.tools.length === 1) {
                        toolRoot.visible = true;
                        var tool = frame.tools[0];
                        if (tool.timeVisible > toolTime) {
                            // TODO: option to toggle stabilized or not
                            stickMesh.position.fromArray(tool.tipPosition);
                            // stickMesh.position.fromArray(tool.stabilizedTipPosition);
                            direction.fromArray(tool.direction);
                            stickMesh.quaternion.setFromUnitVectors(UP, direction);
                            if (tool.timeVisible > toolTimeB) {
                                if (tipBody.sleepState === CANNON.Body.SLEEPING) {
                                    // cue becomes collidable
                                    tipBody.wakeUp();
                                    // TODO: indicator (particle effect)
                                }
                                position.set(0, 0, 0);
                                stickMesh.localToWorld(position);
                                tipBody.position.copy(position);

                                velocity.set(tool.tipVelocity[0] * 0.001, tool.tipVelocity[1] * 0.001, tool.tipVelocity[2] * 0.001);
                                velocity.applyQuaternion(parent.quaternion);
                                tipBody.velocity.copy(velocity);
                            }
                        }
                    }
                    else if (frame.tools.length === 2) {
                        pyserver.log('TWO TOOLS OMG');
                    }
                };
            } else {
                // onFrame: ########################################
                return function (frame) {
                    if (frame.tools.length === 1) {
                        toolRoot.visible = true;
                        var tool = frame.tools[0];
                        if (tool.timeVisible > toolTime) {
                            stickMesh.position.fromArray(tool.tipPosition);
                            // stickMesh.position.fromArray(tool.stabilizedTipPosition);

                            direction.fromArray(tool.direction);
                            stickMesh.quaternion.setFromUnitVectors(UP, direction);

                            position.set(0, 0, 0);
                            stickMesh.localToWorld(position);
                            tipBody.position.copy(position);

                            velocity.set(tool.tipVelocity[0] * 0.001, tool.tipVelocity[1] * 0.001, tool.tipVelocity[2] * 0.001);
                            velocity.applyQuaternion(parent.quaternion);
                            tipBody.velocity.copy(velocity);
                        }
                    }
                    else if (frame.tools.length === 2) {
                        pyserver.log('TWO TOOLS OMG');
                    }
                    leftRoot.visible = rightRoot.visible = false;
                    for (var i = 0; i < frame.hands.length; i++) {
                        var hand = frame.hands[i];
                        if (hand.confidence > minConfidence) {
                            handRoots[i].visible = true;
                            handMaterial.opacity = hand.confidence;
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
                };
            }
        })();
        leapController.on('frame', onFrame);

    }

    return {
        stickMesh: stickMesh,
        tipMesh: tipMesh,
        tipBody: tipBody,
        toolRoot: toolRoot
    };
}
