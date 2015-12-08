WebVRApplication = ( function () {
    function WebVRApplication(name, avatar, scene, config) {
        this.name = name;
        this.avatar = avatar;
        this.scene = scene;
        // TODO: copy
        this.config = config;


        var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera = camera;
        var renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer = renderer;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        if (config.shadowMap) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        var domElement = this.renderer.domElement;
        document.body.appendChild(domElement);
        domElement.id = 'renderer'
        this.vrEffect = new THREE.VREffect(this.renderer);
        this.vrEffect.setSize(window.innerWidth, window.innerHeight);
        this.vrManager = new WebVRManager(this.renderer, this.vrEffect, {
            hideButton: false
        });
        this.vrControls = new THREE.VRControls(this.camera);
        this.vrControls.enabled = false;


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

        var lastPosition = new THREE.Vector3();
        this.resetVRSensor = function () {
            var dheading = -this.camera.rotation.y;
            lastPosition.copy(this.camera.position);
            this.vrControls.resetSensor();
            if (this.config.onResetVRSensor) {
                this.config.onResetVRSensor(dheading, lastPosition);
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


        this.menu = this.config.menu;


        var keyboardCommands = {
            toggleVRControls: {buttons: [Primrose.Input.Keyboard.V],
                               commandDown: this.toggleVRControls.bind(this), dt: 0.25},
            toggleWireframe: {buttons: [Primrose.Input.Keyboard.NUMBER0],
                              commandDown: this.toggleWireframe.bind(this), dt: 0.25},
            resetVRSensor: {buttons: [Primrose.Input.Keyboard.Z],
                            commandDown: this.resetVRSensor.bind(this), dt: 0.25},
            toggleMenu: {buttons: [Primrose.Input.Keyboard.SPACEBAR],
                         commandDown: function () { this.menu.visible = !this.menu.visible; }.bind(this), dt: 0.5}
        };
        config.keyboardCommands = combineDefaults(config.keyboardCommands || {}, keyboardCommands);
        config.keyboardCommands = Object.keys(config.keyboardCommands).map(function (k) {
            return combineDefaults({name: k}, config.keyboardCommands[k]);
        });
        this.keyboard = new Primrose.Input.Keyboard("keyboard", window, config.keyboardCommands);


        var gamepadCommands = {
            resetVRSensor: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.back],
                            commandDown: this.resetVRSensor.bind(this), dt: 0.25},
            toggleMenu: {buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.start],
                         commandDown: function () { this.menu.visible = !this.menu.visible; }.bind(this), dt: 0.5}
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


        var world;
        if (config.world) {
            world = config.world;
        } else {
            world = new CANNON.World();
            world.gravity.set( 0, -config.gravity, 0 );
            world.broadphase = new CANNON.SAPBroadphase( world );
            world.defaultContactMaterial.contactEquationStiffness   = config.contactEquationStiffness || 1e6;
            world.defaultContactMaterial.frictionEquationStiffness  = config.frictionEquationStiffness || 1e6;
            world.defaultContactMaterial.contactEquationRelaxation  = config.contactEquationRelaxation || 3;
            world.defaultContactMaterial.frictionEquationRelaxation = config.frictionEquationRelaxation || 3;
            world.solver.iterations = 7;
        }
        this.world = world;


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
            if (config.onfullscreenchange) {
                console.log("WebVRApplication: calling config.onfullscreenchange...");
                config.onfullscreenchange(fullscreen);
            }
        }.bind(this));


        this.start = function(animate) {
            function waitForResources() {
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
            waitForResources();
        };

    }

    return WebVRApplication;
} )();
