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

    this.renderer.setPixelRatio(window.devicePixelRadio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.matrixAutoUpdate = true;

    this.vrEffect = new THREE.VREffect(this.renderer, function(error) { throw new Error(error); });

    this.vrControls = new THREE.VRControls(this.camera, function(error) { throw new Error(error); });
    this.vrControlsEnabled = true;

    this.useImmediatePose = false;

    this.stage = new THREE.Object3D();
    this.stage.matrixAutoUpdate = false;

    this.scene.add(this.stage);

    // public methods:

    this.render = function () {
        if (this.vrControlsEnabled) this.vrControls.update(this.useImmediatePose);
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

    this.toggleUseImmediatePose = function () {
        if (this.useImmediatePose) {
            this.useImmediatePose = false;
        } else {
            this.useImmediatePose = true;
            console.log('using immediate pose');
        }
    }.bind(this);

    this.resetVRSensor = ( function () {
        var lastPosition = new THREE.Vector3();
        var euler = new THREE.Euler(0, 0, 0, 'YXZ');
        var onResetVRSensor = config.onResetVRSensor;
        return function () {
            if (this.vrControlsEnabled) {
                this.vrControls.update(true);
                lastPosition.copy(this.camera.position);
                var lastRotation = this.camera.rotation.y;
                this.vrControls.resetPose();
                this.vrControls.update(true);

                // maintain correspondence between virtual / physical poses of stage objects:
                this.stage.children.forEach( function (object) {
                    // maintain rotation of object (relative heading of object w.r.t. HMD):
                    if (object === this.camera) return;
                    euler.setFromQuaternion(object.quaternion);
                    euler.y -= lastRotation;
                    object.quaternion.setFromEuler(euler);
                    // maintain position of object w.r.t. HMD:
                    object.position.sub(lastPosition);
                    object.position.applyAxisAngle(THREE.Object3D.DefaultUp, -lastRotation);
                    object.position.add(this.camera.position);
                    object.updateMatrix();
                }.bind(this) );

                this.stage.updateMatrixWorld(true);

                // this.stage.children.forEach( function (child) {
                //     euler.setFromQuaternion(child.quaternion);
                //     euler.y -= lastRotation;
                //     child.quaternion.setFromAxisAngle(THREE.Object3D.DefaultUp, euler.y);
                //     child.position.sub(lastPosition);
                //     child.position.applyAxisAngle(THREE.Object3D.DefaultUp, -lastRotation);
                //     child.position.add(this.camera.position);
                //     child.updateMatrix();
                // } );

                if (onResetVRSensor) {
                    onResetVRSensor(lastRotation, lastPosition);
                }
            }
        };
    } )().bind(this);

    this.toggleFullscreen = function (options) {
        if (!isFullscreen()) {
            requestFullscreen(options);
            // requestPointerLock();
        } else {
            exitFullscreen();
            // releasePointerLock();
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

    this.vrDisplay = null;

    // WebVR setup:

    if (navigator.getVRDisplays) {
        navigator.getVRDisplays().then( function (displays) {
            if (displays.length > 0) {
                this.vrDisplay = displays[0];
                if (this.vrDisplay.stageParameters && this.vrDisplay.stageParameters.sittingToStandingTransform) {
                    this.stage.matrix.fromArray(this.vrDisplay.stageParameters.sittingToStandingTransform);
                    this.stage.matrix.decompose(this.stage.position, this.stage.quaternion, this.stage.scale);
                    this.stage.matrixWorldNeedsUpdate = true;
                }
                if (config.onGotVRDisplay) {
                    config.onGotVRDisplay(this.vrDisplay);
                }
            }
        }.bind(this) );
    } else {
        console.error('WebVR API is not supported');
    }

    this.toggleVR = function () {
        var vrDisplay = this.vrDisplay;
        if (vrDisplay && !vrDisplay.isPresenting && vrDisplay.capabilities.canPresent) {
            this.vrEffect.requestPresent();
        } else if (vrDisplay && vrDisplay.isPresenting) {
            this.vrEffect.exitPresent().then( function () {
                console.log('exited VR presentation');
            } );
        } else {
            console.error('there is no capable VRDisplay available');
        }
    }.bind(this);

    // resize, fullscreen/VR listener functions and other useful functions:

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

    // function requestPointerLock() {
    //     if (domElement.requestPointerLock) {
    //         domElement.requestPointerLock();
    //     } else if (domElement.mozRequestPointerLock) {
    //         domElement.mozRequestPointerLock();
    //     } else if (domElement.webkitRequestPointerLock) {
    //         domElement.webkitRequestPointerLock();
    //     }
    // }

    // function releasePointerLock() {
    //     if (document.exitPointerLock) {
    //         document.exitPointerLock();
    //     } else if (document.mozExitPointerLock) {
    //         document.mozExitPointerLock();
    //     } else if (document.webkitExitPointerLock) {
    //         document.webkitExitPointerLock();
    //     }
    // }

    var beforeUnload = function () {
        // stop VR presenting when exiting the app
        if (this.vrDisplay && this.vrDisplay.isPresenting) {
            this.vrEffect.exitPresent();
        }
    }.bind(this);

    // add standard event listeners

    window.addEventListener('resize', onResize, false);
    document.addEventListener(domElement.mozRequestFullScreen ? 'mozfullscreenchange' : 'webkitfullscreenchange',
        onFullscreenChange, false);
    window.addEventListener("beforeunload", beforeUnload, false);
};
