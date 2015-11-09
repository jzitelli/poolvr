function addHands(parent) {
    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
    leapController.connect();
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    leftRoot.position.y = rightRoot.position.y = -0.25;
    leftRoot.position.z = rightRoot.position.z = -0.5;
    var scale = 0.001;
    leftRoot.scale.set(scale, scale, scale);
    rightRoot.scale.set(scale, scale, scale);
    leftRoot.visible = rightRoot.visible = false;
    parent.add(leftRoot);
    parent.add(rightRoot);

    var palms = [];
    var palm = new THREE.Mesh(new THREE.SphereBufferGeometry(0.025 / scale).scale(1, 0.5, 1));
    leftRoot.add(palm);
    palms.push(palm);
    palm = palm.clone();
    rightRoot.add(palm);
    palms.push(palm);

    var tips = [[], []];
    var joints = [[], []];

    for (var i = 0; i < 5; ++i) {

        var tip = new THREE.Mesh(new THREE.SphereBufferGeometry(0.005 / scale));
        var joint = new THREE.Mesh(new THREE.SphereBufferGeometry(0.007 / scale));

        tips[0].push(tip);
        leftRoot.add(tip);
        tip = tip.clone();
        tips[1].push(tip);
        rightRoot.add(tip);

        joints[0].push([joint]);
        leftRoot.add(joint);
        joint = joint.clone();
        joints[1].push([joint]);
        rightRoot.add(joint);

        joint = new THREE.Mesh(new THREE.SphereBufferGeometry(0.0055 / scale));
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
        frame.hands.forEach(function (hand, i) {
            palms[i].position.set(hand.palmPosition[0], hand.palmPosition[1], hand.palmPosition[2]);
            palmNormal.set(hand.palmNormal[0], hand.palmNormal[1], hand.palmNormal[2]);
            palms[i].quaternion.setFromUnitVectors(UP, palmNormal);
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
