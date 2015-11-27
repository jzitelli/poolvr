var SynthSpeaker = ( function() {

    function SynthSpeaker(options) {
        this.queue = [];
        this.onBegins = [];
        this.onEnds = [];
        this.speaking = false;
        this.utterance = new SpeechSynthesisUtterance();
        options = options || {};
        this.utterance.volume = options.volume || 1;
        this.utterance.rate = options.rate || 1;
        this.utterance.pitch = options.pitch || 1;
        this.utterance.onend = function(event) {
            var onEnd = this.onEnds.shift();
            if (onEnd) {
                onEnd();
            }
            if (this.queue.length > 0) {
                this.utterance.text = this.queue.shift();
                var onBegin = this.onBegins.shift();
                if (onBegin) {
                    onBegin();
                }
                speechSynthesis.speak(this.msg);
            } else {
                this.speaking = false;
            }
        }.bind(this);
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
        console.log("speechSynthesis not supported (Chrome only)");
        return function () {
            this.speak = function () {};
        };
    }
} )();
