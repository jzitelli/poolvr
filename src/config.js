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

    turnLeft:     {buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
    turnRight:    {buttons: [ Primrose.Input.Keyboard.RIGHTARROW]},
    driveForward: {buttons: [-Primrose.Input.Keyboard.W]},
    driveBack:    {buttons: [ Primrose.Input.Keyboard.S]},
    strafeLeft:   {buttons: [-Primrose.Input.Keyboard.A]},
    strafeRight:  {buttons: [ Primrose.Input.Keyboard.D]},
    floatUp:      {buttons: [ Primrose.Input.Keyboard.E]},
    floatDown:    {buttons: [-Primrose.Input.Keyboard.C]},

    moveToolUp:        {buttons: [Primrose.Input.Keyboard.O]},
    moveToolDown:      {buttons: [Primrose.Input.Keyboard.PERIOD]},
    moveToolForwards:  {buttons: [Primrose.Input.Keyboard.I]},
    moveToolBackwards: {buttons: [Primrose.Input.Keyboard.K]},
    moveToolLeft:      {buttons: [Primrose.Input.Keyboard.J]},
    moveToolRight:     {buttons: [Primrose.Input.Keyboard.L]},
    rotateToolCW:      {buttons: [Primrose.Input.Keyboard.U]},
    rotateToolCCW:     {buttons: [Primrose.Input.Keyboard.Y]},

    toggleVRControls: {buttons: [Primrose.Input.Keyboard.V],
                       commandDown: function(){app.toggleVRControls();}, dt: 0.25},
    toggleWireframe: {buttons: [Primrose.Input.Keyboard.NUMBER0],
                      commandDown: function(){app.toggleWireframe();}, dt: 0.25},
    resetVRSensor: {buttons: [Primrose.Input.Keyboard.Z],
                    commandDown: function(){app.resetVRSensor();}, dt: 0.25},

    resetTable: {buttons: [Primrose.Input.Keyboard.R],
                 commandDown: function(){POOLVR.resetTable();}, dt: 0.5},

    autoPosition: {buttons: [Primrose.Input.Keyboard.P],
                   commandDown: function(){POOLVR.autoPosition(avatar);}, dt: 0.5},

    toggleMenu: {buttons: [Primrose.Input.Keyboard.SPACEBAR],
                 commandDown: function(){POOLVR.toggleMenu();}, dt: 0.25},

    nextBall: {buttons: [Primrose.Input.Keyboard.ADD],
               commandDown: function(){POOLVR.selectNextBall();}, dt: 0.5},

    prevBall: {buttons: [Primrose.Input.Keyboard.SUBTRACT],
               commandDown: function(){POOLVR.selectNextBall(-1);}, dt: 0.5}
};
POOLVR.keyboardCommands = makeObjectArray(POOLVR.keyboardCommands, 'name');
POOLVR.keyboard = new Primrose.Input.Keyboard("keyboard", window, POOLVR.keyboardCommands);

var DEADZONE = 0.2;
POOLVR.gamepadCommands = {

    strafe:   {axes: [ Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    drive:    {axes: [ Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    float:    {axes: [-Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    dheading: {axes: [-Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    pitch:    {axes: [ Primrose.Input.Gamepad.LSY], deadzone: DEADZONE,
               integrate: true, max: 0.5 * Math.PI, min: -0.5 * Math.PI},
    toggleFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
                      commandDown: function(){avatar.floatMode=true;},
                      commandUp: function(){avatar.floatMode=false;}},

    toolStrafe: {axes: [ Primrose.Input.Gamepad.RSX], deadzone: DEADZONE},
    toolDrive:  {axes: [ Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toolFloat:  {axes: [-Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toggleToolFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightStick],
                          commandDown: function(){avatar.toolMode=true;},
                          commandUp: function(){avatar.toolMode=false;}},

    resetVRSensor: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                    commandDown: function(){app.resetVRSensor();}, dt: 0.25},

    nextBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightBumper],
               commandDown: function(){POOLVR.selectNextBall();}, dt: 0.5},

    prevBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftBumper],
               commandDown: function(){POOLVR.selectNextBall(-1);}, dt: 0.5},

    autoPosition: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.Y],
                   commandDown: function(){POOLVR.autoPosition(avatar);}, dt: 0.5},

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

POOLVR.config.toolOptions.host = URL_PARAMS.host;
POOLVR.config.toolOptions.port = URL_PARAMS.port;

pyserver.log('POOLVR.config.toolOptions =\n' + JSON.stringify(POOLVR.config.toolOptions, undefined, 2));

POOLVR.toolOptions = combineObjects(POOLVR.config.toolOptions, {
    keyboard: POOLVR.keyboard,
    gamepad: POOLVR.gamepad,
    useBasicMaterials: POOLVR.config.useBasicMaterials
});

POOLVR.config.synthSpeakerVolume = URL_PARAMS.synthSpeakerVolume || POOLVR.config.synthSpeakerVolume || 0.25;


// POOLVR.config.vrLeap = URL_PARAMS.vrLeap || POOLVR.config.vrLeap;
// if (POOLVR.config.vrLeap) {
//     // ##### Leap Motion VR tracking mode: #####
//     POOLVR.config.toolOptions.transformOptions = {vr: true, effectiveParent: app.camera};
// }


POOLVR.saveConfig = function () {
    "use strict";
    var profileName = document.getElementById('profileName');
    if (profileName) {
        console.log(profileName.value);
        profileName = profileName.value;
    } else {
        profileName = 'unnamed profile';
    }
    if (window.toolRoot) {
        POOLVR.config.toolOptions.toolOffset = [window.toolRoot.position.x, window.toolRoot.position.y, window.toolRoot.position.z];
        POOLVR.config.toolOptions.toolRotation = window.toolRoot.rotation.y;
    }
    pyserver.log(JSON.stringify(POOLVR.config, undefined, 2));
    localStorage.setItem(profileName, JSON.stringify(POOLVR.config));
};


POOLVR.loadConfig = function (profileName) {
    "use strict";
    var localStorageConfig = localStorage.getItem(profileName);
    if (localStorageConfig) {
        localStorageConfig = JSON.parse(localStorageConfig);
        for (var k in localStorageConfig) {
            if (POOLVR.config.hasOwnProperty(k)) {
                POOLVR.config[k] = localStorageConfig[k];
            }
        }
        pyserver.log("loaded profile " + profileName);
        pyserver.log(JSON.stringify(POOLVR.config, undefined, 2));
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


POOLVR.selectNextBall = function (inc) {
    "use strict";
    inc = inc || 1;
    var next = Math.max(1, Math.min(15, POOLVR.nextBall + inc));
    while (!POOLVR.onTable[next]) {
        next = Math.max(1, Math.min(15, next + inc));
        if (next === POOLVR.nextBall) {
            break;
        }
    }
    if (POOLVR.nextBall != next) {
        POOLVR.nextBall = next;
        textGeomLogger.log("BALL " + POOLVR.nextBall + " SELECTED");
    }
};


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
        textGeomLogger.log("YOU ARE BEING AUTO-POSITIONED.  NEXT BALL: " + POOLVR.nextBall);

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
    "use strict";
    menu.visible = !menu.visible;
    mouseStuff.mousePointerMesh.visible = menu.visible;
    mouseStuff.setPickables(menu.children);
};


POOLVR.config.useWebVRBoilerplate = URL_PARAMS.useWebVRBoilerplate || POOLVR.config.useWebVRBoilerplate;

var WebVRConfig = WebVRConfig || POOLVR.config.WebVRConfig || {};
WebVRConfig.FORCE_DISTORTION = URL_PARAMS.FORCE_DISTORTION || WebVRConfig.FORCE_DISTORTION;
WebVRConfig.FORCE_ENABLE_VR  = URL_PARAMS.FORCE_ENABLE_VR  || WebVRConfig.FORCE_ENABLE_VR;


( function () {
    "use strict";
    var profileSelect = document.getElementById('profileSelect');
    profileSelect.onchange = function (evt) {
        console.log(this.value);
        POOLVR.loadConfig(this.value);
    };
    for (var i = 0; i < localStorage.length; i++) {
        var profileName = localStorage.key(i);
        var option = document.createElement('option');
        option.text = profileName;
        option.value = profileName;
        profileSelect.appendChild(option);
    }
    var onClick = function () {
        POOLVR.config[this.id] = this.checked;
    };
    for (var name in POOLVR.config) {
        if (name === 'pyserver') continue;
        var v = POOLVR.config[name];
        if ((v === true) || (v === false)) {
            var input = document.getElementById(name);
            if (input) {
                input.onclick = onClick;
            }
        }
    }
} )();

POOLVR.profileForm = document.getElementById('profileForm');

POOLVR.vrButton = document.getElementById('enterVR');
if (POOLVR.vrButton) {
    POOLVR.vrButton.addEventListener('click', function () {
        app.enterVR();
    });
}

POOLVR.fullscreenButton = document.getElementById('enterFullscreen');
if (POOLVR.fullscreenButton) {
    POOLVR.fullscreenButton.addEventListener('click', function () {
        app.enterFullscreen();
    });
}

POOLVR.saveConfigButton = document.getElementById('saveConfig');
if (POOLVR.saveConfigButton) {
    POOLVR.saveConfigButton.addEventListener('click', function () {
        // TODO: callback
        POOLVR.saveConfig();
        textGeomLogger.log("CONFIGURATION SAVED:");
        textGeomLogger.log(JSON.stringify(POOLVR.config, undefined, 2));
    });
}
