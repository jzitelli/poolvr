/*
  poolvr v0.1.0 2015-12-23
  
  Copyright (C) 2015 Jeffrey Zitelli <jeffrey.zitelli@gmail.com> (https://github.com/jzitelli)
  http://subvr.info/poolvr
  https://github.com/jzitelli/poolvr.git
*/
WebVRApplication = ( function () {
    function WebVRApplication(scene, config) {
        this.scene = scene;

        config = config || {};
        var rendererOptions     = config.rendererOptions || {antialias: true, alpha: true};
        var useShadowMap        = config.useShadowMap;
        var onResetVRSensor     = config.onResetVRSensor;
        var useWebVRBoilerplate = config.useWebVRBoilerplate;

        var world = config.world;
        if (!world) {
            var worldConfig = config.worldConfig || {};
            worldConfig.gravity                    = worldConfig.gravity || 9.8;
            worldConfig.contactEquationStiffness   = worldConfig.contactEquationStiffness || 1e7;
            worldConfig.frictionEquationStiffness  = worldConfig.frictionEquationStiffness || 1e7;
            worldConfig.contactEquationRelaxation  = worldConfig.contactEquationRelaxation || 3;
            worldConfig.frictionEquationRelaxation = worldConfig.frictionEquationRelaxation || 3;
            worldConfig.iterations                 = worldConfig.iterations || 8;

            world = new CANNON.World();
            world.gravity.set( 0, -worldConfig.gravity, 0 );
            world.broadphase = new CANNON.SAPBroadphase( world );
            world.defaultContactMaterial.contactEquationStiffness   = worldConfig.contactEquationStiffness;
            world.defaultContactMaterial.frictionEquationStiffness  = worldConfig.frictionEquationStiffness;
            world.defaultContactMaterial.contactEquationRelaxation  = worldConfig.contactEquationRelaxation;
            world.defaultContactMaterial.frictionEquationRelaxation = worldConfig.frictionEquationRelaxation;
            world.solver.iterations = worldConfig.iterations;
        }
        this.world = world;

        var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera = camera;

        var renderer = new THREE.WebGLRenderer(rendererOptions);
        this.renderer = renderer;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        if (useShadowMap) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        var domElement = this.renderer.domElement;
        document.body.appendChild(domElement);
        domElement.id = 'renderer';

        var vrEffect = new THREE.VREffect(this.renderer);
        this.vrEffect = vrEffect;
        this.vrEffect.setSize(window.innerWidth, window.innerHeight);

        this.vrControls = new THREE.VRControls(this.camera);
        this.vrControls.enabled = true;

        if (useWebVRBoilerplate) {
            this.vrManager = new WebVRManager(this.renderer, this.vrEffect, {
                hideButton: false
            });
        } else {
            // TODO: HTML/CSS interface
            this.vrManager = ( function () {
                var mode = 0;
                var onFullscreenChange = function () {
                    mode = 1 - mode;
                    vrEffect.setSize(window.innerWidth, window.innerHeight);
                };
                document.addEventListener('webkitfullscreenchange', onFullscreenChange);
                document.addEventListener('mozfullscreenchange', onFullscreenChange);
                window.addEventListener('keydown', function (evt) {
                    if (evt.keyCode === 70) { // F
                        vrEffect.setFullScreen((mode === 0));
                    }
                });
                return {
                    isVRMode: function () {
                        return mode === 1;
                    },
                    render: function (scene, camera, t) {
                        if (mode === 1) vrEffect.render(scene, camera);
                        else renderer.render(scene, camera);
                    }
                };
            } )();
        }

        this.toggleVRControls = function () {
            if (this.vrControls.enabled) {
                this.vrControls.enabled = false;
                this.camera.position.set(0, 0, 0);
                this.camera.quaternion.set(0, 0, 0, 1);
            } else {
                this.vrControls.enabled = true;
                // this.vrControls.update();
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


        renderer.domElement.requestPointerLock = renderer.domElement.requestPointerLock || renderer.domElement.mozRequestPointerLock || renderer.domElement.webkitRequestPointerLock;
        function requestPointerLock() {
            if (renderer.domElement.requestPointerLock) {
                renderer.domElement.requestPointerLock();
            }
        }
        function releasePointerLock() {
            document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
            if (document.exitPointerLock) {
                document.exitPointerLock();
            }
        }
        var fullscreenchange = this.renderer.domElement.mozRequestFullScreen ? 'mozfullscreenchange' : 'webkitfullscreenchange';
        document.addEventListener(fullscreenchange, function ( event ) {
            if (this.vrManager.isVRMode()) {
                this.vrControls.enabled = true;
            }
            var fullscreen = !(document.webkitFullscreenElement === null || document.mozFullScreenElement === null);
            if (!fullscreen) {
                releasePointerLock();
            } else {
                requestPointerLock();
            }
        }.bind(this));


        this.start = function(animate) {
            function waitForResources(t) {
                if (THREE.py.isLoaded()) {
                    THREE.py.CANNONize(scene, world);
                    for (var i = 0; i < 240*2; i++) {
                        world.step(1/240);
                    }
                    requestAnimationFrame(animate);
                } else {
                    requestAnimationFrame(waitForResources);
                }
            }
            waitForResources(0);
        };

    }

    return WebVRApplication;
} )();
;
THREE.py = ( function () {
    "use strict";
    var manager = new THREE.LoadingManager();
    var isLoaded_ = true;
    manager.onLoad = function () {
        isLoaded_ = true;
    };
    var objectLoader = new THREE.ObjectLoader(manager),
        imageLoader = new THREE.ImageLoader(manager),
        textureLoader = new THREE.TextureLoader(manager),
        cubeTextureLoader = new THREE.CubeTextureLoader(manager);

    function isLoaded() {
        return isLoaded_;
    }

    function load(url, onLoad) {
        // TODO:
    }

    function parse(json, texturePath, onLoad) {
        if (texturePath) {
            objectLoader.setTexturePath(texturePath);
        }

        isLoaded_ = false;
        function onLoad_(obj) {
            loadHeightfields(obj);
            obj.traverse( function (node) {
                if (node instanceof THREE.Mesh) {
                    node.geometry.computeBoundingSphere();
                    node.geometry.computeBoundingBox();
                    if (node.userData && node.userData.visible === false) {
                        node.visible = false;
                    }
                    if (!(node.geometry instanceof THREE.SphereBufferGeometry)) {
                        // makes seams appear on spherebuffergeometries due to doubled vertices at phi=0=2*pi
                        //node.geometry.computeVertexNormals();
                    }
                    if (node.material.shading === THREE.FlatShading)
                        node.geometry.computeFaceNormals();
                }
            } );
            isLoaded_ = true;
            if (onLoad) {
                onLoad(obj);
            }
        }

        if (json.materials) {
            json.materials.forEach( function (mat) {
                if (mat.type.endsWith("ShaderMaterial") && mat.uniforms) {
                    var uniforms = mat.uniforms;
                    for (var key in uniforms) {
                        var uniform = uniforms[key];
                        if (uniform.type === 't') {
                            if (Array.isArray(uniform.value) && uniform.value.length == 6) {
                                // texture cube specified by urls
                                uniform.value = cubeTextureLoader.load(uniform.value);
                            } else
                            if (typeof uniform.value === 'string') {
                                // single texture specified by url
                                uniform.value = textureLoader.load(uniform.value);
                            }
                        }
                    }
                }
            } );
        }

        // filter out geometries that ObjectLoader doesn't handle:
        var geometries = objectLoader.parseGeometries(json.geometries.filter(function (geom) {
            return geom.type !== "TextGeometry" && geom.type !== 'HeightfieldBufferGeometry';
        }));
        // construct and insert geometries that ObjectLoader doesn't handle
        json.geometries.forEach( function (geom) {
            if (geom.type == "TextGeometry") {
                var geometry = new THREE.TextGeometry(geom.text, geom.parameters);
                geometry.uuid = geom.uuid;
                if (geom.name !== undefined) geometry.name = geom.name;
                geometries[geom.uuid] = geometry;
            }
        } );
        var images = objectLoader.parseImages(json.images, function () {onLoad_(object);});
        var textures = objectLoader.parseTextures(json.textures, images);
        var materials = objectLoader.parseMaterials(json.materials, textures);
        var object = objectLoader.parseObject(json.object, geometries, materials);


        if (json.images === undefined || json.images.length === 0) {
            onLoad_(object);
        }

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

        return object;
    }

    function CANNONize(obj, world) {
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
            var bodies;
            if (node.body) {
                return node.body;
            }
            if (node instanceof THREE.Mesh) {
                var params = {mass: cannonData.mass,
                              position: node.position,
                              quaternion: node.quaternion};
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
                        position,
                        array;
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
                                for (var i = 0; i < array.length; i += 3) {
                                    points.push(new CANNON.Vec3(array[i], array[i+1], array[i+2]));
                                }
                                array = node.geometry.index.array;
                                for (i = 0; i < array.length; i += 3) {
                                    var face = [array[i], array[i+1], array[i+2]];
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
                            var quaternion = new CANNON.Quaternion();
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
                                for (var iv = 0; iv < node.geometry.vertices.length; iv++) {
                                    var vert = node.geometry.vertices[iv];
                                    vertices.push(vert.x, vert.y, vert.z);
                                }
                                indices = [];
                                for (var iface = 0; iface < node.geometry.faces.length; iface++) {
                                    var face = node.geometry.faces[iface];
                                    indices.push(face.a, face.b, face.c);
                                }
                            }
                            shape = new CANNON.Trimesh(vertices, indices);
                            break;
                        case 'Ellipsoid':
                            // TODO
                            console.log('TODO');
                            break;
                        default:
                            console.log("unknown shape type: " + e);
                            break;
                    }
                    body.addShape(shape, position, quaternion);
                });
                node.body = body;
                return body;
            } else if (node instanceof THREE.Object3D) {
                bodies = [];
                node.children.forEach(function (c) { bodies.push(makeCANNON(c, cannonData)); });
                return bodies;
            } else {
                console.log("makeCANNON error");
            }
        }
    }

    var TextGeomMesher = ( function () {

        var alphas = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var digits = "0123456789";
        var symbols = ",./;'[]\\-=<>?:\"{}|_+~!@#$%^&*()";
        var chars = alphas + digits + symbols;

        function TextGeomMesher(material, parameters) {
            this.material = material || new THREE.MeshBasicMaterial({color: 0xff2201});
            this.geometries = {};
            this.meshes = {};
            parameters = parameters || {size: 0.2, height: 0, font: 'anonymous pro', curveSegments: 2};
            for (var i = 0; i < chars.length; i++) {
                var c = chars[i];
                var geom = new THREE.TextGeometry(c, parameters);
                var bufferGeom = new THREE.BufferGeometry();
                bufferGeom.fromGeometry(geom);
                geom.dispose();
                this.geometries[c] = bufferGeom;
                this.meshes[c] = new THREE.Mesh(geom, this.material);
            }
            var lineMeshBuffer = {};
            this.makeMesh = function (text, material) {
                material = material || this.material;
                var mesh = new THREE.Object3D();
                var lines = text.split(/\n/);
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    var lineMesh = lineMeshBuffer[line];
                    if (lineMesh) {
                        var clone = lineMesh.clone();
                        clone.position.y = 0;
                        mesh.add(clone);
                    }
                    else {
                        lineMesh = new THREE.Object3D();
                        mesh.add(lineMesh);
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
                // scroll lines:
                for (i = 0; i < mesh.children.length; i++) {
                    var child = mesh.children[i];
                    child.position.y = (mesh.children.length - i) * 1.6*parameters.size;
                }
                return mesh;
            }.bind(this);
        }

        return TextGeomMesher;
    } )();


    return {
        load:           load,
        parse:          parse,
        CANNONize:      CANNONize,
        isLoaded:       isLoaded,
        TextGeomMesher: TextGeomMesher,
        config:         window.THREE_PY_CONFIG || {}
    };
} )();
;
function setupMouse(parent, position, particleTexture, onpointerlockchange) {
    "use strict";
    position = position || new THREE.Vector3(0, 0, -2);
    var numParticles = 50;
    particleTexture = particleTexture || '/images/mouseParticle.png';
    var mouseParticleGroup = new SPE.Group({
        texture: {value: THREE.ImageUtils.loadTexture(particleTexture)},
        maxParticleCount: numParticles
    });
    var mouseParticleEmitter = new SPE.Emitter({
        maxAge: {value: 0.5},
        position: {value: new THREE.Vector3(0, 0, 0),
                   spread: new THREE.Vector3(0, 0, 0)},
        velocity: {value: new THREE.Vector3(0, 0, 0),
                   spread: new THREE.Vector3(0.4, 0.4, 0.4)},
        color: {value: [new THREE.Color('blue'), new THREE.Color('red')]},
        opacity: {value: [1, 0.1]},
        size: {value: 0.1},
        particleCount: numParticles
    });
    mouseParticleGroup.addEmitter(mouseParticleEmitter);

    var mousePointerMesh = mouseParticleGroup.mesh;

    parent.add(mousePointerMesh);
    mousePointerMesh.position.copy(position);

    // mousePointerMesh.visible = true;
    mousePointerMesh.visible = false;

    if ("onpointerlockchange" in document) {
      document.addEventListener('pointerlockchange', lockChangeAlert, false);
    } else if ("onmozpointerlockchange" in document) {
      document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    } else if ("onwebkitpointerlockchange" in document) {
      document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
    }
    function lockChangeAlert() {
        if ( document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement ) {
            pyserver.log('pointer lock status is now locked');
            //mousePointerMesh.visible = true;
            if (onpointerlockchange) {
                onpointerlockchange(true);
            }
        } else {
            pyserver.log('pointer lock status is now unlocked');
            //mousePointerMesh.visible = false;
            if (onpointerlockchange) {
                onpointerlockchange(false);
            }
        }
    }

    var xMax = 2, xMin = -2,
        yMax = 1.25, yMin = -1;
    window.addEventListener("mousemove", function (evt) {
        if (!mousePointerMesh.visible) return;
        var dx = evt.movementX,
            dy = evt.movementY;
        if (dx) {
            mousePointerMesh.position.x += 0.0005*dx;
            mousePointerMesh.position.y -= 0.0005*dy;
            if      (mousePointerMesh.position.x > xMax) mousePointerMesh.position.x = xMax;
            else if (mousePointerMesh.position.x < xMin) mousePointerMesh.position.x = xMin;
            if      (mousePointerMesh.position.y > yMax) mousePointerMesh.position.y = yMax;
            else if (mousePointerMesh.position.y < yMin) mousePointerMesh.position.y = yMin;
        }
    });
    window.addEventListener("mousedown", function (evt) {
        if (!mousePointerMesh.visible) return;
        if (picked && picked.onSelect) {
            picked.onSelect();
        }
    });

    var pickables,
        picked;
    function setPickables(p) {
        pickables = p;
    }

    var origin = new THREE.Vector3();
    var direction = new THREE.Vector3();
    var raycaster = new THREE.Raycaster();
    var lt = 0;
    function animateMousePointer(t, camera) {
        var dt = 0.001*(t - lt);
        if (mousePointerMesh.visible) {
            mouseParticleGroup.tick(dt);
            if (pickables && camera) {
                origin.set(0, 0, 0);
                direction.set(0, 0, 0);
                direction.subVectors(mousePointerMesh.localToWorld(direction), camera.localToWorld(origin)).normalize();
                raycaster.set(origin, direction);
                var intersects = raycaster.intersectObjects(pickables);
                if (intersects.length > 0) {
                    if (picked != intersects[0].object) {
                        if (picked) picked.material.color.setHex(picked.currentHex);
                        picked = intersects[0].object;
                        picked.currentHex = picked.material.color.getHex();
                        picked.material.color.setHex(0xff4444); //0x44ff44);
                    }
                } else {
                    if (picked) picked.material.color.setHex(picked.currentHex);
                    picked = null;
                }
            }
        }
        lt = t;
    }

    return {
        animateMousePointer: animateMousePointer,
        setPickables       : setPickables,
        mousePointerMesh   : mousePointerMesh
    };
}
;
var TextGeomLogger = (function () {
    "use strict";
    var alphas = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var digits = "0123456789";
    var symbols = ",./;'[]\\-=<>?:\"{}|_+~!@#$%^&*()";
    var chars = alphas + digits + symbols;

    function TextGeomLogger(material, options) {
        material = material || new THREE.MeshBasicMaterial({color: 0xff2201});
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

        var nrows = options.nrows || 7;
        //var ncols = options.ncols || 80;

        var lineMeshBuffer = {};

        this.root = new THREE.Object3D();

        this.log = function (msg) {
            var lines = msg.split(/\n/);
            // create / clone new lines:
            for (var i = 0; i < lines.length; i++) {
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
                child.position.y = (this.root.children.length - i) * 1.6*textGeomParams.size;
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

    return TextGeomLogger;

})();
;
function addTool(parent, world, options) {
    /*************************************

    parent: THREE.Object3D
    world : CANNON.World

    returns: stuff

    *************************************/
    "use strict";
    options = options || {};

    var toolLength = options.toolLength || 0.5;
    var toolRadius = options.toolRadius || 0.013;
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

    var handOffset = options.handOffset || new THREE.Vector3().copy(toolOffset);
    var handRotation = options.handRotation || toolRotation;

    var toolTime  = options.toolTime  || 0.25;
    var toolTimeB = options.toolTimeB || toolTime + 0.5;
    var toolTimeC = options.toolTimeC || toolTimeB + 1.5;

    var minConfidence = options.minConfidence || 0.3;

    var interactionBoxOpacity   = options.interactionBoxOpacity || (options.useBasicMaterials === false ? 0.1 : 0.25);
    var interactionPlaneOpacity = options.interactionPlaneOpacity || interactionBoxOpacity;


    var keyboard = options.keyboard;
    var gamepad = options.gamepad;

    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});

    var scalar;
    var transformOptions = options.transformOptions;
    if (transformOptions) {
        leapController.use('transform', transformOptions);
        pyserver.log("transformOptions =\n" + JSON.stringify(transformOptions, undefined, 2));
        if (transformOptions.vr === true) {
            toolOffset.set(0, 0, 0);
            toolRotation = 0;
            handOffset.set(0, 0, 0);
        }
        scalar = 1; // transform plugin takes care of scaling
    } else {
        scalar = 0.001;
    }

    // leap motion event callbacks:
    var onConnect = options.onConnect || function () {
        pyserver.log('Leap Motion WebSocket connected');
    };
    leapController.on('connect', onConnect);
    if (options.onStreamingStarted) {
        leapController.on('streamingStarted', options.onStreamingStarted);
    }
    if (options.onStreamingStopped) {
        leapController.on('streamingStopped', options.onStreamingStopped);
    }

    leapController.connect();

    // three.js tool: ########################################################################
    var toolRoot = new THREE.Object3D();
    toolRoot.position.copy(toolOffset);
    toolRoot.scale.set(scalar, scalar, scalar);
    parent.add(toolRoot);
    var UP = new THREE.Vector3(0, 1, 0);
    toolRoot.quaternion.setFromAxisAngle(UP, toolRotation);

    // interaction box visual guide:
    var boxGeom = new THREE.BoxGeometry(1/scalar, 1/scalar, 1/scalar);
    var interactionBoxGeom = new THREE.BufferGeometry();
    interactionBoxGeom.fromGeometry(boxGeom);
    boxGeom.dispose();
    var interactionBoxMaterial = new THREE.MeshBasicMaterial({color: 0x00dd44, transparent: true, opacity: interactionBoxOpacity, side: THREE.BackSide});
    var interactionBoxMesh = new THREE.Mesh(interactionBoxGeom, interactionBoxMaterial);
    toolRoot.add(interactionBoxMesh);
    var interactionPlaneMaterial = new THREE.MeshBasicMaterial({color: 0x00dd44, transparent: true, opacity: interactionPlaneOpacity});
    var interactionPlaneGeom = new THREE.PlaneBufferGeometry(1/scalar, 1/scalar);
    var interactionPlaneMesh = new THREE.Mesh(interactionPlaneGeom, interactionPlaneMaterial);
    interactionPlaneMesh.position.z = 1/2/scalar - 1/3/scalar;
    interactionBoxMesh.add(interactionPlaneMesh);
    interactionPlaneMesh = interactionPlaneMesh.clone();
    interactionPlaneMesh.position.z = 1/2/scalar - 2/3/scalar;
    interactionBoxMesh.add(interactionPlaneMesh);
    // leap motion controller:
    boxGeom = new THREE.BoxGeometry(0.0254*3/scalar, 0.0254*0.5/scalar, 0.0254*1.2/scalar);
    var leapGeom = new THREE.BufferGeometry();
    leapGeom.fromGeometry(boxGeom);
    boxGeom.dispose();
    var leapMaterial;
    if (options.useBasicMaterials) {
        leapMaterial = new THREE.MeshBasicMaterial({color: 0x777777});
    } else {
        leapMaterial = new THREE.MeshLambertMaterial({color: 0x777777});
    }
    var leapMesh = new THREE.Mesh(leapGeom, leapMaterial);
    leapMesh.position.y = 0.0254*0.25/scalar;
    toolRoot.add(leapMesh);

    var stickGeom = new THREE.CylinderGeometry(toolRadius/scalar, toolRadius/scalar, toolLength/scalar, 10, 1, false);
    stickGeom.translate(0, -toolLength/scalar / 2, 0);
    var bufferGeom = new THREE.BufferGeometry();
    bufferGeom.fromGeometry(stickGeom);
    stickGeom.dispose();
    stickGeom = bufferGeom;

    var stickMaterial;
    var stickColor = 0xeebb99;
    var tipColor = 0x004488;
    var tipMaterial;
    if (options.useBasicMaterials) {
        stickMaterial = new THREE.MeshBasicMaterial({color: stickColor, side: THREE.DoubleSide, transparent: true});
        tipMaterial = new THREE.MeshBasicMaterial({color: tipColor, transparent: true});
    }
    else {
        stickMaterial = new THREE.MeshLambertMaterial({color: stickColor, side: THREE.DoubleSide, transparent: true});
        tipMaterial = new THREE.MeshLambertMaterial({color: tipColor, transparent: true});
    }
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    toolRoot.add(stickMesh);

    var tipBody = new CANNON.Body({mass: toolMass, type: CANNON.Body.KINEMATIC});
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
    toolRoot.visible = false;

    // three.js hands: ############################
    // hands don't necessarily correspond the left / right labels, but doesn't matter to me because they look indistinguishable
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    leftRoot.position.copy(handOffset);
    leftRoot.scale.set(scalar, scalar, scalar);
    rightRoot.position.copy(handOffset);
    rightRoot.scale.set(scalar, scalar, scalar);
    var handRoots = [leftRoot, rightRoot];
    parent.add(leftRoot);
    parent.add(rightRoot);
    // leftRoot.visible = rightRoot.visible = false;

    var handMaterial = new THREE.MeshBasicMaterial({color: 0x113399, transparent: true, opacity: 0});
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

    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    var velocity = new THREE.Vector3();

    // TODO: restructure w/ mixin pattern
    function animateLeap(frame, dt) {

        var interactionBox = frame.interactionBox;
        if (interactionBox.valid) {
            interactionBoxMesh.position.fromArray(interactionBox.center);
            interactionBoxMesh.scale.set(interactionBox.width*scalar, interactionBox.height*scalar, interactionBox.depth*scalar);
        }

        if (frame.tools.length === 1) {

            var tool = frame.tools[0];

            if (tool.timeVisible > toolTime) {

                // position.fromArray(tool.tipPosition);
                position.fromArray(tool.stabilizedTipPosition);

                stickMesh.position.copy(position);

                direction.fromArray(tool.direction);

                stickMesh.quaternion.setFromUnitVectors(UP, direction);

                if (tool.timeVisible > toolTimeB) {

                    if (tipBody.sleepState === CANNON.Body.SLEEPING) {
                        // cue becomes collidable
                        tipBody.wakeUp();
                        // TODO: indicator (particle effect)
                        tipMaterial.color.setHex(0xff0000);
                    }

                    toolRoot.localToWorld(position);
                    tipBody.position.copy(position);

                    tipBody.quaternion.copy(stickMesh.getWorldQuaternion());

                    velocity.fromArray(tool.tipVelocity);
                    toolRoot.localToWorld(velocity);
                    velocity.sub(toolRoot.getWorldPosition());
                    // velocity.multiplyScalar(0.5);
                    tipBody.velocity.copy(velocity);

                    if (interactionBoxMaterial.opacity > 0.1 && tool.timeVisible > toolTimeC) {
                        // dim the interaction box:
                        interactionBoxMaterial.opacity *= 0.93;
                        interactionPlaneMaterial.opacity = interactionBoxMaterial.opacity;
                    }

                }

                if (toolRoot.visible === false || stickMaterial.opacity !== 1) {
                    toolRoot.visible = true;
                    stickMaterial.opacity = tipMaterial.opacity = 1;
                    interactionBoxMaterial.opacity = interactionBoxOpacity;
                    interactionPlaneMaterial.opacity = interactionPlaneOpacity;
                }

            }

        } else if (tipBody.sleepState === CANNON.Body.AWAKE) {

            tipBody.sleep();
            tipMaterial.color.setHex(tipColor);

        } else {

            // fade out stick
            if (tipMaterial.opacity > 0.1) {
                stickMaterial.opacity *= 0.9;
                tipMaterial.opacity = stickMaterial.opacity;
                interactionBoxMaterial.opacity *= 0.9;
                interactionPlaneMaterial.opacity = interactionBoxMaterial.opacity;
            } else {
                toolRoot.visible = false;
            }

        }

        leftRoot.visible = rightRoot.visible = false;
        for (var i = 0; i < frame.hands.length; i++) {
            var hand = frame.hands[i];
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
                    var finger = hand.fingers[j];
                    fingerTips[i][j].position.fromArray(finger.tipPosition);
                    joints[i][j].position.fromArray(finger.bones[1].nextJoint);
                    joint2s[i][j].position.fromArray(finger.bones[2].nextJoint);
                }
            }
        }


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
        if (toolDrive !== 0 || toolStrafe !== 0 || toolFloat !== 0 || rotateToolCW !== 0) {
            toolRoot.position.x += 0.2  * dt * toolStrafe;
            toolRoot.position.z += -0.2 * dt * toolDrive;
            toolRoot.position.y += 0.2  * dt * toolFloat;
            leftRoot.position.copy(toolRoot.position);
            rightRoot.position.copy(toolRoot.position);
            toolRoot.rotation.y += 0.15 * dt * rotateToolCW;
            leftRoot.rotation.y = rightRoot.rotation.y = toolRoot.rotation.y;

            if (toolRoot.visible === false || stickMaterial.opacity !== 1) {
                toolRoot.visible = true;
                stickMaterial.opacity = tipMaterial.opacity = 1;
                interactionBoxMaterial.opacity = interactionBoxOpacity;
                interactionPlaneMaterial.opacity = interactionPlaneOpacity;
            }
        }
    }

    // leapController.on('frame', animateLeap);

    return {
        stickMesh: stickMesh,
        tipMesh: tipMesh,
        tipBody: tipBody,
        toolRoot: toolRoot,
        leapController: leapController,
        animateLeap: animateLeap,
        leftRoot: leftRoot,
        rightRoot: rightRoot
    };
}
;
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


    // this.playSound = function (url, loop) {
    //     var source = audioContext.createBufferSource();
    //     source.loop = (loop === true);
    //     source.connect(gainNode);
    //     var request = new XMLHttpRequest();
    //     request.responseType = 'arraybuffer';
    //     request.open('GET', url, true);
    //     request.onload = function() {
    //         audioContext.decodeAudioData(request.response).then(function(buffer) {
    //             source.buffer = buffer;
    //             source.start(0);
    //         });
    //     };
    //     request.send();
    // };
;
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
        console.log("speechSynthesis not supported");
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
/* global pyserver */
function addGfxTablet(width, height, logger) {
    "use strict";
    if (pyserver.config.WEBSOCKETS.indexOf('/gfxtablet') == -1) {
        pyserver.log('configure pyserver to open gfxtablet websocket at /gfxtablet');
        return;
    }
    width = width || 2560 / 2;
    height = height || 1600 / 2;

    var socket = new WebSocket('ws://' + document.domain + ':' + location.port + '/gfxtablet');

    var gfxtabletCanvas = document.createElement('canvas');
    gfxtabletCanvas.width = width;
    gfxtabletCanvas.height = height;
    var aspect = gfxtabletCanvas.width / gfxtabletCanvas.height;
    var texture = new THREE.Texture(gfxtabletCanvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
                                    THREE.LinearFilter, THREE.LinearFilter);

    var paintableMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture});

    var image = paintableMaterial.map.image;
    var ctx = image.getContext('2d');
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, gfxtabletCanvas.width, gfxtabletCanvas.height);

    var scale = 2;
    paintableMaterial.map.needsUpdate = true;

    var cursorMaterial = new THREE.MeshBasicMaterial({color: 0xee9966});
    cursorMaterial.transparent = true;
    cursorMaterial.opacity = 0.666;
    var cursor = new THREE.Mesh(new THREE.CircleGeometry(0.02), cursorMaterial);
    canvasMesh.add(cursor);
    cursor.position.z = 0.01;
    cursor.visible = false;

    ctx.lineCap = 'round';
    //ctx.lineJoin = stroke.join;
    //ctx.miterLimit = stroke.miterLimit;

    function drawStroke (points) {
        if (points.length === 0)
            return;
        var start = points[0];
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,255,50,0.92)'; //stroke.color;
        ctx.lineWidth = start.p * 10; //normalizeLineSize(stroke.size);
        ctx.moveTo(gfxtabletCanvas.width * start.x, gfxtabletCanvas.height * start.y);
        for (var j = 1; j < points.length; j++) {
            var end = points[j];
            ctx.lineTo(gfxtabletCanvas.width * end.x, gfxtabletCanvas.height * end.y);
        }
        ctx.stroke();
    }

    function circle(x, y, r, c, o) {
        var opacity = o || 1;
        ctx.beginPath();
        var rad = ctx.createRadialGradient(x, y, r/2, x, y, r);
        rad.addColorStop(0, 'rgba('+c+','+opacity+')');
        rad.addColorStop(0.5, 'rgba('+c+','+opacity+')');
        rad.addColorStop(1, 'rgba('+c+',0)');
        ctx.fillStyle = rad;
        ctx.arc(x, y, r, 0, Math.PI*2, false);
        ctx.fill();
        ctx.closePath();
    }

    socket.onopen = function () {
        logger.log("GfxTable WebSocket opened");
    };
    socket.onerror = function (error) {
        logger.log("could not connect to GfxTablet WebSocket");
    };
    var points = [];
    var stroking = false;
    var NP = 2;
    socket.onmessage = function (message) {
        var data = JSON.parse(message.data);
        if (data.p > 0) {
            points.push(data);
            // circle(gfxtabletCanvas.width * data.x, gfxtabletCanvas.height * data.y,
            //     2 + 50*data.p * data.p, '255,0,0', 0.1 + 0.9 * data.p);
            if (points.length > NP) {
                drawStroke(points);
                paintableMaterial.map.needsUpdate = true;
                points.splice(0, NP);
            }
        }
        if (data.button !== undefined) {
            if (data.button_down === 0) {
                drawStroke(points);
                stroking = false;
                paintableMaterial.map.needsUpdate = true;
                points = [];
            } else {
                stroking = true;
            }
        }
        if (stroking) {
            cursor.visible = false;
        } else {
            cursor.visible = true;
            cursor.position.x = -aspect * scale / 2 + aspect * scale * data.x;
            cursor.position.y = scale / 2 - scale * data.y;
        }
    };

    return {paintableMaterial: paintableMaterial,
            cursor: cursor};
}

// var canvasMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(scale * aspect, scale), paintableMaterial);
// canvasMesh.position.z = -4;
;
var pyserver;
if (!POOLVR.config.pyserver) {
    pyserver = {log: function (msg) { console.log('pyserver.log: ' + msg); },
                readFile: function () {},
                writeFile: function () {}};
} else {
    pyserver = {
        log: function (msg, success) {
            "use strict";
            // console.log('pyserver.log: ' + msg);
            var xhr = new XMLHttpRequest();
            var data = new FormData();
            data.append("msg", msg);
            xhr.open("POST", '/log');
            xhr.onload = function() {
                var response = JSON.parse(xhr.responseText);
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
}
;
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


var userAgent = navigator.userAgent;


POOLVR.keyboardCommands = {
    turnLeft: {buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
    turnRight: {buttons: [Primrose.Input.Keyboard.RIGHTARROW]},
    driveForward: {buttons: [-Primrose.Input.Keyboard.W]},
    driveBack: {buttons: [Primrose.Input.Keyboard.S]},
    strafeLeft: {buttons: [-Primrose.Input.Keyboard.A]},
    strafeRight: {buttons: [Primrose.Input.Keyboard.D]},
    floatUp: {buttons: [Primrose.Input.Keyboard.E, Primrose.Input.Keyboard.NUMBER9]},
    floatDown: {buttons: [-Primrose.Input.Keyboard.C, -Primrose.Input.Keyboard.NUMBER3]},
    moveToolUp:        {buttons: [Primrose.Input.Keyboard.O]},
    moveToolDown:      {buttons: [Primrose.Input.Keyboard.PERIOD]},
    moveToolForwards:  {buttons: [Primrose.Input.Keyboard.I]},
    moveToolBackwards: {buttons: [Primrose.Input.Keyboard.K]},
    moveToolLeft:      {buttons: [Primrose.Input.Keyboard.J]},
    moveToolRight:     {buttons: [Primrose.Input.Keyboard.L]},
    rotateToolCW:    {buttons: [Primrose.Input.Keyboard.U]},
    rotateToolCCW:   {buttons: [Primrose.Input.Keyboard.Y]},

    resetTable: {buttons: [Primrose.Input.Keyboard.R],
                 commandDown: function(){POOLVR.resetTable();}, dt: 0.5},

    autoPosition: {buttons: [Primrose.Input.Keyboard.P],
                   commandDown: function(){POOLVR.autoPosition(avatar);}, dt: 0.5},

    toggleVRControls: {buttons: [Primrose.Input.Keyboard.V],
                       commandDown: function(){app.toggleVRControls();}, dt: 0.25},

    toggleWireframe: {buttons: [Primrose.Input.Keyboard.NUMBER0],
                      commandDown: function(){app.toggleWireframe();}, dt: 0.25},

    resetVRSensor: {buttons: [Primrose.Input.Keyboard.Z],
                    commandDown: function(){app.resetVRSensor();}, dt: 0.25},

    toggleMenu: {buttons: [Primrose.Input.Keyboard.SPACEBAR],
                 commandDown: function(){POOLVR.toggleMenu();}, dt: 0.25},

    saveConfig: {buttons: [Primrose.Input.Keyboard.NUMBER1],
                 commandDown: function(){POOLVR.saveConfig();}, dt: 1.0}
};
POOLVR.keyboardCommands = makeObjectArray(POOLVR.keyboardCommands, 'name');
POOLVR.keyboard = new Primrose.Input.Keyboard("keyboard", window, POOLVR.keyboardCommands);

var DEADZONE = 0.2;
POOLVR.gamepadCommands = {
    strafe: {axes: [Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    drive: {axes: [Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    dheading: {axes: [-Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
    pitch: {axes: [Primrose.Input.Gamepad.LSY], integrate: true, deadzone: DEADZONE,
            max: 0.5 * Math.PI, min: -0.5 * Math.PI},
    float: {axes: [-Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
    toggleFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
                      commandDown: function () { avatar.floatMode = true; },
                      commandUp: function () { avatar.floatMode = false; }},
    toolStrafe: {axes: [Primrose.Input.Gamepad.RSX], deadzone: DEADZONE},
    toolDrive: {axes: [Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toolFloat: {axes: [-Primrose.Input.Gamepad.RSY], deadzone: DEADZONE},
    toolRotY: {axes: [Primrose.Input.Gamepad.RSY], integrate: true, deadzone: DEADZONE,
               max: 2 * Math.PI, min: 0},
    toggleToolFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightStick],
                          commandDown: function () { avatar.toolMode = true; },
                          commandUp: function(){avatar.toolMode=false;}},

    nextBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightBumper],
               commandDown: function () { POOLVR.nextBall = Math.max(1, (POOLVR.nextBall + 1) % 16); },
               dt: 0.5},

    prevBall: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftBumper],
               commandDown: function(){POOLVR.nextBall=Math.max(1,(POOLVR.nextBall-1)%16);},
               dt: 0.5},

    autoPosition: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.Y],
                   commandDown: function(){POOLVR.autoPosition(avatar);}, dt: 0.5},

    resetVRSensor: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                    commandDown: function(){app.resetVRSensor();}, dt: 0.25},

    toggleMenu: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.start],
                 commandDown: function(){POOLVR.toggleMenu();}, dt: 0.25}
};


POOLVR.gamepadCommands = makeObjectArray(POOLVR.gamepadCommands, 'name');
POOLVR.gamepad = new Primrose.Input.Gamepad("gamepad", POOLVR.gamepadCommands);
POOLVR.gamepad.addEventListener("gamepadconnected", function(id) {
    if (!this.isGamepadSet()) {
        this.setGamepad(id);
        console.log("gamepad " + id + " connected");
    }
}.bind(POOLVR.gamepad), false);


// if (!URL_PARAMS.disableLocalStorage) {
//     var localStorageConfig = localStorage.getItem(POOLVR.version);
//     if (localStorageConfig) {
//         pyserver.log("POOLVR.config loaded from localStorage:");
//         pyserver.log(localStorageConfig);
//         POOLVR.config = JSON.parse(localStorageConfig);
//     }
// }


if (POOLVR.config.useShadowMap) {
    POOLVR.config.useBasicMaterials = false;
}

POOLVR.config.toolOptions = POOLVR.config.toolOptions || {};
POOLVR.config.toolOptions.toolLength   = URL_PARAMS.toolLength   || POOLVR.config.toolOptions.toolLength;
POOLVR.config.toolOptions.toolRadius   = URL_PARAMS.toolRadius   || POOLVR.config.toolOptions.toolRadius;
POOLVR.config.toolOptions.toolMass     = URL_PARAMS.toolMass     || POOLVR.config.toolOptions.toolMass;
POOLVR.config.toolOptions.toolOffset   = URL_PARAMS.toolOffset   || POOLVR.config.toolOptions.toolOffset;
POOLVR.config.toolOptions.toolRotation = URL_PARAMS.toolRotation || POOLVR.config.toolOptions.toolRotation;
POOLVR.config.toolOptions.tipShape     = URL_PARAMS.tipShape     || POOLVR.config.toolOptions.tipShape;

pyserver.log('POOLVR.config.toolOptions =\n' + JSON.stringify(POOLVR.config.toolOptions, undefined, 2));
POOLVR.toolOptions = combineObjects(
    POOLVR.config.toolOptions,
    {keyboard: POOLVR.keyboard, gamepad: POOLVR.gamepad, useBasicMaterials: POOLVR.config.useBasicMaterials}
);

// POOLVR.config.vrLeap = URL_PARAMS.vrLeap || POOLVR.config.vrLeap;
// if (POOLVR.config.vrLeap) {
//     // ##### Leap Motion VR tracking mode: #####
//     POOLVR.config.toolOptions.transformOptions = {vr: true, effectiveParent: app.camera};
// }
// toolOptions.onStreamingStarted = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS CONNECTED.  GOOD JOB."); };
// toolOptions.onStreamingStopped = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS DISCONNECTED!  HOW WILL YOU PLAY?!"); };


POOLVR.config.textGeomLogger = URL_PARAMS.textGeomLogger || POOLVR.config.textGeomLogger;


POOLVR.saveConfig = function () {
    "use strict";
    if (POOLVR.config.pyserver) {
        if (window.toolRoot) {
            POOLVR.config.toolOptions.toolOffset = [window.toolRoot.position.x, window.toolRoot.position.y, window.toolRoot.position.z];
            POOLVR.config.toolOptions.toolRotation = window.toolRoot.rotation.y;
        }
        pyserver.writeFile('config.json', POOLVR.config);
    } else {
        localStorage.setItem(POOLVR.version, JSON.stringify(POOLVR.config));
    }
};


POOLVR.ballMeshes = [];
POOLVR.ballBodies = [];
POOLVR.initialPositions = [];
POOLVR.onTable = [false,
                  true, true, true, true, true, true, true,
                  true,
                  true, true, true, true, true, true, true];
POOLVR.nextBall = 1;


POOLVR.resetTable = function () {
    "use strict";
    POOLVR.ballBodies.forEach(function (body, ballNum) {
        body.wakeUp();
        body.position.copy(POOLVR.initialPositions[ballNum]);
        body.velocity.set(0, 0, 0);
        // body.angularVelocity.set(0, 0, 0);
        // body.bounces = 0;
        body.mesh.visible = true;
    });
    if (synthSpeaker.speaking === false) {
        synthSpeaker.speak("Table reset.");
    }
    POOLVR.nextBall = 1;
    textGeomLogger.log("TABLE RESET.");
};


POOLVR.autoPosition = ( function () {
    "use strict";
    var nextVector = new THREE.Vector3();
    var UP = new THREE.Vector3(0, 1, 0);
    function autoPosition(avatar) {
        textGeomLogger.log("YOU ARE BEING AUTO-POSITIONED.");
        // if (synthSpeaker.speaking === false) {
        //     synthSpeaker.speak("You are being auto-positioned.");
        // }

        avatar.heading = Math.atan2(
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.x - POOLVR.ballMeshes[0].position.x),
            -(POOLVR.ballMeshes[POOLVR.nextBall].position.z - POOLVR.ballMeshes[0].position.z)
        );
        avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
        avatar.updateMatrixWorld();

        nextVector.copy(toolRoot.position);
        avatar.localToWorld(nextVector);
        nextVector.sub(POOLVR.ballMeshes[0].position);
        nextVector.y = 0;
        avatar.position.sub(nextVector);
    }
    return autoPosition;
} )();


POOLVR.toggleMenu = function () {
    menu.visible = !menu.visible;
    mouseStuff.mousePointerMesh.visible = menu.visible;
    mouseStuff.setPickables(menu.children);
};


POOLVR.config.useWebVRBoilerplate = URL_PARAMS.useWebVRBoilerplate || POOLVR.config.useWebVRBoilerplate;

var WebVRConfig = WebVRConfig || POOLVR.config.WebVRConfig || {};
WebVRConfig.FORCE_DISTORTION = URL_PARAMS.FORCE_DISTORTION || WebVRConfig.FORCE_DISTORTION;
WebVRConfig.FORCE_ENABLE_VR  = URL_PARAMS.FORCE_ENABLE_VR  || WebVRConfig.FORCE_ENABLE_VR;


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
    restitution: 0.4,
    friction: 0.07
});
POOLVR.tipMaterial            = new CANNON.Material();
POOLVR.tipBallContactMaterial = new CANNON.ContactMaterial(POOLVR.tipMaterial, POOLVR.ballMaterial, {
    restitution: 0.01,
    friction: 0.15,
    contactEquationRelaxation: 3,
    frictionEquationRelaxation: 3
});

POOLVR.setupMaterials = function (world) {
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
};

POOLVR.setupWorld = function (scene, world, tipBody) {
    tipBody.material = POOLVR.tipMaterial;
    // referenced by cannon.js callbacks:
    var ballStripeMeshes = [],
        ballShadowMeshes = [];
    // first pass:
    scene.traverse(function (node) {
        if (node instanceof THREE.Mesh) {
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
            }
            else if (node.name.endsWith('RailMesh')) {
                node.body.material = POOLVR.railMaterial;
            }
        }
    });
    // second pass:
    var H_table     = POOLVR.config.H_table,
        ball_radius = POOLVR.config.ball_diameter / 2;
    scene.traverse(function (node) {
        if (node instanceof THREE.Mesh && node.name.startsWith('ball ')) {
            var ballBum = node.body.ballNum;
            var body = node.body;
            var mesh = node;
            body.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function(evt) {
                var body = evt.body;
                var contact = evt.contact;
                // ball-ball collision:
                if (contact.bi === body && contact.bi.material === contact.bj.material) {
                    var impactVelocity = contact.getImpactVelocityAlongNormal();
                    playCollisionSound(impactVelocity);
                }
            });
            // post step callback: reposition mesh, shadow, stripe
            app.world.addEventListener("postStep", function () {
                this.position.copy(this.body.position);
                var ballNum = this.body.ballNum;
                var stripeMesh = ballStripeMeshes[ballNum];
                if (stripeMesh !== undefined) {
                    stripeMesh.quaternion.copy(this.body.quaternion);
                }
                var shadowMesh = ballShadowMeshes[ballNum];
                if (shadowMesh) {
                    shadowMesh.position.y = -(this.position.y - H_table) + 0.0004;
                }
                // var awakes = false;
                // for (var j = 0; j < ballBodies.length; ++j) {
                //     // if (body.sleepState === CANNON.Body.AWAKE) {
                //     //     awakes = true;
                //     //     doAutoPosition = true;
                //     // }
                // }
            }.bind(mesh));
        }
        else if (node instanceof THREE.Mesh && node.name === 'floorMesh') {
            // ball-floor collision
            node.body.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {
                var body = evt.body;
                if (body.ballNum === 0) {
                    textGeomLogger.log("SCRATCH.");
                    synthSpeaker.speak("Scratch.");
                    body.position.copy(POOLVR.initialPositions[0]);
                    body.velocity.set(0, 0, 0);
                    // i like it when it keeps moving
                    // body.angularVelocity.set(0, 0, 0);
                } else {
                    body.bounces++;
                    if (body.bounces === 1) {
                        textGeomLogger.log(body.mesh.name + " HIT THE FLOOR!");
                        playPocketedSound();
                        POOLVR.onTable[body.ballNum] = false;
                        POOLVR.nextBall = POOLVR.onTable.indexOf(true);
                        if (POOLVR.nextBall === -1) {
                            synthSpeaker.speak("You cleared the table.  Well done.");
                            textGeomLogger.log("YOU CLEARED THE TABLE.  WELL DONE.");
                            POOLVR.resetTable();
                        }
                    } else if (body.bounces === 7) {
                        body.sleep();
                        body.mesh.visible = false;
                        // autoPosition(avatar, 5);
                    }
                }
            });
        }
    });
    var tipEventCounter = 0;
    tipBody.addEventListener(CANNON.Body.COLLIDE_EVENT_NAME, function (evt) {
        tipEventCounter++;
        if (tipEventCounter === 1) {
            synthSpeaker.speak("You moved a ball.  Good job.");
        }
        else if (tipEventCounter === 16) {
            synthSpeaker.speak("Hi.");
        }
    });
    // app.world.addEventListener("postStep", function () {
    //     stickMesh.position.copy(tipBody.position);
    //     stickMesh.parent.worldToLocal(stickMesh.position);
    //     //scene.updateMatrixWorld();
    // });
};
;
var playCollisionSound = (function () {
    "use strict";
    var ballBallBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', '/sounds/ballBall.ogg', true);
    request.onload = function() {
        WebVRSound.audioContext.decodeAudioData(request.response, function(buffer) {
            ballBallBuffer = buffer;
        });
    };
    request.send();
    var playCollisionSound = function (v) {
        WebVRSound.playBuffer(ballBallBuffer, Math.min(1, v / 4));
    };
    return playCollisionSound;
})();

var playPocketedSound = (function () {
    "use strict";
    var ballBallBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', '/sounds/ballPocketed.ogg', true);
    request.onload = function() {
        WebVRSound.audioContext.decodeAudioData(request.response, function(buffer) {
            ballBallBuffer = buffer;
        });
    };
    request.send();
    var playPocketedSound = function () {
        WebVRSound.playBuffer(ballBallBuffer, 1);
    };
    return playPocketedSound;
})();
;
var app;

var avatar = new THREE.Object3D();
var initialPosition = POOLVR.config.initialPosition || [0, 0.9, 0.9];
avatar.position.fromArray(initialPosition);
avatar.heading = 0;
avatar.floatMode = false;
avatar.toolMode = false;

var mouseStuff = setupMouse(avatar, undefined, '../images/mouseParticle.png');

var textGeomLogger = new TextGeomLogger(undefined, {nrows: 20, size: 0.043});
avatar.add(textGeomLogger.root);
textGeomLogger.root.position.set(-1.5, -0.23, -1.8);

var toolRoot;

var menu = setupMenu(avatar);

function setupMenu(parent) {
    "use strict";
    var menu = new THREE.Object3D();
    var material = new THREE.MeshBasicMaterial({color: 0x22ee33});

    var textGeom = new THREE.TextGeometry('RESET TABLE', {font: 'anonymous pro', size: 0.2, height: 0, curveSegments: 2});
    var textMesh = new THREE.Mesh(textGeom, material);
    textMesh.position.set(0, 1, -2);
    menu.add(textMesh);
    textMesh.onSelect = POOLVR.resetTable;

    textGeom = new THREE.TextGeometry('SAVE CONFIG', {font: 'anonymous pro', size: 0.2, height: 0, curveSegments: 2});
    textMesh = new THREE.Mesh(textGeom, material.clone());
    textMesh.position.set(0, 0.7, -2);
    menu.add(textMesh);
    textMesh.onSelect = POOLVR.saveConfig;

    parent.add(menu);
    menu.visible = true;
    return menu;
}


var animate = function (avatar, keyboard, gamepad, leapController, animateLeap,
                        toolRoot, stickMesh,
                        animateMousePointer,
                        useShadowMap) {
    "use strict";
    var H_table = POOLVR.config.H_table;
    if (!useShadowMap) {
        var stickShadow = new THREE.Object3D();
        stickShadow.position.set(stickMesh.position.x,
            (H_table + 0.001 - toolRoot.position.y - avatar.position.y) / toolRoot.scale.y,
            stickMesh.position.z);
        stickShadow.scale.set(1, 0.001, 1);
        toolRoot.add(stickShadow);
        var stickShadowMaterial = new THREE.MeshBasicMaterial({color: 0x002200});
        var stickShadowGeom = stickMesh.geometry.clone();
        var stickShadowMesh = new THREE.Mesh(stickShadowGeom, stickShadowMaterial);
        stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        stickShadow.add(stickShadowMesh);
    }
    var UP = new THREE.Vector3(0, 1, 0);
    var walkSpeed = 0.333,
        floatSpeed = 0.1;
    var lt = 0,
        lastFrameID;
    function animate(t) {
        requestAnimationFrame(animate);
        var dt = (t - lt) * 0.001;
        if (app.vrControls.enabled) {
            app.vrControls.update();
        }
        app.vrManager.render(app.scene, app.camera, t);
        keyboard.update(dt);
        gamepad.update(dt);

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
        if (strafe || drive) {
            var len = walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive +
                strafe * strafe));
            strafe *= len;
            drive *= len;
        } else {
            strafe = 0;
            drive = 0;
        }
        floatUp *= floatSpeed;

        avatar.heading += heading;
        var cosHeading = Math.cos(avatar.heading),
            sinHeading = Math.sin(avatar.heading);
        // if (!app.vrControls.enabled) {
        //     pitch -= 0.8 * dt * (keyboard.getValue("pitchUp") + keyboard.getValue("pitchDown"));
        //     pitchQuat.setFromAxisAngle(RIGHT, pitch);
        // }
        // var cosPitch = Math.cos(pitch),
        //     sinPitch = Math.sin(pitch);

        avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
        avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
        avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
        avatar.position.y += dt * floatUp;


        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {
            animateLeap(frame, dt);
            lastFrameID = frame.id;
        }

        // if (dt < 1/60) {
        //     app.world.step(dt);
        // } else {
        //     app.world.step(1/60, dt, 10);
        // }

        if (!useShadowMap) {
            stickShadow.position.set(stickMesh.position.x,
                (H_table + 0.001 - toolRoot.position.y - avatar.position.y) / toolRoot.scale.y,
                stickMesh.position.z);
            stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        }

        animateMousePointer(t, app.camera);

        lt = t;
    }
    return animate;
};


/* jshint multistr: true */
function onLoad() {
    "use strict";
    pyserver.log("\n\
*********************************************----\n\
*********************************************----\n\
*********************************************----\n\
    ---- starting poolvr CONFIGURATOR... --------\n\
*********************************************----\n\
*********************************************----\n\
*********************************************----\n\
    ---------------------------------------------\n");
    pyserver.log('WebVRConfig =\n' + JSON.stringify(WebVRConfig, undefined, 2));
    pyserver.log('userAgent = ' + userAgent);
    if (navigator.getVRDevices) {
        navigator.getVRDevices().then(function (devices) {
            devices.forEach(function (device, i) {
                pyserver.log('\nVR device ' + i + ': ' + device.deviceName);
                console.log(device);
            });
        });
    }
    pyserver.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    textGeomLogger.log(JSON.stringify(POOLVR.config, undefined, 2));

    var scene = THREE.py.parse(JSON_SCENE);

    if (!POOLVR.config.useBasicMaterials) {
        // would rather add the spot lights via three.py generated JSON_SCENE, but I'm having problems getting shadows frm them:
        var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 10, 90);
        centerSpotLight.position.set(0, 3, 0);
        centerSpotLight.castShadow = true;
        centerSpotLight.shadowCameraNear = 0.01;
        centerSpotLight.shadowCameraFar = 4;
        centerSpotLight.shadowCameraFov = 90;
        scene.add(centerSpotLight);
        // var centerSpotLightHelper = new THREE.SpotLightHelper(centerSpotLight);
        // scene.add(centerSpotLightHelper);
        // centerSpotLightHelper.visible = false;
    }


    var UP = new THREE.Vector3(0, 1, 0);
    var appConfig = combineObjects(POOLVR.config, {
        onResetVRSensor: function (lastRotation, lastPosition) {
            // TODO
            pyserver.log('updating the toolRoot position...');
            //app.camera.updateMatrix();
            avatar.heading += lastRotation - app.camera.rotation.y;
            toolRoot.rotation.y -= (lastRotation - app.camera.rotation.y);
            toolRoot.position.sub(lastPosition);
            toolRoot.position.applyAxisAngle(UP, -lastRotation + app.camera.rotation.y);
            toolRoot.position.add(app.camera.position);
            //toolRoot.updateMatrix();
            avatar.updateMatrixWorld();
        }
    });
    app = new WebVRApplication(scene, appConfig);

    THREE.py.CANNONize(scene, app.world);

    scene.add(avatar);
    avatar.add(app.camera);

    POOLVR.setupMaterials(app.world);

    var toolStuff = addTool(avatar, app.world, POOLVR.toolOptions);
    toolRoot = toolStuff.toolRoot;

    POOLVR.setupWorld(scene, app.world, toolStuff.tipBody);

    app.start( animate(avatar, POOLVR.keyboard, POOLVR.gamepad,
                       toolStuff.leapController,
                       toolStuff.animateLeap,
                       toolStuff.toolRoot,
                       toolStuff.stickMesh,
                       mouseStuff.animateMousePointer,
                       POOLVR.config.useShadowMap) );
}
// ################## poolvr VERSION = "v0.1.0";