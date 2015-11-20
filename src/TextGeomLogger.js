var TextGeomLogger = (function () {

	function TextGeomLogger(geometries, material) {
		this.geometries = geomeries;
		this.materials = materials;
		this.meshes = meshes;

		this.log = function (msg) {

			// TODO:
			// split at newlines
			var lines = '\n'.split(msg);
			var words = 
			// split at word boundaries
			// clone or create positioned word objects / character meshes

		}.bind(this);
	}
	
	return TextGeomLogger;

})();
