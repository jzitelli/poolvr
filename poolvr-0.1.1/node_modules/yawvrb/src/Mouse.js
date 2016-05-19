/* global THREE */

module.exports = ( function () {
	"use strict";

	const DEFAULT_OPTIONS = {
		eventTarget: document
	};

	function Mouse(options) {
		var _options = {};
		options = options || _options;
		for (var option in DEFAULT_OPTIONS) {
			_options[option] = options[option];
		}
		for (option in DEFAULT_OPTIONS) {
			if (options[option] === undefined) _options[option] = DEFAULT_OPTIONS[option];
		}
		options = _options;

		var stageObject = new THREE.Mesh(new THREE.BoxBufferGeometry(5.75 * 0.01, 3.75 * 0.01, 9.5 * 0.01));
		this.stageObject = stageObject;

		var pointerMesh = options.pointerMesh || new THREE.Mesh(new THREE.CircleBufferGeometry(0.014, 8), new THREE.MeshBasicMaterial({color: 0xffee22}));
		pointerMesh.matrixAutoUpdate = false;
		pointerMesh.visible = false;
		this.pointerMesh = pointerMesh;

		var eventTarget = options.eventTarget;

		var pointerEnabled = false;
		this.togglePointer = function () {
			if (pointerEnabled) {
				eventTarget.removeEventListener("mousemove", onMouseMove);
				pointerEnabled = false;
				pointerMesh.visible = false;
			} else {
				eventTarget.addEventListener("mousemove", onMouseMove, false);
				pointerEnabled = true;
				pointerMesh.visible = true;
			}
			function onMouseMove(evt) {
				var aspect = window.innerWidth / window.innerHeight;
				if (document.pointerLockElement) {
					pointerMesh.position.x += evt.movementX / window.innerWidth;
					pointerMesh.position.y -= evt.movementY / window.innerHeight / aspect;
				} else {
					pointerMesh.position.x = -0.5 + evt.screenX / window.innerWidth;
					stageObject.position.x = -12 * 0.0254 + 0.1 * evt.screenX / window.innerWidth;
					pointerMesh.position.y =  (0.5 - evt.screenY / window.innerHeight) / aspect;
					stageObject.position.z =  -12 * 0.0254 + 0.1 * (0.5 - evt.screenY / window.innerHeight) / aspect;
				}
				pointerMesh.updateMatrix();
				stageObject.updateMatrix();
			}
		};

		// function onClick(evt) {
		// 	// TODO
		// }
		// eventTarget.addEventListener("click", onClick, false);
	}

	return Mouse;
} )();
