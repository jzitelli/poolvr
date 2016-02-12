// TODO: load from JSON config
POOLVR.ballMaterial            = new CANNON.Material();
POOLVR.ballBallContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.ballMaterial, {
    restitution: 0.92,
    friction: 0.14
});
POOLVR.playableSurfaceMaterial            = new CANNON.Material();
POOLVR.ballPlayableSurfaceContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.playableSurfaceMaterial, {
    restitution: 0.3,
    friction: 0.21
});
POOLVR.cushionMaterial            = new CANNON.Material();
POOLVR.ballCushionContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.cushionMaterial, {
    restitution: 0.8,
    friction: 0.12
});
POOLVR.floorMaterial            = new CANNON.Material();
POOLVR.floorBallContactMaterial = new CANNON.ContactMaterial(POOLVR.floorMaterial, POOLVR.ballMaterial, {
    restitution: 0.86,
    friction: 0.4
});
POOLVR.railMaterial            = new CANNON.Material();
POOLVR.railBallContactMaterial = new CANNON.ContactMaterial(POOLVR.railMaterial, POOLVR.ballMaterial, {
    restitution: 0.4,
    friction: 0.07
});
POOLVR.tipMaterial            = new CANNON.Material();
POOLVR.tipBallContactMaterial = new CANNON.ContactMaterial(POOLVR.tipMaterial, POOLVR.ballMaterial, {
    restitution: 0.01,
    friction: 0.15,
    contactEquationRelaxation: 3,
    frictionEquationRelaxation: 3
});


POOLVR.setupMaterials = function (world) {
    world.addMaterial(POOLVR.ballMaterial);
    world.addMaterial(POOLVR.playableSurfaceMaterial);
    world.addMaterial(POOLVR.cushionMaterial);
    world.addMaterial(POOLVR.floorMaterial);
    world.addMaterial(POOLVR.tipMaterial);
    world.addMaterial(POOLVR.railMaterial);
    world.addContactMaterial(POOLVR.ballBallContactMaterial);
    world.addContactMaterial(POOLVR.ballPlayableSurfaceContactMaterial);
    world.addContactMaterial(POOLVR.ballCushionContactMaterial);
    world.addContactMaterial(POOLVR.floorBallContactMaterial);
    world.addContactMaterial(POOLVR.tipBallContactMaterial);
    world.addContactMaterial(POOLVR.railBallContactMaterial);
};


POOLVR.setupWorld = function (scene, world) {

    var ballStripeMeshes = [],
        ballShadowMeshes = [];
    var floorMesh;

    scene.traverse(function (node) {
        if (node instanceof THREE.Mesh) {
            var ballNum;
            if (node.name.startsWith('ball ')) {
                ballNum = Number(node.name.split(' ')[1]);
                POOLVR.ballMeshes[ballNum] = node;
                POOLVR.ballBodies[ballNum] = node.body;
                POOLVR.initialPositions[ballNum] = new THREE.Vector3().copy(node.position);
                node.body.bounces = 0;
                node.body.ballNum = ballNum;
                node.body.material = POOLVR.ballMaterial;
            }
            else if (node.name.startsWith('ballStripeMesh')) {
                ballNum = Number(node.name.split(' ')[1]);
                ballStripeMeshes[ballNum] = node;
            }
            else if (node.name.startsWith('ballShadowMesh')) {
                ballNum = Number(node.name.split(' ')[1]);
                ballShadowMeshes[ballNum] = node;
            }
            else if (node.name === 'playableSurfaceMesh') {
                node.body.material = POOLVR.playableSurfaceMaterial;
            }
            else if (node.name.endsWith('CushionMesh')) {
                node.body.material = POOLVR.cushionMaterial;
            }
            else if (node.name === 'floorMesh') {
                node.body.material = POOLVR.floorMaterial;
                floorMesh = node;
            }
            else if (node.name.endsWith('RailMesh')) {
                node.body.material = POOLVR.railMaterial;
            }
        }
    });

    var H_table = POOLVR.config.H_table;

    world.addEventListener("postStep", function () {

        for (var i = 0; i < POOLVR.ballMeshes.length; i++) {

            var mesh = POOLVR.ballMeshes[i];
            var body = POOLVR.ballBodies[i];
            mesh.position.copy(body.interpolatedPosition);

            var stripeMesh = ballStripeMeshes[i];
            if (stripeMesh !== undefined) {
                stripeMesh.quaternion.copy(body.interpolatedQuaternion);
            }

            var shadowMesh = ballShadowMeshes[i];
            if (shadowMesh) {
                shadowMesh.position.y = -(mesh.position.y - H_table) + 0.0004;
            }

        }

    });

    // ball-floor collision
    floorMesh.body.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {

        var body = evt.body;
        
        if (body.ballNum === 0) {
        
            POOLVR.textGeomLogger.log("SCRATCH.");
            POOLVR.synthSpeaker.speak("Scratch.");
            body.position.copy(POOLVR.initialPositions[0]);
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);

        } else {
        
            body.bounces++;
            if (body.bounces === 1) {
                // POOLVR.textGeomLogger.log(body.mesh.name + " HIT THE FLOOR!");
                playPocketedSound();
                POOLVR.onTable[body.ballNum] = false;
                POOLVR.nextBall = POOLVR.onTable.indexOf(true);
                if (POOLVR.nextBall === -1) {
                    POOLVR.synthSpeaker.speak("You cleared the table.  Well done.");
                    POOLVR.textGeomLogger.log("YOU CLEARED THE TABLE.  WELL DONE.");
                    POOLVR.resetTable();
                }
            } else if (body.bounces === 7) {
                body.sleep();
                body.mesh.visible = false;
                // autoPosition(avatar, 5);
            }

        }

    });

    // scene.traverse(function (node) {
    //     if (node instanceof THREE.Mesh && node.name.startsWith('ball ')) {
    //         var body = node.body;
    //         var mesh = node;
    //         body.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function(evt) {
    //             var body = evt.body;
    //             var contact = evt.contact;
    //             // ball-ball collision:
    //             if (contact.bi === body && contact.bi.material === contact.bj.material) {
    //                 var impactVelocity = contact.getImpactVelocityAlongNormal();
    //                 playCollisionSound(impactVelocity);
    //             }
    //         });
    //     }
    // });

};
