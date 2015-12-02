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

        var audioContext = new AudioContext();
        var gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 1;
        this.audioContext = audioContext;
        this.gainNode = gainNode;
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

    }

    return WebVRApplication;
} )();
