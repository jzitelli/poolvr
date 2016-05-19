/* global THREE, GFXTABLET */

module.exports = ( function () {
	"use strict";
	const INCH2METERS = 0.0254;
	function GfxTablet(xRes, yRes, width, height) {
		xRes = xRes || 2560;
		yRes = yRes || 1600;
		width = width || 8.5 * INCH2METERS;
		height = height || 5.25 * INCH2METERS;
		// set up WebSocket, paintable surface for GfxTablet:
		var gfxTabletStuff = GFXTABLET.addGfxTablet(xRes, yRes);
		// create VR visuals:
		var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1), gfxTabletStuff.paintableMaterial);
		mesh.scale.x = width;
		mesh.scale.y = height;
		var cursor = gfxTabletStuff.cursor;
		cursor.scale.x = 0.002 / width;
		cursor.scale.y = 0.002 / height;
		cursor.position.z = 0.005;
		cursor.updateMatrix();
		mesh.add(cursor);
		this.mesh = mesh;
		this.cursor = cursor;
	}
	return GfxTablet;
} )();
