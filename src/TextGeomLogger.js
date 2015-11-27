var TextGeomLogger = (function () {
    "use strict";
    var alphas = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var digits = "0123456789";
    var symbols = ",./;'[]\\-=<>?:\"{}|_+~!@#$%^&*()";
    var chars = alphas + digits + symbols;

    function TextGeomLogger(material, options) {
        material = material || new THREE.MeshBasicMaterial({color: 0xee2200});
        options = options || {};
        var textGeomParams = {
            size:          options.size || 0.12,
            font:          options.font || 'anonymous pro',
            height:        options.height || 0,
            curveSegments: options.curveSegments || 2
        };
        this.geometries = {};
        this.meshes = {};
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i];
            var geom = new THREE.TextGeometry(c, textGeomParams);
            var bufferGeom = new THREE.BufferGeometry();
            bufferGeom.fromGeometry(geom);
            geom.dispose();
            this.geometries[c] = bufferGeom;
            this.meshes[c] = new THREE.Mesh(geom, material);
        }

        var nrows = options.nrows || 20;
        //var ncols = options.ncols || 80;

        var lineMeshBuffer = {};

        this.root = new THREE.Object3D();

        this.log = function (msg) {
            var lines = msg.split('\n');
            // scroll previous lines:
            for (var i = 0; i < this.root.children.length; i++) {
                var child = this.root.children[i];
                child.position.y += 1.6*textGeomParams.size;
            }
            // create / clone new lines:
            for (i = 0; i < lines.length; i++) {
                var line = lines[i];
                var lineMesh = lineMeshBuffer[line];
                if (lineMesh) {
                    var clone = lineMesh.clone();
                    clone.position.y = 0;
                    this.root.add(clone);
                }
                else {
                    lineMesh = new THREE.Object3D();
                    this.root.add(lineMesh);
                    lineMeshBuffer[line] = lineMesh;
                    for (var j = 0; j < line.length; j++) {
                        var c = line[j];
                        if (c !== ' ') {
                            var letterMesh = this.meshes[c].clone();
                            letterMesh.position.x = 0.8*textGeomParams.size * j;
                            lineMesh.add(letterMesh);
                        }
                    }
                }
            }
            // remove rows exceeding max display
            while (this.root.children.length > nrows) {
                this.root.remove(this.root.children[-1]);
            }
        }.bind(this);
    }

    return TextGeomLogger;

})();
