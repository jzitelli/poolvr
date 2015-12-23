var URL_PARAMS = (function () {
    "use strict";
    var params = {};
    location.search.substr(1).split("&").forEach( function(item) {
        var k = item.split("=")[0],
            v = decodeURIComponent(item.split("=")[1]);
        if (k in params) {
            params[k].push(v);
        } else {
            params[k] = [v];
        }
    } );
    for (var k in params) {
        if (params[k].length === 1)
            params[k] = params[k][0];
        if (params[k] === 'true')
            params[k] = true;
        else if (params[k] === 'false')
            params[k] = false;
    }
    return params;
})();


function combineObjects(a, b) {
    "use strict";
    var c = {},
        k;
    for (k in a) {
        c[k] = a[k];
    }
    for (k in b) {
        if (!c.hasOwnProperty(k)) {
            c[k] = b[k];
        }
    }
    return c;
}


function makeObjectArray(obj, keyKey) {
    "use strict";
    keyKey = keyKey || "key";
    return Object.keys(obj).map(function (k) {
        var item = {};
        item[keyKey] = k;
        for (var p in obj[k]) {
            item[p] = obj[k][p];
        }
        return item;
    });
}


var userAgent = navigator.userAgent;


POOLVR.keyboardCommands = {
    turnLeft: {buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
    turnRight: {buttons: [Primrose.Input.Keyboard.RIGHTARROW]},
    driveForward: {buttons: [-Primrose.Input.Keyboard.W]},
    driveBack: {buttons: [Primrose.Input.Keyboard.S]},
    strafeLeft: {buttons: [-Primrose.Input.Keyboard.A]},
    strafeRight: {buttons: [Primrose.Input.Keyboard.D]},
    floatUp: {buttons: [Primrose.Input.Keyboard.E, Primrose.Input.Keyboard.NUMBER9]},
    floatDown: {buttons: [-Primrose.Input.Keyboard.C, -Primrose.Input.Keyboard.NUMBER3]},
    moveToolUp:        {buttons: [Primrose.Input.Keyboard.O]},
    moveToolDown:      {buttons: [Primrose.Input.Keyboard.PERIOD]},
    moveToolForwards:  {buttons: [Primrose.Input.Keyboard.I]},
    moveToolBackwards: {buttons: [Primrose.Input.Keyboard.K]},
    moveToolLeft:      {buttons: [Primrose.Input.Keyboard.J]},
    moveToolRight:     {buttons: [Primrose.Input.Keyboard.L]},
    rotateToolCW:    {buttons: [Primrose.Input.Keyboard.U]},
    rotateToolCCW:   {buttons: [Primrose.Input.Keyboard.Y]},

    resetTable: {buttons: [Primrose.Input.Keyboard.R],
                 commandDown: function(){POOLVR.resetTable();}, dt: 0.5},

    autoPosition: {buttons: [Primrose.Input.Keyboard.P],
                   commandDown: function(){POOLVR.autoPosition(avatar);}, dt: 0.5},

    toggleVRControls: {buttons: [Primrose.Input.Keyboard.V],
                       commandDown: function(){app.toggleVRControls();}, dt: 0.25},

    toggleWireframe: {buttons: [Primrose.Input.Keyboard.NUMBER0],
                      commandDown: function(){app.toggleWireframe();}, dt: 0.25},

    resetVRSensor: {buttons: [Primrose.Input.Keyboard.Z],
                    commandDown: function(){app.resetVRSensor();}, dt: 0.25},

    toggleMenu: {buttons: [Primrose.Input.Keyboard.SPACEBAR],
                 commandDown: function(){POOLVR.toggleMenu();}, dt: 0.25},

    saveConfig: {buttons: [Primrose.Input.Keyboard.NUMBER1],
                 commandDown: function(){POOLVR.saveConfig();}, dt: 1.0}
};
POOLVR.keyboardCommands = makeObjectArray(POOLVR.keyboardCommands, 'name');
POOLVR.keyboard = new Primrose.Input.Keyboard("keyboard", window, POOLVR.keyboardCommands);

var DEADZONE = 0.2;
POOLVR.gamepadCommands = {
    strafe: {axes: [Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    drive: {axes: [Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    dheading: {axes: [-Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    pitch: {axes: [Primrose.Input.Gamepad.LSY], integrate: true, deadzone: DEADZONE,
            max: 0.5 * Math.PI, min: -0.5 * Math.PI},
    float: {axes: [-Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    toggleFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
                      commandDown: function () { avatar.floatMode = true; },
                      commandUp: function () { avatar.floatMode = false; }},
    toolStrafe: {axes: [Primrose.Input.Gamepad.RSX], deadzone: DEADZONE},
    toolDrive: {axes: [Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toolFloat: {axes: [-Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toolRotY: {axes: [Primrose.Input.Gamepad.RSY], integrate: true, deadzone: DEADZONE,
               max: 2 * Math.PI, min: 0},
    toggleToolFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightStick],
                          commandDown: function () { avatar.toolMode = true; },
                          commandUp: function(){avatar.toolMode=false;}},

    nextBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightBumper],
               commandDown: function () { POOLVR.nextBall = Math.max(1, (POOLVR.nextBall + 1) % 16); },
               dt: 0.5},

    prevBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftBumper],
               commandDown: function(){POOLVR.nextBall=Math.max(1,(POOLVR.nextBall-1)%16);},
               dt: 0.5},

    autoPosition: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.Y],
                   commandDown: function(){POOLVR.autoPosition(avatar);}, dt: 0.5},

    resetVRSensor: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                    commandDown: function(){app.resetVRSensor();}, dt: 0.25},

    toggleMenu: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.start],
                 commandDown: function(){POOLVR.toggleMenu();}, dt: 0.25}
};


POOLVR.gamepadCommands = makeObjectArray(POOLVR.gamepadCommands, 'name');
POOLVR.gamepad = new Primrose.Input.Gamepad("gamepad", POOLVR.gamepadCommands);
POOLVR.gamepad.addEventListener("gamepadconnected", function(id) {
    if (!this.isGamepadSet()) {
        this.setGamepad(id);
        console.log("gamepad " + id + " connected");
    }
}.bind(POOLVR.gamepad), false);


// if (!URL_PARAMS.disableLocalStorage) {
//     var localStorageConfig = localStorage.getItem(POOLVR.version);
//     if (localStorageConfig) {
//         pyserver.log("POOLVR.config loaded from localStorage:");
//         pyserver.log(localStorageConfig);
//         POOLVR.config = JSON.parse(localStorageConfig);
//     }
// }


if (POOLVR.config.useShadowMap) {
    POOLVR.config.useBasicMaterials = false;
}

POOLVR.config.toolOptions = POOLVR.config.toolOptions || {};
POOLVR.config.toolOptions.toolLength   = URL_PARAMS.toolLength   || POOLVR.config.toolOptions.toolLength;
POOLVR.config.toolOptions.toolRadius   = URL_PARAMS.toolRadius   || POOLVR.config.toolOptions.toolRadius;
POOLVR.config.toolOptions.toolMass     = URL_PARAMS.toolMass     || POOLVR.config.toolOptions.toolMass;
POOLVR.config.toolOptions.toolOffset   = URL_PARAMS.toolOffset   || POOLVR.config.toolOptions.toolOffset;
POOLVR.config.toolOptions.toolRotation = URL_PARAMS.toolRotation || POOLVR.config.toolOptions.toolRotation;
POOLVR.config.toolOptions.tipShape     = URL_PARAMS.tipShape     || POOLVR.config.toolOptions.tipShape;

pyserver.log('POOLVR.config.toolOptions =\n' + JSON.stringify(POOLVR.config.toolOptions, undefined, 2));
POOLVR.toolOptions = combineObjects(
    POOLVR.config.toolOptions,
    {keyboard: POOLVR.keyboard, gamepad: POOLVR.gamepad, useBasicMaterials: POOLVR.config.useBasicMaterials}
);

// POOLVR.config.vrLeap = URL_PARAMS.vrLeap || POOLVR.config.vrLeap;
// if (POOLVR.config.vrLeap) {
//     // ##### Leap Motion VR tracking mode: #####
//     POOLVR.config.toolOptions.transformOptions = {vr: true, effectiveParent: app.camera};
// }
// toolOptions.onStreamingStarted = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS CONNECTED.  GOOD JOB."); };
// toolOptions.onStreamingStopped = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS DISCONNECTED!  HOW WILL YOU PLAY?!"); };


POOLVR.config.textGeomLogger = URL_PARAMS.textGeomLogger || POOLVR.config.textGeomLogger;


POOLVR.saveConfig = function () {
    "use strict";
    if (POOLVR.config.pyserver) {
        if (window.toolRoot) {
            POOLVR.config.toolOptions.toolOffset = [window.toolRoot.position.x, window.toolRoot.position.y, window.toolRoot.position.z];
            POOLVR.config.toolOptions.toolRotation = window.toolRoot.rotation.y;
        }
        pyserver.writeFile('config.json', POOLVR.config);
    } else {
        localStorage.setItem(POOLVR.version, JSON.stringify(POOLVR.config));
    }
};


POOLVR.ballMeshes = [];
POOLVR.ballBodies = [];
POOLVR.initialPositions = [];
POOLVR.onTable = [false,
                  true, true, true, true, true, true, true,
                  true,
                  true, true, true, true, true, true, true];
POOLVR.nextBall = 1;


POOLVR.resetTable = function () {
    "use strict";
    POOLVR.ballBodies.forEach(function (body, ballNum) {
        body.wakeUp();
        body.position.copy(POOLVR.initialPositions[ballNum]);
        body.velocity.set(0, 0, 0);
        // body.angularVelocity.set(0, 0, 0);
        // body.bounces = 0;
        body.mesh.visible = true;
    });
    if (synthSpeaker.speaking === false) {
        synthSpeaker.speak("Table reset.");
    }
    POOLVR.nextBall = 1;
    textGeomLogger.log("TABLE RESET.");
};


POOLVR.autoPosition = ( function () {
    "use strict";
    var nextVector = new THREE.Vector3();
    var UP = new THREE.Vector3(0, 1, 0);
    function autoPosition(avatar) {
        textGeomLogger.log("YOU ARE BEING AUTO-POSITIONED.");
        // if (synthSpeaker.speaking === false) {
        //     synthSpeaker.speak("You are being auto-positioned.");
        // }

        avatar.heading = Math.atan2(
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.x - POOLVR.ballMeshes[0].position.x),
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.z - POOLVR.ballMeshes[0].position.z)
        );
        avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
        avatar.updateMatrixWorld();

        nextVector.copy(toolRoot.position);
        avatar.localToWorld(nextVector);
        nextVector.sub(POOLVR.ballMeshes[0].position);
        nextVector.y = 0;
        avatar.position.sub(nextVector);
    }
    return autoPosition;
} )();


POOLVR.toggleMenu = function () {
    menu.visible = !menu.visible;
    mouseStuff.mousePointerMesh.visible = menu.visible;
    mouseStuff.setPickables(menu.children);
};


POOLVR.config.useWebVRBoilerplate = URL_PARAMS.useWebVRBoilerplate || POOLVR.config.useWebVRBoilerplate;

var WebVRConfig = WebVRConfig || POOLVR.config.WebVRConfig || {};
WebVRConfig.FORCE_DISTORTION = URL_PARAMS.FORCE_DISTORTION || WebVRConfig.FORCE_DISTORTION;
WebVRConfig.FORCE_ENABLE_VR  = URL_PARAMS.FORCE_ENABLE_VR  || WebVRConfig.FORCE_ENABLE_VR;


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

POOLVR.setupWorld = function (scene, world, tipBody) {
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
                        textGeomLogger.log(body.mesh.name + " HIT THE FLOOR!");
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
            synthSpeaker.speak("You moved a ball.  Good job.");
        }
        else if (tipEventCounter === 16) {
            synthSpeaker.speak("Hi.");
        }
    });
    // app.world.addEventListener("postStep", function () {
    //     stickMesh.position.copy(tipBody.position);
    //     stickMesh.parent.worldToLocal(stickMesh.position);
    //     //scene.updateMatrixWorld();
    // });
};
