/* global THREE */

const DEFAULT_OPTIONS = {
    useImmediatePose: false,
    onResetVRSensor: function (lastRotation, lastPosition) {
        console.log('lastRotation: ' + lastRotation);
        console.log('lastPosition: ' + lastPosition);
    }
};

function App(scene, config, rendererOptions) {
    "use strict";
    var _config = {};
    config = config || _config;
    for (var kwarg in config) {
        _config[kwarg] = config[kwarg];
    }
    for (kwarg in DEFAULT_OPTIONS) {
        if (config[kwarg] === undefined) _config[kwarg] = DEFAULT_OPTIONS[kwarg];
    }
    config = _config;
    console.log('YAWVRB.App config:');
    console.log(config);

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

    // public methods:

    this.render = function () {
        if (this.vrControlsEnabled) this.vrControls.update(config.useImmediatePose);
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

    this.resetVRSensor = ( function () {
        var onResetVRSensor = config.onResetVRSensor;
        var lastPosition = new THREE.Vector3();
        return function () {
            if (this.vrControlsEnabled) {
                this.vrControls.update(true);
                lastPosition.copy(this.camera.position);
                var lastRotation = this.camera.rotation.y;
                this.vrControls.resetPose();
                this.vrControls.update(true);
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

    // WebVR setup

    this.vrDisplay = null;

    if (navigator.getVRDisplays) {
        navigator.getVRDisplays().then( function (displays) {
            if (displays.length > 0) {
                this.vrDisplay = displays[0];
            }
        }.bind(this) );
    } else {
        console.error('WebVR API is not supported');
    }

    this.toggleVR = function () {
        var vrDisplay = this.vrDisplay;
        if (vrDisplay && !vrDisplay.isPresenting && vrDisplay.capabilities.canPresent) {
            this.vrEffect.requestPresent().then( function () {
                if (vrDisplay.capabilities.hasExternalDisplay) {
                    var eyeParams = vrDisplay.getEyeParameters( 'left' );
                    this.renderer.setSize(2*eyeParams.renderWidth, eyeParams.renderHeight);
                }
                // requestPointerLock();
            }.bind(this) );
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
}

module.exports = App;
