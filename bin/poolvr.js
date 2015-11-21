/*
  poolvr v0.1.0 2015-11-20
  
  Copyright (C) 2015 Jeffrey Zitelli <jeffrey.zitelli@gmail.com> (http://subvr.info)
  http://subvr.info/poolvr
  https://github.com/jzitelli/poolvr.git
*/
WebVRApplication = ( function () {
    function WebVRApplication(name, avatar, scene, options) {
        this.name = name;
        this.avatar = avatar;
        this.scene = scene;

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

        this.avatar.heading = 0;

        this.resetVRSensor = function () {
            this.vrControls.resetSensor();
            this.avatar.heading = 0;
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

        // default keyboard controls:
        var keyboardCommands = {
            turnLeft: {buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
            turnRight: {buttons: [Primrose.Input.Keyboard.RIGHTARROW]},
            driveForward: {buttons: [-Primrose.Input.Keyboard.W]},
            driveBack: {buttons: [Primrose.Input.Keyboard.S]},
            strafeLeft: {buttons: [-Primrose.Input.Keyboard.A]},
            strafeRight: {buttons: [Primrose.Input.Keyboard.D]},
            floatUp: {buttons: [Primrose.Input.Keyboard.E, Primrose.Input.Keyboard.NUMBER9]},
            floatDown: {buttons: [-Primrose.Input.Keyboard.C, -Primrose.Input.Keyboard.NUMBER3]},
            toggleVRControls: {buttons: [Primrose.Input.Keyboard.V],
                               commandDown: this.toggleVRControls.bind(this), dt: 0.25},
            toggleWireframe: {buttons: [Primrose.Input.Keyboard.NUMBER0],
                              commandDown: this.toggleWireframe.bind(this), dt: 0.25},
            resetVRSensor: {buttons: [Primrose.Input.Keyboard.Z],
                            commandDown: this.resetVRSensor.bind(this), dt: 0.25}
        };
        options.keyboardCommands = combineDefaults(options.keyboardCommands || {}, keyboardCommands);
        options.keyboardCommands = Object.keys(options.keyboardCommands).map(function (k) {
            return combineDefaults({name: k}, options.keyboardCommands[k]);
        });

        // default gamepad controls:
        var DEADZONE = 0.2;
        var gamepadCommands = {
            strafe: {axes: [Primrose.Input.Gamepad.LSX], deadzone: DEADZONE},
            drive: {axes: [Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
            heading: {axes: [-Primrose.Input.Gamepad.RSX], integrate: true, deadzone: DEADZONE},
            pitch: {axes: [Primrose.Input.Gamepad.RSY], integrate: true, deadzone: DEADZONE,
                    max: 0.5 * Math.PI, min: -0.5 * Math.PI},
            float: {axes: [-Primrose.Input.Gamepad.LSY], deadzone: DEADZONE},
            toggleFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
                              commandDown: function () { avatar.floatMode = true; },
                              commandUp: function () { avatar.floatMode = false; }},
            resetVRSensor: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                            commandDown: this.resetVRSensor.bind(this), dt: 0.25}
        };
        options.gamepadCommands = combineDefaults(options.gamepadCommands || {}, gamepadCommands);
        options.gamepadCommands = Object.keys(options.gamepadCommands).map(function (k) {
            return combineDefaults({name: k}, options.gamepadCommands[k]);
        });

        this.options = options;

        this.keyboard = new Primrose.Input.Keyboard("keyboard", window, options.keyboardCommands);

        this.gamepad = new Primrose.Input.Gamepad("gamepad", options.gamepadCommands);
        this.gamepad.addEventListener("gamepadconnected", function(id) {
            if (!this.gamepad.isGamepadSet()) {
                this.gamepad.setGamepad(id);
                console.log("gamepad " + id + " connected");
            }
        }.bind(this), false);

        var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera = camera;
        var renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer = renderer;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        if (options.backgroundColor !== undefined)
            this.renderer.setClearColor(options.backgroundColor);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (options.shadowMap) {
            console.log("shadow mapping enabled");
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        document.body.appendChild(this.renderer.domElement);
        this.vrEffect = new THREE.VREffect(this.renderer);
        this.vrManager = new WebVRManager(this.renderer, this.vrEffect, {
            hideButton: false
        });

        this.vrControls = new THREE.VRControls(this.camera);
        this.vrControls.enabled = false;

        this.audioContext = new AudioContext();

        this.listeners = {'update': []};

        var world = new CANNON.World();
        world.gravity.set( 0, -options.gravity, 0 );
        world.broadphase = new CANNON.SAPBroadphase( world );
        world.defaultContactMaterial.contactEquationStiffness = 1e8;
        world.defaultContactMaterial.frictionEquationStiffness = 1e8;
        world.defaultContactMaterial.contactEquationRelaxation = 3;
        world.defaultContactMaterial.frictionEquationRelaxation = 3;
        world.solver.iterations = 10;
        this.world = world;

        window.addEventListener("resize", function () {
            var canvasWidth = window.innerWidth,
                canvasHeight = window.innerHeight;
            this.camera.aspect = canvasWidth / canvasHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(canvasWidth, canvasHeight);
            if (this.vrManager.isVRMode()) {
                this.vrControls.enabled = true;
                pitch = 0;
            }
        }.bind(this), false);

        var mousePointer = new THREE.Mesh(new THREE.SphereBufferGeometry(0.0123), new THREE.MeshBasicMaterial({color: options.mousePointerColor}));
        this.mousePointer = mousePointer;
        mousePointer.position.z = -2;
        avatar.add(mousePointer);
        mousePointer.visible = false;
        if ("onpointerlockchange" in document) {
          document.addEventListener('pointerlockchange', lockChangeAlert, false);
        } else if ("onmozpointerlockchange" in document) {
          document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
        } else if ("onwebkitpointerlockchange" in document) {
          document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
        }
        function lockChangeAlert() {
          if( document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement ) {
            console.log('pointer lock status is now locked');
            if (options.showMousePointerOnLock) {
                mousePointer.visible = true;
            }
            mousePointer.position.x = mousePointer.position.y = 0;
          } else {
            console.log('pointer lock status is now unlocked');
            mousePointer.visible = false;
          }
        }

        var loadingScene = new THREE.Scene();
        var loadingMesh = new THREE.Mesh(new THREE.TextGeometry('LOADING...', {size: 0.3, height: 0}));
        loadingMesh.position.x = loadingMesh.position.z = -2;
        loadingScene.add(loadingMesh);
        var loadingCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.lt = 0;

        this.start = function(animate) {
            function waitForResources(t) {
                if (CrapLoader.isLoaded()) {
                    CrapLoader.CANNONize(scene, world);
                    // to let physics settle down first with small time steps:
                    for (var i = 0; i < 240*2; i++) {
                        world.step(1/240);
                    }
                    this.lt = t;
                    requestAnimationFrame(animate);
                } else {
                    renderer.render(loadingScene, loadingCamera);
                    requestAnimationFrame(waitForResources);
                }
            }
            waitForResources(0);
        };

        this.pickables = null;
        this.setPicking = function (mode, objects) {
            this.picking = mode;
            if (this.picking) {
                if (objects) {
                    this.pickables = objects;
                } else if (!this.pickables) {
                    this.pickables = [];
                    scene.traverse(function (obj) {
                        if (obj != mousePointer && obj instanceof THREE.Mesh && obj.material.color !== undefined) {
                            this.pickables.push(obj);
                        }
                    });
                }
            }
        };
        this.picked = null;

        var audioContext = this.audioContext;
        var gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 1;
        this.gainNode = gainNode;
        this.playSound = function (url, loop) {
            var source = audioContext.createBufferSource();
            source.loop = (loop === true);
            source.connect(gainNode);
            var request = new XMLHttpRequest();
            request.responseType = 'arraybuffer';
            request.open('GET', url, true);
            request.onload = function() {
                audioContext.decodeAudioData(request.response).then(function(buffer) {
                    source.buffer = buffer;
                    source.start(0);
                });
            };
            request.send();
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

    function parse(json) {
        // TODO: convert all to BufferGeometry option
        function onLoad(obj) {
            obj.traverse( function (node) {
                if (node instanceof THREE.Mesh) {
                    node.geometry.computeBoundingSphere();
                    node.geometry.computeBoundingBox();
                    if (node.userData && node.userData.visible === false) {
                        node.visible = false;
                    }
                    if (node.material.shading === THREE.SmoothShading)
                        node.geometry.computeVertexNormals();
                    else if (node.material.shading === THREE.FlatShading)
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
                body = new CANNON.Body({
                    mass: cannonData.mass,
                    position: node.localToWorld(position),
                    quaternion: node.quaternion
                });
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
    var toolOffset = options.toolOffset || new THREE.Vector3(0, -0.46, -toolLength - 0.15);
    var toolMass = options.toolMass || 0.06;
    var toolTime = options.toolTime || 0.02;

    var handOffset = options.handOffset || new THREE.Vector3(0, -0.25, -0.4);

    var minConfidence = options.minConfidence || 0.3;

    var transformOptions = options.transformOptions || {};

    // tool:
    var toolRoot = new THREE.Object3D();
    toolRoot.position.copy(toolOffset);
    parent.add(toolRoot);
    var stickGeom = new THREE.CylinderGeometry(toolRadius, toolRadius, toolLength, 10, 1, false);
    stickGeom.translate(0, -toolLength / 2, 0);
    var stickMaterial;
    var tipMaterial;
    if (options.useBasicMaterials) {
        stickMaterial = new THREE.MeshBasicMaterial({color: 0xeebb99, side: THREE.DoubleSide});
        tipMaterial = new THREE.MeshBasicMaterial({color: 0x004488});
    }
    else {
        stickMaterial = new THREE.MeshLambertMaterial({color: 0xeebb99, side: THREE.DoubleSide});
        tipMaterial = new THREE.MeshLambertMaterial({color: 0x004488});
    }
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    toolRoot.add(stickMesh);
    var tipMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(toolRadius), tipMaterial);
    tipMesh.castShadow = true;
    stickMesh.add(tipMesh);
    // TODO: mass
    var tipBody = new CANNON.Body({mass: toolMass, type: CANNON.Body.KINEMATIC});
    tipBody.addShape(new CANNON.Sphere(toolRadius));
    world.addBody(tipBody);

    // setup hands: ############################
    // hands don't necessarily correspond the left / right labels, but doesn't matter to me because they look indistinguishable
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    leftRoot.position.copy(handOffset);
    rightRoot.position.copy(handOffset);
    var handRoots = [leftRoot, rightRoot];
    parent.add(leftRoot);
    parent.add(rightRoot);
    leftRoot.visible = rightRoot.visible = false;

    if (!options.leapHandsDisabled) {
        var handMaterial = new THREE.MeshBasicMaterial({color: 0x113399, transparent: true, opacity: 0});
        // arms:
        var armRadius = 0.0276,
            armLength = 0.26;
        var armGeom = new THREE.CylinderGeometry(armRadius, armRadius, armLength);
        var armMesh = new THREE.Mesh(armGeom, handMaterial);
        var arms = [armMesh, armMesh.clone()];
        leftRoot.add(arms[0]);
        rightRoot.add(arms[1]);
        // palms:
        var radius = 0.025;
        var palmGeom = new THREE.SphereBufferGeometry(radius).scale(1, 0.5, 1);
        var palmMesh = new THREE.Mesh(palmGeom, handMaterial);
        palmMesh.castShadow = true;
        var palms = [palmMesh, palmMesh.clone()];
        leftRoot.add(palms[0]);
        rightRoot.add(palms[1]);
        // fingertips:
        radius = 0.005;
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

    if (!options.leapDisabled) {

        var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
        if (transformOptions.vr === true) {
            toolTime *= 2;
        }
        console.log("'transform' options:");
        console.log(transformOptions);
        leapController.use('transform', transformOptions).connect();
        var onFrame = (function () {
            var UP = new THREE.Vector3(0, 1, 0);
            var direction = new THREE.Vector3();
            var position = new THREE.Vector3();
            var velocity = new THREE.Vector3();

            if (options.leapHandsDisabled) {
                // onFrame (tool only): ########################################
                return function (frame) {
                    if (frame.tools.length === 1) {
                        toolRoot.visible = true;
                        var tool = frame.tools[0];
                        if (tool.timeVisible > toolTime) {
                            // TODO: option to toggle stabilized or not
                            stickMesh.position.fromArray(tool.tipPosition);
                            // stickMesh.position.fromArray(tool.stabilizedTipPosition);

                            direction.fromArray(tool.direction);
                            stickMesh.quaternion.setFromUnitVectors(UP, direction);

                            position.set(0, 0, 0);
                            stickMesh.localToWorld(position);
                            tipBody.position.copy(position);

                            velocity.set(tool.tipVelocity[0] * 0.001, tool.tipVelocity[1] * 0.001, tool.tipVelocity[2] * 0.001);
                            velocity.applyQuaternion(parent.quaternion);
                            tipBody.velocity.copy(velocity);
                        }
                    }
                    else if (frame.tools.length === 2) {
                        console.log('TWO TOOLS OMG');
                    }
                };
            } else {
                // onFrame: ########################################
                return function (frame) {
                    if (frame.tools.length === 1) {
                        toolRoot.visible = true;
                        var tool = frame.tools[0];
                        if (tool.timeVisible > toolTime) {
                            // TODO: option to toggle stabilized or not
                            stickMesh.position.fromArray(tool.tipPosition);
                            // stickMesh.position.fromArray(tool.stabilizedTipPosition);

                            direction.fromArray(tool.direction);
                            stickMesh.quaternion.setFromUnitVectors(UP, direction);

                            position.set(0, 0, 0);
                            stickMesh.localToWorld(position);
                            tipBody.position.copy(position);

                            velocity.set(tool.tipVelocity[0] * 0.001, tool.tipVelocity[1] * 0.001, tool.tipVelocity[2] * 0.001);
                            velocity.applyQuaternion(parent.quaternion);
                            tipBody.velocity.copy(velocity);
                        }
                    }
                    else if (frame.tools.length === 2) {
                        console.log('TWO TOOLS OMG');
                    }
                    leftRoot.visible = rightRoot.visible = false;
                    for (var i = 0; i < frame.hands.length; i++) {
                        var hand = frame.hands[i];
                        if (hand.confidence > minConfidence) {
                            handRoots[i].visible = true;
                            handMaterial.opacity = hand.confidence;
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
                };
            }
        })();
        leapController.on('frame', onFrame);

    }

    return [stickMesh, tipBody, toolRoot];
}
;
var pyserver = {

    log: function (msg, success) {
        "use strict";
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
        console.log(msg);
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
;
var POOLVR_VERSION = POOLVR_VERSION || 'poolvr-0.1.0';
var POOLVR = {
    config: POOLVR_CONFIG,
    version: POOLVR_VERSION
};

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
        if (params[k].length == 1)
            params[k] = params[k][0];

        if (params[k] === 'true')
            params[k] = true;
        else if (params[k] === 'false')
            params[k] = false;
    }
    return params;
})();

function logVars() {
    "use strict";
    pyserver.log('app.options = ' + JSON.stringify(app.options));
    pyserver.log('tipBody.position = ' + tipBody.position);
    pyserver.log('toolRoot = ' + toolRoot);
    pyserver.log('avatar = ' + avatar);
}

POOLVR.keyboardCommands = {
    logVars: {buttons: [Primrose.Input.Keyboard.Q],
              commandDown: logVars},
    moveToolUp:        {buttons: [Primrose.Input.Keyboard.NUMBER7]},
    moveToolDown:      {buttons: [Primrose.Input.Keyboard.NUMBER1]},
    moveToolForwards:  {buttons: [Primrose.Input.Keyboard.NUMBER8]},
    moveToolBackwards: {buttons: [Primrose.Input.Keyboard.NUMBER5]},
    moveToolLeft:      {buttons: [Primrose.Input.Keyboard.NUMBER4]},
    moveToolRight:     {buttons: [Primrose.Input.Keyboard.NUMBER6]}
};

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
    toggleToolFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightStick],
                          commandDown: function () { avatar.toolMode = true; },
                          commandUp: function () { avatar.toolMode = false; } }
};
;
var avatar = avatar || new THREE.Object3D();

var TextGeomLogger = (function () {
	"use strict";
	function TextGeomLogger(geometries, material, options) {
		this.geometries = geomeries;
		this.material = material;
		this.meshes = {};
		for (var c in this.geometries) {
			var geom = this.geometries[c].clone();
			this.meshes[c] = new THREE.Mesh(geom, material.clone());
		}
		this.logRoot = new THREE.Object3D();
		this.lineMeshBuffer = {};
		options = options || {};
		options.size    = options.size || 0.2;
	    options.font    = 'anonymous pro';
		options.height  = options.height || 0;
        options.rows    = options.rows || 20;
        options.columns = options.columns || 80;
        options.parent  = options.parent || avatar;
        this.options = options;

		this.log = function (msg) {
			var lines = msg.split('\n');
			for (var i = 0; i < lines.length && i < this.logRoot.children.length; i++) {
				var child = this.logRoot.children[i];
				child.position.y += 1.6 * this.options.size;
			}
			for (i = 0; i < lines.length; i++) {
				var line = lines[i];
				var mesh = this.lineMeshBuffer[line];
				if (mesh) {
					this.logRoot.add(mesh.clone());
				}
				else {
					mesh = new THREE.Object3D();
					this.logRoot.add(mesh);
					this.lineMeshBuffer[line] = mesh;
					for (var col = 0; col < line.length; col++) {
						var c = line[col];
						if (c !== ' ') {
							var letterMesh = this.meshes[c].clone();
							letterMesh.position.x = 1.6*this.options.size * col;
						}
					}
				}
			}
		}.bind(this);
	}
	
	return TextGeomLogger;

})();
;
// TODO requires pyserver.js, settings.js, webvr-manager.js, webvr-polyfill.js

pyserver.log("hello from cardboard.js");

var userAgent = navigator.userAgent || navigator.vendor || window.opera;
// Check both width and height since the phone may be in landscape.
var width = screen.availWidth;
var height = screen.availHeight;
var pixelWidth = width * window.devicePixelRatio;
var pixelHeight = height * window.devicePixelRatio;

if (!POOLVR.config.oldBoilerplate) {
    // using most recent webvr-boilerplate
    window.WebVRConfig = window.WebVRConfig || {
        FORCE_ENABLE_VR: URL_PARAMS.forceEnableVR,
        FORCE_DISTORTION: URL_PARAMS.forceDistortion
    };
} else {
    // using older version
    window.WEBVR_FORCE_DISTORTION = window.WEBVR_FORCE_DISTORTION || URL_PARAMS.forceDistorion;
    window.WebVRConfig = window.WebVRConfig || {};
}

var VR_DEVICES = [
    // Samsung Galaxy 4S #########################################################################################
    // Firefox Beta:
    // Mozilla/5.0 (Android 5.0.1; Mobile; rv:43.0) Gecko/43.0 Firefox/43.0
    // vr.cardboard.enabled = true
    "Phone Sensor (Cardboard) HMD (HMD)",    // VR device 0
    "Phone Sensor (Cardboard) HMD (Sensor)", // VR device 1
    // vr.cardboard.enabled = false
    // no devices
    // *** sensor not working? ***
    // Chrome Dev:
    // Mozilla/5.0 (Linux; Android 5.0.1; SCH-I545 Build/LRX22C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2560.5 Mobile Safari/537.36
    // chrome://flags WebVR enabled
    // *** WORKS ***
    "Google, Inc. Cardboard v1", // VR device 0
    "Google, Inc. Cardboard v1", // VR device 1
    // Chrome:
    // Mozilla/5.0 (Linux; Android 5.0.1; SCH-I545 Build/LRX22C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36
    // *** WORKS WITH LATEST WEBVR-BOILERPLATE (z-ordering issue) ***
    "webvr-polyfill deviceName",                 // VR device 0
    "VR Position Device (webvr-polyfill:fused)", // VR device 1

    // Fedora 22 #################################################################################################
    // Firefox Nightly:
    // Mozilla/5.0 (X11; Linux x86_64; rv:45.0) Gecko/20100101 Firefox/45.0
    // no devices
    
    // Windows 10 ################################################################################################
    // DK2 0.6.0.1 drivers
    // Chrome 0.5.0.1 DK2 build:
    // Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2383.0 Safari/537.36
    // *** WORKS W/ OLDER WEBVR-BOILERPLATE ***
    "Oculus Rift DK2, Oculus VR", // VR device 0
    "Oculus Rift DK2, Oculus VR", // VR device 1
    // Firefox Nightly:
    // Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:45.0) Gecko/20100101 Firefox/45.0
    // *** NO DISPLAY IN HMD ***
    "Oculus VR HMD (HMD)",   // VR device 0
    "Oculus VR HMD (Sensor)" // VR device 0
    // DK2 0.8 drivers


    // Windows 7 ################################################################################################
    // DK2 0.8 drivers
    // Chrome 0.8.0.1 DK2 build
    // *** WORKS W/ OLDER WEBVR-BOILERPLATE ***
];

pyserver.log(JSON.stringify(WebVRConfig));
pyserver.log(userAgent);
if (navigator.getVRDevices) {
    navigator.getVRDevices().then(function (devices) {
        devices.forEach(function (device, i) {
            pyserver.log('VR device ' + i + ': ' + device.deviceName);
        });
    });
}

pyserver.log("goodbye from cardboard.js");
;
// TODO requires three.js, CANNON.js, settings.js, cardboard.js, WebVRApplication.js, CrapLoader.js, LeapTools.js, pyserver.js
var app;
var scene = CrapLoader.parse(JSON_SCENE);
var avatar = avatar || new THREE.Object3D();

var H_table = 0.74295; // TODO: coordinate w/ server
avatar.position.y = 1.2;
avatar.position.z = 1.88;

var stickMesh, tipBody, toolRoot;
var stickShadow, stickShadowMesh;
var ballMeshes       = [],
    ballStripeMeshes = [];

var dynamicBodies;

function onLoad() {
    "use strict";
    pyserver.log("starting poolvr...\nPOOLVR.config =\n" + JSON.stringify(POOLVR.config));
    POOLVR.config.keyboardCommands = POOLVR.keyboardCommands;
    POOLVR.config.gamepadCommands = POOLVR.gamepadCommands;
    
    app = new WebVRApplication("poolvr", avatar, scene, POOLVR.config);
    avatar.add(app.camera);
    scene.add(avatar);

    if (!app.options.useBasicMaterials) {
        // would rather add the spot lights via three.py generated JSON_SCENE, but I'm having problems getting shadows frm them:
        var centerSpotLight = new THREE.SpotLight(0xffffee, 1, 10, 90);
        centerSpotLight.position.set(0, 3, 0);
        centerSpotLight.castShadow = true;
        centerSpotLight.shadowCameraNear = 0.01;
        centerSpotLight.shadowCameraFar = 4;
        centerSpotLight.shadowCameraFov = 90;
        scene.add(centerSpotLight);
        var centerSpotLightHelper = new THREE.SpotLightHelper(centerSpotLight);
        scene.add(centerSpotLightHelper);
        centerSpotLightHelper.visible = false;
    }

    // ##### Desktop mode (default): #####
    var toolOptions = {
        transformOptions : {vr: 'desktop'},
        leapDisabled     : app.options.leapDisabled,
        leapHandsDisabled: app.options.leapHandsDisabled,
        useBasicMaterials: app.options.useBasicMaterials,
        toolLength       : app.options.toolLength,
        toolRadius       : app.options.toolRadius
    };
    // ##### Leap Motion VR tracking mode: #####
    if (app.options.leapVR) {
        toolOptions.transformOptions = {vr: true, effectiveParent: app.camera};
    }

    CrapLoader.CANNONize(scene, app.world);

    var ballMaterial = new CANNON.Material();
    var ballBallContactMaterial = new CANNON.ContactMaterial(ballMaterial, ballMaterial, {restitution: 0.93});
    app.world.addContactMaterial(ballBallContactMaterial);

    var playableSurfaceMaterial = new CANNON.Material();
    var ballPlayableSurfaceContactMaterial = new CANNON.ContactMaterial(ballMaterial, playableSurfaceMaterial, {restitution: 0.1, friction: 0.2});
    app.world.addContactMaterial(ballPlayableSurfaceContactMaterial);
    
    var cushionMaterial = new CANNON.Material();
    var ballCushionContactMaterial = new CANNON.ContactMaterial(ballMaterial, cushionMaterial, {restitution: 0.8, friction: 0.12});
    app.world.addContactMaterial(ballCushionContactMaterial);

    var floorMaterial = new CANNON.Material();
    var floorBallContactMaterial = new CANNON.ContactMaterial(floorMaterial, ballMaterial, {restitution: 0.88, friction: 0.4});
    app.world.addContactMaterial(floorBallContactMaterial);

    scene.traverse(function (node) {
        if (node.name.startsWith('ballMesh')) {
            node.body.material = ballMaterial;
            ballMeshes.push(node);
        }
        else if (node.name.startsWith('ballStripeMesh')) {
            ballStripeMeshes.push(node);
        }
        else if (node.name.startsWith('playableSurfaceMesh')) {
            node.body.material = playableSurfaceMaterial;
        }
        else if (node.name.endsWith('CushionMesh')) {
            node.body.material = cushionMaterial;
        }
        else if (node.name === 'floorMesh') {
            node.body.material = floorMaterial;
        }
    });

    pyserver.log('adding tool...\ntoolOptions = ' + JSON.stringify(toolOptions));
    var toolStuff = addTool(avatar, app.world, toolOptions);

    stickMesh = toolStuff[0];
    tipBody   = toolStuff[1];
    toolRoot  = toolStuff[2];

    if (!app.options.shadowMap) {
        // create shadow mesh from projection:
        stickShadow = new THREE.Object3D();
        stickShadow.position.y = -avatar.position.y - toolRoot.position.y + H_table + 0.001;
        stickShadow.scale.set(1, 0.0004, 1);
        toolRoot.add(stickShadow);
        var stickShadowGeom = stickMesh.geometry.clone();
        var toolLength = toolOptions.toolLength;
        stickShadowGeom.translate(0, -toolLength / 2, 0); // have to do this again because not buffergeometry???
        var stickShadowMaterial = new THREE.MeshBasicMaterial({color: 0x002200});
        stickShadowMesh = new THREE.Mesh(stickShadowGeom, stickShadowMaterial);
        stickShadowMesh.quaternion.copy(stickMesh.quaternion);
        stickShadow.add(stickShadowMesh);
    }

    if (app.options.mouseControlsEnabled) {
        var mousePointer = stickMesh;
        mousePointer.position.y = H_table + 0.1 - avatar.position.y;
        tipBody.position[1] = H_table + 0.1;
        window.addEventListener("mousemove", function (evt) {
            var dx = evt.movementX,
                dy = evt.movementY;
            mousePointer.position.x += 0.001*dx;
            mousePointer.position.x = Math.max(Math.min(mousePointer.position.x, 2.25), -2.25);
            mousePointer.position.z += 0.001*dy;
            mousePointer.position.z = Math.max(Math.min(mousePointer.position.z, 1.5), -1);
            tipBody.position[0] = mousePointer.position.x;
            tipBody.position[2] = mousePointer.position.z;
        });
    }

    dynamicBodies = app.world.bodies.filter(function(body) { return body.mesh && body.type !== CANNON.Body.STATIC; });

    app.start(animate);
}



var UP = new THREE.Vector3(0, 1, 0),
    RIGHT = new THREE.Vector3(1, 0, 0),
    pitch = 0,
    pitchQuat = new THREE.Quaternion(),
    headingQuat = new THREE.Quaternion(),
    strafe,
    drive,
    floatUp,
    kbpitch = 0,
    walkSpeed = 0.3,
    floatSpeed = 0.1,
    toolDrive, toolStrafe, toolFloat;
var raycaster = new THREE.Raycaster();
function animate(t) {
    "use strict";
    requestAnimationFrame(animate);
    var dt = (t - app.lt) * 0.001;
    app.lt = t;
    if (app.vrControls.enabled) {
        app.vrControls.update();
    }
    app.vrManager.render(app.scene, app.camera, t);
    app.keyboard.update(dt);
    app.gamepad.update(dt);

    floatUp = app.keyboard.getValue("floatUp") + app.keyboard.getValue("floatDown");
    drive = app.keyboard.getValue("driveBack") + app.keyboard.getValue("driveForward");
    strafe = app.keyboard.getValue("strafeRight") + app.keyboard.getValue("strafeLeft");
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
    if (!app.vrControls.enabled || app.options.vrPitchingEnabled) {
        kbpitch -= 0.8 * dt * (app.keyboard.getValue("pitchUp") + app.keyboard.getValue("pitchDown"));
        pitch = kbpitch;
        pitchQuat.setFromAxisAngle(RIGHT, pitch);
    }
    var cosPitch = Math.cos(pitch),
        sinPitch = Math.sin(pitch);
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

    toolDrive = app.keyboard.getValue("moveToolForwards") - app.keyboard.getValue("moveToolBackwards");
    toolFloat = app.keyboard.getValue("moveToolUp") - app.keyboard.getValue("moveToolDown");
    toolStrafe = app.keyboard.getValue("moveToolRight") - app.keyboard.getValue("moveToolLeft");
    toolStrafe += app.gamepad.getValue("toolStrafe");
    if (avatar.toolMode) {
        toolFloat += app.gamepad.getValue("toolFloat");
    } else {
        toolDrive -= app.gamepad.getValue("toolDrive");
    }

    // TODO: resolve CANNON issues w/ initial low framerate
    app.world.step(Math.min(dt, 1/60));

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

    if (!app.options.shadowMap) {
        stickShadow.position.x = stickMesh.position.x;
        stickShadow.position.z = stickMesh.position.z;
        stickShadow.position.y = -avatar.position.y - toolRoot.position.y + H_table + 0.001;
        stickShadowMesh.quaternion.copy(stickMesh.quaternion);
    }
    if (app.mousePointer && avatar.picking) {
        origin.set(0, 0, 0);
        direction.set(0, 0, 0);
        direction.subVectors(mousePointer.localToWorld(direction), camera.localToWorld(origin)).normalize();
        raycaster.set(origin, direction);
        var intersects = raycaster.intersectObjects(app.pickables);
        if (intersects.length > 0) {
            if (app.picked != intersects[0].object) {
                if (app.picked) app.picked.material.color.setHex(app.picked.currentHex);
                app.picked = intersects[0].object;
                app.picked.currentHex = app.picked.material.color.getHex();
                app.picked.material.color.setHex(0xff4444); //0x44ff44);
            }
        } else {
            if (app.picked) app.picked.material.color.setHex(app.picked.currentHex);
            app.picked = null;
        }
    }
}

// ################## poolvr VERSION = "v0.1.0";