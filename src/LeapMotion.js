/* *********************************************************************************************

   To connect to remote Leap Motion controllers, add this to the host's Leap Motion config.json:
     "websockets_allow_remote": true

   ********************************************************************************************* */

/* global Leap, THREE, CANNON */
var Utils = require('./Utils.js');

module.exports = ( function () {
    "use strict";

    const INCH2METERS = 0.0254;
    const LEAP2METERS = 0.001;
    const METERS2LEAP = 1000;
    const UP = THREE.Object3D.DefaultUp;
    const FORWARD = new THREE.Vector3(0, 0, -1);

    const DEFAULT_OPTIONS = {
        toolLength: 0.15,
        toolRadius: 0.0034,
        tipRadius: 0.0034,
        toolMass: 0.04,
        tipShape: 'ImplicitCylinder',
        interactionBoxColor: 0x99eebb,
        leapColor: 0x777777,
        toolColor: 0xeebb99,
        tipColor: 0x99bbee,
        handColor: 0x113399,
        useShadowMesh: true,
        shadowMaterial: new THREE.MeshBasicMaterial({color: 0x333333}),
        shadowLightPosition: new THREE.Vector4(0, 7, 0, 0.1),
        shadowPlane: 0.002,
        numSegments: 10,
        interactionPlaneOpacity: 0.22,
        timeA: 0.25,
        timeB: 0.25 + 1.5,
        minConfidence: 0.13,
        host: '127.0.0.1',
        port: 6437
    };

    function makeTool(options) {
        options = Utils.combineObjects(DEFAULT_OPTIONS, options || {});
        console.log('Leap Motion tool options:');
        console.log(options);

        // coordinate transformations are performed via three.js scene graph
        var toolRoot = new THREE.Object3D();
        toolRoot.scale.set(LEAP2METERS, LEAP2METERS, LEAP2METERS);

        toolRoot.position.set(0, -18 * 0.0254, -0.49);

        // set up / connect to leap controller:

        var leapController = new Leap.Controller({background: true,
                                                  host: options.host,
                                                  port: options.port});

        // leap motion event callbacks:
        var onConnect = options.onConnect || function () {
            console.log('Leap Motion WebSocket connected (host: %s, port: %d)', options.host, options.port);
        };
        leapController.on('connect', onConnect);

        var onDisconnect = options.onDisconnect || function () {
            console.log('Leap Motion WebSocket disconnected (host: %s, port: %d)', options.host, options.port);
        };
        leapController.on('disconnect', onDisconnect);

        var onStreamingStarted = options.onStreamingStarted || function () {
            console.log('Leap Motion streaming started (host: %s, port: %d)', options.host, options.port);
        };
        leapController.on('streamingStarted', onStreamingStarted);

        var onStreamingStopped = options.onStreamingStopped || function () {
            console.warn('Leap Motion streaming stopped (host: %s, port: %d)', options.host, options.port);
        };
        leapController.on('streamingStopped', onStreamingStopped);

        // setup tool visuals:

        // interaction box visual guide:
        var interactionBoxRoot = new THREE.Object3D();
        toolRoot.add(interactionBoxRoot);

        var interactionPlaneMaterial = new THREE.MeshBasicMaterial({color: options.interactionBoxColor, transparent: true, opacity: options.interactionPlaneOpacity});
        var interactionPlaneGeom = new THREE.PlaneBufferGeometry(METERS2LEAP, METERS2LEAP);

        var interactionPlaneMesh = new THREE.Mesh(interactionPlaneGeom, interactionPlaneMaterial);
        interactionBoxRoot.add(interactionPlaneMesh);

        interactionPlaneMesh = interactionPlaneMesh.clone();
        interactionPlaneMesh.position.z = METERS2LEAP * 0.5;
        interactionPlaneMesh.updateMatrix();
        interactionBoxRoot.add(interactionPlaneMesh);

        interactionPlaneMesh = interactionPlaneMesh.clone();
        interactionPlaneMesh.position.z = METERS2LEAP * (-0.5);
        interactionPlaneMesh.updateMatrix();
        interactionBoxRoot.add(interactionPlaneMesh);

        // leap motion controller:
        var boxGeom = new THREE.BoxGeometry(METERS2LEAP*INCH2METERS*(3+1/8), METERS2LEAP*INCH2METERS*7/16, METERS2LEAP*INCH2METERS*(1 + 3/16));
        var leapGeom = new THREE.BufferGeometry();
        leapGeom.fromGeometry(boxGeom);
        boxGeom.dispose();
        var leapMaterial = new THREE.MeshLambertMaterial({color: options.leapColor});
        var leapMesh = new THREE.Mesh(leapGeom, leapMaterial);
        leapMesh.position.y = METERS2LEAP*INCH2METERS*(7/32);
        leapMesh.updateMatrix();
        toolRoot.add(leapMesh);

        // the stick:
        var toolGeom = new THREE.CylinderGeometry(METERS2LEAP*options.toolRadius, METERS2LEAP*options.toolRadius, METERS2LEAP*options.toolLength, 10, 1, false);
        toolGeom.translate(0, -0.5*METERS2LEAP*options.toolLength, 0);
        toolGeom.rotateX(-0.5 * Math.PI);
        var bufferGeom = new THREE.BufferGeometry();
        bufferGeom.fromGeometry(toolGeom);
        toolGeom.dispose();
        toolGeom = bufferGeom;
        var toolMaterial = new THREE.MeshLambertMaterial({color: options.toolColor, transparent: true});
        var toolMesh = new THREE.Mesh(toolGeom, toolMaterial);
        toolRoot.add(toolMesh);

        var toolShadowMesh;
        if (options.useShadowMesh) {
            toolShadowMesh = new THREE.ShadowMesh(toolMesh, options.shadowMaterial);
            var shadowPlane = new THREE.Plane(UP, options.shadowPlane);
            toolShadowMesh.updateShadowMatrix(shadowPlane, options.shadowLightPosition);
        } else {
            toolMesh.castShadow = true;
        }

        var toolBody = new CANNON.Body({mass: options.toolMass, type: CANNON.Body.KINEMATIC});
        // TODO: rename, avoid confusion b/t cannon and three materials
        toolBody.material = options.tipMaterial || new CANNON.Material();

        var tipMesh = null;
        if (options.tipShape === 'Sphere') {
            var tipGeom = new THREE.SphereBufferGeometry(METERS2LEAP*options.tipRadius, 10);
            toolBody.addShape(new CANNON.Sphere(options.tipRadius));
            var tipMaterial = new THREE.MeshLambertMaterial({color: options.tipColor, transparent: true});
            tipMesh = new THREE.Mesh(tipGeom, tipMaterial);
            tipMesh.castShadow = true;
            toolMesh.add(tipMesh);
        } else {
            // cannon body is a cylinder at end of tool
            var cylLength = options.toolLength;
            var shapePosition = new CANNON.Vec3(0, 0, 0.5*cylLength);
            if (options.tipShape === 'ImplicitCylinder') {
                toolBody.addShape(new CANNON.ImplicitCylinder(options.tipRadius, cylLength), shapePosition, (new CANNON.Quaternion()).setFromAxisAngle(CANNON.Vec3.UNIT_X, 0.5*Math.PI));
            } else {
                toolBody.addShape(new CANNON.Cylinder(options.tipRadius, options.tipRadius, cylLength, options.numSegments), shapePosition);
            }
        }

        // to store decomposed toolRoot world matrix, used to convert three.js local coords to cannon.js world coords:
        var worldPosition = new THREE.Vector3();
        var worldQuaternion = new THREE.Quaternion();
        var worldScale = new THREE.Vector3();
        // inverse of toolRoot.matrixWorld, used for converting cannon.js world coords to three.js local coords:
        var matrixWorldInverse = new THREE.Matrix4();

        function updateToolMapping() {
            toolRoot.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
            matrixWorldInverse.getInverse(toolRoot.matrixWorld);
        }

        function updateToolPostStep() {
            toolMesh.position.copy(toolBody.interpolatedPosition);
            toolMesh.position.applyMatrix4(matrixWorldInverse);
            toolMesh.updateMatrix();
            if (toolShadowMesh) {
                toolShadowMesh.updateMatrix();
            }
        }

        var direction = new THREE.Vector3();
        var position = new THREE.Vector3();
        var velocity = new THREE.Vector3();
        var quaternion = new THREE.Quaternion();

        var deadtime = 0;

        var lastFrameID;

        function setDeadtime(t) {
            deadtime = t;
            if (deadtime === 0) {
                interactionBoxRoot.visible = true;
                interactionPlaneMaterial.opacity = options.interactionPlaneOpacity;
            }
        }

        function updateTool(dt) {

            deadtime += dt;

            var frame = leapController.frame();
            if (frame.valid && frame.id !== lastFrameID) {

                lastFrameID = frame.id;

                var interactionBox = frame.interactionBox;
                if (interactionBox.valid) {
                    interactionBoxRoot.position.fromArray(interactionBox.center);
                    interactionBoxRoot.scale.set(interactionBox.width*LEAP2METERS, interactionBox.height*LEAP2METERS, interactionBox.depth*LEAP2METERS);
                    interactionBoxRoot.updateMatrix();
                    interactionBoxRoot.updateMatrixWorld();
                }

                if (frame.tools.length === 1) {

                    deadtime = 0;

                    var tool = frame.tools[0];

                    if (toolMesh.visible === false || toolMesh.material.opacity < 1) {
                        toolMesh.visible = true;

                        if (toolShadowMesh) toolShadowMesh.visible = true;

                        toolMesh.material.opacity = 1;
                        if (tipMesh) tipMesh.material.opacity = 1;
                        interactionBoxRoot.visible = true;
                        interactionPlaneMaterial.opacity = options.interactionPlaneOpacity;
                    }

                    position.fromArray(tool.tipPosition);
                    //position.fromArray(tool.stabilizedTipPosition);
                    direction.fromArray(tool.direction);

                    toolMesh.position.copy(position);
                    position.applyMatrix4(toolRoot.matrixWorld);
                    toolBody.position.copy(position);

                    toolMesh.quaternion.setFromUnitVectors(FORWARD, direction);

                    quaternion.multiplyQuaternions(worldQuaternion, toolMesh.quaternion);
                    toolBody.quaternion.copy(quaternion);

                    toolMesh.updateMatrix();
                    toolMesh.updateMatrixWorld();

                    if (toolShadowMesh) {
                        toolShadowMesh.updateMatrix();
                        toolShadowMesh.updateMatrixWorld();
                    }

                    velocity.fromArray(tool.tipVelocity);
                    velocity.applyQuaternion(worldQuaternion);
                    velocity.multiplyScalar(LEAP2METERS);
                    toolBody.velocity.copy(velocity);

                    if (tool.timeVisible > options.timeA) {
                        // stick becomes collidable once it has been detected for some time
                        if (toolBody.sleepState === CANNON.Body.SLEEPING) {
                            toolBody.wakeUp();
                            // TODO: indicator (particle effect)
                            if (tipMesh) tipMesh.material.color.setHex(0xff0000);
                        }

                        if (tool.timeVisible > options.timeB && interactionPlaneMaterial.opacity > 0.1) {
                            // dim the interaction box:
                            interactionPlaneMaterial.opacity *= 0.94;
                        }

                    }

                } else if (toolBody.sleepState === CANNON.Body.AWAKE) {
                    // tool detection was just lost
                    toolBody.sleep();
                    if (tipMesh) tipMesh.material.color.setHex(options.tipColor);

                } else {
                    // tool is already lost
                    if (toolMesh.visible && toolMesh.material.opacity > 0.1) {
                        // fade out tool
                        toolMesh.material.opacity *= 0.8;
                        if (tipMesh) tipMesh.material.opacity = toolMesh.material.opacity;
                    } else {
                        toolMesh.visible = false;
                        if (toolShadowMesh) toolShadowMesh.visible = false;
                    }
                }

                updateHands(frame);

            }

            if ( deadtime > 1.5 && interactionBoxRoot.visible ) {
                interactionPlaneMaterial.opacity *= 0.93;
                if (interactionPlaneMaterial.opacity < 0.02) interactionBoxRoot.visible = false;
            }

        }

        // setup hands:

        // hands don't necessarily correspond the left / right labels, but doesn't matter in this case because they look indistinguishable
        var leftRoot = new THREE.Object3D(),
            rightRoot = new THREE.Object3D();
        var handRoots = [leftRoot, rightRoot];
        toolRoot.add(leftRoot);
        toolRoot.add(rightRoot);

        var handMaterial = new THREE.MeshBasicMaterial({color: options.handColor, transparent: true, opacity: 0});

        // arms:
        var armRadius = METERS2LEAP*0.021,
            armLength = METERS2LEAP*0.22;
        var armGeom = new THREE.CylinderGeometry(armRadius, armRadius, armLength);
        bufferGeom = new THREE.BufferGeometry();
        bufferGeom.fromGeometry(armGeom);
        armGeom.dispose();
        armGeom = bufferGeom;
        var armMesh = new THREE.Mesh(armGeom, handMaterial);
        var arms = [armMesh, armMesh.clone()];
        leftRoot.add(arms[0]);
        rightRoot.add(arms[1]);
        // palms:
        var radius = METERS2LEAP*0.02;
        var palmGeom = new THREE.SphereBufferGeometry(radius).scale(1, 0.4, 1);
        var palmMesh = new THREE.Mesh(palmGeom, handMaterial);
        var palms = [palmMesh, palmMesh.clone()];
        leftRoot.add(palms[0]);
        rightRoot.add(palms[1]);

        // var textureLoader = new THREE.TextureLoader();
        // var spriteTexture = textureLoader.load('/node_modules/three/examples/textures/sprite1.png'); , function (texture) {
        // } );
        // var spriteMaterial = new THREE.SpriteMaterial({map: spriteTexture});
        // var sphereSprite = new THREE.Sprite(spriteMaterial);

        // fingertips:
        radius = METERS2LEAP*0.005;
        var fingerTipGeom = new THREE.SphereBufferGeometry(radius);
        var fingerTipMesh = new THREE.Mesh(fingerTipGeom, handMaterial);
        // var fingerTipMesh = sphereSprite.clone();
        // fingerTipMesh.scale.set(radius, radius, radius);
        var fingerTips = [[fingerTipMesh, fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone()],
                          [fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone(), fingerTipMesh.clone()]];
        leftRoot.add(fingerTips[0][0], fingerTips[0][1], fingerTips[0][2], fingerTips[0][3], fingerTips[0][4]);
        rightRoot.add(fingerTips[1][0], fingerTips[1][1], fingerTips[1][2], fingerTips[1][3], fingerTips[1][4]);
        // finger joints:
        var jointMesh = fingerTipMesh.clone();
        jointMesh.scale.set(7/5, 7/5, 7/5);
        var joints = [[jointMesh, jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone()],
                      [jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone(), jointMesh.clone()]];
        leftRoot.add(joints[0][0], joints[0][1], joints[0][2], joints[0][3], joints[0][4]);
        rightRoot.add(joints[1][0], joints[1][1], joints[1][2], joints[1][3], joints[1][4]);
        var joint2Mesh = fingerTipMesh.clone();
        joint2Mesh.scale.set(55/50, 55/50, 55/50);
        var joint2s = [[joint2Mesh, joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone()],
                       [joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone(), joint2Mesh.clone()]];
        leftRoot.add(joint2s[0][0], joint2s[0][1], joint2s[0][2], joint2s[0][3], joint2s[0][4]);
        rightRoot.add(joint2s[1][0], joint2s[1][1], joint2s[1][2], joint2s[1][3], joint2s[1][4]);
        var joint3Mesh = fingerTipMesh.clone();
        joint3Mesh.scale.set(7/5, 7/5, 7/5);
        var joint3s = [[joint3Mesh, joint3Mesh.clone(), joint3Mesh.clone(), joint3Mesh.clone()],
                       [joint3Mesh.clone(), joint3Mesh.clone(), joint3Mesh.clone(), joint3Mesh.clone()]];
        leftRoot.add(joint3s[0][0], joint3s[0][1], joint3s[0][2], joint3s[0][3]);
        rightRoot.add(joint3s[1][0], joint3s[1][1], joint3s[1][2], joint3s[1][3]);

        function updateHands(frame) {
            leftRoot.visible = rightRoot.visible = false;
            for (var i = 0; i < frame.hands.length; i++) {
                var hand = frame.hands[i];
                if (hand.confidence > options.minConfidence) {

                    handRoots[i].visible = true;
                    handMaterial.opacity = 0.5*handMaterial.opacity + 0.5*(hand.confidence - options.minConfidence) / (1 - options.minConfidence);

                    var arm = arms[i];
                    direction.fromArray(hand.arm.basis[2]);
                    arm.quaternion.setFromUnitVectors(UP, direction);
                    arm.position.fromArray(hand.arm.center());
                    arm.updateMatrix();

                    var palm = palms[i];
                    direction.fromArray(hand.palmNormal);
                    palm.quaternion.setFromUnitVectors(UP, direction);
                    palm.position.fromArray(hand.palmPosition);
                    palm.updateMatrix();

                    var handFingerTips = fingerTips[i];
                    var handJoints = joints[i];
                    var handJoint2s = joint2s[i];
                    var handJoint3s = joint3s[i];
                    for (var j = 0; j < hand.fingers.length; j++) {
                        var finger = hand.fingers[j];
                        handFingerTips[j].position.fromArray(finger.tipPosition);
                        handFingerTips[j].updateMatrix();
                        handJoints[j].position.fromArray(finger.bones[1].nextJoint);
                        handJoints[j].updateMatrix();
                        handJoint2s[j].position.fromArray(finger.bones[2].nextJoint);
                        handJoint2s[j].updateMatrix();
                    }
                    for (j = 0; j < 4; j++) {
                        finger = hand.fingers[j+1];
                        handJoint3s[j].position.fromArray(finger.bones[1].prevJoint);
                        handJoint3s[j].updateMatrix();
                    }
                }
            }
        }

        // initialize matrices:
        toolRoot.traverse( function (node) {
            node.matrixAutoUpdate = false;
            node.updateMatrix();
        } );

        interactionBoxRoot.visible = false;
        toolMesh.visible = false;
        if (toolShadowMesh) toolShadowMesh.visible = false;
        leftRoot.visible  = false;
        rightRoot.visible = false;

        return {
            leapController:     leapController,
            toolRoot:           toolRoot,
            toolMesh:           toolMesh,
            toolBody:           toolBody,
            updateTool:         updateTool,
            updateToolPostStep: updateToolPostStep,
            updateToolMapping:  updateToolMapping,
            setDeadtime:        setDeadtime,
            toolShadowMesh: toolShadowMesh,
            worldQuaternion: worldQuaternion,
            worldPosition: worldPosition
        };
    }

    return {
        makeTool: makeTool
    };

} )();
