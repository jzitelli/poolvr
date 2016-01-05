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


POOLVR.setupWorld = function (scene, world, tipBody, stickMesh) {
    tipBody.material = POOLVR.tipMaterial;
    // referenced by cannon.js callbacks:
    var ballStripeMeshes = [],
        ballShadowMeshes = [];
    // first pass:
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
            }
            else if (node.name.endsWith('RailMesh')) {
                node.body.material = POOLVR.railMaterial;
            }
        }
    });
    // second pass:
    var H_table     = POOLVR.config.H_table,
        ball_radius = POOLVR.config.ball_diameter / 2;
    scene.traverse(function (node) {
        if (node instanceof THREE.Mesh && node.name.startsWith('ball ')) {
            var ballBum = node.body.ballNum;
            var body = node.body;
            var mesh = node;
            body.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function(evt) {
                var body = evt.body;
                var contact = evt.contact;
                // ball-ball collision:
                if (contact.bi === body && contact.bi.material === contact.bj.material) {
                    var impactVelocity = contact.getImpactVelocityAlongNormal();
                    playCollisionSound(impactVelocity);
                }
            });
            // post step callback: reposition mesh, shadow, stripe
            app.world.addEventListener("postStep", function () {
                this.position.copy(this.body.position);
                var ballNum = this.body.ballNum;
                var stripeMesh = ballStripeMeshes[ballNum];
                if (stripeMesh !== undefined) {
                    stripeMesh.quaternion.copy(this.body.quaternion);
                }
                var shadowMesh = ballShadowMeshes[ballNum];
                if (shadowMesh) {
                    shadowMesh.position.y = -(this.position.y - H_table) + 0.0004;
                }
                // var awakes = false;
                // for (var j = 0; j < ballBodies.length; ++j) {
                //     // if (body.sleepState === CANNON.Body.AWAKE) {
                //     //     awakes = true;
                //     //     doAutoPosition = true;
                //     // }
                // }
            }.bind(mesh));
        }
        else if (node instanceof THREE.Mesh && node.name === 'floorMesh') {
            // ball-floor collision
            node.body.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {
                var body = evt.body;
                if (body.ballNum === 0) {
                    textGeomLogger.log("SCRATCH.");
                    synthSpeaker.speak("Scratch.");
                    body.position.copy(POOLVR.initialPositions[0]);
                    body.velocity.set(0, 0, 0);
                    // i like it when it keeps moving
                    // body.angularVelocity.set(0, 0, 0);
                } else {
                    body.bounces++;
                    if (body.bounces === 1) {
                        // textGeomLogger.log(body.mesh.name + " HIT THE FLOOR!");
                        playPocketedSound();
                        POOLVR.onTable[body.ballNum] = false;
                        POOLVR.nextBall = POOLVR.onTable.indexOf(true);
                        if (POOLVR.nextBall === -1) {
                            synthSpeaker.speak("You cleared the table.  Well done.");
                            textGeomLogger.log("YOU CLEARED THE TABLE.  WELL DONE.");
                            POOLVR.resetTable();
                        }
                    } else if (body.bounces === 7) {
                        body.sleep();
                        body.mesh.visible = false;
                        // autoPosition(avatar, 5);
                    }
                }
            });
        }
    });
    var tipEventCounter = 0;
    tipBody.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {
        tipEventCounter++;
        if (tipEventCounter === 1) {
            setTimeout(function () {
                synthSpeaker.speak("You moved a ball.  Good job.");
            }, 250);
        }
        else if (tipEventCounter === 16) {
            synthSpeaker.speak("Hi.");
        }
    });
    app.world.addEventListener("postStep", function () {
        stickMesh.position.copy(tipBody.position);
        stickMesh.parent.worldToLocal(stickMesh.position);
        //stickMesh.quaternion.copy(tipBody.quaternion);
        //scene.updateMatrixWorld();
    });
};
