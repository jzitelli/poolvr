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
            floatUp: {buttons: [Primrose.Input.Keyboard.E]},
            floatDown: {buttons: [-Primrose.Input.Keyboard.C]},
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
        var gamepadCommands = {
            strafe: {axes: [Primrose.Input.Gamepad.LSX], deadzone: 0.15},
            drive: {axes: [Primrose.Input.Gamepad.LSY], deadzone: 0.15},
            heading: {axes: [-Primrose.Input.Gamepad.RSX], integrate: true, deadzone: 0.15},
            pitch: {axes: [Primrose.Input.Gamepad.RSY], integrate: true, deadzone: 0.15,
                    max: 0.5 * Math.PI, min: -0.5 * Math.PI},
            float: {axes: [-Primrose.Input.Gamepad.LSY], deadzone: 0.12},
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

        this.options = combineDefaults(options, {
            gravity: 0,
            backgroundColor: 0x000000,
            moveSpeed: 0.5,
            mousePointerColor: 0xff3322,
            showMousePointerOnLock: false
        });

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
        world.defaultContactMaterial.frictionEquationStiffness = 1e7;
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
