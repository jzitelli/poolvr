/*
  poolvr v0.1.0 2015-12-02
  
  Copyright (C) 2015 Jeffrey Zitelli <jeffrey.zitelli@gmail.com> (http://subvr.info)
  http://subvr.info/poolvr
  https://github.com/jzitelli/poolvr.git
*/
WebVRApplication = ( function () {
    function WebVRApplication(name, avatar, scene, config) {
        this.name = name;
        this.avatar = avatar;
        this.scene = scene;
        this.config = config;

        avatar.heading = avatar.heading || 0;
        avatar.pitch = avatar.pitch || 0;

        var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera = camera;

        var renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer = renderer;
        this.renderer.setPixelRatio(window.devicePixelRatio);

        if (config.shadowMap) {
            console.log("shadow mapping enabled");
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        document.body.appendChild(this.renderer.domElement);

        this.vrEffect = new THREE.VREffect(this.renderer);
        this.vrEffect.setSize(window.innerWidth, window.innerHeight);

        this.vrManager = new WebVRManager(this.renderer, this.vrEffect, {
            hideButton: false
        });

        this.vrControls = new THREE.VRControls(this.camera);
        this.vrControls.enabled = false;

        this.resetVRSensor = function () {
            this.vrControls.resetSensor();
        }.bind(this);

        this.toggleVRControls = function () {
            if (this.vrControls.enabled) {
                this.vrControls.enabled = false;
                this.camera.position.set(0, 0, 0);
                this.camera.quaternion.set(0, 0, 0, 1);
            } else {
                this.vrControls.enabled = true;
                this.vrControls.update();
            }
        }.bind(this);

        var wireframeMaterial = new THREE.MeshBasicMaterial({color: 0xeeddaa, wireframe: true});
        this.toggleWireframe = function () {
            if (this.scene.overrideMaterial) {
                console.log("wireframe: off");
                this.scene.overrideMaterial = null;
            } else {
                console.log("wireframe: on");
                this.scene.overrideMaterial = wireframeMaterial;
            }
        }.bind(this);

        // keyboard controls:
        var keyboardCommands = {
            toggleVRControls: {buttons: [Primrose.Input.Keyboard.V],
                               commandDown: this.toggleVRControls.bind(this), dt: 0.25},
            toggleWireframe: {buttons: [Primrose.Input.Keyboard.NUMBER0],
                              commandDown: this.toggleWireframe.bind(this), dt: 0.25},
            resetVRSensor: {buttons: [Primrose.Input.Keyboard.Z],
                            commandDown: this.resetVRSensor.bind(this), dt: 0.25}
        };
        config.keyboardCommands = combineDefaults(config.keyboardCommands || {}, keyboardCommands);
        config.keyboardCommands = Object.keys(config.keyboardCommands).map(function (k) {
            return combineDefaults({name: k}, config.keyboardCommands[k]);
        });
        this.keyboard = new Primrose.Input.Keyboard("keyboard", window, config.keyboardCommands);

        // gamepad controls:
        var gamepadCommands = {
            resetVRSensor: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                            commandDown: this.resetVRSensor.bind(this), dt: 0.25}
        };
        config.gamepadCommands = combineDefaults(config.gamepadCommands || {}, gamepadCommands);
        config.gamepadCommands = Object.keys(config.gamepadCommands).map(function (k) {
            return combineDefaults({name: k}, config.gamepadCommands[k]);
        });
        this.gamepad = new Primrose.Input.Gamepad("gamepad", config.gamepadCommands);
        this.gamepad.addEventListener("gamepadconnected", function(id) {
            if (!this.gamepad.isGamepadSet()) {
                this.gamepad.setGamepad(id);
                console.log("gamepad " + id + " connected");
            }
        }.bind(this), false);

        this.listeners = {'update': []};

        var world;
        if (config.world) {
            world = config.world;
        } else {
            world = new CANNON.World();
            world.gravity.set( 0, -config.gravity, 0 );
            world.broadphase = new CANNON.SAPBroadphase( world );
            world.defaultContactMaterial.contactEquationStiffness   = config.contactEquationStiffness || 1e7;
            world.defaultContactMaterial.frictionEquationStiffness  = config.frictionEquationStiffness || 1e7;
            world.defaultContactMaterial.contactEquationRelaxation  = config.contactEquationRelaxation || 3;
            world.defaultContactMaterial.frictionEquationRelaxation = config.frictionEquationRelaxation || 3;
            world.solver.iterations = 10;
        }
        this.world = world;

        // TODO: needed?
        window.addEventListener("resize", function () {
            // var canvasWidth = window.innerWidth,
            //     canvasHeight = window.innerHeight;
            // this.camera.aspect = canvasWidth / canvasHeight;
            // this.camera.updateProjectionMatrix();
            // this.renderer.setSize(canvasWidth, canvasHeight);
            if (this.vrManager.isVRMode()) {
                this.vrControls.enabled = true;
            }
        }.bind(this), false);

        this.lt = 0;

        this.start = function(animate) {
            function waitForResources(t) {
                if (CrapLoader.isLoaded()) {
                    CrapLoader.CANNONize(scene, world);
                    for (var i = 0; i < 240*2; i++) {
                        world.step(1/240);
                    }
                    this.lt = t;
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
var CrapLoader = ( function () {
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

    function parse(json, texturePath) {
        if (texturePath) {
            objectLoader.setTexturePath(texturePath);
        }
        // TODO: convert all to BufferGeometry?
        function onLoad(obj) {
            obj.traverse( function (node) {
                if (node instanceof THREE.Mesh) {
                    node.geometry.computeBoundingSphere();
                    node.geometry.computeBoundingBox();
                    if (node.userData && node.userData.visible === false) {
                        node.visible = false;
                    }
                    node.geometry.computeVertexNormals();
                    if (node.material.shading === THREE.FlatShading)
                        node.geometry.computeFaceNormals();
                }
            } );
        }
        if (json.materials) {
            json.materials.forEach( function (mat) {
                if (mat.type.endsWith("ShaderMaterial") && mat.uniforms) {
                    var uniforms = mat.uniforms;
                    for (var key in uniforms) {
                        var uniform = uniforms[key];
                        if (uniform.type === 't') {
                            if (Array.isArray(uniform.value) && uniform.value.length == 6) {
                                isLoaded_ = false;
                                // texture cube specified by urls
                                uniform.value = cubeTextureLoader.load(uniform.value);
                            } else
                            if (typeof uniform.value === 'string') {
                                isLoaded_ = false;
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
            return geom.type != "TextGeometry";
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
        var images = objectLoader.parseImages(json.images, function () {
            onLoad(object);
        });
        var textures = objectLoader.parseTextures(json.textures, images);
        var materials = objectLoader.parseMaterials(json.materials, textures);
        var object = objectLoader.parseObject(json.object, geometries, materials);
        if (json.images === undefined || json.images.length === 0) {
            onLoad(object);
        }
        return object;
    }

    var position = new THREE.Vector3();
    function CANNONize(obj, world) {
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
                position.copy(node.position);
                var params = {mass: cannonData.mass,
                              position: node.localToWorld(position),
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
                        position,
                        quaternion,
                        array;
                    switch (e) {
                        case 'Plane':
                            shape = new CANNON.Plane();
                            quaternion = new CANNON.Quaternion();
                            quaternion.setFromEuler(-Math.PI / 2, 0, 0, 'XYZ');
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
                            break;
                        // case 'Trimesh':
                        //     var vertices;
                        //     var indices;
                        //     if (node.geometry instanceof THREE.BufferGeometry) {
                        //         vertices = node.geometry.getAttribute('position').array;
                        //         indices = node.geometry.getAttribute('index').array;
                        //     } else {
                        //         vertices = [];
                        //         for (var iv = 0; iv < node.geometry.vertices.length; iv++) {
                        //             var vert = node.geometry.vertices[iv];
                        //             vertices.push(vert.x, vert.y, vert.z);
                        //         }
                        //         indices = [];
                        //         for (var iface = 0; iface < node.geometry.faces.length; iface++) {
                        //             var face = node.geometry.faces[iface];
                        //             indices.push(face.a, face.b, face.c);
                        //         }
                        //     }
                        //     shape = new CANNON.Trimesh(vertices, indices);
                        //     break;
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

    return {
        parse: parse,
        CANNONize: CANNONize,
        isLoaded: isLoaded
    };

} )();
;
function addTool(parent, world, options) {
    "use strict";
    options = options || {};

    var toolLength = options.toolLength || 0.5;
    var toolRadius = options.toolRadius || 0.013;
    var toolMass   = options.toolMass   || 0.06;

    var toolOffset = options.toolOffset || new THREE.Vector3(0, -0.4, -toolLength - 0.2);
    var handOffset = options.handOffset || new THREE.Vector3(0, -0.25, -0.4);

    var toolTime      = options.toolTime  || 0.25;
    var toolTimeB     = options.toolTimeB || toolTime + 1;
    var minConfidence = options.minConfidence || 0.3;

    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});

    var scalar;
    var transformOptions = options.transformOptions;
    if (transformOptions) {
        leapController.use('transform', transformOptions);
        pyserver.log("transformOptions =\n" + JSON.stringify(transformOptions, undefined, 2));
        if (transformOptions.vr === true) {
            toolOffset.set(0, 0, 0);
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

    // interaction box visual guide:
    var interactionBoxGeom = new THREE.BufferGeometry();
    var boxGeom = new THREE.BoxGeometry(1/scalar, 1/scalar, 1/scalar);
    interactionBoxGeom.fromGeometry(boxGeom);
    boxGeom.dispose();
    var interactionBoxMaterial = new THREE.MeshBasicMaterial({color: 0x992222, transparent: true, opacity: 0.4});
    var interactionBoxMesh = new THREE.Mesh(interactionBoxGeom, interactionBoxMaterial);
    toolRoot.add(interactionBoxMesh);

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
        stickMaterial = new THREE.MeshBasicMaterial({color: stickColor, side: THREE.DoubleSide});
        tipMaterial = new THREE.MeshBasicMaterial({color: tipColor});
    }
    else {
        stickMaterial = new THREE.MeshLambertMaterial({color: stickColor, side: THREE.DoubleSide});
        tipMaterial = new THREE.MeshLambertMaterial({color: tipColor});
    }
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    toolRoot.add(stickMesh);
    var tipMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(0.95*toolRadius/scalar, 10), tipMaterial);
    tipMesh.castShadow = true;
    stickMesh.add(tipMesh);
    // TODO: mass
    var tipBody = new CANNON.Body({mass: toolMass, type: CANNON.Body.KINEMATIC});
    tipBody.addShape(new CANNON.Sphere(toolRadius));
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
    leftRoot.visible = rightRoot.visible = false;

    if (!options.leapHandsDisabled) {
        var handMaterial = new THREE.MeshBasicMaterial({color: 0x113399, transparent: true, opacity: 0});
        // arms:
        var armRadius = 0.0276/scalar,
            armLength = 0.26/scalar;

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
    }

    var UP = new THREE.Vector3(0, 1, 0);
    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    var velocity = new THREE.Vector3();

    function animateLeap(frame, dt) {

        var interactionBox = frame.interactionBox;
        if (interactionBox.valid) {
            interactionBoxMesh.position.fromArray(interactionBox.center);
            interactionBoxMesh.scale.set(interactionBox.width*scalar, interactionBox.height*scalar, interactionBox.depth*scalar);
        }

        if (frame.tools.length === 1) {
            var tool = frame.tools[0];
            if (tool.timeVisible > toolTime) {
                toolRoot.visible = true;
                stickMesh.position.fromArray(tool.tipPosition); // stickMesh.position.fromArray(tool.stabilizedTipPosition);
                direction.fromArray(tool.direction);
                stickMesh.quaternion.setFromUnitVectors(UP, direction);

                if (tool.timeVisible > toolTimeB) {
                    if (tipBody.sleepState === CANNON.Body.SLEEPING) {
                        // cue becomes collidable
                        tipBody.wakeUp();
                        // TODO: indicator (particle effect)
                        tipMaterial.color.setHex(0xff0000);
                    }
                    position.set(0, 0, 0);
                    stickMesh.localToWorld(position);
                    tipBody.position.copy(position);

                    velocity.set(tool.tipVelocity[0] * 0.001, tool.tipVelocity[1] * 0.001, tool.tipVelocity[2] * 0.001);
                    velocity.applyQuaternion(parent.quaternion);
                    tipBody.velocity.copy(velocity);
                }
            }
        } else if (tipBody.sleepState === CANNON.Body.AWAKE) {
            tipBody.sleep();
            tipMaterial.color.setHex(tipColor);
        }

        leftRoot.visible = rightRoot.visible = false;
        for (var i = 0; i < frame.hands.length; i++) {
            var hand = frame.hands[i];
            if (hand.confidence > minConfidence) {
                handRoots[i].visible = true;
                handMaterial.opacity = (hand.confidence - minConfidence) / (1 - minConfidence);
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

    }

    // leapController.on('frame', animateLeap);

    return {
        stickMesh: stickMesh,
        tipMesh: tipMesh,
        tipBody: tipBody,
        toolRoot: toolRoot,
        leapController: leapController,
        animateLeap: animateLeap
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

    return {
        audioContext: audioContext,
        getNextGainNode: getNextGainNode
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

    function SynthSpeaker(options) {
        this.queue = [];
        this.onBegins = [];
        this.onEnds = [];
        this.speaking = false;
        this.utterance = new SpeechSynthesisUtterance();
        options = options || {};
        this.utterance.volume = options.volume || 1;
        this.utterance.rate = options.rate || 1;
        this.utterance.pitch = options.pitch || 1;
        this.utterance.onend = function(event) {
            var onEnd = this.onEnds.shift();
            if (onEnd) {
                onEnd();
            }
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
    }

    SynthSpeaker.prototype.speak = function(text, onEnd, onBegin) {
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
        console.log("speechSynthesis not supported (Chrome only)");
        return function () {
            this.speak = function () {};
        };
    }
} )();
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
        if (params[k].length == 1)
            params[k] = params[k][0];
        if (params[k] === 'true')
            params[k] = true;
        else if (params[k] === 'false')
            params[k] = false;
    }
    return params;
})();


POOLVR.config.keyboardCommands = {
    turnLeft: {buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
    turnRight: {buttons: [Primrose.Input.Keyboard.RIGHTARROW]},
    driveForward: {buttons: [-Primrose.Input.Keyboard.W]},
    driveBack: {buttons: [Primrose.Input.Keyboard.S]},
    strafeLeft: {buttons: [-Primrose.Input.Keyboard.A]},
    strafeRight: {buttons: [Primrose.Input.Keyboard.D]},
    floatUp: {buttons: [Primrose.Input.Keyboard.E, Primrose.Input.Keyboard.NUMBER9]},
    floatDown: {buttons: [-Primrose.Input.Keyboard.C, -Primrose.Input.Keyboard.NUMBER3]},
    moveToolUp:        {buttons: [Primrose.Input.Keyboard.NUMBER7]},
    moveToolDown:      {buttons: [Primrose.Input.Keyboard.NUMBER1]},
    moveToolForwards:  {buttons: [Primrose.Input.Keyboard.NUMBER8]},
    moveToolBackwards: {buttons: [Primrose.Input.Keyboard.NUMBER5]},
    moveToolLeft:      {buttons: [Primrose.Input.Keyboard.NUMBER4]},
    moveToolRight:     {buttons: [Primrose.Input.Keyboard.NUMBER6]}
};

var DEADZONE = 0.2;
POOLVR.config.gamepadCommands = {
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
    toggleToolFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightStick],
                          commandDown: function () { avatar.toolMode = true; },
                          commandUp: function () { avatar.toolMode = false; } }
};



// TODO: load from JSON config
POOLVR.ballMaterial            = new CANNON.Material();
POOLVR.ballBallContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.ballMaterial, {
    restitution: 0.91,
    friction: 0.15
});
POOLVR.playableSurfaceMaterial            = new CANNON.Material();
POOLVR.ballPlayableSurfaceContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.playableSurfaceMaterial, {
    restitution: 0.33,
    friction: 0.17
});
POOLVR.cushionMaterial            = new CANNON.Material();
POOLVR.ballCushionContactMaterial = new CANNON.ContactMaterial(POOLVR.ballMaterial, POOLVR.cushionMaterial, {
    restitution: 0.8,
    friction: 0.13
});
POOLVR.floorMaterial            = new CANNON.Material();
POOLVR.floorBallContactMaterial = new CANNON.ContactMaterial(POOLVR.floorMaterial, POOLVR.ballMaterial, {
    restitution: 0.88,
    friction: 0.4
});

POOLVR.config.mouseEnabled = URL_PARAMS.mouseEnabled || POOLVR.config.mouseEnabled;
POOLVR.config.vrLeap       = URL_PARAMS.vrLeap       || POOLVR.config.vrLeap;

POOLVR.config.toolLength   = URL_PARAMS.toolLength || POOLVR.config.toolLength || 0.5;
POOLVR.config.toolRadius   = URL_PARAMS.toolRadius || POOLVR.config.toolRadius || 0.013;
POOLVR.config.toolMass     = URL_PARAMS.toolMass || POOLVR.config.toolMass || 0.06;
if (URL_PARAMS.toolOffset) {
    POOLVR.config.toolOffset = new THREE.Vector3();
    POOLVR.config.toolOffset.fromArray(URL_PARAMS.toolOffset);
} else {
    POOLVR.config.toolOffset = new THREE.Vector3(0, -0.42, -POOLVR.config.toolLength - 0.15);
}


var WebVRConfig = WebVRConfig || {};
// WebVRConfig.FORCE_DISTORTION = true;
// WebVRConfig.FORCE_ENABLE_VR = true;

pyserver.log('WebVRConfig =\n' + JSON.stringify(WebVRConfig, undefined, 2));
var userAgent = navigator.userAgent;
pyserver.log('userAgent = ' + userAgent);
var vrDevices = [];
if (navigator.getVRDevices) {
    navigator.getVRDevices().then(function (devices) {
        devices.forEach(function (device, i) {
            pyserver.log('\nVR device ' + i + ': ' + device.deviceName);
            console.log(device);
            vrDevices[i] = device;
        });
    });
}
;
// TODO requires three.js, CANNON.js, settings.js, cardboard.js, WebVRApplication.js, CrapLoader.js, LeapTools.js, pyserver.js
// TODO restructure fdsgbfng

var app;
var scene = CrapLoader.parse(JSON_SCENE);
var avatar = avatar || new THREE.Object3D();
avatar.position.y = 1.1;
avatar.position.z = 1.86;
var textGeomLogger;
var synthSpeaker;

POOLVR.mouseParticleGroup = new SPE.Group({
    texture: {value: THREE.ImageUtils.loadTexture('images/particle.png')},
    maxParticleCount: 50
});
POOLVR.mouseParticleEmitter = new SPE.Emitter({
    maxAge: {value: 0.5},
    position: {value: new THREE.Vector3(),
               spread: new THREE.Vector3()},
    velocity: {value: new THREE.Vector3(0, 0, 0),
               spread: new THREE.Vector3(0.3, 0.3, 0.3)},
    color: {value: [new THREE.Color('white'), new THREE.Color('red')]},
    size: {value: 0.075},
    particleCount: 50
});
POOLVR.mouseParticleGroup.addEmitter(POOLVR.mouseParticleEmitter);
POOLVR.mousePointerMesh = POOLVR.mouseParticleGroup.mesh;
POOLVR.mousePointerMesh.visible = false;


function setupMenu(parent) {
    "use strict";
    var textGeom = new THREE.TextGeometry('RESET TABLE', {font: 'anonymous pro', size: 0.2, height: 0});
    var textMesh = new THREE.Mesh(textGeom);
    textMesh.position.set(0, 1, -2);
    parent.add(textMesh);
}


function onLoad() {
    "use strict";
    pyserver.log("starting poolvr...");
    pyserver.log("POOLVR.config =\n" + JSON.stringify(POOLVR.config, undefined, 2));

    app = new WebVRApplication("poolvr", avatar, scene, POOLVR.config);
    avatar.add(app.camera);
    scene.add(avatar);

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

    CrapLoader.CANNONize(scene, app.world);

    app.world.addContactMaterial(POOLVR.ballBallContactMaterial);
    app.world.addContactMaterial(POOLVR.ballPlayableSurfaceContactMaterial);
    app.world.addContactMaterial(POOLVR.ballCushionContactMaterial);
    app.world.addContactMaterial(POOLVR.floorBallContactMaterial);

    var ballMeshes       = [];
    var ballStripeMeshes = [];
    scene.traverse(function (node) {
        if (node.name.startsWith('ballMesh')) {
            node.body.material = POOLVR.ballMaterial;
            ballMeshes.push(node);
        }
        else if (node.name.startsWith('ballStripeMesh')) {
            ballStripeMeshes.push(node);
        }
        else if (node.name.startsWith('playableSurfaceMesh')) {
            node.body.material = POOLVR.playableSurfaceMaterial;
        }
        else if (node.name.endsWith('CushionMesh')) {
            node.body.material = POOLVR.cushionMaterial;
        }
        else if (node.name === 'floorMesh') {
            node.body.material = POOLVR.floorMaterial;
        }
    });

    textGeomLogger = new TextGeomLogger();
    avatar.add(textGeomLogger.root);
    textGeomLogger.root.position.set(-2.75, 1.5, -3.5);

    synthSpeaker = new SynthSpeaker({volume: 0.5, rate: 0.8, pitch: 0.7});

    var toolOptions = {
        // ##### Desktop mode (default): #####
        transformOptions : POOLVR.config.transformOptions, // || {vr: 'desktop'},
        useBasicMaterials: POOLVR.config.useBasicMaterials,
        toolLength       : POOLVR.config.toolLength,
        toolRadius       : POOLVR.config.toolRadius,
        toolMass         : POOLVR.config.toolMass,
        toolOffset       : POOLVR.config.toolOffset
    };
    if (POOLVR.config.vrLeap) {
        // ##### Leap Motion VR tracking mode: #####
        toolOptions.transformOptions = {vr: true, effectiveParent: app.camera};
    }
    pyserver.log('toolOptions =\n' + JSON.stringify(toolOptions, undefined, 2));
    // toolOptions.onStreamingStarted = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS CONNECTED.  GOOD JOB."); };
    // toolOptions.onStreamingStopped = function () { textGeomLogger.log("YOUR LEAP MOTION CONTROLLER IS DISCONNECTED!  HOW WILL YOU PLAY?!"); };

    var toolStuff = addTool(avatar, app.world, toolOptions);
    var toolRoot       = toolStuff.toolRoot;
    var leapController = toolStuff.leapController;
    var stickMesh   = toolStuff.stickMesh;
    var animateLeap = toolStuff.animateLeap;

    var dynamicBodies = app.world.bodies.filter(function(body) { return body.mesh && body.type === CANNON.Body.DYNAMIC; });

    // setupMenu(avatar);

    textGeomLogger.log("HELLO.  WELCOME TO POOLVR.");
    synthSpeaker.speak("Hello.  Welcome to pool-ver");
    textGeomLogger.log("PLEASE WAVE A STICK-LIKE OBJECT IN FRONT OF YOUR LEAP MOTION CONTROLLER.");
    synthSpeaker.speak("Please wave a stick-like object in front of your Leap Motion controller.");

    // function lockChangeAlert() {
    //     if ( document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement ) {
    //         pyserver.log('pointer lock status is now locked');
    //         // mousePointerMesh.visible = true;
    //     } else {
    //         pyserver.log('pointer lock status is now unlocked');
    //         // mousePointerMesh.visible = false;
    //     }
    // }
    // if ("onpointerlockchange" in document) {
    //   document.addEventListener('pointerlockchange', lockChangeAlert, false);
    // } else if ("onmozpointerlockchange" in document) {
    //   document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    // } else if ("onwebkitpointerlockchange" in document) {
    //   document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
    // }

    // avatar.add(mousePointerMesh);
    // mousePointerMesh.position.set(0, 0, -2);
    // var xMax = 2, xMin = -2,
    //     yMax = 1, yMin = -1;
    // window.addEventListener("mousemove", function (evt) {
    //     if (!mousePointerMesh.visible) return;
    //     var dx = evt.movementX,
    //         dy = evt.movementY;
    //     mousePointerMesh.position.x += 0.0004*dx;
    //     mousePointerMesh.position.y -= 0.0004*dy;
    //     if (mousePointerMesh.position.x > xMax) mousePointerMesh.position.x = xMax;
    //     else if (mousePointerMesh.position.x < xMin) mousePointerMesh.position.x = xMin;
    //     if (mousePointerMesh.position.y > yMax) mousePointerMesh.position.y = yMax;
    //     else if (mousePointerMesh.position.y < yMin) mousePointerMesh.position.y = yMin;
    // });

    app.start( animate(leapController, animateLeap,
                       dynamicBodies, ballStripeMeshes,
                       toolRoot, POOLVR.config.shadowMap,
                       toolStuff.stickMesh, toolStuff.tipMesh,
                       POOLVR.config.H_table, POOLVR.floorMaterial, POOLVR.ballMaterial) );

}


var playCollisionSound = (function () {
    "use strict";
    var ballBallBuffer;
    var request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', 'sounds/ballBall.ogg', true);
    request.onload = function() {
        WebVRSound.audioContext.decodeAudioData(request.response, function(buffer) {
            ballBallBuffer = buffer;
        });
    };
    request.send();
    var playCollisionSound = function (v) {
        var source = WebVRSound.audioContext.createBufferSource();
        var gainNode = WebVRSound.getNextGainNode();
        gainNode.gain.value = Math.min(1, v / 5);
        source.connect(gainNode);
        source.buffer = ballBallBuffer;
        source.start(0);
    };
    return playCollisionSound;
})();


var animate = function (leapController, animateLeap,
                        dynamicBodies, ballStripeMeshes,
                        toolRoot, shadowMap,
                        stickMesh, tipMesh,
                        H_table, floorMaterial, ballMaterial) {
    "use strict";
    if (!shadowMap) {
        // create shadow mesh from projection:
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
        tipMesh.geometry.computeBoundingSphere();
        var tipShadowGeom = new THREE.CircleBufferGeometry(tipMesh.geometry.boundingSphere.radius).rotateX(-Math.PI / 2);
        var tipShadowMesh = new THREE.Mesh(tipShadowGeom, stickShadowMaterial);
        stickShadow.add(tipShadowMesh);
    }

    var UP = new THREE.Vector3(0, 1, 0),
        RIGHT = new THREE.Vector3(1, 0, 0),
        pitchQuat = new THREE.Quaternion(),
        headingQuat = new THREE.Quaternion(),
        walkSpeed = 0.333,
        floatSpeed = 0.1;
    var raycaster = new THREE.Raycaster();
    var lastFrameID;
    function animate(t) {
        requestAnimationFrame(animate);
        var dt = (t - app.lt) * 0.001;
        app.lt = t;
        if (app.vrControls.enabled) {
            app.vrControls.update();
        }
        app.vrManager.render(app.scene, app.camera, t);

        app.keyboard.update(dt);
        app.gamepad.update(dt);

        var floatUp = app.keyboard.getValue("floatUp") + app.keyboard.getValue("floatDown");
        var drive = app.keyboard.getValue("driveBack") + app.keyboard.getValue("driveForward");
        var strafe = app.keyboard.getValue("strafeRight") + app.keyboard.getValue("strafeLeft");
        avatar.heading += -0.8 * dt * (app.keyboard.getValue("turnLeft") + app.keyboard.getValue("turnRight"));
        if (avatar.floatMode) {
            floatUp += app.gamepad.getValue("float");
            strafe += app.gamepad.getValue("strafe");
        } else {
            drive += app.gamepad.getValue("drive");
            avatar.heading += 0.8 * dt * app.gamepad.getValue("dheading");
        }
        var cosHeading = Math.cos(avatar.heading),
            sinHeading = Math.sin(avatar.heading);
        if (!app.vrControls.enabled) {
            avatar.pitch -= 0.8 * dt * (app.keyboard.getValue("pitchUp") + app.keyboard.getValue("pitchDown"));
            pitchQuat.setFromAxisAngle(RIGHT, avatar.pitch);
        }
        var cosPitch = Math.cos(avatar.pitch),
            sinPitch = Math.sin(avatar.pitch);
        floatUp *= floatSpeed;
        if (strafe || drive) {
            var len = walkSpeed * Math.min(1, 1 / Math.sqrt(drive * drive +
                strafe * strafe));
            strafe *= len;
            drive *= len;
        } else {
            strafe = 0;
            drive = 0;
        }

        var toolDrive = app.keyboard.getValue("moveToolForwards") - app.keyboard.getValue("moveToolBackwards");
        var toolFloat = app.keyboard.getValue("moveToolUp") - app.keyboard.getValue("moveToolDown");
        var toolStrafe = app.keyboard.getValue("moveToolRight") - app.keyboard.getValue("moveToolLeft");
        toolStrafe += app.gamepad.getValue("toolStrafe");
        if (avatar.toolMode) {
            toolFloat += app.gamepad.getValue("toolFloat");
        } else {
            toolDrive -= app.gamepad.getValue("toolDrive");
        }

        var frame = leapController.frame();
        if (frame.valid && frame.id != lastFrameID) {
            animateLeap(frame, dt);
            lastFrameID = frame.id;
        }

        // TODO: resolve problem where all balls randomly bounce straight up really high!!!
        app.world.step(1/60, dt);

        for (var j = 0; j < dynamicBodies.length; ++j) {
            var body = dynamicBodies[j];
            body.mesh.position.copy(body.position);
        }

        for (j = 0; j < ballStripeMeshes.length; j++) {
            var mesh = ballStripeMeshes[j];
            mesh.quaternion.copy(mesh.parent.body.quaternion);
        }

        avatar.quaternion.setFromAxisAngle(UP, avatar.heading);
        avatar.quaternion.multiply(pitchQuat);
        avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
        avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
        avatar.position.y += dt * floatUp;

        toolRoot.position.x += 0.25  * dt * toolStrafe;
        toolRoot.position.z += -0.25 * dt * toolDrive;
        toolRoot.position.y += 0.25  * dt * toolFloat;

        if (!shadowMap) {
            stickShadow.position.set(stickMesh.position.x,
                (H_table + 0.001 - toolRoot.position.y - avatar.position.y) / toolRoot.scale.y,
                stickMesh.position.z);
            stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        }

        for (j = 0; j < app.world.contacts.length; j++) {
            var contactEquation = app.world.contacts[j];
            var bi = contactEquation.bi,
                bj = contactEquation.bj;
            if (bi.material === bj.material) {
                // ball-ball collision
                var impactVelocity = contactEquation.getImpactVelocityAlongNormal();
                playCollisionSound(impactVelocity);
            } else if (bi.material === floorMaterial || bj.material === floorMaterial) {
                // ball-floor collision
                var ballBody = (bi.material === ballMaterial ? bi : bj);
                if (!ballBody.bounces) {
                    //textGeomLogger.log(ballBody.mesh.name + " HIT THE FLOOR!");
                    ballBody.bounces = 1;
                } else if (ballBody.bounces > 5) {
                    ballBody.sleep();
                } else {
                    ballBody.bounces++;
                }
            }
        }

        //if (app.mouseParticleGroup) app.mouseParticleGroup.tick(dt);

    }

    return animate;
};


    // if (app.mousePointerMesh && avatar.picking) {
    //     origin.set(0, 0, 0);
    //     direction.set(0, 0, 0);
    //     direction.subVectors(mousePointerMesh.localToWorld(direction), camera.localToWorld(origin)).normalize();
    //     raycaster.set(origin, direction);
    //     var intersects = raycaster.intersectObjects(app.pickables);
    //     if (intersects.length > 0) {
    //         if (app.picked != intersects[0].object) {
    //             if (app.picked) app.picked.material.color.setHex(app.picked.currentHex);
    //             app.picked = intersects[0].object;
    //             app.picked.currentHex = app.picked.material.color.getHex();
    //             app.picked.material.color.setHex(0xff4444); //0x44ff44);
    //         }
    //     } else {
    //         if (app.picked) app.picked.material.color.setHex(app.picked.currentHex);
    //         app.picked = null;
    //     }
    // }
// ################## poolvr VERSION = "v0.1.0";