window.Audio = require('./Audio.js');

/* global POOLVR */
POOLVR.playCollisionSound = (function () {
    "use strict";
    var ballBallBuffer;
    var filename = (!/Edge/.test(navigator.userAgent)) ? 'sounds/ballBall.ogg' : 'sounds/ballBall.mp3';
    Audio.loadBuffer(filename, function (buffer) {
        ballBallBuffer = buffer;
    });
    var playCollisionSound = function (v) {
        Audio.playBuffer(ballBallBuffer, Math.min(1, v / 10));
    };
    return playCollisionSound;
})();

POOLVR.playPocketedSound = (function () {
    "use strict";
    var ballPocketedBuffer;
    var filename = (!/Edge/.test(navigator.userAgent)) ? 'sounds/ballPocketed.ogg' : 'sounds/ballPocketed.mp3';
    Audio.loadBuffer(filename, function (buffer) {
        ballPocketedBuffer = buffer;
    });
    var playPocketedSound = function () {
        Audio.playBuffer(ballPocketedBuffer, 0.5);
    };
    return playPocketedSound;
})();
