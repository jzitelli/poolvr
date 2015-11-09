/* global JSON_CONFIG */

var URL_PARAMS = (function () {
    "use strict";
    var params = {};
    location.search.substr(1).split("&").forEach(function(item) {
        var k = item.split("=")[0],
            v = decodeURIComponent(item.split("=")[1]);
        if (k in params) {
            params[k].push(v);
        } else {
            params[k] = [v];
        }
    });
    for (var k in params) {
        if (params[k].length == 1) {
            params[k] = params[k][0];
        }
    }
    return params;
})();

var pyserver = {

    config: JSON_CONFIG,

    exec: function (src, success, logger) {
        "use strict";
        var xhr = new XMLHttpRequest();
        var data = new FormData();
        data.append("src", src);
        xhr.open("POST", '/pyexec');
        xhr.onload = function() {
            var response = JSON.parse(xhr.responseText);
            console.log(response);
            if (logger) {
                logger.log(response.stdout);
            }
            if (response.error) {
                console.log("Python error: " + response.error);
            }
            else if (success) {
                success(response.return_value);
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