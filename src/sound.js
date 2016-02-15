POOLVR.playCollisionSound = (function () {
    "use strict";
    var ballBallBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', '/sounds/ballBall.ogg');
    request.onload = function() {
        WebVRSound.audioContext.decodeAudioData(this.response, function(buffer) {
            ballBallBuffer = buffer;
        });
    };
    request.send();
    var playCollisionSound = function (v) {
        WebVRSound.playBuffer(ballBallBuffer, Math.min(1, v / 4));
    };
    return playCollisionSound;
})();

POOLVR.playPocketedSound = (function () {
    "use strict";
    var ballPocketedBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', '/sounds/ballPocketed.ogg');
    request.onload = function() {
        WebVRSound.audioContext.decodeAudioData(this.response, function(buffer) {
            ballPocketedBuffer = buffer;
        });
    };
    request.send();
    var playPocketedSound = function () {
        WebVRSound.playBuffer(ballPocketedBuffer, 0.5);
    };
    return playPocketedSound;
})();
