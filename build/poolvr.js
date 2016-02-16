/* ############################################################################

  poolvr v0.1.0 2016-02-16

  https://jzitelli.github.io/poolvr
  git+https://github.com/jzitelli/poolvr.git

The MIT License (MIT)

Copyright (c) 2015 Jeffrey Zitelli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

############################################################################ */

// #### node_modules/three.py/js/three.py.js
THREE.py = ( function () {
    "use strict";

    var fonts = {};

    function parse(json, onLoad) {

        var objectLoader = new THREE.ObjectLoader();

        var manager = new THREE.LoadingManager();
        var textureLoader = new THREE.TextureLoader(manager),
            cubeTextureLoader = new THREE.CubeTextureLoader(manager),
            fontLoader = new THREE.FontLoader(manager);

        var images;

        var promise = new Promise( function (resolve, reject) {

            // filter out geometries that ObjectLoader doesn't handle, parse the rest:
            var geometries = objectLoader.parseGeometries(json.geometries.filter( function (geom) {
                return geom.type !== "TextGeometry";
            } ));

            manager.onLoad = onPartsLoad;
            function onPartsLoad() {
                // construct TextGeometries now that fonts are loaded:
                json.geometries.forEach( function (geom) {
                    if (geom.type === "TextGeometry") {
                        geom.parameters.font = fonts[geom.font_url];
                        var textGeometry = new THREE.TextGeometry(geom.text, geom.parameters);
                        textGeometry.uuid = geom.uuid;
                        if (geom.name !== undefined) textGeometry.name = geom.name;
                        geometries[geom.uuid] = textGeometry;
                    }
                } );

                function _onLoad(obj) {
                    // the final callback, calls promise resolve
                    loadHeightfields(obj);
                    obj.traverse( function (node) {
                        if (node.userData) {
                            if (node.userData.layers) {
                                node.userData.layers.forEach( function (channel) {
                                    console.log('setting layer ' + channel);
                                    node.layers.set(channel);
                                } );
                            }
                        }
                        if (node instanceof THREE.Mesh) {
                            node.geometry.computeBoundingSphere();
                            node.geometry.computeBoundingBox();
                            if (node.material.shading === THREE.FlatShading) {
                                node.geometry.computeFaceNormals();
                            }
                        }
                    } );
                    if (onLoad) {
                        onLoad(obj);
                    }
                    resolve(obj);
                }

                images = objectLoader.parseImages(json.images, function () { _onLoad(object); });
                var textures = objectLoader.parseTextures(json.textures, images);
                var materials = objectLoader.parseMaterials(json.materials, textures);

                var object = objectLoader.parseObject(json.object, geometries, materials);

                if (json.images === undefined || json.images.length === 0) {
                    _onLoad(object);
                }

            }

            var needsLoading = false;

            // set texture values for shader material uniforms:
            if (json.materials) {
                json.materials.forEach( function (mat) {
                    if (mat.type.endsWith("ShaderMaterial") && mat.uniforms) {
                        var uniforms = mat.uniforms;
                        for (var key in uniforms) {
                            var uniform = uniforms[key];
                            if (uniform.type === 't') {
                                if (Array.isArray(uniform.value) && uniform.value.length === 6) {
                                    // texture cube specified by urls
                                    uniform.value = cubeTextureLoader.load(uniform.value);
                                    needsLoading = true;
                                } else if (typeof uniform.value === 'string') {
                                    // single texture specified by url
                                    uniform.value = textureLoader.load(uniform.value);
                                    needsLoading = true;
                                }
                            }
                        }
                    }
                } );
            }

            // load fonts:
            json.geometries.forEach( function (geom) {
                if (geom.type === "TextGeometry" && fonts[geom.font_url] === undefined) {
                    fonts[geom.font_url] = null;
                    fontLoader.load(geom.font_url, function (font) {
                        fonts[geom.font_url] = font;
                    });
                    needsLoading = true;
                }
            } );

            if (needsLoading === false) onPartsLoad();

        } );

        function loadHeightfields(obj) {
            function getPixel(imagedata, x, y) {
                var position = (x + imagedata.width * y) * 4,
                    data = imagedata.data;
                return {
                    r: data[position],
                    g: data[position + 1],
                    b: data[position + 2],
                    a: data[position + 3]
                };
            }
            obj.traverse( function (node) {
                if (node.userData && node.userData.heightfieldImage) {
                    var uuid = node.userData.heightfieldImage;
                    var heightfieldScale = node.userData.heightfieldScale || 1;
                    var image = images[uuid];
                    if (image) {
                        var canvas = document.createElement('canvas');
                        canvas.width = image.width;
                        canvas.height = image.height;
                        var context = canvas.getContext('2d');
                        context.drawImage(image, 0, 0);
                        var imageData = context.getImageData(0, 0, image.width, image.height);
                        var attribute = node.geometry.getAttribute('position');
                        var gridX1 = node.geometry.parameters.widthSegments + 1;
                        var gridY1 = node.geometry.parameters.heightSegments + 1;
                        var i = 0;
                        for (var iy = 0; iy < gridY1; ++iy) {
                            for (var ix = 0; ix < gridX1; ++ix) {
                                var pixel = getPixel(imageData, ix, iy);
                                attribute.setZ(i++, heightfieldScale * (pixel.r + 256*pixel.g + 256*256*pixel.b) / (256 * 256 * 256));
                            }
                        }
                        attribute.needsUpdate = true;
                        node.geometry.computeFaceNormals();
                        node.geometry.computeVertexNormals();
                        node.geometry.normalsNeedUpdate = true;
                        node.geometry.computeBoundingSphere();
                        node.geometry.computeBoundingBox();
                    }
                }
            });
        }

        return promise;

    }

    return {
        parse: parse,
        fonts: fonts
    };
} )();
;
// #### node_modules/three.py/js/CANNONize.js
THREE.py.CANNONize = function (obj, world) {
    "use strict";
    obj.updateMatrixWorld();
    obj.traverse(function(node) {
        if (node.userData && node.userData.cannonData) {
            var body = makeCANNON(node, node.userData.cannonData);
            if (world) {
                if (body instanceof CANNON.Body) {
                    world.addBody(body);
                } else {
                    // assumed to be array
                    body.forEach(function (b) { world.addBody(b); });
                }
            }
        }
    });

    function makeCANNON(node, cannonData) {
        var body;
        if (node.body) {
            return node.body;
        }
        if (node instanceof THREE.Mesh) {
            var params = {mass: cannonData.mass,
                          position: node.getWorldPosition(),
                          quaternion: node.getWorldQuaternion()};
            if (cannonData.linearDamping !== undefined) {
                params.linearDamping = cannonData.linearDamping;
            }
            if (cannonData.angularDamping !== undefined) {
                params.angularDamping = cannonData.angularDamping;
            }
            body = new CANNON.Body(params);
            body.mesh = node;
            cannonData.shapes.forEach(function(e) {
                var shape,
                    quaternion,
                    position;
                var array, face, i;
                switch (e) {
                    case 'Plane':
                        shape = new CANNON.Plane();
                        break;
                    case 'Box':
                        var halfExtents = new CANNON.Vec3();
                        node.geometry.computeBoundingBox();
                        halfExtents.x = node.scale.x * (node.geometry.boundingBox.max.x - node.geometry.boundingBox.min.x) / 2;
                        halfExtents.y = node.scale.y * (node.geometry.boundingBox.max.y - node.geometry.boundingBox.min.y) / 2;
                        halfExtents.z = node.scale.z * (node.geometry.boundingBox.max.z - node.geometry.boundingBox.min.z) / 2;
                        shape = new CANNON.Box(halfExtents);
                        break;
                    case 'Sphere':
                        node.geometry.computeBoundingSphere();
                        shape = new CANNON.Sphere(node.geometry.boundingSphere.radius);
                        break;
                    case 'ConvexPolyhedron':
                        var points = [];
                        var faces = [];
                        if (node.geometry instanceof THREE.BufferGeometry) {
                            array = node.geometry.getAttribute('position').array;
                            for (i = 0; i < array.length; i += 3) {
                                points.push(new CANNON.Vec3(array[i], array[i+1], array[i+2]));
                            }
                            array = node.geometry.index.array;
                            for (i = 0; i < array.length; i += 3) {
                                face = [array[i], array[i+1], array[i+2]];
                                faces.push(face);
                            }
                        } else if (node.geometry instanceof THREE.Geometry) {
                            // TODO
                        }
                        shape = new CANNON.ConvexPolyhedron(points, faces);
                        break;
                    case 'Cylinder':
                        shape = new CANNON.Cylinder(node.geometry.parameters.radiusTop,
                            node.geometry.parameters.radiusBottom,
                            node.geometry.parameters.height,
                            node.geometry.parameters.radialSegments);
                        quaternion = new CANNON.Quaternion();
                        quaternion.setFromEuler(-Math.PI/2, 0, 0, 'XYZ');
                        break;
                    case 'Heightfield':
                        array = node.geometry.getAttribute('position').array;
                        if (node.geometry.type !== 'PlaneBufferGeometry') {
                            alert('uh oh!');
                        }
                        var gridX1 = node.geometry.parameters.widthSegments + 1;
                        var gridY1 = node.geometry.parameters.heightSegments + 1;
                        var dx = node.geometry.parameters.width / node.geometry.parameters.widthSegments;
                        var data = [];
                        for (var ix = 0; ix < gridX1; ++ix) {
                            data.push(new Float32Array(gridY1));
                            for (var iy = 0; iy < gridY1; ++iy) {
                                data[ix][iy] = array[3 * (gridX1 * (gridY1 - iy - 1) + ix) + 2];
                            }
                        }
                        shape = new CANNON.Heightfield(data, {
                            elementSize: dx
                        });
                        // center to match THREE.PlaneBufferGeometry:
                        position = new CANNON.Vec3();
                        position.x = -node.geometry.parameters.width / 2;
                        position.y = -node.geometry.parameters.height / 2;
                        break;
                    case 'Trimesh':
                        var vertices;
                        var indices;
                        if (node.geometry instanceof THREE.BufferGeometry) {
                            vertices = node.geometry.getAttribute('position').array;
                            indices = node.geometry.index.array;
                        } else {
                            vertices = [];
                            for (i = 0; i < node.geometry.vertices.length; i++) {
                                var vert = node.geometry.vertices[i];
                                vertices.push(vert.x, vert.y, vert.z);
                            }
                            indices = [];
                            for (i = 0; i < node.geometry.faces.length; i++) {
                                face = node.geometry.faces[i];
                                indices.push(face.a, face.b, face.c);
                            }
                        }
                        shape = new CANNON.Trimesh(vertices, indices);
                        break;
                    case 'Ellipsoid':
                        // TODO
                        console.warn('TODO');
                        break;
                    default:
                        console.error("unknown shape type: " + e);
                        break;
                }
                body.addShape(shape, position, quaternion);
            });
            node.body = body;
            return body;
        } else if (node instanceof THREE.Object3D) {
            var bodies = [];
            node.children.forEach(function (c) { bodies.push(makeCANNON(c, cannonData)); });
            return bodies;
        } else {
            console.error("makeCANNON error");
        }
    }
};
;
// #### node_modules/three.py/js/WebVRApplication.js
function WebVRApplication(scene, config) {
    "use strict";
    this.scene = scene;

    config = config || {};
    var rendererOptions     = config.rendererOptions;
    var onResetVRSensor     = config.onResetVRSensor;

    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera = camera;

    this.renderer = new THREE.WebGLRenderer(rendererOptions);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    var domElement = this.renderer.domElement;
    document.body.appendChild(domElement);
    domElement.id = 'renderer';

    this.vrEffect = new THREE.VREffect(this.renderer, function(errorMsg) { console.log('error creating VREffect: ' + errorMsg); });
    this.vrEffect.setSize(window.innerWidth, window.innerHeight);

    this.vrControls = new THREE.VRControls(this.camera, function(errorMsg) { console.log('error creating VRControls: ' + errorMsg); });
    this.vrControls.enabled = true;

    this.vrManager = new WebVRManager(this.renderer, this.vrEffect, {
        hideButton: false
    });


    this.toggleVRControls = function () {
        if (this.vrControls.enabled) {
            this.vrControls.enabled = false;
            this.camera.position.set(0, 0, 0);
            this.camera.quaternion.set(0, 0, 0, 1);
        } else {
            this.vrControls.enabled = true;
        }
    }.bind(this);


    var lastPosition = new THREE.Vector3();
    this.resetVRSensor = function () {
        lastPosition.copy(this.camera.position);
        var lastRotation = this.camera.rotation.y;
        this.vrControls.resetSensor();
        this.vrControls.update();
        if (onResetVRSensor) {
            onResetVRSensor(lastRotation, lastPosition);
        }
    }.bind(this);


    var wireframeMaterial = new THREE.MeshBasicMaterial({color: 0xeeddaa, wireframe: true});
    this.toggleWireframe = function () {
        if (this.scene.overrideMaterial) {
            this.scene.overrideMaterial = null;
        } else {
            this.scene.overrideMaterial = wireframeMaterial;
        }
    }.bind(this);


    // TODO

    // renderer.domElement.requestPointerLock = renderer.domElement.requestPointerLock || renderer.domElement.mozRequestPointerLock || renderer.domElement.webkitRequestPointerLock;
    // function requestPointerLock() {
    //     if (renderer.domElement.requestPointerLock) {
    //         renderer.domElement.requestPointerLock();
    //     }
    // }
    // function releasePointerLock() {
    //     document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
    //     if (document.exitPointerLock) {
    //         document.exitPointerLock();
    //     }
    // }
    // var fullscreenchange = this.renderer.domElement.mozRequestFullScreen ? 'mozfullscreenchange' : 'webkitfullscreenchange';
    // document.addEventListener(fullscreenchange, function ( event ) {
    //     if (this.vrManager.isVRMode()) {
    //         this.vrControls.enabled = true;
    //     }
    //     var fullscreen = !(document.webkitFullscreenElement === null || document.mozFullScreenElement === null);
    //     if (!fullscreen) {
    //         releasePointerLock();
    //     } else {
    //         requestPointerLock();
    //     }
    // }.bind(this));

}
;
// #### node_modules/three.py/js/TextGeomUtils.js
var TextGeomUtils = ( function () {
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
            for (var j = 0; j < text.length; j++) {
                var c = text[j];
                if (c !== ' ') {
                    var mesh = new THREE.Mesh(this.geometries[c], material);
                    mesh.position.x = 0.8*textGeomParams.size * j;
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
        var ncols      = options.ncols || 30;
        var lineHeight = options.lineHeight || 1.8 * 0.12;

        var lineObjects = {};

        this.root = new THREE.Object3D();

        this.log = function (msg) {
            var lines = msg.split(/\n/);
            // create / clone lines:
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var lineObject = lineObjects[line];
                if (lineObject) {
                    var clone = lineObject.clone();
                    clone.position.y = 0;
                    this.root.add(clone);
                } else {
                    lineObject = textGeomCacher.makeObject(line, material);
                    this.root.add(lineObject);
                    lineObjects[line] = lineObject;
                }
            }
            // remove rows exceeding max display
            var toRemove = [];
            for (i = lines.length - 1; i < this.root.children.length - nrows; i++) {
                toRemove.push(this.root.children[i]);
            }
            for (i = 0; i < toRemove.length; i++) {
                this.root.remove(toRemove[i]);
            }
            // scroll lines:
            for (i = 0; i < this.root.children.length; i++) {
                var child = this.root.children[i];
                child.position.y = (this.root.children.length - i) * lineHeight;
            }
        }.bind(this);

        this.clear = function () {
            var toRemove = [];
            for (var i = 0; i < this.root.children.length; i++) {
                toRemove.push(this.root.children[i]);
            }
            for (i = 0; i < toRemove.length; i++) {
                this.root.remove(toRemove[i]);
            }
        }.bind(this);
    }

    return {
        TextGeomCacher: TextGeomCacher,
        TextGeomLogger: TextGeomLogger
    };

} )();
;
// #### src/utils.js
var URL_PARAMS = (function () {
    "use strict";
    var params = {};
    location.search.substr(1).split("&").forEach( function(item) {
        var k = item.split("=")[0],
            v = decodeURIComponent(item.split("=")[1]);
        if (k in params) {
            params[k].push(v);
        } else {
            params[k] = [v];
        }
    } );
    for (var k in params) {
        if (params[k].length === 1)
            params[k] = params[k][0];
        if (params[k] === 'true')
            params[k] = true;
        else if (params[k] === 'false')
            params[k] = false;
    }
    return params;
})();


function combineObjects(a, b) {
    "use strict";
    var c = {},
        k;
    for (k in a) {
        c[k] = a[k];
    }
    for (k in b) {
        if (!c.hasOwnProperty(k)) {
            c[k] = b[k];
        }
    }
    return c;
}


function makeObjectArray(obj, keyKey) {
    "use strict";
    keyKey = keyKey || "key";
    return Object.keys(obj).map(function (k) {
        var item = {};
        item[keyKey] = k;
        for (var p in obj[k]) {
            item[p] = obj[k][p];
        }
        return item;
    });
}


// adapted from detectmobilebrowsers.com
function isMobile() {
	var a = navigator.userAgent || navigator.vendor || window.opera;
	return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)));
}
;
// #### src/LeapInput.js
function addTool(parent, world, options) {
    /*************************************

    parent: THREE.Object3D
    world : CANNON.World

    returns: stuff

    *************************************/
    "use strict";
    options = options || {};

    // parse options:

    var toolLength = options.toolLength || 0.5;
    var toolRadius = options.toolRadius || 0.013;
    // should remove, don't think this matters for cannon.js kinematic body:
    var toolMass   = options.toolMass   || 0.04;

    var tipShape = options.tipShape || 'Sphere';
    var tipRadius,
        tipMinorRadius;
    if (tipShape === 'Cylinder') {
        tipRadius = options.tipRadius || toolRadius;
    } else {
        tipRadius = options.tipRadius || 0.95 * toolRadius;
        if (tipShape === 'Ellipsoid') {
            tipMinorRadius = options.tipMinorRadius || 0.25 * tipRadius;
        }
    }

    var toolOffset = new THREE.Vector3(0, -0.4, -toolLength - 0.2);
    if (options.toolOffset) {
        toolOffset.fromArray(options.toolOffset);
    }
    var toolRotation = options.toolRotation || 0;

    var toolTimeA = options.toolTimeA || 0.25;
    var toolTimeB = options.toolTimeB || toolTimeA + 1.5;

    var minConfidence = options.minConfidence || 0.3;

    var interactionPlaneOpacity = options.interactionPlaneOpacity || (options.useBasicMaterials === false ? 0.18 : 0.25);

    var stickColor = options.stickColor || 0xeebb99;
    var tipColor   = options.tipColor   || 0x004488;
    var handColor  = options.handColor  || 0x113399;

    var host = options.host || '127.0.0.1';
    var port = options.port || 6437;

    // set up / connect to leap controller:

    var leapController = new Leap.Controller({background: true,
                                              host: host, port: port});

    // leap motion event callbacks:
    var onConnect = options.onConnect || function () {
        console.log('Leap Motion WebSocket connected');
    };
    leapController.on('connect', onConnect);

    var onStreamingStarted = options.onStreamingStarted || function () {
        console.log('Leap Motion streaming started');
    };
    leapController.on('streamingStarted', onStreamingStarted);

    var onStreamingStopped = options.onStreamingStopped || function () {
        console.warn('Leap Motion streaming stopped');
    };
    leapController.on('streamingStopped', onStreamingStopped);

    leapController.connect();

    // coordinate transformations are performed via three.js scene graph
    var toolRoot = new THREE.Object3D();
    toolRoot.position.copy(toolOffset);
    var scalar = 0.001;
    toolRoot.scale.set(scalar, scalar, scalar);
    var UP = new THREE.Vector3(0, 1, 0);
    toolRoot.quaternion.setFromAxisAngle(UP, toolRotation);
    parent.add(toolRoot);

    // setup three.js tool graphics:

    // interaction box visual guide:
    var interactionBoxMesh = new THREE.Object3D();
    toolRoot.add(interactionBoxMesh);
    var interactionPlaneMaterial = new THREE.MeshBasicMaterial({color: 0x00dd44, transparent: true, opacity: interactionPlaneOpacity});
    var interactionPlaneGeom = new THREE.PlaneBufferGeometry(1/scalar, 1/scalar);
    var interactionPlaneMesh = new THREE.Mesh(interactionPlaneGeom, interactionPlaneMaterial);
    interactionBoxMesh.add(interactionPlaneMesh);
    interactionPlaneMesh = interactionPlaneMesh.clone();
    interactionPlaneMesh.position.z = 1/2/scalar;
    interactionBoxMesh.add(interactionPlaneMesh);
    interactionPlaneMesh = interactionPlaneMesh.clone();
    interactionPlaneMesh.position.z = -1/2/scalar;
    interactionBoxMesh.add(interactionPlaneMesh);
    interactionBoxMesh.visible = false;

    // leap motion controller:
    var boxGeom = new THREE.BoxGeometry(0.0254*3/scalar, 0.0254*0.5/scalar, 0.0254*1.2/scalar);
    var leapGeom = new THREE.BufferGeometry();
    leapGeom.fromGeometry(boxGeom);
    boxGeom.dispose();
    var leapMaterial = new THREE.MeshLambertMaterial({color: 0x777777});
    var leapMesh = new THREE.Mesh(leapGeom, leapMaterial);
    leapMesh.position.y = 0.0254*0.25/scalar;
    toolRoot.add(leapMesh);

    // the stick:
    var stickGeom = new THREE.CylinderGeometry(toolRadius/scalar, toolRadius/scalar, toolLength/scalar, 10, 1, false);
    stickGeom.translate(0, -toolLength/scalar / 2, 0);
    var bufferGeom = new THREE.BufferGeometry();
    bufferGeom.fromGeometry(stickGeom);
    stickGeom.dispose();
    stickGeom = bufferGeom;
    var stickMaterial = new THREE.MeshLambertMaterial({color: stickColor, side: THREE.DoubleSide, transparent: true});
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    stickMesh.visible = false;
    toolRoot.add(stickMesh);

    var tipBody = new CANNON.Body({mass: toolMass, type: CANNON.Body.KINEMATIC});
    // TODO: rename, avoid confusion b/t cannon and three materials
    tipBody.material = POOLVR.tipMaterial;
    var tipMesh = null;
    if (tipShape !== 'Cylinder') {
        var tipGeom = new THREE.SphereBufferGeometry(tipRadius/scalar, 10);
        if (tipShape === 'Ellipsoid') {
            tipGeom.scale(1, tipMinorRadius / tipRadius, 1);
            // TODO: fix. verify ellipsoid shape:
            tipBody.addShape(new CANNON.Ellipsoid(tipRadius, tipMinorRadius, tipRadius));
        } else {
            tipBody.addShape(new CANNON.Sphere(tipRadius));
        }
        var tipMaterial = new THREE.MeshLambertMaterial({color: tipColor, transparent: true});
        tipMesh = new THREE.Mesh(tipGeom, tipMaterial);
        tipMesh.castShadow = true;
        stickMesh.add(tipMesh);
    } else {
        // whole stick
        var shapeQuaternion = new CANNON.Quaternion();
        shapeQuaternion.setFromEuler(-Math.PI / 2, 0, 0, 'XYZ');
        var shapePosition = new CANNON.Vec3(0, -tipRadius, 0);
        tipBody.addShape(new CANNON.Cylinder(tipRadius, tipRadius, 2*tipRadius, 8), shapePosition, shapeQuaternion);
    }
    world.addBody(tipBody);

    // create shadow mesh from projection:
    var stickShadow = new THREE.Object3D();
    stickShadow.scale.set(1, 0.001, 1);
    toolRoot.add(stickShadow);
    stickShadow.visible = false;
    //stickMesh.add(stickShadow);
    var stickShadowMaterial = new THREE.MeshBasicMaterial({color: 0x002200});
    var stickShadowGeom = stickMesh.geometry.clone();
    var stickShadowMesh = new THREE.Mesh(stickShadowGeom, stickShadowMaterial);
    stickShadow.add(stickShadowMesh);
    if (tipShape === 'Ellipsoid') {
        // TODO: new projection approach for ellipsoid tip
    } else if (tipShape === 'Sphere') {
        tipMesh.geometry.computeBoundingSphere();
        var tipShadowGeom = new THREE.CircleBufferGeometry(tipMesh.geometry.boundingSphere.radius).rotateX(-Math.PI / 2);
        var tipShadowMesh = new THREE.Mesh(tipShadowGeom, stickShadowMaterial);
        stickShadow.add(tipShadowMesh);
    }

    // setup three.js hands:

    // hands don't necessarily correspond the left / right labels, but doesn't matter to me because they look indistinguishable
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    var handRoots = [leftRoot, rightRoot];
    toolRoot.add(leftRoot);
    toolRoot.add(rightRoot);

    var handMaterial = new THREE.MeshBasicMaterial({color: handColor, transparent: true, opacity: 0});

    // arms:
    var armRadius = 0.0216/scalar,
        armLength = 0.22/scalar;
    var armGeom = new THREE.CylinderGeometry(armRadius, armRadius, armLength);
    bufferGeom = new THREE.BufferGeometry();
    bufferGeom.fromGeometry(armGeom);
    armGeom.dispose();
    armGeom = bufferGeom;
    var armMesh = new THREE.Mesh(armGeom, handMaterial);
    var arms = [armMesh, armMesh.clone()];
    leftRoot.add(arms[0]);
    rightRoot.add(arms[1]);
    // palms:
    var radius = 0.025/scalar;
    var palmGeom = new THREE.SphereBufferGeometry(radius).scale(1, 0.5, 1);
    var palmMesh = new THREE.Mesh(palmGeom, handMaterial);
    palmMesh.castShadow = true;
    var palms = [palmMesh, palmMesh.clone()];
    leftRoot.add(palms[0]);
    rightRoot.add(palms[1]);
    // fingertips:
    radius = 0.005/scalar;
    var fingerTipGeom = new THREE.SphereBufferGeometry(radius);
    var fingerTipMesh = new THREE.Mesh(fingerTipGeom, handMaterial);
    var fingerTips = [[fingerTipMesh, fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone()],
                      [fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone()]];
    leftRoot.add(fingerTips[0][0], fingerTips[0][1], fingerTips[0][2], fingerTips[0][3], fingerTips[0][4]);
    rightRoot.add(fingerTips[1][0], fingerTips[1][1], fingerTips[1][2], fingerTips[1][3], fingerTips[1][4]);
    // finger joints:
    var jointMesh = fingerTipMesh.clone();
    jointMesh.scale.set(7/5, 7/5, 7/5);
    var joints = [[jointMesh, jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone()],
                  [jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone()]];
    leftRoot.add(joints[0][0], joints[0][1], joints[0][2], joints[0][3], joints[0][4]);
    rightRoot.add(joints[1][0], joints[1][1], joints[1][2], joints[1][3], joints[1][4]);
    // TODO: use the anatomical names
    // TODO: reduce fractions
    var joint2Mesh = fingerTipMesh.clone();
    joint2Mesh.scale.set(55/50, 55/50, 55/50);
    var joint2s = [[joint2Mesh, joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone()],
                  [joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone()]];
    leftRoot.add(joint2s[0][0], joint2s[0][1], joint2s[0][2], joint2s[0][3], joint2s[0][4]);
    rightRoot.add(joint2s[1][0], joint2s[1][1], joint2s[1][2], joint2s[1][3], joint2s[1][4]);


    var tipCollisionCounter = 0;
    tipBody.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {
        // TODO: move this function definition elsewhere, pass as option
        tipCollisionCounter++;
        if (tipCollisionCounter === 1) {
            setTimeout(function () {
                POOLVR.synthSpeaker.speak("You moved a ball.  Good job.");
            }, 250);
        }
        else if (tipCollisionCounter === 16) {
            setTimeout(function () {
                POOLVR.synthSpeaker.speak("You are doing a great job.");
            }, 3000);
        }
    });


    var H_table = POOLVR.config.H_table;

    function updateToolPostStep() {
        stickMesh.position.copy(tipBody.interpolatedPosition);
        toolRoot.worldToLocal(stickMesh.position);
        stickShadow.position.set(
            stickMesh.position.x,
            (H_table + 0.001 - toolRoot.position.y - parent.position.y) / toolRoot.scale.y,
            stickMesh.position.z
        );
    }

    var worldQuaternion = new THREE.Quaternion();

    function moveToolRoot(keyboard, gamepad, dt) {
        var toolDrive = 0;
        var toolFloat = 0;
        var toolStrafe = 0;
        var rotateToolCW = 0;
        if (keyboard) {
            toolDrive += keyboard.getValue("moveToolForwards") - keyboard.getValue("moveToolBackwards");
            toolFloat += keyboard.getValue("moveToolUp") - keyboard.getValue("moveToolDown");
            toolStrafe += keyboard.getValue("moveToolRight") - keyboard.getValue("moveToolLeft");
            rotateToolCW += keyboard.getValue("rotateToolCW") - keyboard.getValue("rotateToolCCW");
        }
        if (gamepad) {
            if (parent.toolMode) {
                toolFloat += gamepad.getValue("toolFloat");
                toolStrafe += gamepad.getValue("toolStrafe");
            } else {
                toolDrive -= gamepad.getValue("toolDrive");
                rotateToolCW -= gamepad.getValue("toolStrafe");
            }
        }
        if ((toolDrive !== 0) || (toolStrafe !== 0) || (toolFloat !== 0) || (rotateToolCW !== 0)) {
            toolRoot.position.x +=  0.16 * dt * toolStrafe;
            toolRoot.position.z += -0.16 * dt * toolDrive;
            toolRoot.position.y +=  0.16 * dt * toolFloat;
            toolRotation += 0.15 * dt * rotateToolCW;
            toolRoot.quaternion.setFromAxisAngle(UP, toolRotation);
            if (interactionBoxMesh.visible === false) {
                interactionBoxMesh.visible = true;
                stickMesh.material.opacity = 1;
                if (tipMesh) tipMesh.material.opacity = 1;
                interactionPlaneMaterial.opacity = interactionPlaneOpacity;
            }
        }
    }

    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    var velocity = new THREE.Vector3();

    var cannonUP = new CANNON.Vec3(0, 1, 0);
    var cannonVec = new CANNON.Vec3();

    var lastFrameID;

    function updateTool() {

        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {

            lastFrameID = frame.id;

            var interactionBox = frame.interactionBox;
            if (interactionBox.valid) {
                interactionBoxMesh.position.fromArray(interactionBox.center);
                interactionBoxMesh.scale.set(interactionBox.width*scalar, interactionBox.height*scalar, interactionBox.depth*scalar);
            }

            toolRoot.getWorldQuaternion(worldQuaternion);

            if (frame.tools.length === 1) {

                var tool = frame.tools[0];

                if (stickMesh.visible === false || stickMesh.material.opacity < 1) {
                    stickMesh.visible = true;
                    stickShadow.visible = true;
                    interactionBoxMesh.visible = true;
                    stickMesh.material.opacity = 1;
                    if (tipMesh) tipMesh.material.opacity = 1;
                    interactionPlaneMaterial.opacity = interactionPlaneOpacity;
                }

                //position.fromArray(tool.tipPosition);
                position.fromArray(tool.stabilizedTipPosition);

                stickMesh.position.copy(position);
                stickShadow.position.set(
                    stickMesh.position.x,
                    (H_table + 0.001 - toolRoot.position.y - parent.position.y) / toolRoot.scale.y,
                    stickMesh.position.z
                );

                toolRoot.localToWorld(position);
                tipBody.position.copy(position);

                direction.fromArray(tool.direction);

                stickMesh.quaternion.setFromUnitVectors(UP, direction);
                stickShadowMesh.quaternion.copy(stickMesh.quaternion);

                direction.applyQuaternion(worldQuaternion);
                cannonVec.copy(direction);
                tipBody.quaternion.setFromVectors(cannonUP, cannonVec);

                velocity.fromArray(tool.tipVelocity);
                velocity.applyQuaternion(worldQuaternion);
                velocity.multiplyScalar(0.001);
                tipBody.velocity.copy(velocity);

                if (tool.timeVisible > toolTimeA) {

                    if (tipBody.sleepState === CANNON.Body.SLEEPING) {
                        // cue becomes collidable
                        tipBody.wakeUp();
                        // TODO: indicator (particle effect)
                        if (tipMesh) tipMesh.material.color.setHex(0xff0000);
                    }

                    if (tool.timeVisible > toolTimeB && interactionPlaneMaterial.opacity > 0.1) {
                        // dim the interaction box:
                        interactionPlaneMaterial.opacity *= 0.93;
                    }

                }

            } else if (tipBody.sleepState === CANNON.Body.AWAKE) {
                // tool detection was just lost
                tipBody.sleep();
                if (tipMesh) tipMesh.material.color.setHex(tipColor);

            } else {
                // tool is already lost
                if (stickMesh.visible && stickMesh.material.opacity > 0.1) {
                    // fade out tool
                    stickMesh.material.opacity *= 0.8;
                    interactionPlaneMaterial.opacity *= 0.8;
                    if (tipMesh) tipMesh.material.opacity = stickMesh.material.opacity;
                } else {
                    stickMesh.visible = false;
                    interactionBoxMesh.visible = false;
                    stickShadow.visible = false;
                }
            }

            var hand, finger;
            leftRoot.visible = rightRoot.visible = false;
            for (var i = 0; i < frame.hands.length; i++) {
                hand = frame.hands[i];
                if (hand.confidence > minConfidence) {
                    handRoots[i].visible = true;
                    handMaterial.opacity = 0.5*handMaterial.opacity + 0.5*(hand.confidence - minConfidence) / (1 - minConfidence);
                    direction.fromArray(hand.arm.basis[2]);
                    arms[i].quaternion.setFromUnitVectors(UP, direction);
                    var center = hand.arm.center();
                    arms[i].position.fromArray(center);

                    direction.fromArray(hand.palmNormal);
                    palms[i].quaternion.setFromUnitVectors(UP, direction);
                    palms[i].position.fromArray(hand.palmPosition);

                    for (var j = 0; j < hand.fingers.length; j++) {
                        finger = hand.fingers[j];
                        fingerTips[i][j].position.fromArray(finger.tipPosition);
                        joints[i][j].position.fromArray(finger.bones[1].nextJoint);
                        joint2s[i][j].position.fromArray(finger.bones[2].nextJoint);
                    }
                }
            }

        }

    }

    return {
        toolRoot:           toolRoot,
        leapController:     leapController,
        updateTool:         updateTool,
        updateToolPostStep: updateToolPostStep,
        moveToolRoot:       moveToolRoot
    };
}
;
// #### src/WebVRSound.js
var WebVRSound = (function (numGainNodes) {
    "use strict";
    numGainNodes = numGainNodes || 4;

    var audioContext = new AudioContext();

    var gainNodes = [];
    for (var i = 0; i < numGainNodes; i++) {
        var gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 1;
        gainNodes.push(gainNode);
    }

    var iGainNode = 0;
    function getNextGainNode() {
        var node = gainNodes[iGainNode];
        iGainNode = (iGainNode + 1) % numGainNodes;
        return node;
    }

    var playBuffer = function (buffer, vol) {
        var source = audioContext.createBufferSource();
        var gainNode = getNextGainNode();
        gainNode.gain.value = vol;
        source.connect(gainNode);
        source.buffer = buffer;
        source.start(0);
    };

    return {
        audioContext: audioContext,
        getNextGainNode: getNextGainNode,
        playBuffer: playBuffer
    };

})();
;
// #### src/SynthSpeaker.js
var SynthSpeaker = ( function() {
    "use strict";
    function SynthSpeaker(options) {
        options = options || {};
        this.volume = options.volume || 1;
        this.rate   = options.rate || 1;
        this.pitch  = options.pitch || 1;

        this.queue = [];
        this.onBegins = [];
        this.onEnds = [];
        this.speaking = false;

        var onend = function () {
            var onEnd = this.onEnds.shift();
            if (onEnd) {
                onEnd();
            }
            this.utterance = new SpeechSynthesisUtterance();
            this.utterance.volume = this.volume;
            this.utterance.rate = this.rate;
            this.utterance.pitch = this.pitch;
            this.utterance.onend = onend;
            if (this.queue.length > 0) {
                this.utterance.text = this.queue.shift();
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
        this.utterance.onend = onend;
        this.utterance.volume = this.volume;
        this.utterance.rate = this.rate;
        this.utterance.pitch = this.pitch;

    }

    SynthSpeaker.prototype.speak = function(text, onBegin, onEnd) {
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
        console.warn("speechSynthesis not supported");
        return function () {
            this.volume = 0;
            this.rate = 1;
            this.pitch = 1;
            this.speak = function (text, onBegin, onEnd) {
                if (onBegin) onBegin();
                if (onEnd) onEnd();
            };
        };
    }
} )();
;
// #### src/config.js
POOLVR.commands = {
  toggleVRControls: function () { POOLVR.app.toggleVRControls(); },
  toggleWireframe:  function () { POOLVR.app.toggleWireframe(); },
  resetVRSensor:    function () { POOLVR.app.resetVRSensor(); },
  resetTable:       function () { POOLVR.resetTable(); },
  autoPosition:     function () { POOLVR.autoPosition(); },
  //toggleMenu:       function () { POOLVR.toggleMenu(); },
  selectNextBall:   function () { POOLVR.selectNextBall(); },
  selectPrevBall:   function () { POOLVR.selectNextBall(-1); },
  saveConfig:       function () { POOLVR.saveConfig(); }
};

POOLVR.keyboardCommands = {
    turnLeft:     {buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
    turnRight:    {buttons: [ Primrose.Input.Keyboard.RIGHTARROW]},
    driveForward: {buttons: [-Primrose.Input.Keyboard.W]},
    driveBack:    {buttons: [ Primrose.Input.Keyboard.S]},
    strafeLeft:   {buttons: [-Primrose.Input.Keyboard.A]},
    strafeRight:  {buttons: [ Primrose.Input.Keyboard.D]},
    floatUp:      {buttons: [ Primrose.Input.Keyboard.E]},
    floatDown:    {buttons: [-Primrose.Input.Keyboard.C]},

    moveToolUp:        {buttons: [Primrose.Input.Keyboard.O]},
    moveToolDown:      {buttons: [Primrose.Input.Keyboard.PERIOD]},
    moveToolForwards:  {buttons: [Primrose.Input.Keyboard.I]},
    moveToolBackwards: {buttons: [Primrose.Input.Keyboard.K]},
    moveToolLeft:      {buttons: [Primrose.Input.Keyboard.J]},
    moveToolRight:     {buttons: [Primrose.Input.Keyboard.L]},
    rotateToolCW:      {buttons: [Primrose.Input.Keyboard.U]},
    rotateToolCCW:     {buttons: [Primrose.Input.Keyboard.Y]},

    toggleVRControls: {buttons: [Primrose.Input.Keyboard.V],
                       commandDown: POOLVR.commands.toggleVRControls, dt: 0.25},
    toggleWireframe: {buttons: [Primrose.Input.Keyboard.NUMBER0],
                      commandDown: POOLVR.commands.toggleWireframe, dt: 0.25},
    resetVRSensor: {buttons: [Primrose.Input.Keyboard.Z],
                    commandDown: POOLVR.commands.resetVRSensor, dt: 0.25},
    resetTable: {buttons: [Primrose.Input.Keyboard.R],
                 commandDown: POOLVR.commands.resetTable, dt: 0.5},
    autoPosition: {buttons: [Primrose.Input.Keyboard.P],
                   commandDown: POOLVR.commands.autoPosition, dt: 0.5},
    // toggleMenu: {buttons: [Primrose.Input.Keyboard.SPACEBAR],
    //              commandDown: POOLVR.commands.toggleMenu, dt: 0.25},
    selectNextBall: {buttons: [Primrose.Input.Keyboard.ADD],
                     commandDown: POOLVR.commands.selectNextBall, dt: 0.5},
    selectPrevBall: {buttons: [Primrose.Input.Keyboard.SUBTRACT],
                     commandDown: POOLVR.commands.selectPrevBall, dt: 0.5},
    saveConfig: {buttons: [Primrose.Input.Keyboard.NUMBER1],
                 commandDown: POOLVR.commands.saveConfig, dt: 0.5}
};

POOLVR.keyboardCommands = makeObjectArray(POOLVR.keyboardCommands, 'name');
POOLVR.keyboard = new Primrose.Input.Keyboard("keyboard", window, POOLVR.keyboardCommands);

var DEADZONE = 0.2;
POOLVR.gamepadCommands = {
    strafe:   {axes: [ Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    drive:    {axes: [ Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    float:    {axes: [-Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    dheading: {axes: [-Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    pitch:    {axes: [ Primrose.Input.Gamepad.LSY], deadzone: DEADZONE,
               integrate: true, max: 0.5 * Math.PI, min: -0.5 * Math.PI},
    toggleFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
                      commandDown: function () { POOLVR.avatar.floatMode = true; },
                      commandUp:   function () { POOLVR.avatar.floatMode = false; }},

    toolStrafe: {axes: [ Primrose.Input.Gamepad.RSX], deadzone: DEADZONE},
    toolDrive:  {axes: [ Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toolFloat:  {axes: [-Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toggleToolFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightStick],
                          commandDown: function () { POOLVR.avatar.toolMode = true; },
                          commandUp:   function () { POOLVR.avatar.toolMode = false; }},

    resetVRSensor: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                    commandDown: POOLVR.commands.resetVRSensor, dt: 0.25},
    selectNextBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightBumper],
                     commandDown: POOLVR.commands.selectNextBall, dt: 0.25},
    selectPrevBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftBumper],
                     commandDown: POOLVR.commands.selectPrevBall, dt: 0.25},
    autoPosition: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.Y],
                   commandDown: POOLVR.commands.autoPosition, dt: 0.25},
    // toggleMenu: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.start],
    //              commandDown: function(){POOLVR.toggleMenu();}, dt: 0.25},
    saveConfig: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.right],
                 commandDown: POOLVR.commands.saveConfig, dt: 0.5}
};


POOLVR.gamepadCommands = makeObjectArray(POOLVR.gamepadCommands, 'name');
POOLVR.gamepad = new Primrose.Input.Gamepad("gamepad", POOLVR.gamepadCommands);
POOLVR.gamepad.addEventListener("gamepadconnected", function(id) {
    if (!this.isGamepadSet()) {
        this.setGamepad(id);
        console.log("gamepad " + id + " connected");
    }
}.bind(POOLVR.gamepad), false);


POOLVR.config.useTextGeomLogger = URL_PARAMS.useTextGeomLogger !== undefined ? URL_PARAMS.useTextGeomLogger : POOLVR.config.useTextGeomLogger;

POOLVR.config.synthSpeakerVolume = URL_PARAMS.synthSpeakerVolume || POOLVR.config.synthSpeakerVolume;

POOLVR.config.initialPosition = POOLVR.config.initialPosition;

// Leap Motion config:
POOLVR.config.toolOptions = POOLVR.config.toolOptions || {};
POOLVR.config.toolOptions.toolLength   = URL_PARAMS.toolLength   || POOLVR.config.toolOptions.toolLength;
POOLVR.config.toolOptions.toolRadius   = URL_PARAMS.toolRadius   || POOLVR.config.toolOptions.toolRadius;
POOLVR.config.toolOptions.toolMass     = URL_PARAMS.toolMass     || POOLVR.config.toolOptions.toolMass;
POOLVR.config.toolOptions.toolOffset   = URL_PARAMS.toolOffset   || POOLVR.config.toolOptions.toolOffset;
POOLVR.config.toolOptions.toolRotation = URL_PARAMS.toolRotation || POOLVR.config.toolOptions.toolRotation;
POOLVR.config.toolOptions.tipShape     = URL_PARAMS.tipShape     || POOLVR.config.toolOptions.tipShape;
POOLVR.config.toolOptions.host         = URL_PARAMS.host;
POOLVR.config.toolOptions.port         = URL_PARAMS.port;

// application graphics config:
POOLVR.config.useBasicMaterials = URL_PARAMS.useBasicMaterials !== undefined ? URL_PARAMS.useBasicMaterials : POOLVR.config.useBasicMaterials;

if (POOLVR.config.useBasicMaterials) {
    POOLVR.config.usePointLight = false;
    POOLVR.config.useShadowMap  = false;
} else {
    POOLVR.config.usePointLight = URL_PARAMS.usePointLight !== undefined ? URL_PARAMS.usePointLight : POOLVR.config.usePointLight;
    POOLVR.config.useShadowMap  = URL_PARAMS.useShadowMap  !== undefined ? URL_PARAMS.useShadowMap  : POOLVR.config.useShadowMap;
}

// THREE.WebGLRenderer config:
POOLVR.config.rendererOptions = {
    antialias: URL_PARAMS.antialias !== undefined ? URL_PARAMS.antialias : (isMobile() === false)
};


POOLVR.profile = URL_PARAMS.profile || POOLVR.profile || 'default';


POOLVR.saveConfig = function () {
    "use strict";
    POOLVR.config.toolOptions.toolOffset = [POOLVR.toolRoot.position.x, POOLVR.toolRoot.position.y, POOLVR.toolRoot.position.z];
    POOLVR.config.toolOptions.toolRotation = POOLVR.toolRoot.rotation.y;
    localStorage.setItem(POOLVR.profile, JSON.stringify(POOLVR.config));
    console.log("saved configuration for profile '" + POOLVR.profile + "':");
    console.log(JSON.stringify(POOLVR.config, undefined, 2));
};


POOLVR.loadConfig = function () {
    "use strict";
    var localStorageConfig = localStorage.getItem(POOLVR.profile);
    if (localStorageConfig) {
        localStorageConfig = JSON.parse(localStorageConfig);
        for (var k in localStorageConfig) {
            if (POOLVR.config.hasOwnProperty(k)) {
                POOLVR.config[k] = localStorageConfig[k];
            }
        }
        console.log("loaded configuration for profile '" + POOLVR.profile + "':");
        console.log(JSON.stringify(POOLVR.config, undefined, 2));
    }
};
;
// #### src/setup.js
// TODO: load from JSON config
POOLVR.ballMaterial            = new CANNON.Material();
POOLVR.ballBallContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.ballMaterial, {
    restitution: 0.92,
    friction: 0.14
});
POOLVR.playableSurfaceMaterial            = new CANNON.Material();
POOLVR.ballPlayableSurfaceContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.playableSurfaceMaterial, {
    restitution: 0.3,
    friction: 0.21
});
POOLVR.cushionMaterial            = new CANNON.Material();
POOLVR.ballCushionContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.cushionMaterial, {
    restitution: 0.8,
    friction: 0.12
});
POOLVR.floorMaterial            = new CANNON.Material();
POOLVR.floorBallContactMaterial = new CANNON.ContactMaterial(POOLVR.floorMaterial, POOLVR.ballMaterial, {
    restitution: 0.86,
    friction: 0.4
});
POOLVR.railMaterial            = new CANNON.Material();
POOLVR.railBallContactMaterial = new CANNON.ContactMaterial(POOLVR.railMaterial, POOLVR.ballMaterial, {
    restitution: 0.7,
    friction: 0.07
});
POOLVR.tipMaterial            = new CANNON.Material();
POOLVR.tipBallContactMaterial = new CANNON.ContactMaterial(POOLVR.tipMaterial, POOLVR.ballMaterial, {
    restitution: 0.01,
    friction: 0.15,
    contactEquationRelaxation: 3,
    frictionEquationRelaxation: 3
});


POOLVR.ballMeshes = [];
POOLVR.ballBodies = [];
POOLVR.initialPositions = [];
POOLVR.onTable = [true,
                  true, true, true, true, true, true, true,
                  true,
                  true, true, true, true, true, true, true];
POOLVR.nextBall = 1;


POOLVR.playCollisionSound = (function () {
    "use strict";
    var ballBallBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', 'sounds/ballBall.ogg');
    request.onload = function() {
        WebVRSound.audioContext.decodeAudioData(this.response, function(buffer) {
            ballBallBuffer = buffer;
        });
    };
    request.send();
    var playCollisionSound = function (v) {
        WebVRSound.playBuffer(ballBallBuffer, Math.min(1, v / 10));
    };
    return playCollisionSound;
})();


POOLVR.playPocketedSound = (function () {
    "use strict";
    var ballPocketedBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', 'sounds/ballPocketed.ogg');
    request.onload = function() {
        WebVRSound.audioContext.decodeAudioData(this.response, function(buffer) {
            ballPocketedBuffer = buffer;
        });
    };
    request.send();
    var playPocketedSound = function () {
        WebVRSound.playBuffer(ballPocketedBuffer, 0.5);
    };
    return playPocketedSound;
})();


POOLVR.setup = function () {
    "use strict";

    var world = new CANNON.World();
    world.gravity.set( 0, -POOLVR.config.gravity, 0 );
    //world.broadphase = new CANNON.SAPBroadphase( world );
    world.defaultContactMaterial.contactEquationStiffness   = 1e6;
    world.defaultContactMaterial.frictionEquationStiffness  = 1e6;
    world.defaultContactMaterial.contactEquationRelaxation  = 3;
    world.defaultContactMaterial.frictionEquationRelaxation = 3;
    world.solver.iterations = 9;

    POOLVR.world = world;

    var scene = POOLVR.app.scene;

    THREE.py.CANNONize(scene, world);

    world.addMaterial(POOLVR.ballMaterial);
    world.addMaterial(POOLVR.playableSurfaceMaterial);
    world.addMaterial(POOLVR.cushionMaterial);
    world.addMaterial(POOLVR.floorMaterial);
    world.addMaterial(POOLVR.tipMaterial);
    world.addMaterial(POOLVR.railMaterial);
    world.addContactMaterial(POOLVR.ballBallContactMaterial);
    world.addContactMaterial(POOLVR.ballPlayableSurfaceContactMaterial);
    world.addContactMaterial(POOLVR.ballCushionContactMaterial);
    world.addContactMaterial(POOLVR.floorBallContactMaterial);
    world.addContactMaterial(POOLVR.tipBallContactMaterial);
    world.addContactMaterial(POOLVR.railBallContactMaterial);

    var leapTool = addTool(POOLVR.avatar, world, POOLVR.config.toolOptions);

    POOLVR.toolRoot = leapTool.toolRoot;
    POOLVR.updateTool = leapTool.updateTool;
    POOLVR.updateToolPostStep = leapTool.updateToolPostStep;
    POOLVR.moveToolRoot = leapTool.moveToolRoot;

    var ballStripeMeshes = [],
        ballShadowMeshes = [];
    var floorMesh;

    scene.traverse(function (node) {

        if (node instanceof THREE.Mesh) {

            if (POOLVR.config.useBasicMaterials && (node.material instanceof THREE.MeshLambertMaterial || node.material instanceof THREE.MeshPhongMaterial)) {
                var material = node.material;
                node.material = new THREE.MeshBasicMaterial({color: material.color.getHex(), transparent: material.transparent, side: material.side});
                material.dispose();
            }

            var ballNum;
            if (node.name.startsWith('ball ')) {
                ballNum = Number(node.name.split(' ')[1]);
                POOLVR.ballMeshes[ballNum] = node;
                POOLVR.ballBodies[ballNum] = node.body;
                POOLVR.initialPositions[ballNum] = new THREE.Vector3().copy(node.position);
                node.body.bounces = 0;
                node.body.ballNum = ballNum;
                node.body.material = POOLVR.ballMaterial;
            }
            else if (node.name.startsWith('ballStripeMesh')) {
                ballNum = Number(node.name.split(' ')[1]);
                ballStripeMeshes[ballNum] = node;
            }
            else if (node.name.startsWith('ballShadowMesh')) {
                ballNum = Number(node.name.split(' ')[1]);
                ballShadowMeshes[ballNum] = node;
            }
            else if (node.name === 'playableSurfaceMesh') {
                node.body.material = POOLVR.playableSurfaceMaterial;
            }
            else if (node.name.endsWith('CushionMesh')) {
                node.body.material = POOLVR.cushionMaterial;
            }
            else if (node.name === 'floorMesh') {
                node.body.material = POOLVR.floorMaterial;
                floorMesh = node;
            }
            else if (node.name.endsWith('RailMesh')) {
                node.body.material = POOLVR.railMaterial;
            }

        }

    });

    var H_table = POOLVR.config.H_table;

    POOLVR.updateBallsPostStep = function () {

        for (var i = 0; i < POOLVR.ballMeshes.length; i++) {

            var mesh = POOLVR.ballMeshes[i];
            var body = POOLVR.ballBodies[i];
            mesh.position.copy(body.interpolatedPosition);

            // TODO: better method for projected shadows, less hacks
            //mesh.quaternion.copy(body.interpolatedQuaternion);
            var stripeMesh = ballStripeMeshes[i];
            if (stripeMesh !== undefined) {
                stripeMesh.quaternion.copy(body.interpolatedQuaternion);
            }

            var shadowMesh = ballShadowMeshes[i];
            if (shadowMesh) {
                shadowMesh.position.y = -(mesh.position.y - H_table) + 0.0004;
            }

        }

    };

    // ball-floor collision
    floorMesh.body.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {

        var body = evt.body;

        if (body.ballNum === 0) {

            POOLVR.textGeomLogger.log("SCRATCH.");
            POOLVR.synthSpeaker.speak("Scratch.");
            body.position.copy(POOLVR.initialPositions[0]);
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);

        } else if (body.ballNum !== undefined) {

            body.bounces++;
            if (body.bounces === 1) {
                // POOLVR.textGeomLogger.log(body.mesh.name + " HIT THE FLOOR!");
                POOLVR.playPocketedSound();
                POOLVR.onTable[body.ballNum] = false;
                POOLVR.nextBall = POOLVR.onTable.slice(1).indexOf(true) + 1;
                if (POOLVR.nextBall === 0) {
                    POOLVR.synthSpeaker.speak("You cleared the table.  Well done.");
                    POOLVR.textGeomLogger.log("YOU CLEARED THE TABLE.  WELL DONE.");
                    POOLVR.resetTable();
                }
            } else if (body.bounces === 7) {
                body.sleep();
                body.mesh.visible = false;
                // autoPosition(avatar, 5);
            }

        }

    });

    var relVelocity = new CANNON.Vec3();
    world.addEventListener('beginContact', function (evt) {
        var bodyA = evt.bodyA;
        var bodyB = evt.bodyB;
        if (bodyA.material === bodyB.material) {
            // ball-ball collision
            bodyA.velocity.vsub(bodyB.velocity, relVelocity);
            POOLVR.playCollisionSound(relVelocity.lengthSquared());
        }
    });

};
;
// #### src/app.js
POOLVR.selectNextBall = function (inc) {
    "use strict";
    inc = inc || 1;
    var next = Math.max(1, Math.min(15, POOLVR.nextBall + inc));
    while (!POOLVR.onTable[next]) {
        next = Math.max(1, Math.min(15, next + inc));
        if (next === POOLVR.nextBall) {
            break;
        }
    }
    if (POOLVR.nextBall !== next) {
        POOLVR.nextBall = next;
        POOLVR.textGeomLogger.log("BALL " + POOLVR.nextBall + " SELECTED");
    }
};


POOLVR.resetTable = function () {
    "use strict";
    POOLVR.ballBodies.forEach(function (body, ballNum) {
        body.wakeUp();
        body.position.copy(POOLVR.initialPositions[ballNum]);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
        body.bounces = 0;
        POOLVR.onTable[ballNum] = true;
        body.mesh.visible = true;
    });
    if (POOLVR.synthSpeaker.speaking === false) {
        POOLVR.synthSpeaker.speak("Table reset.");
    }
    POOLVR.nextBall = 1;
    POOLVR.textGeomLogger.log("TABLE RESET.");
};


POOLVR.avatar = new THREE.Object3D();


POOLVR.autoPosition = ( function () {
    "use strict";
    var nextVector = new THREE.Vector3();
    var UP = new THREE.Vector3(0, 1, 0);
    var avatar = POOLVR.avatar;
    return function () {
        // POOLVR.textGeomLogger.log("YOU ARE BEING AUTO-POSITIONED.  NEXT BALL: " + POOLVR.nextBall);
        if (POOLVR.synthSpeaker.speaking === false) {
            POOLVR.synthSpeaker.speak("You are being auto-positioned.");
        }

        avatar.heading = Math.atan2(
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.x - POOLVR.ballMeshes[0].position.x),
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.z - POOLVR.ballMeshes[0].position.z)
        );
        avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
        avatar.updateMatrixWorld();

        nextVector.copy(POOLVR.toolRoot.position);
        avatar.localToWorld(nextVector);
        nextVector.sub(POOLVR.ballMeshes[0].position);
        nextVector.y = 0;
        avatar.position.sub(nextVector);
    };
} )();


POOLVR.moveAvatar = ( function () {
    "use strict";
    var UP = new THREE.Vector3(0, 1, 0),
        walkSpeed = 0.333,
        floatSpeed = 0.1;
    var avatar = POOLVR.avatar;

    return function (keyboard, gamepad, dt) {
        var floatUp = keyboard.getValue("floatUp") + keyboard.getValue("floatDown");
        var drive = keyboard.getValue("driveBack") + keyboard.getValue("driveForward");
        var strafe = keyboard.getValue("strafeRight") + keyboard.getValue("strafeLeft");
        var heading = -0.8 * dt * (keyboard.getValue("turnLeft") + keyboard.getValue("turnRight"));
        if (avatar.floatMode) {
            floatUp += gamepad.getValue("float");
            strafe += gamepad.getValue("strafe");
        } else {
            drive += gamepad.getValue("drive");
            heading += 0.8 * dt * gamepad.getValue("dheading");
        }
        floatUp *= floatSpeed;
        if (strafe || drive) {
            var len = walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive + strafe * strafe));
            strafe *= len;
            drive *= len;
        } else {
            strafe = 0;
            drive = 0;
        }
        if (floatUp !== 0 || strafe !== 0 || heading !== 0 || drive !== 0) {
            avatar.heading += heading;
            var cosHeading = Math.cos(avatar.heading),
                sinHeading = Math.sin(avatar.heading);
            avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
            avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
            avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
            avatar.position.y += dt * floatUp;
        }
    };
} )();


POOLVR.startTutorial = function () {
    "use strict";
    POOLVR.synthSpeaker.speak("Hello.  Welcome. To. Pool-ver.", function () {
        POOLVR.textGeomLogger.log("HELLO.  WELCOME TO POOLVR.");
    });

    POOLVR.synthSpeaker.speak("Please wave a stick-like object in front of your Leap Motion controller.", function () {
        POOLVR.textGeomLogger.log("PLEASE WAVE A STICK-LIKE OBJECT IN FRONT OF YOUR");
        POOLVR.textGeomLogger.log("LEAP MOTION CONTROLLER.");
    });

    POOLVR.synthSpeaker.speak("Keep the stick within the interaction box when you want to make contact with.  A ball.", function () {
        POOLVR.textGeomLogger.log("KEEP THE STICK WITHIN THE INTERACTION BOX WHEN YOU WANT");
        POOLVR.textGeomLogger.log("TO MAKE CONTACT WITH A BALL...");
    });
};


POOLVR.animate = function () {
    "use strict";
    var keyboard = POOLVR.keyboard,
        gamepad  = POOLVR.gamepad,
        app      = POOLVR.app,
        world    = POOLVR.world,
        updateTool          = POOLVR.updateTool,
        updateToolPostStep  = POOLVR.updateToolPostStep,
        moveToolRoot        = POOLVR.moveToolRoot,
        moveAvatar          = POOLVR.moveAvatar,
        updateBallsPostStep = POOLVR.updateBallsPostStep;

    var glS, rS;
    if (URL_PARAMS.rstats) {
        /* jshint ignore:start */
        var tS = new threeStats( POOLVR.app.renderer );
        glS = new glStats();
        rS  = new rStats({
            CSSPath: "lib/rstats/",
            values: {
                frame: { caption: 'Total frame time (ms)' },
                calls: { caption: 'Calls (three.js)' },
                raf: { caption: 'Time since last rAF (ms)' },
                // rstats: { caption: 'rStats update (ms)' }, // no worky?
                updatetool: { caption: 'Leap frame update (ms)' },
                updatevrcontrols: { caption: 'VRControls update (ms)' },
                step: { caption: 'Cannon step (ms)' },
                poststep: { caption: 'Cannon post-step (ms)' },
                updatekeyboardgamepad: { caption: 'Move avatar / Leap (ms)' }
            },
            fractions: [
                { base: 'frame', steps: [ 'updatetool', 'updatevrcontrols', 'render', 'step', 'poststep', 'updatekeyboardgamepad' ] }
            ],
            plugins: [tS, glS]
        });
        /* jshint ignore:end */
    } else {
        glS = {start: function () {}};
        rS  = function (id) { return {start:  function () {},
                                      end:    function () {},
                                      tick:   function () {},
                                      frame:  function () {},
                                      update: function () {}}; };
    }

    var lt = 0;

    function animate(t) {
        rS('frame').start();
        glS.start();
        rS('raf').tick();
        rS('fps').frame();

        var dt = (t - lt) * 0.001;

        rS('updatetool').start();
        updateTool();
        rS('updatetool').end();

        rS('updatevrcontrols').start();
        if (app.vrControls.enabled) {
            app.vrControls.update();
        }
        rS('updatevrcontrols').end();

        rS('render').start();
        app.vrManager.render(app.scene, app.camera, t);
        rS('render').end();

        requestAnimationFrame(animate);

        rS('step').start();
        //world.step(dt);
        //world.step(1/75, dt, 5);
        world.step(1/60, dt, 5);
        rS('step').end();

        rS('poststep').start();
        updateToolPostStep();
        updateBallsPostStep();
        rS('poststep').end();

        rS('updatekeyboardgamepad').start();
        keyboard.update(dt);
        gamepad.update(dt);

        moveAvatar(keyboard, gamepad, dt);
        moveToolRoot(keyboard, gamepad, dt);
        rS('updatekeyboardgamepad').end();

        lt = t;

        rS('frame').end();
        rS().update();
    }

    return animate;

};


function onLoad() {
    "use strict";

    POOLVR.loadConfig();
    console.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    var avatar = POOLVR.avatar;
    avatar.position.fromArray(POOLVR.config.initialPosition);
    avatar.heading = 0;
    avatar.floatMode = false;
    avatar.toolMode = false;

    POOLVR.synthSpeaker = new SynthSpeaker({volume: POOLVR.config.synthSpeakerVolume, rate: 0.8, pitch: 0.5});

    if (POOLVR.config.useTextGeomLogger) {
        var fontLoader = new THREE.FontLoader();
        fontLoader.load('fonts/Anonymous Pro_Regular.js', function (font) {
            var textGeomCacher = new TextGeomUtils.TextGeomCacher(font, {size: 0.12});
            var textGeomLoggerMaterial = new THREE.MeshBasicMaterial({color: 0xff3210});
            POOLVR.textGeomLogger = new TextGeomUtils.TextGeomLogger(textGeomCacher,
                {material: textGeomLoggerMaterial, nrows: 7, lineHeight: 1.8 * 0.12});
            avatar.add(POOLVR.textGeomLogger.root);
            POOLVR.textGeomLogger.root.position.set(-2.5, 1.0, -3.5);
        });
    } else {
        POOLVR.textGeomLogger = {
            root: new THREE.Object3D(),
            log: function (msg) { console.log(msg); },
            clear: function () {}
        };
    }

    THREE.py.parse(THREEPY_SCENE).then( function (scene) {

        if (!POOLVR.config.useBasicMaterials) {
            var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 8, Math.PI / 2);
            centerSpotLight.position.set(0, 3, 0);
            centerSpotLight.castShadow = true;
            centerSpotLight.shadow.camera.near = 0.01;
            centerSpotLight.shadow.camera.far = 4;
            centerSpotLight.shadow.camera.fov = 90;
            scene.add(centerSpotLight);
        }

        if (POOLVR.config.usePointLight) {
            var pointLight = new THREE.PointLight(0xaa8866, 0.8, 40);
            pointLight.position.set(4, 5, 2.5);
            scene.add(pointLight);
        }

        var UP = new THREE.Vector3(0, 1, 0);
        var appConfig = combineObjects(POOLVR.config, {
            onResetVRSensor: function (lastRotation, lastPosition) {
                var camera = POOLVR.app.camera;
                // app.camera.updateMatrix();
                POOLVR.avatar.heading += lastRotation - camera.rotation.y;
                POOLVR.toolRoot.rotation.y -= (lastRotation - camera.rotation.y);
                POOLVR.toolRoot.position.sub(lastPosition);
                POOLVR.toolRoot.position.applyAxisAngle(UP, -lastRotation + camera.rotation.y);
                POOLVR.toolRoot.position.add(camera.position);
                // POOLVR.toolRoot.updateMatrix();
                POOLVR.avatar.updateMatrixWorld();
            }
        });

        POOLVR.app = new WebVRApplication(scene, appConfig);

        avatar.add(POOLVR.app.camera);
        scene.add(avatar);

        POOLVR.setup();

        requestAnimationFrame( POOLVR.animate() );

        POOLVR.startTutorial();

    } );

}
