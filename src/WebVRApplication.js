/* global Primrose, THREE, WebVRManager, combineDefaults */

WebVRApplication = ( function () {
    function WebVRApplication(name, avatar, scene, options) {
        this.name = name;
        this.avatar = avatar;
        this.scene = scene;

        // default keyboard controls:
        var keyboardCommands = {
            turnLeft: {buttons: [-Primrose.Input.Keyboard.LEFTARROW]},
            turnRight: {buttons: [Primrose.Input.Keyboard.RIGHTARROW]},
            driveForward: {buttons: [-Primrose.Input.Keyboard.W]},
            driveBack: {buttons: [Primrose.Input.Keyboard.S]},
            strafeLeft: {buttons: [-Primrose.Input.Keyboard.A]},
            strafeRight: {buttons: [Primrose.Input.Keyboard.D]},
            floatUp: {buttons: [Primrose.Input.Keyboard.E]},
            floatDown: {buttons: [-Primrose.Input.Keyboard.C]},
            toggleVRControls: {buttons: [Primrose.Input.Keyboard.V],
                               commandDown: this.toggleVRControls.bind(this), dt: 0.25},
            toggleWireframe: {buttons: [Primrose.Input.Keyboard.U],
                              commandDown: this.toggleWireframe.bind(this), dt: 0.25},
            resetVRSensor: {buttons: [Primrose.Input.Keyboard.Z],
                            commandDown: this.resetVRSensor.bind(this), dt: 0.25}
        };
        options.keyboardCommands = combineDefaults(options.keyboardCommands || {}, keyboardCommands);
        options.keyboardCommands = Object.keys(options.keyboardCommands).map(function (k) {
            return combineDefaults({name: k}, options.keyboardCommands[k]);
        });

        // default gamepad controls:
        var gamepadCommands = {
            strafe: {axes: [Primrose.Input.Gamepad.LSX], deadzone: 0.15},
            drive: {axes: [Primrose.Input.Gamepad.LSY], deadzone: 0.15},
            heading: {axes: [-Primrose.Input.Gamepad.RSX], integrate: true, deadzone: 0.15},
            dheading: {commands: ["heading"], delta: true},
            pitch: {axes: [Primrose.Input.Gamepad.RSY], integrate: true, deadzone: 0.15,
                    max: 0.5 * Math.PI, min: -0.5 * Math.PI},
            float: {axes: [-Primrose.Input.Gamepad.LSY], deadzone: 0.12},
            toggleFloatMode: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftStick],
                              commandDown: function () { application.avatar.floatMode = true; },
                              commandUp: function () { application.avatar.floatMode = false; } },
            resetVRSensor: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                            commandDown: function () { application.resetVRSensor(); }, dt: 0.25}
        };
        options.gamepadCommands = combineDefaults(options.gamepadCommands || {}, gamepadCommands);
        options.gamepadCommands = Object.keys(options.gamepadCommands).map(function (k) {
            return combineDefaults({name: k}, options.gamepadCommands[k]);
        });

        options = combineDefaults(options, {
            gravity: 0,
            backgroundColor: 0x000000,
            moveSpeed: 0.5,
            mousePointerColor: 0xff3322,
            showMousePointerOnLock: false
        });

        this.keyboard = new Primrose.Input.Keyboard("keyboard", window, options.keyboardCommands);
        window.addEventListener("keydown", function (evt) {
            if (evt.keyCode === Primrose.Text.Keys.F) {
                this.vrManager.enterImmersive();
            }
        }.bind(this));

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
        // world.broadphase = new CANNON.NaiveBroadphase( world );
        world.defaultContactMaterial.contactEquationStiffness = 1e8;
        world.defaultContactMaterial.frictionEquationStiffness = 1e7;
        world.defaultContactMaterial.contactEquationRelaxation = 3;
        world.defaultContactMaterial.frictionEquationRelaxation = 3;
        world.solver.iterations = 5;
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
        var lt = 0;

        // TODO: don't poll
        this.start = function() {
            function waitForResources(t) {
                if (CrapLoader.isLoaded()) {
                    CrapLoader.CANNONize(scene, world);
                    for (var i = 0; i < 240*2; i++) {
                        world.step(1/240);
                    }
                    lt = t;
                    requestAnimationFrame(animate);
                } else {
                    renderer.render(loadingScene, loadingCamera);
                    requestAnimationFrame(waitForResources);
                }
            }
            waitForResources(0);
        };

        var raycaster = new THREE.Raycaster(),
            picking = false,
            pickables,
            origin = new THREE.Vector3(),
            direction = new THREE.Vector3();
        raycaster.far = 100;
        this.setPicking = function (mode, objects) {
            picking = mode;
            if (picking) {
                if (objects) {
                    pickables = objects;
                } else {
                    pickables = [];
                    scene.traverse(function (obj) {
                        if (obj != mousePointer && obj instanceof THREE.Mesh && obj.material.color !== undefined) {
                            pickables.push(obj);
                        }
                    });
                }
            }
        };
        this.picked = null;

        this.addEventListener = function ( event, thunk ) {
            if ( this.listeners[event] ) {
                this.listeners[event].push( thunk );
            }
        }.bind(this);

        this.fire = function ( name, dt ) {
            for ( var i = 0; i < this.listeners[name].length; ++i ) {
                this.listeners[name][i]( dt );
            }
        }.bind(this);

        var UP = new THREE.Vector3(0, 1, 0),
            RIGHT = new THREE.Vector3(1, 0, 0),
            heading = 0,
            pitch = 0,
            pitchQuat = new THREE.Quaternion(),
            strafe,
            drive,
            floatUp,
            kbheading = 0,
            kbpitch = 0,
            walkSpeed = options.moveSpeed,
            floatSpeed = 0.9 * options.moveSpeed,
            bodyPosition = new THREE.Vector3();
        var animate = function (t) {
            requestAnimationFrame(animate);
            var dt = (t - lt) * 0.001;
            lt = t;

            if (this.vrControls.enabled) {
                this.vrControls.update();
            }

            this.vrManager.render(this.scene, this.camera, t);

            this.keyboard.update(dt);
            this.gamepad.update(dt);
            kbheading += -0.8 * dt * (this.keyboard.getValue("turnLeft") +
                this.keyboard.getValue("turnRight"));
            heading = kbheading + this.gamepad.getValue("heading");
            var cosHeading = Math.cos(heading),
                sinHeading = Math.sin(heading);
            if (!this.vrControls.enabled || options.vrPitching) {
                kbpitch -= 0.8 * dt * (this.keyboard.getValue("pitchUp") + this.keyboard.getValue("pitchDown"));
                pitch = -(this.gamepad.getValue("pitch") + kbpitch);
                pitchQuat.setFromAxisAngle(RIGHT, pitch);
            }
            var cosPitch = Math.cos(pitch),
                sinPitch = Math.sin(pitch);
            strafe = this.keyboard.getValue("strafeRight") +
                this.keyboard.getValue("strafeLeft") +
                this.gamepad.getValue("strafe");
            floatUp = this.keyboard.getValue("floatUp") + this.keyboard.getValue("floatDown");
            drive = this.keyboard.getValue("driveBack") + this.keyboard.getValue("driveForward");
            if (this.avatar.floatMode) {
                floatUp += this.gamepad.getValue("float");
            } else {
                drive += this.gamepad.getValue("drive");
            }
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

            if (mousePointer.visible && picking) {
                origin.set(0, 0, 0);
                direction.set(0, 0, 0);
                direction.subVectors(mousePointer.localToWorld(direction), camera.localToWorld(origin)).normalize();
                raycaster.set(origin, direction);
                var intersects = raycaster.intersectObjects(pickables);
                if (intersects.length > 0) {
                    if (this.picked != intersects[0].object) {
                        if (this.picked) this.picked.material.color.setHex(this.picked.currentHex);
                        this.picked = intersects[0].object;
                        this.picked.currentHex = this.picked.material.color.getHex();
                        this.picked.material.color.setHex(0xff4444); //0x44ff44);
                    }
                } else {
                    if (this.picked) this.picked.material.color.setHex(this.picked.currentHex);
                    this.picked = null;
                }
            }

            // TODO: resolve CANNON issues w/ initial low framerate
            this.world.step(1/60);

            // if (this.avatar.body) {
            //     this.avatar.body.quaternion.setFromAxisAngle(UP, heading);
            //     this.avatar.body.quaternion.mult(pitchQuat, this.avatar.body.quaternion);
            //     this.avatar.body.velocity.x = this.avatar.body.velocity.x * 0.9 +
            //         0.1 * (strafe * cosHeading + drive * sinHeading * cosPitch);
            //     this.avatar.body.velocity.z = this.avatar.body.velocity.z * 0.9 +
            //         0.1 * ((drive * cosHeading  * cosPitch - strafe * sinHeading));
            //     this.avatar.body.velocity.y = this.avatar.body.velocity.y * 0.9 +
            //         0.08 * floatUp + 0.1 * drive * (-sinPitch);
            // } else {
                this.avatar.quaternion.setFromAxisAngle(UP, heading);
                this.avatar.quaternion.multiply(pitchQuat);
                this.avatar.position.x += dt * (strafe * cosHeading + drive * sinHeading);
                this.avatar.position.z += dt * (drive * cosHeading - strafe * sinHeading);
                this.avatar.position.y += dt * floatUp;
            // }

            for (var j = 0; j < this.world.bodies.length; ++j) {
                var body = this.world.bodies[j];
                if (body.mesh && body.type !== CANNON.Body.STATIC) {
                    body.mesh.position.copy(body.position);
                    body.mesh.quaternion.copy(body.quaternion);
                }
            }

            this.fire('update', dt);

            // if (this.particleGroups) {
            //     this.particleGroups.forEach(function (group) {
            //         group.tick(dt);
            //     });
            // }

        }.bind(this);

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


    var wireframeMaterial = new THREE.MeshBasicMaterial({color: 0xeeddaa, wireframe: true});
    WebVRApplication.prototype.toggleWireframe = function () {
        if (this.scene.overrideMaterial) {
            this.log("wireframe: off");
            this.scene.overrideMaterial = null;
        } else {
            this.log("wireframe: on");
            this.scene.overrideMaterial = wireframeMaterial;
        }
    };


    WebVRApplication.prototype.toggleVRControls = function () {
        if (this.vrControls.enabled) {
            this.vrControls.enabled = false;
            this.camera.position.set(0, 0, 0);
            this.camera.quaternion.set(0, 0, 0, 1);
        } else {
            this.vrControls.enabled = true;
            this.vrControls.update();
        }
    };


    WebVRApplication.prototype.resetVRSensor = function () {
        this.vrControls.resetSensor();
    };

    return WebVRApplication;
} )();
