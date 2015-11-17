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

var options = {
    gravity: 9.8,
    shadowMap: URL_PARAMS.shadowMap,
    leapDisabled: URL_PARAMS.leapDisabled,
    mouseControls: URL_PARAMS.mouseControls,
    basicMaterials: URL_PARAMS.basicMaterials
};
