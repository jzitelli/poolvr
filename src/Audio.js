module.exports = ( function () {
    "use strict";
    var numGainNodes = 4;

    var audioContext = new AudioContext();

    var gainNodes = [];
    for (var i = 0; i < numGainNodes; i++) {
        var gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 1;
        gainNodes.push(gainNode);
    }

    var iGainNode = 0;
    function getNextGainNode() {
        var node = gainNodes[iGainNode];
        iGainNode = (iGainNode + 1) % numGainNodes;
        return node;
    }

    var playBuffer = function (buffer, vol) {
        var source = audioContext.createBufferSource();
        var gainNode = getNextGainNode();
        gainNode.gain.value = vol;
        source.connect(gainNode);
        source.buffer = buffer;
        source.start(0);
    };

    var loadBuffer = function (url, onLoad) {
        var request = new XMLHttpRequest();
        request.responseType = 'arraybuffer';
        request.open('GET', url);
        request.onload = function () {
            audioContext.decodeAudioData(this.response, onLoad);
        };
        request.send();
    };

    return {
        audioContext: audioContext,
        getNextGainNode: getNextGainNode,
        playBuffer: playBuffer,
        loadBuffer: loadBuffer
    };
} )();
