/* global THREE */
module.exports = ( function () {
    "use strict";

    function Stage() {
        this.hmdCalibrationPose = null;

        var vrDisplay;

        var stageRoot = new THREE.Object3D();
        stageRoot.matrixAutoUpdate = false;
        this.stageRoot = stageRoot;

        this.updateSittingToStandingTransform = function () {
            if (vrDisplay && vrDisplay.stageParameters && vrDisplay.stageParameters.sittingToStandingTransform) {
                console.log('sittingToStandingTransform:\n' + vrDisplay.stageParameters.sittingToStandingTransform);
                stageRoot.matrix.fromArray(vrDisplay.stageParameters.sittingToStandingTransform);
                stageRoot.matrix.decompose(stageRoot.position, stageRoot.quaternion, stageRoot.scale);
            }
        };

        if (navigator.getVRDisplays) {
            console.log('checking VRDisplays for stage parameters...');
            navigator.getVRDisplays().then( function (displays) {
                for (var i = 0; i < displays.length; i++) {
                    vrDisplay = displays[i];
                    console.log('%s:\n%s', vrDisplay.deviceName, JSON.stringify(vrDisplay, undefined, 2));
                    if (vrDisplay.stageParameters && vrDisplay.stageParameters.sittingToStandingTransform) {
                        console.log('sittingToStandingTransform:\n' + vrDisplay.stageParameters.sittingToStandingTransform);
                        stageRoot.matrix.fromArray(vrDisplay.stageParameters.sittingToStandingTransform);
                        stageRoot.matrix.decompose(stageRoot.position, stageRoot.quaternion, stageRoot.scale);
                    } else {
                        console.warn('no sittingToStandingTransform provided by the VRDisplay');
                        stageRoot.position.y = 1.2;
                        stageRoot.updateMatrix();
                    }
                }
            } );
        } else {
            console.warn('your browser does not support the latest WebVR API');
        }

        this.updateCalibrationPose = function ( pose, t ) {
            if (pose) console.log(pose);
            if (t) console.log(t);
        }.bind(this);

        this.save = function () {
            console.log('saving poses of stage objects...');
            var transforms = {};
            stageRoot.children.forEach( function (object) {
                if (object.name) {
                    object.updateMatrix();
                    object.updateMatrixWorld();
                    object.matrix.decompose(object.position, object.quaternion, object.scale);
                    transforms[object.name] = {
                        position: object.position.toArray(),
                        quaternion: object.quaternion.toArray()
                    };
                }
            } );
            console.log(JSON.stringify(transforms, undefined, 2));
            localStorage.setItem('stagePoses', JSON.stringify(transforms, undefined, 2));
            return transforms;
        }.bind(this);

        this.load = function (transforms) {
            if (!transforms) {
                transforms = localStorage.getItem('stagePoses');
                if (!transforms) {
                    console.warn('no stage poses found in localStorage');
                    return;
                } else {
                    transforms = JSON.parse(transforms);
                }
            }
            console.log('loading poses of stage objects...');
            stageRoot.children.forEach( function (object) {
                if (object.name && transforms[object.name]) {
                    var transform = transforms[object.name];
                    object.position.fromArray(transform.position);
                    object.quaternion.fromArray(transform.quaternion);
                    object.updateMatrix();
                    object.updateMatrixWorld();
                }
            } );
        }.bind(this);

    }

    return Stage;
} )();
