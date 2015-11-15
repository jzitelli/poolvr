var pyserver = {

    log: function (msg, success, logger) {
        "use strict";
        var xhr = new XMLHttpRequest();
        var data = new FormData();
        data.append("msg", msg);
        xhr.open("POST", '/log');
        xhr.onload = function() {
            var response = JSON.parse(xhr.responseText);
            console.log(response);
            if (success) {
                success(response);
            }
        };
        xhr.send(data);
    },

    readFile: function (filename, success, logger) {
        "use strict";
        var xhr = new XMLHttpRequest();
        xhr.open('GET', "/read?file=" + filename);
        xhr.onload = function() {
            var response = JSON.parse(xhr.responseText);
            if (response.text) {
                success(response.text);
            } else if (response.error) {
                console.log(response.error);
                if (logger) {
                    logger.log(response.error);
                }
            }
        };
        xhr.send();
    },

    writeFile: function (filename, text) {
        "use strict";
        var xhr = new XMLHttpRequest();
        xhr.open('POST', "/write?file=" + filename);
        xhr.onload = function() {
            var response = JSON.parse(xhr.responseText);
            if (response.filename) {
                console.log("wrote " + response.filename);
            }
            else if (response.error) {
                console.log(response.error);
            }
        };
        if (typeof text === 'string') {
            var data = new FormData();
            data.append("text", text);
            xhr.send(data);
        }
        else {
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(text));
        }
    }

};
