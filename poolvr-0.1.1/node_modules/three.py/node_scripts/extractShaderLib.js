var fs = require('fs');
var THREE = require('three.js');
fs.writeFile("three/shaderlib/ShaderLib.json", JSON.stringify(THREE.ShaderLib, undefined, 2), function (err) {
    if (err) {
        return console.log(err);
    }
    console.log("wrote three/shaderlib/ShaderLib.json");
});
fs.writeFile("three/shaderlib/ShaderChunk.json", JSON.stringify(THREE.ShaderChunk, undefined, 2), function (err) {
    if (err) {
        return console.log(err);
    }
    console.log("wrote three/shaderlib/ShaderChunk.json");
});
fs.writeFile("three/shaderlib/UniformsLib.json", JSON.stringify(THREE.UniformsLib, undefined, 2), function (err) {
    if (err) {
        return console.log(err);
    }
    console.log("wrote three/shaderlib/UniformsLib.json");
});
