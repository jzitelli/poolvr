function addHands(parent, transformOptions) {
    "use strict";
    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
    transformOptions = transformOptions || {};
    leapController.use('transform', transformOptions).connect();
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    if (transformOptions.vr !== true) {
        leftRoot.position.y = rightRoot.position.y = -0.25;
        leftRoot.position.z = rightRoot.position.z = -3;
    }
    leftRoot.visible = rightRoot.visible = false;
    parent.add(leftRoot);
    parent.add(rightRoot);

    var material = new THREE.MeshLambertMaterial({color: 0x113399});

    var arms = [];
    var palms = [];
    var tips = [[], []];
    var joints = [[], []];

    var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.2), material);
    arms.push(arm);
    arms.push(arm.clone());
    leftRoot.add(arms[0]);
    rightRoot.add(arms[1]);

    var palm = new THREE.Mesh(new THREE.SphereBufferGeometry(0.025, 20, 10).scale(1, 0.5, 1),
                              material);
    palm.castShadow = true;
    palms.push(palm);
    palm = palm.clone();
    palms.push(palm);
    leftRoot.add(palms[0]);
    rightRoot.add(palms[1]);

    var tipMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(0.005), material);
    var jointMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(0.007), material);
    var joint2Mesh = new THREE.Mesh(new THREE.SphereBufferGeometry(0.0055), material);
    for (var i = 0; i < 5; ++i) {
        var tip = tipMesh.clone();
        tips[0].push(tip);
        leftRoot.add(tip);
        tip = tip.clone();
        tips[1].push(tip);
        rightRoot.add(tip);

        var joint = jointMesh.clone();
        joints[0].push([joint]);
        leftRoot.add(joint);
        joint = joint.clone();
        joints[1].push([joint]);
        rightRoot.add(joint);

        joint = joint2Mesh.clone();
        joints[0][i].push(joint);
        leftRoot.add(joint);
        joint = joint.clone();
        joints[1][i].push(joint);
        rightRoot.add(joint);
    }

    leapController.on('frame', onFrame);
    var UP = new THREE.Vector3(0, 1, 0);
    var palmNormal = new THREE.Vector3(0, 0, 0);
    function onFrame(frame) {

        // TODO:
        // frame.arms.forEach(function (arm, i) {
        // });

        frame.hands.forEach(function (hand, i) {

            palmNormal.set(hand.palmNormal[0], hand.palmNormal[1], hand.palmNormal[2]);
            palms[i].quaternion.setFromUnitVectors(UP, palmNormal);
            palms[i].position.set(hand.palmPosition[0], hand.palmPosition[1], hand.palmPosition[2]);

            hand.fingers.forEach(function (finger, j) {

                tips[i][j].position.set(finger.tipPosition[0], finger.tipPosition[1], finger.tipPosition[2]);
                joints[i][j][0].position.set(finger.bones[1].nextJoint[0], finger.bones[1].nextJoint[1], finger.bones[1].nextJoint[2]);
                joints[i][j][1].position.set(finger.bones[2].nextJoint[0], finger.bones[2].nextJoint[1], finger.bones[2].nextJoint[2]);

            });

        });

        leftRoot.visible = false;
        rightRoot.visible = false;
        if (frame.hands.length == 1) {
            leftRoot.visible = true;
        }
        else if (frame.hands.length == 2) {
            leftRoot.visible = true;
            rightRoot.visible = true;
        }

    }
}
