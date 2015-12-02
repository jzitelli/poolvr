var WebVRSound = (function (numGainNodes) {
    "use strict";
    numGainNodes = numGainNodes || 4;

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

    return {
        audioContext: audioContext,
        getNextGainNode: getNextGainNode,
        playBuffer: playBuffer
    };

})();


    // this.playSound = function (url, loop) {
    //     var source = audioContext.createBufferSource();
    //     source.loop = (loop === true);
    //     source.connect(gainNode);
    //     var request = new XMLHttpRequest();
    //     request.responseType = 'arraybuffer';
    //     request.open('GET', url, true);
    //     request.onload = function() {
    //         audioContext.decodeAudioData(request.response).then(function(buffer) {
    //             source.buffer = buffer;
    //             source.start(0);
    //         });
    //     };
    //     request.send();
    // };
