function WebVRApplication(scene, config) {
    "use strict";
    this.scene = scene;

    config = config || {};
    var rendererOptions  = config.rendererOptions;
    var useShadowMap     = config.useShadowMap;
    var onResetVRSensor  = config.onResetVRSensor;
    var devicePixelRatio = config.devicePixelRatio || window.devicePixelRatio;

    var domElement;
    if (config.canvasId) {
        // canvas already exists in document
        domElement = document.getElementById(config.canvasId);
        rendererOptions = combineObjects(rendererOptions, {canvas: domElement});
        this.renderer = new THREE.WebGLRenderer(rendererOptions);
    } else {
        // create the canvas
        this.renderer = new THREE.WebGLRenderer(rendererOptions);
        domElement = this.renderer.domElement;
        document.body.appendChild(domElement);
        domElement.id = 'webgl-canvas';
    }

    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (useShadowMap) {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.matrixAutoUpdate = true;

    this.vrEffect = new THREE.VREffect(this.renderer, function(error) { console.error('error creating VREffect: ' + error); });

    this.vrControls = new THREE.VRControls(this.camera, function(error) { console.error('error creating VRControls: ' + error); });
    this.vrControlsEnabled = true;

    // public methods:

    this.render = function () {
        if (this.vrControlsEnabled) this.vrControls.update();
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

    var lastPosition = new THREE.Vector3();
    this.resetVRSensor = function () {
        if (this.vrControlsEnabled) {
            this.vrControls.update();
            lastPosition.copy(this.camera.position);
            var lastRotation = this.camera.rotation.y;
            this.vrControls.resetSensor();
            this.vrControls.update();
            if (onResetVRSensor) {
                onResetVRSensor(lastRotation, lastPosition);
            }
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

    // full screen / VR presenting stuff:

    var isFullscreen = false;

    var isRequestingPresent = false;

    var isPresenting = false;

    window.addEventListener('resize', function () {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }.bind(this), false );

    var fullscreenchange = domElement.mozRequestFullScreen ? 'mozfullscreenchange' : 'webkitfullscreenchange';

    var vrButton = document.createElement('button');
    vrButton.innerHTML = 'ENTER VR';
    vrButton.style.position = 'absolute';
    vrButton.style.right = 0;
    vrButton.style.bottom = 0;
    vrButton.style.margin = '10px';
    vrButton.style.padding = '10px';
    vrButton.style.background = 0x222222;
    vrButton.style['text-color'] = 0xffffff;

    document.addEventListener(fullscreenchange, function ( event ) {
        isFullscreen = !!(document.webkitFullscreenElement || document.mozFullScreenElement);
        if (isFullscreen && isRequestingPresent && !isPresenting) {
            isRequestingPresent = false;
            this.vrEffect.requestPresent().then( function () {
                isPresenting = true;
                vrButton.innerHTML = 'EXIT VR';
            } ).catch( function (error) {
                console.error(error);
                vrButton.innerHTML = 'VR ERROR!';
                vrButton.style.background = 0x992222;
                vrButton.removeEventListener('click', onClick);
            } );
        } else if (!isFullscreen && isRequestingPresent) {
            isRequestingPresent = false;
            console.error('requestPresent was not performed because fullscreen could not be entered');
        } else if (!isFullscreen && isPresenting) {
            this.vrEffect.exitPresent().then( function () {
                isPresenting = false;
                vrButton.innerHTML = 'ENTER VR';
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }.bind(this) );
        }
    }.bind(this), false);

    if (window.VRDisplay || window.HMDVRDevice) {

        var onClick = function () {
            if (!isPresenting) {
                isRequestingPresent = true;
                if (domElement.requestFullscreen) {
                    domElement.requestFullscreen();
                } else if (domElement.msRequestFullscreen) {
                    domElement.msRequestFullscreen();
                } else if (domElement.mozRequestFullScreen) {
                    domElement.mozRequestFullScreen();
                } else if (domElement.webkitRequestFullscreen) {
                    domElement.webkitRequestFullscreen();
                } else {
                    console.error('fullscreen not supported');
                    isRequestingPresent = false;
                }
            } else {
                this.vrEffect.exitPresent().then( function () {
                    isPresenting = false;
                    vrButton.innerHTML = 'ENTER VR';
                    this.renderer.setSize(window.innerWidth, window.innerHeight);
                }.bind(this) );
            }
        }.bind(this);

        vrButton.addEventListener('click', onClick, false);

        document.body.appendChild(vrButton);

        window.addEventListener("beforeunload", function (e) {
            if (isPresenting) {
                console.log('exiting VR present state...');
                this.vrEffect.exitPresent().then( function () {
                    console.log('...success!');
                } );
            }
        }.bind(this), false);

    } else {

        console.warn('WebVR is not supported on your browser / platform');

    }


    // TODO
    // renderer.domElement.requestPointerLock = renderer.domElement.requestPointerLock || renderer.domElement.mozRequestPointerLock || renderer.domElement.webkitRequestPointerLock;
    // function requestPointerLock() {
    //     if (renderer.domElement.requestPointerLock) {
    //         renderer.domElement.requestPointerLock();
    //     }
    // }
    // function releasePointerLock() {
    //     document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
    //     if (document.exitPointerLock) {
    //         document.exitPointerLock();
    //     }
    // }
    // document.addEventListener(fullscreenchange, function ( event ) {
    //     if (this.vrManager.isVRMode()) {
    //         this.vrControls.enabled = true;
    //     }
    //     var fullscreen = !(document.webkitFullscreenElement === null || document.mozFullScreenElement === null);
    //     if (!fullscreen) {
    //         releasePointerLock();
    //     } else {
    //         requestPointerLock();
    //     }
    // }.bind(this));

}
