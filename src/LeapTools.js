function addTool(parent, world, useTransform, transformOptions, onFrame) {
    "use strict";
    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
    // tool:
    var toolRoot = new THREE.Object3D();
    // arms/hands don't necessarily correspond the left / right labels, but doesn't matter to me, they are indistinguishable in my case
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();

    var scale = 1;
    var minConfidence = 0.666 / 2;
    var toolTime = 0.1;
    transformOptions = transformOptions || {};
    if (transformOptions.vr === true) {
        toolTime = 0.2; // i guess this could help with vr tracking zaniness?
        // im assuming reported hand.confidence already factors VR effects in (don't know)
    } else {
        leftRoot.position.y = rightRoot.position.y = -0.25;
        leftRoot.position.z = rightRoot.position.z = -0.4;
    }

    var toolOffset = new THREE.Vector3(0, -0.3, -0.4);

    if (useTransform) {
        console.log("using LeapMotion plugin 'transform'");
        console.log(transformOptions);
        leapController.use('transform', transformOptions).connect();
    }
    else {
        console.log("not using LeapMotion plugin 'transform'");
        leapController.connect();
        scale = 0.001;
        toolRoot.scale.set(scale, scale, scale);
        leftRoot.scale.set(scale, scale, scale);
        rightRoot.scale.set(scale, scale, scale);
    }

    onFrame = onFrame || (function () {

        // setup tool: #########################
        parent.add(toolRoot);

        var radius = 0.016 / scale;
        var length = 0.5 / scale;
        toolRoot.position.x = toolOffset.x;
        toolRoot.position.y = toolOffset.y;
        toolRoot.position.z = -length / 2 * scale + toolOffset.z;

        var stickGeom = new THREE.CylinderGeometry(radius, radius, length, 10, 1, false, 0, 2*Math.PI);
        stickGeom.translate(0, -length / 2, 0);
        var stickMaterial = new THREE.MeshLambertMaterial({color: 0xeebb99, side: THREE.DoubleSide});
        var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
        stickMesh.castShadow = true;
        toolRoot.add(stickMesh);

        var tipMaterial = new THREE.MeshLambertMaterial({color: 0x004488});
        var tipMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(radius), tipMaterial);
        tipMesh.castShadow = true;
        stickMesh.add(tipMesh);

        var tipBody = new CANNON.Body({mass: 0.2, type: CANNON.Body.KINEMATIC});
        tipBody.addShape(new CANNON.Sphere(radius * scale));
        world.addBody(tipBody);

        // setup hands: ############################
        parent.add(leftRoot);
        parent.add(rightRoot);
        var handRoots = [leftRoot, rightRoot];

        var handMaterial = new THREE.MeshLambertMaterial({color: 0x113399, side: THREE.DoubleSide});
        radius = 0.032 / scale;
        length = 0.23 / scale;
        var armGeom = new THREE.CylinderGeometry(radius, radius, length);
        var armMesh = new THREE.Mesh(armGeom, handMaterial);
        var arms = [armMesh, armMesh.clone()];
        leftRoot.add(arms[0]);
        rightRoot.add(arms[1]);

        radius = 0.025 / scale;
        var palmGeom = new THREE.SphereBufferGeometry(radius, 18, 9).scale(1, 0.5, 1);
        var palmMesh = new THREE.Mesh(palmGeom, handMaterial);
        palmMesh.castShadow = true;
        var palms = [palmMesh, palmMesh.clone()];
        leftRoot.add(palms[0]);
        rightRoot.add(palms[1]);

        radius = 0.005 / scale;
        var fingerTipGeom = new THREE.SphereBufferGeometry(radius);
        var fingerTipMesh = new THREE.Mesh(fingerTipGeom, handMaterial);
        var fingerTips = [[fingerTipMesh, fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone()],
                          [fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone()]];
        leftRoot.add(fingerTips[0][0], fingerTips[0][1], fingerTips[0][2], fingerTips[0][3], fingerTips[0][4]);
        rightRoot.add(fingerTips[1][0], fingerTips[1][1], fingerTips[1][2], fingerTips[1][3], fingerTips[1][4]);

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


        // onFrame: ########################################
        var UP = new THREE.Vector3(0, 1, 0);
        var direction = new THREE.Vector3();
        var position = new THREE.Vector3();
        var velocity = new THREE.Vector3();

        return function (frame) {
            toolRoot.visible = false;
            if (frame.tools.length === 1) {
                var tool = frame.tools[0];
                if (tool.timeVisible > 0.2) {
                    toolRoot.visible = true;
                    // stickMesh.position.set(tool.tipPosition[0], tool.tipPosition[1], tool.tipPosition[2]);
                    stickMesh.position.set(tool.stabilizedTipPosition[0], tool.stabilizedTipPosition[1], tool.stabilizedTipPosition[2]);
                    direction.set(tool.direction[0], tool.direction[1], tool.direction[2]);
                    stickMesh.quaternion.setFromUnitVectors(UP, direction);

                    position.set(0, 0, 0);
                    stickMesh.localToWorld(position);
                    tipBody.position.copy(position);

                    velocity.set(tool.tipVelocity[0] * 0.001, tool.tipVelocity[1] * 0.001, tool.tipVelocity[2] * 0.001);
                    velocity.applyQuaternion(parent.quaternion);
                    tipBody.velocity.copy(velocity);
                }
            }

            leftRoot.visible = rightRoot.visible = false;
            frame.hands.forEach(function (hand, i) {
                if (hand.confidence > minConfidence) {
                    handRoots[i].visible = true;

                    direction.set(hand.arm.basis[2][0], hand.arm.basis[2][1], hand.arm.basis[2][2]);
                    arms[i].quaternion.setFromUnitVectors(UP, direction);
                    var center = hand.arm.center();
                    arms[i].position.set(center[0], center[1], center[2]);

                    direction.set(hand.palmNormal[0], hand.palmNormal[1], hand.palmNormal[2]);
                    palms[i].quaternion.setFromUnitVectors(UP, direction);
                    palms[i].position.set(hand.palmPosition[0], hand.palmPosition[1], hand.palmPosition[2]);

                    hand.fingers.forEach(function (finger, j) {
                        fingerTips[i][j].position.set(finger.tipPosition[0], finger.tipPosition[1], finger.tipPosition[2]);
                        joints[i][j].position.set(finger.bones[1].nextJoint[0], finger.bones[1].nextJoint[1], finger.bones[1].nextJoint[2]);
                        joint2s[i][j].position.set(finger.bones[2].nextJoint[0], finger.bones[2].nextJoint[1], finger.bones[2].nextJoint[2]);
                    });
                }
                else {
                    handRoots[i].visible = false;
                }
            });
        };

    })();

    leapController.on('frame', onFrame);
}
