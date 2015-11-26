var SynthSpeaker = ( function() {
    function SynthSpeaker(options) {
        this.queue = [];
    }

    return SynthSpeaker;
} )();

/*
    function SynthSpeaker(volume, rate, pitch) {
        //this.queue = []; // e.g. {text: "Hello", caption: "Hello!!!!!!!!!!!!!!!", onbegin: function () {console.log("speaking...");}, onend: function () {console.log("finished speaking");}}
        this.queue = [];
        this.ends = [];
        this.begins = [];
        this.captions = [];
        // only chrome supports
        if (SPEECH) {
            this.msg = new SpeechSynthesisUtterance();
        } else {
            this.msg = {};
        }
        this.msg.volume = volume || 1;
        this.msg.rate = rate || 1;
        this.msg.pitch = pitch || 1;
        this.speaking = false;
        this.msg.onend = function(event) {
            if (this.queue.length > 0) {
                this.msg.text = this.queue.shift();
                var caption = this.captions.shift();
                application.log(caption);
                var onbegin = this.begins.shift();
                if (onbegin) {
                    onbegin();
                }
                if (SPEECH) {
                    speechSynthesis.speak(this.msg);
                }
            } else {
                this.speaking = false;
            }
            var onend = this.ends.shift();
            if (onend) {
                onend();
            }
        }.bind(this);
    }
    SynthSpeak.prototype.speak = function(text, caption, onend, onbegin) {
        caption = (caption === true) ? text : (caption || "");
        text = text.replace('\n', ' ');
        this.ends.push(onend);
        if (this.speaking) {
            this.begins.push(onbegin);
            this.queue.push(text);
            this.captions.push(caption);
        } else {
            if (onbegin) {
                onbegin();
            }
            application.log(caption);
            this.msg.text = text;
            if (SPEECH) {
                this.speaking = true;
                speechSynthesis.speak(this.msg);
            }
        }
    };
    return SynthSpeak;
})();
*/