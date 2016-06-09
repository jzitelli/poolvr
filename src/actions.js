/* global POOLVR, THREE */
POOLVR.selectNextBall = function (inc) {
    "use strict";
    inc = inc || 1;
    var next = Math.max(1, Math.min(15, POOLVR.nextBall + inc));
    if (next === POOLVR.nextBall) return;
    while (!POOLVR.onTable[next]) {
        var _next = next;
        next = Math.max(1, Math.min(15, next + inc));
        if (next === _next) {
            break;
        }
    }
    if (POOLVR.nextBall !== next) {
        POOLVR.nextBall = next;
        POOLVR.textGeomLogger.log("BALL " + POOLVR.nextBall + " SELECTED");
    }
};


POOLVR.resetTable = function () {
    "use strict";
    POOLVR.ballBodies.forEach(function (body, ballNum) {
        body.wakeUp();
        body.position.copy(POOLVR.initialPositions[ballNum]);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.bounces = 0;
        POOLVR.onTable[ballNum] = true;
        body.mesh.visible = true;
    });
    if (POOLVR.synthSpeaker.speaking === false) {
        POOLVR.synthSpeaker.speak("Table reset.");
    }
    POOLVR.nextBall = 1;
    POOLVR.textGeomLogger.log("TABLE RESET.");
};


POOLVR.autoPosition = ( function () {
    "use strict";
    var nextVector = new THREE.Vector3();
    var UP = THREE.Object3D.DefaultUp;
    var speakCount = 0;
    return function (forVive) {

        if (POOLVR.synthSpeaker.speaking === false) {
            if (speakCount <= 3) {
                POOLVR.synthSpeaker.speak("You are being auto-positioned.");
                if (speakCount === 3) {
                    POOLVR.synthSpeaker.speak("I will stop saying that now.");
                }
                speakCount++;
            }
        }

        var avatar = POOLVR.stage.rootObject;
        var heading = Math.atan2(
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.x - POOLVR.ballMeshes[0].position.x),
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.z - POOLVR.ballMeshes[0].position.z)
        );
        avatar.quaternion.setFromAxisAngle(UP, heading);

        if (forVive) {
            // auto-position so that cue ball is 0.5 meters in front of you
            nextVector.set(0, 0, -0.5);
        } else {
            // auto-position so that cue ball is on top of leap controller
            nextVector.copy(POOLVR.leapTool.toolRoot.position);
        }
        nextVector.applyQuaternion(avatar.quaternion);
        nextVector.add(avatar.position);
        nextVector.sub(POOLVR.ballMeshes[0].position);
        nextVector.y = 0;
        avatar.position.sub(nextVector);
        avatar.updateMatrix();
        avatar.updateMatrixWorld();
        POOLVR.leapTool.updateToolMapping();

    };
} )();


POOLVR.stroke = ( function () {
    "use strict";
    var velocity = new THREE.Vector3();
    return function () {
        velocity.set(0, 0, -3.5);
        velocity.applyQuaternion(POOLVR.leapTool.worldQuaternion);
        var body = POOLVR.ballBodies[0];
        body.velocity.copy(velocity);
    };
} )();
