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

WebVRConfig = {

  // Forces cardboard distortion in VR mode.
  //FORCE_DISTORTION: true // Default: false.
  
  // Prevents cardboard distortion in VR mode
  //PREVENT_DISTORTION: true // Default: false.
  
  // Override the cardboard distortion background color.
  //DISTORTION_BGCOLOR: {x: 1, y: 0, z: 0, w: 1} // Default: (0,0,0,1).

};

var options = {
    gravity: 9.8,
    shadowMap: true,
    leapDisabled: URL_PARAMS.leapDisabled,
    mouseControls: URL_PARAMS.mouseControls
};
