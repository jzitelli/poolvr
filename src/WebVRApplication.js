function WebVRApplication(scene, config) {
    "use strict";
    this.scene = scene;

    config = config || {};
    var rendererOptions = config.rendererOptions;
    var useShadowMap    = config.useShadowMap;
    var onResetVRSensor = config.onResetVRSensor;

    var domElement;
    if (config.canvasId) {
        domElement = document.getElementById(config.canvasId);
        rendererOptions = combineObjects(rendererOptions, {canvas: domElement});
        this.renderer = new THREE.WebGLRenderer(rendererOptions);
    } else {
        this.renderer = new THREE.WebGLRenderer(rendererOptions);
        domElement = this.renderer.domElement;
        document.body.appendChild(domElement);
        domElement.id = 'webgl-canvas';
    }

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (useShadowMap) {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.matrixAutoUpdate = true;

    this.vrEffect = new THREE.VREffect(this.renderer, function(error) { console.error('error creating VREffect: ' + error); });

    this.vrControls = new THREE.VRControls(this.camera, function(errorMsg) { console.error('error creating VRControls: ' + error); });
    this.vrControlsEnabled = true;


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


    var isPresenting = false;

    window.addEventListener('resize', function () {
        if (!isPresenting) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize( window.innerWidth, window.innerHeight );
        }
    }.bind(this), false );

    var vrButton = document.createElement('button');
    vrButton.innerHTML = 'ENTER VR';
    vrButton.style.position = 'absolute';
    vrButton.style.right = 0;
    vrButton.style.bottom = 0;
    vrButton.style.margin = '10px';
    vrButton.style.padding = '10px';
    vrButton.style.background = 0x222222;
    vrButton.style['text-color'] = 0xffffff;
    vrButton.addEventListener('click', function () {
        if (!isPresenting) {
            this.vrEffect.requestPresent().then( function () {
                isPresenting = true;
                vrButton.innerHTML = 'EXIT VR';
            } );
        } else {
            this.vrEffect.exitPresent().then( function () {
                isPresenting = false;
                vrButton.innerHTML = 'ENTER VR';
                this.renderer.setSize( window.innerWidth, window.innerHeight )
            }.bind(this) );
        }
    }.bind(this));
    document.body.appendChild(vrButton);


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
    // var fullscreenchange = this.renderer.domElement.mozRequestFullScreen ? 'mozfullscreenchange' : 'webkitfullscreenchange';
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
