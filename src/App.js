/* global THREE */
var Utils = require('./Utils.js');

const DEFAULT_OPTIONS = {
    onResetVRSensor: function (lastRotation, lastPosition) {
        console.log('lastRotation: ' + lastRotation);
        console.log('lastPosition: ' + lastPosition);
    }
};

module.exports = function (scene, config, rendererOptions) {
    "use strict";
    config = Utils.combineObjects(DEFAULT_OPTIONS, config || {});

    this.config = config;

    scene = scene || new THREE.Scene();

    this.scene = scene;

    rendererOptions = rendererOptions || {};

    this.renderer = new THREE.WebGLRenderer(rendererOptions);

    var domElement = this.renderer.domElement;

    if (!rendererOptions.canvas) {
        document.body.appendChild(domElement);
        domElement.id = 'webgl-canvas';
    }

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.matrixAutoUpdate = true;

    // WebXR setup
    this.renderer.xr.enabled = true;

    // XR session and reference space
    this.xrSession = null;
    this.xrReferenceSpace = null;
    this.xrControllers = [];

    this.stage = new THREE.Object3D();
    this.stage.matrixAutoUpdate = false;

    this.scene.add(this.stage);

    // Track VR state
    this.isPresenting = false;

    // public methods:

    this.render = function () {
        this.renderer.render(this.scene, this.camera);
    }.bind(this);

    this.toggleVRControls = function () {
        // In WebXR, camera tracking is automatic when in XR session
        // This function now just resets the camera position when not in VR
        if (!this.isPresenting) {
            this.camera.position.set(0, 0, 0);
            this.camera.quaternion.set(0, 0, 0, 1);
            this.camera.updateMatrixWorld();
        }
    }.bind(this);

    this.resetVRSensor = ( function () {
        var lastPosition = new THREE.Vector3();
        var euler = new THREE.Euler(0, 0, 0, 'YXZ');
        var onResetVRSensor = config.onResetVRSensor;
        return function () {
            if (this.isPresenting && this.xrReferenceSpace) {
                lastPosition.copy(this.camera.position);
                var lastRotation = this.camera.rotation.y;

                // In WebXR, we can request a new reference space to reset the pose
                // For now, we maintain stage object positions relative to new camera pose
                this.stage.children.forEach( function (object) {
                    if (object === this.camera) return;
                    euler.setFromQuaternion(object.quaternion);
                    euler.y -= lastRotation;
                    object.quaternion.setFromEuler(euler);
                    object.position.sub(lastPosition);
                    object.position.applyAxisAngle(THREE.Object3D.DefaultUp, -lastRotation);
                    object.position.add(this.camera.position);
                    object.updateMatrix();
                }.bind(this) );

                this.stage.updateMatrixWorld(true);

                if (onResetVRSensor) {
                    onResetVRSensor(lastRotation, lastPosition);
                }
            }
        };
    } )().bind(this);

    this.toggleFullscreen = function (options) {
        if (!isFullscreen()) {
            requestFullscreen(options);
        } else {
            exitFullscreen();
        }
    };

    this.toggleWireframe = ( function () {
        var wireframeMaterial = new THREE.MeshBasicMaterial({color: 0xeeddaa, wireframe: true});
        return function () {
            if (this.scene.overrideMaterial === wireframeMaterial) {
                this.scene.overrideMaterial = null;
            } else {
                this.scene.overrideMaterial = wireframeMaterial;
            }
        };
    } )().bind(this);

    this.toggleNormalMaterial = ( function () {
        var normalMaterial = new THREE.MeshNormalMaterial();
        return function () {
            if (this.scene.overrideMaterial === normalMaterial) {
                this.scene.overrideMaterial = null;
            } else {
                this.scene.overrideMaterial = normalMaterial;
            }
        };
    } )().bind(this);

    // WebXR session management
    this.startXRSession = function () {
        var self = this;
        if (!navigator.xr) {
            console.error('WebXR not supported');
            return Promise.reject(new Error('WebXR not supported'));
        }

        return navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
        }).then(function (session) {
            self.xrSession = session;
            self.isPresenting = true;

            // Set up the session with the renderer
            self.renderer.xr.setSession(session);

            // Get reference space
            session.requestReferenceSpace('local-floor').then(function (refSpace) {
                self.xrReferenceSpace = refSpace;
                if (config.onXRSessionStarted) {
                    config.onXRSessionStarted(session, refSpace);
                }
            }).catch(function () {
                // Fallback to 'local' if 'local-floor' not available
                session.requestReferenceSpace('local').then(function (refSpace) {
                    self.xrReferenceSpace = refSpace;
                    if (config.onXRSessionStarted) {
                        config.onXRSessionStarted(session, refSpace);
                    }
                });
            });

            session.addEventListener('end', function () {
                self.xrSession = null;
                self.xrReferenceSpace = null;
                self.isPresenting = false;
                if (config.onXRSessionEnded) {
                    config.onXRSessionEnded();
                }
            });

            return session;
        });
    }.bind(this);

    this.endXRSession = function () {
        if (this.xrSession) {
            return this.xrSession.end();
        }
        return Promise.resolve();
    }.bind(this);

    // Toggle VR on/off (for keyboard/gamepad commands)
    this.toggleVR = function () {
        if (!this.isPresenting) {
            this.startXRSession().catch(function (err) {
                console.error('Failed to start XR session:', err);
            });
        } else {
            this.endXRSession();
        }
    }.bind(this);

    // Setup XR controllers
    this.setupXRControllers = function () {
        var self = this;

        // Create controller objects
        for (var i = 0; i < 2; i++) {
            var controller = this.renderer.xr.getController(i);
            controller.addEventListener('connected', function (event) {
                var inputSource = event.data;
                console.log('XR controller connected:', inputSource.handedness);
                if (config.onXRControllerConnected) {
                    config.onXRControllerConnected(inputSource, this);
                }
            });
            controller.addEventListener('disconnected', function () {
                console.log('XR controller disconnected');
                if (config.onXRControllerDisconnected) {
                    config.onXRControllerDisconnected(this);
                }
            });
            this.stage.add(controller);
            this.xrControllers.push(controller);

            // Also get grip space for controller models
            var grip = this.renderer.xr.getControllerGrip(i);
            this.stage.add(grip);
        }
    }.bind(this);

    // Check for WebXR support
    this.checkXRSupport = function () {
        if (!navigator.xr) {
            return Promise.resolve(false);
        }
        return navigator.xr.isSessionSupported('immersive-vr');
    };

    // resize, fullscreen listener functions:

    var onResize = function () {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }.bind(this);

    var onFullscreenChange = function () {
        onResize();
    };

    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
    }

    function requestFullscreen(options) {
        if (domElement.requestFullscreen) {
            domElement.requestFullscreen(options);
        } else if (domElement.msRequestFullscreen) {
            domElement.msRequestFullscreen();
        } else if (domElement.mozRequestFullScreen) {
            domElement.mozRequestFullScreen(options);
        } else if (domElement.webkitRequestFullscreen) {
            domElement.webkitRequestFullscreen();
        } else {
            throw 'Fullscreen API is not supported';
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else {
            console.warn('exitFullscreen is not supported');
        }
    }

    var beforeUnload = function () {
        // End XR session when exiting the app
        if (this.isPresenting) {
            this.endXRSession();
        }
    }.bind(this);

    // add standard event listeners
    window.addEventListener('resize', onResize, false);
    document.addEventListener(domElement.mozRequestFullScreen ? 'mozfullscreenchange' : 'webkitfullscreenchange',
        onFullscreenChange, false);
    window.addEventListener("beforeunload", beforeUnload, false);

    // Initialize XR controllers
    this.setupXRControllers();
};
