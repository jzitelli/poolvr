/* ############################################################################

  poolvr v0.1.0 2016-03-04

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

            // parse geometries, filtering out geometries that ObjectLoader doesn't handle:
            var geometries = objectLoader.parseGeometries(json.geometries.filter( function (geom) {
                return geom.type !== "TextGeometry";
            } ));

            manager.onLoad = onLoadA;

            var waitForLoad = false;

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
                                    waitForLoad = true;
                                } else if (typeof uniform.value === 'string') {
                                    // single texture specified by url
                                    uniform.value = textureLoader.load(uniform.value);
                                    waitForLoad = true;
                                }
                            }
                        }
                    }
                } );
            }

            // load fonts... each unique font URI is loaded once and stored in publically available object `fonts`:
            json.geometries.forEach( function (geom) {
                if (geom.type === "TextGeometry" && fonts[geom.font_url] === undefined) {
                    fonts[geom.font_url] = null;
                    fontLoader.load(geom.font_url, function (font) {
                        fonts[geom.font_url] = font;
                    });
                    waitForLoad = true;
                }
            } );

            if (waitForLoad === false) onLoadA();

            function onLoadA() {

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

                images = objectLoader.parseImages(json.images, function () { onLoadB(object); });
                var textures = objectLoader.parseTextures(json.textures, images);
                var materials = objectLoader.parseMaterials(json.materials, textures);

                var object = objectLoader.parseObject(json.object, geometries, materials);

                if (json.images === undefined || json.images.length === 0) {
                    onLoadB(object);
                }

                // the final callback, resolves promise:
                function onLoadB(obj) {
                    obj.traverse( function (node) {

                        node.updateMatrix();

                        if (node.userData) {
                            if (node.userData.layers) {
                                node.userData.layers.forEach( function (channel) {
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

                    obj.updateMatrixWorld(true);

                    loadHeightfields(obj);

                    if (onLoad) {
                        onLoad(obj);
                    }

                    resolve(obj);
                }

            }

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
            } );
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
// #### src/TextGeomUtils.js
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
        var ncols      = options.ncols || 30;
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
                    var clone = lineObject.clone();
                    this.root.add(clone);
                } else {
                    lineObject = textGeomCacher.makeObject(line, material);
                    this.root.add(lineObject);
                    lineObjects[line] = lineObject;
                }
            }
            // remove rows exceeding max display
            for (i = this.root.children.length - 1; i >= nrows; i--) {
                this.root.remove(this.root.children[i]);
            }
            // scroll lines:
            for (i = 0; i < this.root.children.length; i++) {
                var child = this.root.children[i];
                child.position.y = (this.root.children.length - i) * lineHeight;
                child.updateMatrix();
            }
            this.root.updateMatrixWorld(true);
        }.bind(this);

        this.clear = function () {
            for (var i = this.root.children.length - 1; i >= 0; i--) {
                this.root.remove(this.root.children[i]);
            }
        }.bind(this);
    }

    return {
        TextGeomCacher: TextGeomCacher,
        TextGeomLogger: TextGeomLogger
    };

} )();
;
// #### src/WebVRApplication.js
function WebVRApplication(scene, config) {
    "use strict";
    this.scene = scene;

    config = config || {};
    var rendererOptions  = config.rendererOptions;
    var useShadowMap     = config.useShadowMap;
    var onResetVRSensor  = config.onResetVRSensor;
    var devicePixelRatio = config.devicePixelRatio || window.devicePixelRatio;

    var domElement;
    if (config.canvasId) {
        // canvas already exists in document
        domElement = document.getElementById(config.canvasId);
        rendererOptions = combineObjects(rendererOptions, {canvas: domElement});
        this.renderer = new THREE.WebGLRenderer(rendererOptions);
    } else {
        // create the canvas
        this.renderer = new THREE.WebGLRenderer(rendererOptions);
        domElement = this.renderer.domElement;
        document.body.appendChild(domElement);
        domElement.id = 'webgl-canvas';
    }

    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (useShadowMap) {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.matrixAutoUpdate = true;

    this.vrEffect = new THREE.VREffect(this.renderer, function(error) { console.error('error creating VREffect: ' + error); });

    this.vrControls = new THREE.VRControls(this.camera, function(error) { console.error('error creating VRControls: ' + error); });
    this.vrControlsEnabled = true;

    // public methods:

    this.render = function () {
        if (this.vrControlsEnabled) this.vrControls.update();
        this.vrEffect.render(this.scene, this.camera);
    }.bind(this);

    this.toggleVRControls = function () {
        if (this.vrControlsEnabled) {
            this.vrControlsEnabled = false;
            this.camera.position.set(0, 0, 0);
            this.camera.quaternion.set(0, 0, 0, 1);
            this.camera.updateMatrixWorld();
        } else {
            this.vrControlsEnabled = true;
        }
    }.bind(this);

    var lastPosition = new THREE.Vector3();
    this.resetVRSensor = function () {
        if (this.vrControlsEnabled) {
            this.vrControls.update();
            lastPosition.copy(this.camera.position);
            var lastRotation = this.camera.rotation.y;
            this.vrControls.resetSensor();
            this.vrControls.update();
            if (onResetVRSensor) {
                onResetVRSensor(lastRotation, lastPosition);
            }
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

    // full screen / VR presenting stuff:

    var isFullscreen = false;

    var isRequestingPresent = false;

    var isPresenting = false;

    window.addEventListener('resize', function () {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }.bind(this), false );

    var fullscreenchange = domElement.mozRequestFullScreen ? 'mozfullscreenchange' : 'webkitfullscreenchange';

    var vrButton = document.createElement('button');
    vrButton.innerHTML = 'ENTER VR';
    vrButton.style.position = 'absolute';
    vrButton.style.right = 0;
    vrButton.style.bottom = 0;
    vrButton.style.margin = '10px';
    vrButton.style.padding = '10px';
    vrButton.style.background = 0x222222;
    vrButton.style['text-color'] = 0xffffff;

    document.addEventListener(fullscreenchange, function ( event ) {
        isFullscreen = !!(document.webkitFullscreenElement || document.mozFullScreenElement);
        if (isFullscreen && isRequestingPresent && !isPresenting) {
            isRequestingPresent = false;
            this.vrEffect.requestPresent().then( function () {
                isPresenting = true;
                vrButton.innerHTML = 'EXIT VR';
            } ).catch( function (error) {
                console.error(error);
                vrButton.innerHTML = 'VR ERROR!';
                vrButton.style.background = 0x992222;
                vrButton.removeEventListener('click', onClick);
            } );
        } else if (!isFullscreen && isRequestingPresent) {
            isRequestingPresent = false;
            console.error('requestPresent was not performed because fullscreen could not be entered');
        } else if (!isFullscreen && isPresenting) {
            this.vrEffect.exitPresent().then( function () {
                isPresenting = false;
                vrButton.innerHTML = 'ENTER VR';
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }.bind(this) );
        }
    }.bind(this), false);

    if (window.VRDisplay || window.HMDVRDevice) {

        var onClick = function () {
            if (!isPresenting) {
                isRequestingPresent = true;
                if (domElement.requestFullscreen) {
                    domElement.requestFullscreen();
                } else if (domElement.msRequestFullscreen) {
                    domElement.msRequestFullscreen();
                } else if (domElement.mozRequestFullScreen) {
                    domElement.mozRequestFullScreen();
                } else if (domElement.webkitRequestFullscreen) {
                    domElement.webkitRequestFullscreen();
                } else {
                    console.error('fullscreen not supported');
                    isRequestingPresent = false;
                }
            } else {
                this.vrEffect.exitPresent().then( function () {
                    isPresenting = false;
                    vrButton.innerHTML = 'ENTER VR';
                    this.renderer.setSize(window.innerWidth, window.innerHeight);
                }.bind(this) );
            }
        }.bind(this);

        vrButton.addEventListener('click', onClick, false);

        document.body.appendChild(vrButton);

        window.addEventListener("beforeunload", function (e) {
            if (isPresenting) {
                console.log('exiting VR present state...');
                this.vrEffect.exitPresent().then( function () {
                    console.log('...success!');
                } );
            }
        }.bind(this), false);

    } else {

        console.warn('WebVR is not supported on your browser / platform');

    }


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
// TODO: refactor, more generic
function makeTool(parent, world, options) {
    /*************************************

    parent: THREE.Object3D
    world : CANNON.World

    returns: stuff

    *************************************/
    "use strict";
    options = options || {};

    var UP = THREE.Object3D.DefaultUp;

    // coordinate transformations are performed via three.js scene graph
    var toolRoot = new THREE.Object3D();
    var LEAP2METERS = 0.001;
    var METERS2LEAP = 1000;
    toolRoot.scale.set(LEAP2METERS, LEAP2METERS, LEAP2METERS);
    parent.add(toolRoot);

    // parse options:

    toolRoot.quaternion.setFromAxisAngle(UP, options.toolRotation || 0);
    toolRoot.position.fromArray(options.toolOffset || [0, -0.42, -0.42]);

    var toolLength = options.toolLength || 0.5;
    var toolRadius = options.toolRadius || 0.013;
    // should remove, don't think this matters for cannon.js kinematic body:
    var toolMass   = options.toolMass   || 0.04;

    var tipShape = options.tipShape || 'Cylinder';
    var tipRadius,
        tipMinorRadius;
    if (tipShape === 'Cylinder') {
        tipRadius = options.tipRadius || toolRadius;
    } else {
        tipRadius = options.tipRadius || 0.95 * toolRadius;
        // if (tipShape === 'Ellipsoid') {
        //     tipMinorRadius = options.tipMinorRadius || 0.25 * tipRadius;
        // }
    }

    var toolTimeA = options.toolTimeA || 0.25;
    var toolTimeB = options.toolTimeB || toolTimeA + 1.5;

    var minConfidence = options.minConfidence || 0.3;

    var interactionPlaneOpacity = options.interactionPlaneOpacity || 0.23;

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

    var onDisconnect = options.onDisconnect || function () {
        console.log('Leap Motion WebSocket disconnected');
    };
    leapController.on('disconnect', onDisconnect);

    var onStreamingStarted = options.onStreamingStarted || function () {
        console.log('Leap Motion streaming started');
    };
    leapController.on('streamingStarted', onStreamingStarted);

    var onStreamingStopped = options.onStreamingStopped || function () {
        console.warn('Leap Motion streaming stopped');
    };
    leapController.on('streamingStopped', onStreamingStopped);

    leapController.connect();

    // setup three.js tool graphics:

    // interaction box visual guide:
    var interactionBoxRoot = new THREE.Object3D();
    toolRoot.add(interactionBoxRoot);

    var interactionPlaneMaterial = new THREE.MeshBasicMaterial({color: 0x00dd44, transparent: true, opacity: interactionPlaneOpacity});
    var interactionPlaneGeom = new THREE.PlaneBufferGeometry(METERS2LEAP, METERS2LEAP);

    var interactionPlaneMesh = new THREE.Mesh(interactionPlaneGeom, interactionPlaneMaterial);
    interactionBoxRoot.add(interactionPlaneMesh);

    interactionPlaneMesh = interactionPlaneMesh.clone();
    interactionPlaneMesh.position.z = METERS2LEAP * 0.5;
    interactionPlaneMesh.updateMatrix();
    interactionBoxRoot.add(interactionPlaneMesh);

    interactionPlaneMesh = interactionPlaneMesh.clone();
    interactionPlaneMesh.position.z = METERS2LEAP * (-0.5);
    interactionPlaneMesh.updateMatrix();
    interactionBoxRoot.add(interactionPlaneMesh);

    // leap motion controller:
    var IN2METER = 0.0254;
    var boxGeom = new THREE.BoxGeometry(METERS2LEAP*IN2METER*3, METERS2LEAP*IN2METER*0.5, METERS2LEAP*IN2METER*1.2);
    var leapGeom = new THREE.BufferGeometry();
    leapGeom.fromGeometry(boxGeom);
    boxGeom.dispose();
    var leapMaterial = new THREE.MeshLambertMaterial({color: 0x777777});
    var leapMesh = new THREE.Mesh(leapGeom, leapMaterial);
    leapMesh.position.y = METERS2LEAP*IN2METER*0.25;
    leapMesh.updateMatrix();
    toolRoot.add(leapMesh);

    // the stick:
    var stickGeom = new THREE.CylinderGeometry(METERS2LEAP*toolRadius, METERS2LEAP*toolRadius, METERS2LEAP*toolLength, 10, 1, false);
    stickGeom.translate(0, -0.5*METERS2LEAP*toolLength, 0);
    var bufferGeom = new THREE.BufferGeometry();
    bufferGeom.fromGeometry(stickGeom);
    stickGeom.dispose();
    stickGeom = bufferGeom;
    var stickMaterial = new THREE.MeshLambertMaterial({color: stickColor, transparent: true});
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    toolRoot.add(stickMesh);

    var useShadowMap = POOLVR.config.useShadowMap;
    var stickShadowMesh;
    if (!useShadowMap) {
        stickShadowMesh = new THREE.ShadowMesh(stickMesh, POOLVR.shadowMaterial);
        POOLVR.app.scene.add(stickShadowMesh);
        var shadowPlane = new THREE.Plane(UP, (POOLVR.config.H_table + 0.001));
        var shadowLightPosition = new THREE.Vector4(0, 5, 0, 0.01);
        stickShadowMesh.updateShadowMatrix(shadowPlane, shadowLightPosition);
    }

    var tipBody = new CANNON.Body({mass: toolMass, type: CANNON.Body.KINEMATIC});
    // TODO: rename, avoid confusion b/t cannon and three materials
    tipBody.material = POOLVR.tipMaterial;
    var tipMesh = null;
    if (tipShape !== 'Cylinder') {
        var tipGeom = new THREE.SphereBufferGeometry(METERS2LEAP*tipRadius, 10);

        // TODO: implement cannon.js ellipsoid shape
        // if (tipShape === 'Ellipsoid') {
        //     tipGeom.scale(1, tipMinorRadius / tipRadius, 1);
        //     tipBody.addShape(new CANNON.Ellipsoid(tipRadius, tipMinorRadius, tipRadius));
        // } else {
        //     tipBody.addShape(new CANNON.Sphere(tipRadius));
        // }
        tipBody.addShape(new CANNON.Sphere(tipRadius));

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

    // setup three.js hands:

    // hands don't necessarily correspond the left / right labels, but doesn't matter to me because they look indistinguishable
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    var handRoots = [leftRoot, rightRoot];
    toolRoot.add(leftRoot);
    toolRoot.add(rightRoot);

    var handMaterial = new THREE.MeshBasicMaterial({color: handColor, transparent: true, opacity: 0});

    // arms:
    var armRadius = METERS2LEAP*0.0216,
        armLength = METERS2LEAP*0.22;
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
    var radius = METERS2LEAP*0.025;
    var palmGeom = new THREE.SphereBufferGeometry(radius).scale(1, 0.5, 1);
    var palmMesh = new THREE.Mesh(palmGeom, handMaterial);
    palmMesh.castShadow = true;
    var palms = [palmMesh, palmMesh.clone()];
    leftRoot.add(palms[0]);
    rightRoot.add(palms[1]);
    // fingertips:
    radius = METERS2LEAP*0.005;
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

    interactionBoxRoot.visible = false;

    stickMesh.visible = false;

    leftRoot.visible  = false;
    rightRoot.visible = false;

    // to store decomposed toolRoot world matrix, used to convert three.js local coords to cannon.js world coords:
    toolRoot.worldPosition = new THREE.Vector3();
    toolRoot.worldQuaternion = new THREE.Quaternion();
    toolRoot.worldScale = new THREE.Vector3();
    // inverse of toolRoot.matrixWorld, used for converting cannon.js world coords to three.js local coords:
    toolRoot.matrixWorldInverse = new THREE.Matrix4();

    function updateToolMapping() {
        toolRoot.matrixWorld.decompose(toolRoot.worldPosition, toolRoot.worldQuaternion, toolRoot.worldScale);
        toolRoot.matrixWorldInverse.getInverse(toolRoot.matrixWorld);
    }

    // initialize matrices now:
    toolRoot.updateMatrix();
    toolRoot.updateMatrixWorld();

    updateToolMapping();

    if (!useShadowMap) {
        stickShadowMesh.updateMatrix();
        stickShadowMesh.updateMatrixWorld();
        stickShadowMesh.visible = false;
    }


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


    function updateToolPostStep() {
        stickMesh.position.copy(tipBody.interpolatedPosition);
        stickMesh.position.applyMatrix4(toolRoot.matrixWorldInverse);
        stickMesh.updateMatrix();
        stickMesh.updateMatrixWorld();

        if (!useShadowMap) {
            stickShadowMesh.updateMatrix();
            stickShadowMesh.updateMatrixWorld();
        }
    }


    var deadtime = 0;

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
            toolRoot.rotation.y -= 0.15 * dt * rotateToolCW;
            //toolRoot.quaternion.setFromAxisAngle(UP, toolRotation);

            toolRoot.updateMatrix();

            if (interactionBoxRoot.visible === false) {
                interactionBoxRoot.visible = true;
                interactionPlaneMaterial.opacity = interactionPlaneOpacity;
            }

            deadtime = 0;

        }
    }

    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    var velocity = new THREE.Vector3();
    var quaternion = new THREE.Quaternion();
    var lastFrameID;

    function updateTool(dt) {

        deadtime += dt;

        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {

            lastFrameID = frame.id;

            var interactionBox = frame.interactionBox;
            if (interactionBox.valid) {
                interactionBoxRoot.position.fromArray(interactionBox.center);
                interactionBoxRoot.scale.set(interactionBox.width*LEAP2METERS, interactionBox.height*LEAP2METERS, interactionBox.depth*LEAP2METERS);
                interactionBoxRoot.updateMatrix();
                interactionBoxRoot.updateMatrixWorld();
            }

            if (frame.tools.length === 1) {

                deadtime = 0;

                var tool = frame.tools[0];

                if (stickMesh.visible === false || stickMesh.material.opacity < 1) {
                    stickMesh.visible = true;

                    if (!useShadowMap) stickShadowMesh.visible = true;

                    stickMesh.material.opacity = 1;
                    if (tipMesh) tipMesh.material.opacity = 1;
                    interactionBoxRoot.visible = true;
                    interactionPlaneMaterial.opacity = interactionPlaneOpacity;
                }

                //position.fromArray(tool.tipPosition);
                position.fromArray(tool.stabilizedTipPosition);
                direction.fromArray(tool.direction);

                stickMesh.position.copy(position);
                position.applyMatrix4(toolRoot.matrixWorld);
                tipBody.position.copy(position);

                stickMesh.quaternion.setFromUnitVectors(UP, direction);

                quaternion.multiplyQuaternions(toolRoot.worldQuaternion, stickMesh.quaternion);
                tipBody.quaternion.copy(quaternion);

                stickMesh.updateMatrix();
                stickMesh.updateMatrixWorld();

                if (!useShadowMap) {
                    stickShadowMesh.updateMatrix();
                    stickShadowMesh.updateMatrixWorld();
                }

                velocity.fromArray(tool.tipVelocity);
                velocity.applyQuaternion(toolRoot.worldQuaternion);
                velocity.multiplyScalar(LEAP2METERS);
                tipBody.velocity.copy(velocity);

                if (tool.timeVisible > toolTimeA) {
                    // stick becomes collidable once it has been detected for duration `toolTimeA`
                    if (tipBody.sleepState === CANNON.Body.SLEEPING) {
                        tipBody.wakeUp();
                        // TODO: indicator (particle effect)
                        if (tipMesh) tipMesh.material.color.setHex(0xff0000);
                    }

                    if (tool.timeVisible > toolTimeB && interactionPlaneMaterial.opacity > 0.1) {
                        // dim the interaction box:
                        interactionPlaneMaterial.opacity *= 0.94;
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
                    if (tipMesh) tipMesh.material.opacity = stickMesh.material.opacity;
                } else {
                    stickMesh.visible = false;
                    if (!useShadowMap) stickShadowMesh.visible = false;
                }
            }

            updateHands(frame);

        }

        if ( deadtime > 1.5 && interactionBoxRoot.visible ) {
            interactionPlaneMaterial.opacity *= 0.93;
            if (interactionPlaneMaterial.opacity < 0.02) interactionBoxRoot.visible = false;
        }

    }

    function updateHands(frame) {
        leftRoot.visible = rightRoot.visible = false;
        for (var i = 0; i < frame.hands.length; i++) {
            var hand = frame.hands[i];
            if (hand.confidence > minConfidence) {

                handRoots[i].visible = true;
                handMaterial.opacity = 0.7*handMaterial.opacity + 0.3*(hand.confidence - minConfidence) / (1 - minConfidence);

                var arm = arms[i];
                direction.fromArray(hand.arm.basis[2]);
                arm.quaternion.setFromUnitVectors(UP, direction);
                arm.position.fromArray(hand.arm.center());
                arm.updateMatrix();

                var palm = palms[i];
                direction.fromArray(hand.palmNormal);
                palm.quaternion.setFromUnitVectors(UP, direction);
                palm.position.fromArray(hand.palmPosition);
                palm.updateMatrix();

                var handFingerTips = fingerTips[i];
                var handJoints = joints[i];
                var handJoint2s = joint2s[i];
                for (var j = 0; j < hand.fingers.length; j++) {
                    var finger = hand.fingers[j];
                    handFingerTips[j].position.fromArray(finger.tipPosition);
                    handFingerTips[j].updateMatrix();
                    handJoints[j].position.fromArray(finger.bones[1].nextJoint);
                    handJoints[j].updateMatrix();
                    handJoint2s[j].position.fromArray(finger.bones[2].nextJoint);
                    handJoint2s[j].updateMatrix();
                }

                handRoots[i].updateMatrixWorld(true);
            }
        }
    }

    return {
        toolRoot:           toolRoot,
        leapController:     leapController,
        updateTool:         updateTool,
        updateToolPostStep: updateToolPostStep,
        moveToolRoot:       moveToolRoot,
        updateToolMapping:  updateToolMapping,
        updateHands:        updateHands
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
    toggleVRControls: function () { POOLVR.app.toggleVRControls(); POOLVR.app.camera.updateMatrix(); },
    toggleWireframe:  function () { POOLVR.app.toggleWireframe(); },
    resetVRSensor:    function () { POOLVR.app.resetVRSensor(); },
    resetTable:       function () { POOLVR.resetTable(); },
    autoPosition:     function () { POOLVR.autoPosition(); },
    selectNextBall:   function () { POOLVR.selectNextBall(); },
    selectPrevBall:   function () { POOLVR.selectNextBall(-1); },
    stroke:           function () { POOLVR.stroke(); }
};

// TODO: remove Primrose dependency for keyboard / gamepad input, it seems overkill for just this functionality + my Primrose version is very outdated.

// TODO: control customization menu

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
    selectNextBall: {buttons: [Primrose.Input.Keyboard.ADD],
                     commandDown: POOLVR.commands.selectNextBall, dt: 0.5},
    selectPrevBall: {buttons: [Primrose.Input.Keyboard.SUBTRACT],
                     commandDown: POOLVR.commands.selectPrevBall, dt: 0.5},
    stroke: {buttons: [Primrose.Input.Keyboard.SPACEBAR],
             commandDown: POOLVR.commands.stroke, dt: 0.25}
};

POOLVR.keyboardCommands = makeObjectArray(POOLVR.keyboardCommands, 'name');

POOLVR.keyboard = new Primrose.Input.Keyboard('keyboard', document, POOLVR.keyboardCommands);


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
                   commandDown: POOLVR.commands.autoPosition, dt: 0.25}
};


POOLVR.gamepadCommands = makeObjectArray(POOLVR.gamepadCommands, 'name');
POOLVR.gamepad = new Primrose.Input.Gamepad("gamepad", POOLVR.gamepadCommands);
POOLVR.gamepad.addEventListener("gamepadconnected", function(id) {
    if (!this.isGamepadSet()) {
        this.setGamepad(id);
        console.log("gamepad " + id + " connected");
    }
}.bind(POOLVR.gamepad), false);


POOLVR.parseURIConfig = function () {
    "use strict";
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
};


POOLVR.profile = URL_PARAMS.profile || POOLVR.profile || 'default';


POOLVR.saveConfig = function (profileName) {
    "use strict";
    POOLVR.config.toolOptions.toolOffset = [POOLVR.toolRoot.position.x, POOLVR.toolRoot.position.y, POOLVR.toolRoot.position.z];
    POOLVR.config.toolOptions.toolRotation = POOLVR.toolRoot.rotation.y;
    localStorage.setItem(profileName, JSON.stringify(POOLVR.config));
    console.log("saved configuration for profile '" + profileName + "':");
    console.log(JSON.stringify(POOLVR.config, undefined, 2));
};


POOLVR.loadConfig = function (profileName) {
    "use strict";
    var localStorageConfig = localStorage.getItem(profileName);
    var config;
    if (localStorageConfig) {
        config = {};
        localStorageConfig = JSON.parse(localStorageConfig);
        for (var k in localStorageConfig) {
            if (POOLVR.config.hasOwnProperty(k)) {
                config[k] = localStorageConfig[k];
            }
        }
        console.log("loaded configuration for profile '" + profileName + "'");
    }
    return config;
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
    world.defaultContactMaterial.contactEquationStiffness   = 1e7;
    world.defaultContactMaterial.frictionEquationStiffness  = 2e6;
    world.defaultContactMaterial.contactEquationRelaxation  = 2;
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

    var useShadowMap = POOLVR.config.useShadowMap;

    if (!useShadowMap) {
        POOLVR.shadowMaterial = new THREE.MeshBasicMaterial({color: 0x002200});
    }

    POOLVR.leapIndicator = document.getElementById('leapIndicator');

    var leapTool = makeTool( POOLVR.avatar, POOLVR.world, combineObjects(POOLVR.config.toolOptions, {
        onConnect: function () {
            POOLVR.leapIndicator.innerHTML = 'connected';
        },
        onDisconnect: function () {
            POOLVR.leapIndicator.innerHTML = 'disconnected';
        }
    }));

    POOLVR.leapController     = leapTool.leapController;
    POOLVR.toolRoot           = leapTool.toolRoot;
    POOLVR.updateTool         = leapTool.updateTool;
    POOLVR.updateToolPostStep = leapTool.updateToolPostStep;
    POOLVR.moveToolRoot       = leapTool.moveToolRoot;
    POOLVR.updateToolMapping  = leapTool.updateToolMapping;

    var basicMaterials = {};
    var nonbasicMaterials = {};

    POOLVR.switchMaterials = function (useBasicMaterials) {
        var materials = useBasicMaterials ? basicMaterials : nonbasicMaterials;
        POOLVR.app.scene.traverse( function (node) {
            if (node instanceof THREE.Mesh) {
                var material = node.material;
                var name = material.name;
                if (materials[name]) {
                    node.material = materials[name];
                }
            }
        } );
    };

    var floorBody;

    scene.traverse(function (node) {

        if (node instanceof THREE.Mesh) {

            if ( node.material.name && (nonbasicMaterials[node.material.name] === undefined) &&
                (node.material instanceof THREE.MeshLambertMaterial || node.material instanceof THREE.MeshPhongMaterial) ) {
                nonbasicMaterials[node.material.name] = node.material;
                var basicMaterial = new THREE.MeshBasicMaterial({color: node.material.color.getHex(), transparent: node.material.transparent, side: node.material.side});
                basicMaterial.name = node.material.name;
                basicMaterials[node.material.name] = basicMaterial;
            }

            var ballNum;
            if (node.name.startsWith('ballMesh')) {
                ballNum = Number(node.name.split(' ')[1]);
                POOLVR.ballMeshes[ballNum] = node;
                POOLVR.ballBodies[ballNum] = node.body;
                POOLVR.initialPositions[ballNum] = new THREE.Vector3().copy(node.position);
                node.body.bounces = 0;
                node.body.ballNum = ballNum;
                node.body.material = POOLVR.ballMaterial;
            }
            else if (node.name === 'playableSurfaceMesh') {
                node.body.material = POOLVR.playableSurfaceMaterial;
            }
            else if (node.name.endsWith('CushionMesh')) {
                node.body.material = POOLVR.cushionMaterial;
            }
            else if (node.name === 'floorMesh') {
                floorBody = node.body;
                floorBody.material = POOLVR.floorMaterial;
            }
            else if (node.name.endsWith('RailMesh')) {
                node.body.material = POOLVR.railMaterial;
            }

        }

    });

    var H_table = POOLVR.config.H_table;

    if (!useShadowMap) {

        var ballShadowMeshes = [];
        var ballShadowGeom = new THREE.CircleBufferGeometry(0.5*POOLVR.config.ball_diameter, 16);
        ballShadowGeom.rotateX(-0.5*Math.PI);

        POOLVR.ballMeshes.forEach( function (mesh, ballNum) {
            var ballShadowMesh = new THREE.Mesh(ballShadowGeom, POOLVR.shadowMaterial);
            ballShadowMesh.position.copy(mesh.position);
            ballShadowMesh.position.y = H_table + 0.0004;
            ballShadowMeshes[ballNum] = ballShadowMesh;
            scene.add(ballShadowMesh);
        } );

    }

    POOLVR.updateBallsPostStep = function () {

        for (var i = 0; i < POOLVR.ballMeshes.length; i++) {

            var mesh = POOLVR.ballMeshes[i];
            var body = POOLVR.ballBodies[i];
            mesh.position.copy(body.interpolatedPosition);
            mesh.quaternion.copy(body.interpolatedQuaternion);
            mesh.updateMatrix();
            mesh.updateMatrixWorld();

            if (!useShadowMap) {
                var shadowMesh = ballShadowMeshes[i];
                shadowMesh.position.x = mesh.position.x;
                shadowMesh.position.z = mesh.position.z;
                shadowMesh.updateMatrix();
                shadowMesh.updateMatrixWorld();
            }

        }

    };

    // ball-floor collision
    floorBody.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {

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
// #### src/menu.js
POOLVR.setupMenu = function () {
    "use strict";
    var inputs = document.querySelectorAll('input');
    function onFocus(evt) {
        POOLVR.keyboard.enabled = false;
    }
    function onBlur(evt) {
        POOLVR.keyboard.enabled = true;
    }
    for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('focus', onFocus);
        inputs[i].addEventListener('blur', onBlur);
    }

    var useBasicMaterialsInput = document.getElementById('useBasicMaterials');
    useBasicMaterialsInput.checked = POOLVR.config.useBasicMaterials;
    useBasicMaterialsInput.addEventListener('change', function (evt) {
        POOLVR.config.useBasicMaterials = useBasicMaterialsInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);
    });

    var useShadowMapInput = document.getElementById('useShadowMap');
    useShadowMapInput.checked = POOLVR.config.useShadowMap;
    useShadowMapInput.addEventListener('change', function (evt) {
        POOLVR.config.useShadowMap = useShadowMapInput.checked;
        POOLVR.saveConfig(POOLVR.profile);
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
    });

    // TODO: regular expression format check
    var leapAddressInput = document.getElementById('leapAddress');
    leapAddressInput.value = 'localhost';
    leapAddressInput.addEventListener('change', function (evt) {
        POOLVR.leapController.connection.host = leapAddressInput.value;
        POOLVR.leapController.connection.disconnect(true);
        POOLVR.leapController.connect();
        POOLVR.saveConfig(POOLVR.profile);
    });

    var profileNameInput = document.getElementById('profileName');
    profileNameInput.value = POOLVR.profile;
    profileNameInput.addEventListener('change', function (evt) {
        POOLVR.profile = profileNameInput.value;
        POOLVR.saveConfig(POOLVR.profile);
    });

    var overlay = document.getElementById('overlay');
    var startButton = document.getElementById('start');

    startButton.addEventListener('click', function () {
        overlay.style.display = 'none';
        POOLVR.startTutorial();
    });
};
;
// #### src/main.js
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


POOLVR.autoPosition = ( function () {
    "use strict";
    var nextVector = new THREE.Vector3();
    var UP = THREE.Object3D.DefaultUp;
    var speakCount = 0;
    return function () {

        if (POOLVR.synthSpeaker.speaking === false) {
            if (speakCount <= 7) {
                POOLVR.synthSpeaker.speak("You are being auto-positioned.");
                if (speakCount === 7) {
                    POOLVR.synthSpeaker.speak("I will stop saying that now.");
                }
                speakCount++;
            }
        }

        var avatar = POOLVR.avatar;
        avatar.heading = Math.atan2(
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.x - POOLVR.ballMeshes[0].position.x),
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.z - POOLVR.ballMeshes[0].position.z)
        );
        avatar.quaternion.setFromAxisAngle(UP, avatar.heading);

        // nextVector.copy(POOLVR.toolRoot.worldPosition);
        nextVector.copy(POOLVR.toolRoot.position);
        nextVector.applyQuaternion(avatar.quaternion);
        nextVector.add(avatar.position);

        nextVector.sub(POOLVR.ballMeshes[0].position);
        nextVector.y = 0;
        avatar.position.sub(nextVector);

        avatar.updateMatrix();
        avatar.updateMatrixWorld();

        POOLVR.updateToolMapping();

    };
} )();


POOLVR.moveAvatar = ( function () {
    "use strict";
    var UP = THREE.Object3D.DefaultUp,
        walkSpeed = 0.333,
        floatSpeed = 0.1;

    return function (keyboard, gamepad, dt) {
        var avatar = POOLVR.avatar;

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

            avatar.updateMatrix();
        }
    };
} )();


POOLVR.stroke = function () {
    "use strict";
    var body = POOLVR.ballBodies[0];
    body.velocity.z = -3.5;
};


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

    POOLVR.synthSpeaker.speak("If you are playing in VR, you will probably want use the. I. J. K. And L. Keys to move the. Virtual. Leap Motion Controller.  So that the virtual. And physical positions. Coincide.", function () {
        POOLVR.textGeomLogger.log("IF YOU ARE PLAYING IN VR, YOU WILL PROBABLY WANT TO USE THE");
        POOLVR.textGeomLogger.log("I/J/K/L/O/./Y/U KEYS");
        POOLVR.textGeomLogger.log("TO MOVE THE VIRTUAL LEAP MOTION CONTROLLER");
        POOLVR.textGeomLogger.log("SO THAT THE VIRTUAL AND PHYSICAL POSITIONS COINCIDE.");
    });

};


POOLVR.startAnimateLoop = function () {
    "use strict";
    var keyboard = POOLVR.keyboard,
        gamepad  = POOLVR.gamepad,
        app      = POOLVR.app,
        world    = POOLVR.world,
        avatar   = POOLVR.avatar,
        updateTool          = POOLVR.updateTool,
        updateToolPostStep  = POOLVR.updateToolPostStep,
        moveToolRoot        = POOLVR.moveToolRoot,
        moveAvatar          = POOLVR.moveAvatar,
        updateBallsPostStep = POOLVR.updateBallsPostStep,
        updateToolMapping   = POOLVR.updateToolMapping;

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
        updateTool(dt);
        rS('updatetool').end();

        rS('updatevrcontrols').start();
        if (app.vrControlsEnabled) {
            app.vrControls.update();
            app.camera.updateMatrixWorld();
        }
        rS('updatevrcontrols').end();

        rS('render').start();
        app.vrEffect.render(app.scene, app.camera);
        rS('render').end();

        rS('step').start();
        world.step(Math.min(1/60, dt), dt, 10);
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

        avatar.updateMatrixWorld();
        updateToolMapping();
        rS('updatekeyboardgamepad').end();

        lt = t;

        requestAnimationFrame(animate);

        rS('frame').end();
        rS().update();
    }

    requestAnimationFrame(animate);

};


function onLoad() {
    "use strict";
    POOLVR.config = POOLVR.loadConfig(POOLVR.profile) || POOLVR.config;
    POOLVR.parseURIConfig();

    console.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    THREE.Object3D.DefaultMatrixAutoUpdate = false;

    POOLVR.avatar = new THREE.Object3D();
    var avatar = POOLVR.avatar;

    avatar.position.fromArray(POOLVR.config.initialPosition);

    avatar.heading = 0;
    avatar.floatMode = false;
    avatar.toolMode = false;

    POOLVR.synthSpeaker = new SynthSpeaker({volume: POOLVR.config.synthSpeakerVolume, rate: 0.8, pitch: 0.5});

    if (POOLVR.config.useTextGeomLogger) {
        var fontLoader = new THREE.FontLoader();
        fontLoader.load('fonts/Anonymous Pro_Regular.js', function (font) {
            var textGeomCacher = new TextGeomUtils.TextGeomCacher(font, {size: 0.14});
            var textGeomLoggerMaterial = new THREE.MeshBasicMaterial({color: 0xff3210});
            POOLVR.textGeomLogger = new TextGeomUtils.TextGeomLogger(textGeomCacher,
                {material: textGeomLoggerMaterial, nrows: 7, lineHeight: 1.8 * 0.14});
            avatar.add(POOLVR.textGeomLogger.root);
            POOLVR.textGeomLogger.root.position.set(-2.7, 0.88, -3.3);
            POOLVR.textGeomLogger.root.updateMatrix();
        });
    } else {
        POOLVR.textGeomLogger = {
            root: new THREE.Object3D(),
            log: function (msg) { console.log(msg); },
            clear: function () {}
        };
    }

    THREE.py.parse(THREEPY_SCENE).then( function (scene) {

        scene.autoUpdate = false;

        var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 8, Math.PI / 2);
        centerSpotLight.position.set(0, 3, 0);
        centerSpotLight.castShadow = true;
        centerSpotLight.shadow.camera.matrixAutoUpdate = true;
        centerSpotLight.shadow.camera.near = 1;
        centerSpotLight.shadow.camera.far = 3;
        centerSpotLight.shadow.camera.fov = 80;
        //centerSpotLight.shadow.radius = 0.5;
        scene.add(centerSpotLight);
        centerSpotLight.updateMatrix();
        centerSpotLight.updateMatrixWorld();

        POOLVR.centerSpotLight = centerSpotLight;

        if (POOLVR.config.usePointLight) {
            var pointLight = new THREE.PointLight(0xaa8866, 0.8, 40);
            pointLight.position.set(4, 5, 2.5);
            scene.add(pointLight);
            pointLight.updateMatrix();
            pointLight.updateMatrixWorld();
        }

        var appConfig = combineObjects(POOLVR.config, {
            canvasId: 'webgl-canvas',
            onResetVRSensor: function (lastRotation, lastPosition) {
                // maintain correspondence between virtual / physical leap motion controller:
                var camera = POOLVR.app.camera;
                POOLVR.toolRoot.rotation.y -= (lastRotation - camera.rotation.y);
                POOLVR.toolRoot.position.sub(lastPosition);
                POOLVR.toolRoot.position.applyAxisAngle(THREE.Object3D.DefaultUp, -lastRotation + camera.rotation.y);
                POOLVR.toolRoot.position.add(camera.position);
                POOLVR.toolRoot.updateMatrix();
                POOLVR.toolRoot.updateMatrixWorld();
                POOLVR.avatar.heading += lastRotation - camera.rotation.y;
                POOLVR.avatar.quaternion.setFromAxisAngle(THREE.Object3D.DefaultUp, avatar.heading);
                POOLVR.avatar.updateMatrix();
                POOLVR.avatar.updateMatrixWorld();
            }
        });

        POOLVR.app = new WebVRApplication(scene, appConfig);

        avatar.add(POOLVR.app.camera);

        scene.add(avatar);

        avatar.updateMatrix();
        avatar.updateMatrixWorld();

        POOLVR.setupMenu();

        POOLVR.setup();

        scene.updateMatrixWorld(true);

        POOLVR.switchMaterials(POOLVR.config.useBasicMaterials);

        POOLVR.startAnimateLoop();

    } );

}
