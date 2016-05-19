/* global THREE */
module.exports = ( function () {
    "use strict";
    var alphas  = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var digits  = "0123456789";
    var symbols = ",./;'[]\\-=<>?:\"{}|_+~!@#$%^&*()";
    var chars   = alphas + digits + symbols;

    function TextGeomCacher(font, options) {
        options = options || {};
        var textGeomParams = {
            font:          font,
            size:          options.size || 0.12,
            height:        options.height || 0,
            curveSegments: options.curveSegments || 2
        };

        this.geometries = {};
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i];
            var geom = new THREE.TextGeometry(c, textGeomParams);
            var bufferGeom = new THREE.BufferGeometry();
            bufferGeom.fromGeometry(geom);
            geom.dispose();
            this.geometries[c] = bufferGeom;
        }

        this.makeObject = function (text, material) {
            var object = new THREE.Object3D();
            object.matrixAutoUpdate = false;
            for (var j = 0; j < text.length; j++) {
                var c = text[j];
                if (c !== ' ') {
                    var mesh = new THREE.Mesh(this.geometries[c], material);
                    mesh.matrixAutoUpdate = false;
                    mesh.position.x = 0.8*textGeomParams.size * j;
                    mesh.updateMatrix();
                    object.add(mesh);
                }
            }
            return object;
        }.bind(this);
    }

    function TextGeomLogger(textGeomCacher, options) {
        options = options || {};
        var material   = options.material || new THREE.MeshBasicMaterial({color: 0xff2201});
        var nrows      = options.nrows || 20;
        //var ncols      = options.ncols || 30;
        var lineHeight = options.lineHeight || 1.8 * 0.12;

        var lineObjects = {};

        this.root = new THREE.Object3D();
        this.root.matrixAutoUpdate = false;

        this.log = function (msg) {
            var lines = msg.split(/\n/);
            // create / clone lines:
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var lineObject = lineObjects[line];
                if (lineObject) {
                    lineObject = lineObject.clone();
                    this.root.add(lineObject);
                } else {
                    lineObject = textGeomCacher.makeObject(line, material);
                    lineObjects[line] = lineObject;
                    this.root.add(lineObject);
                }
                lineObject.position.y = -(i + 1) * lineHeight;
                lineObject.updateMatrix();
            }
            this.root.updateMatrixWorld(true);
        }.bind(this);

        var lt = 0;
        this.update = function (t) {
            var dt = 0.001 * (t - lt);
            lt = t;
            var numChildren = this.root.children.length;
            if (numChildren === 0) return;
            var lastLineObject = this.root.children[numChildren-1];
            if (lastLineObject.position.y < 0) {
                for (var i = 0; i < numChildren; i++) {
                    this.root.children[i].position.y += 2 * lineHeight * dt;
                    this.root.children[i].updateMatrix();
                }
            }
            // remove rows exceeding max display
            if (lastLineObject.position.y >= 0) {
                for (i = numChildren - 1; i >= nrows; i--) {
                    this.root.remove(this.root.children[0]);
                }
            }
        }.bind(this);

        this.clear = function () {
            for (var i = this.root.children.length - 1; i >= 0; i--) {
                this.root.remove(this.root.children[this.root.children.length - 1]);
            }
        }.bind(this);
    }

    return {
        TextGeomCacher: TextGeomCacher,
        TextGeomLogger: TextGeomLogger
    };

} )();
