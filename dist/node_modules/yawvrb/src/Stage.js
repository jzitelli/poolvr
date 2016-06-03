/* global THREE */
module.exports = ( function () {
    "use strict";

    function Stage() {
        var rootObject = new THREE.Object3D();
        rootObject.matrixAutoUpdate = false;

        this.rootObject = rootObject;

        this.hasStageParameters = false;

        var vrDisplay;

        if (navigator.getVRDisplays) {
            console.log('checking VRDisplays for stage parameters...');
            navigator.getVRDisplays().then( function (displays) {
                for (var i = 0; i < displays.length; i++) {
                    vrDisplay = displays[i];
                    console.log('%s:\n%s', vrDisplay.displayName, JSON.stringify(vrDisplay, undefined, 2));
                    updateSittingToStandingTransform();
                }
            } );
        } else {
            console.warn('your browser does not support the latest WebVR API');
        }

        var updateSittingToStandingTransform = function () {
            if (vrDisplay && vrDisplay.stageParameters && vrDisplay.stageParameters.sittingToStandingTransform) {
                console.log('sittingToStandingTransform:\n' + vrDisplay.stageParameters.sittingToStandingTransform);
                rootObject.matrix.fromArray(vrDisplay.stageParameters.sittingToStandingTransform);
                rootObject.matrix.decompose(rootObject.position, rootObject.quaternion, rootObject.scale);
                rootObject.matrixWorldNeedsUpdate = true;
                this.hasStageParameters = true;
                console.log('  position: %f, %f, %f', rootObject.position.x, rootObject.position.y, rootObject.position.z);
                console.log('  rotation: %f, %f, %f', rootObject.rotation.x, rootObject.rotation.y, rootObject.rotation.z);
                console.log('  quaternion: %f, %f, %f, %f', rootObject.quaternion.x, rootObject.quaternion.y, rootObject.quaternion.z, rootObject.quaternion.w);
                console.log('  scale: %f, %f, %f', rootObject.scale.x, rootObject.scale.y, rootObject.scale.z);
            } else {
                console.warn('no sittingToStandingTransform provided by the VRDisplay');
            }
        }.bind(this);

        this.save = function () {
            console.log('saving poses of stage objects...');
            var transforms = {};
            rootObject.children.forEach( function (object) {
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
        };

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
            rootObject.children.forEach( function (object) {
                if (object.name && transforms[object.name]) {
                    var transform = transforms[object.name];
                    object.position.fromArray(transform.position);
                    object.quaternion.fromArray(transform.quaternion);
                    object.updateMatrix();
                }
            } );
            rootObject.updateMatrixWorld(true);
        };

    }

    return Stage;
} )();
