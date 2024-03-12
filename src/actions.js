/* global POOLVR, THREE, Utils */
POOLVR.parseURIConfig = function () {
    "use strict";
    POOLVR.config = POOLVR.config || {};
    if (POOLVR.config.useBasicMaterials) {
        POOLVR.config.useSpotLight = false;
        POOLVR.config.usePointLight = false;
        POOLVR.config.useShadowMap  = false;
    } else {
        POOLVR.config.useSpotLight  = Utils.URL_PARAMS.useSpotLight  !== undefined ? Utils.URL_PARAMS.useSpotLight  : (POOLVR.config.useSpotLight || true);
        POOLVR.config.usePointLight = Utils.URL_PARAMS.usePointLight !== undefined ? Utils.URL_PARAMS.usePointLight : POOLVR.config.usePointLight;
        POOLVR.config.useShadowMap  = Utils.URL_PARAMS.useShadowMap  !== undefined ? Utils.URL_PARAMS.useShadowMap  : POOLVR.config.useShadowMap;
    }
    POOLVR.config.toolOptions = POOLVR.config.toolOptions || {};
    POOLVR.config.toolOptions.useShadowMesh  = !POOLVR.config.useShadowMap;
    POOLVR.config.toolOptions.shadowPlane    = POOLVR.config.H_table + 0.001;
    POOLVR.config.toolOptions.shadowMaterial = POOLVR.shadowMaterial;
};


POOLVR.saveConfig = function (profileName) {
    "use strict";
    var key = 'POOLVR' + POOLVR.version + '_' + profileName;
    localStorage.setItem(key, JSON.stringify(POOLVR.config, undefined, 2));
    console.log('saved configuration for profile "%s":', profileName);
    console.log(localStorage[key]);
};


POOLVR.loadConfig = function (profileName) {
    "use strict";
    var localStorageConfig = localStorage.getItem('POOLVR' + POOLVR.version + '_' + profileName);
    var config;
    if (localStorageConfig) {
        config = {};
        localStorageConfig = JSON.parse(localStorageConfig);
        for (var k in localStorageConfig) {
            config[k] = localStorageConfig[k];
        }
        console.log('loaded configuration for profile "%s"',  profileName);
    }
    return config;
};


POOLVR.switchMaterials = function (useBasicMaterials) {
    var materials = useBasicMaterials ? POOLVR.basicMaterials : POOLVR.nonBasicMaterials;
    POOLVR.app.scene.traverse( function (node) {
        if (node instanceof THREE.Mesh) {
            var material = node.material;
            var uuid = material.uuid;
            if (materials[uuid]) {
                node.material = materials[uuid];
            }
        }
    } );
};


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
        var shadowMesh = POOLVR.ballShadowMeshes[ballNum];
        if (shadowMesh) shadowMesh.visible = true;
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
    return function () {
        var avatar = POOLVR.app.stage;
        var heading = Math.atan2(
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.x - POOLVR.ballMeshes[0].position.x),
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.z - POOLVR.ballMeshes[0].position.z)
        );
        avatar.quaternion.setFromAxisAngle(UP, heading);
    };
} )();


POOLVR.stroke = ( function () {
    "use strict";
    var velocity = new THREE.Vector3();
    return function () {
        velocity.set(0, 0, -3.9);
        var body = POOLVR.ballBodies[0];
        body.velocity.copy(velocity);
    };
} )();


POOLVR.moveStage = ( function () {
    "use strict";
    return function (keyboard, gamepadValues, dt) {
        var stage = POOLVR.app.stage;
        var moveFB = 0, moveRL = 0, moveUD = 0, turnRL = 0;
        if (keyboard) {
            moveFB += keyboard.moveForward - keyboard.moveBackward;
            moveUD += keyboard.moveUp - keyboard.moveDown;
            moveRL += keyboard.moveRight - keyboard.moveLeft;
            turnRL += keyboard.turnRight - keyboard.turnLeft;
        }
        for (var i = 0; i < gamepadValues.length; i++) {
            var values = gamepadValues[i];
            if (values.toggleFloatMode) {
                if (values.moveFB) moveUD -= values.moveFB;
                if (values.turnLR) moveRL += values.turnLR;
            } else {
                if (values.moveFB) moveFB -= values.moveFB;
                if (values.turnLR) turnRL += values.turnLR;
            }
            if (values.moveRL) moveRL += values.moveRL;
        }
        if (moveFB || moveRL || moveUD || turnRL) {
            Utils.moveObject(stage, dt, moveFB, moveRL, moveUD, turnRL, 0);
        }
    };
} )();


POOLVR.moveToolRoot = ( function () {
    "use strict";
    return function (keyboard, gamepadValues, dt) {
        var moveFB = 0, moveRL = 0, moveUD = 0, turnRL = 0;
        if (keyboard) {
            moveFB += keyboard.moveToolForward - keyboard.moveToolBackward;
            moveUD += keyboard.moveToolUp - keyboard.moveToolDown;
            moveRL += keyboard.moveToolRight - keyboard.moveToolLeft;
            turnRL += keyboard.rotateToolCW - keyboard.rotateToolCCW;
        }
        for (var i = 0; i < gamepadValues.length; i++) {
            var values = gamepadValues[i];
            if (values.toggleToolFloatMode) {
                if (values.moveToolFB) moveUD -= values.moveToolFB;
                if (values.turnToolLR) moveRL += values.turnToolLR;
            } else {
                if (values.moveToolFB) moveFB -= values.moveToolFB;
                if (values.turnToolLR) turnRL += values.turnToolLR;
            }
        }
    };
} )();


POOLVR.startTutorial = function () {
    "use strict";
    POOLVR.synthSpeaker.speak("Hello.  Welcome. To. Pool-ver.", function () {
        POOLVR.textGeomLogger.log("HELLO.  WELCOME TO POOLVR.");
    });

    POOLVR.synthSpeaker.speak("Keep the stick within the interaction box when you want to make contact with.  A ball.", function () {
        POOLVR.textGeomLogger.log("KEEP THE STICK WITHIN THE INTERACTION BOX WHEN YOU WANT");
        POOLVR.textGeomLogger.log("TO MAKE CONTACT WITH A BALL...");
    });

};
