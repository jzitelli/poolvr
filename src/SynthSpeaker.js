var SynthSpeaker = ( function() {
    "use strict";
    function SynthSpeaker(options) {
        options = options || {};
        this.queue = [];
        this.onBegins = [];
        this.onEnds = [];
        this.speaking = false;

        var onend = function () {
            var onEnd = this.onEnds.shift();
            if (onEnd) {
                onEnd();
            }
            if (this.queue.length > 0) {
                this.utterance = new SpeechSynthesisUtterance();
                this.utterance.volume = options.volume || 1;
                this.utterance.rate = options.rate || 1;
                this.utterance.pitch = options.pitch || 1;
                this.utterance.onend = onend;
                this.utterance.text = this.queue.shift();
                console.log(this.utterance.text);
                var onBegin = this.onBegins.shift();
                if (onBegin) {
                    onBegin();
                }
                speechSynthesis.speak(this.utterance);
            } else {
                this.speaking = false;
            }
        }.bind(this);

        this.utterance = new SpeechSynthesisUtterance();
        this.utterance.volume = options.volume || 1;
        this.utterance.rate = options.rate || 1;
        this.utterance.pitch = options.pitch || 1;
        this.utterance.onend = onend;

    }

    SynthSpeaker.prototype.speak = function(text, onEnd, onBegin) {
        this.onEnds.push(onEnd);
        if (this.speaking) {
            this.queue.push(text);
            this.onBegins.push(onBegin);
        } else {
            if (onBegin) {
                onBegin();
            }
            this.utterance.text = text;
            this.speaking = true;
            speechSynthesis.speak(this.utterance);
        }
    };

    if (window.speechSynthesis) {
        return SynthSpeaker;
    } else {
        console.log("speechSynthesis not supported");
        return function () {
            this.speak = function () {};
        };
    }
} )();
