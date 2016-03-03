/* global module */
var fs = require('fs')

var srcFiles = [
  "node_modules/three.py/js/three.py.js",
  "node_modules/three.py/js/CANNONize.js",
  "node_modules/three.py/js/TextGeomUtils.js",
  "src/WebVRApplication.js",
  "src/utils.js",
  "src/LeapInput.js",
  "src/WebVRSound.js",
  "src/SynthSpeaker.js",
  "src/config.js",
  "src/setup.js",
  "src/menu.js",
  "src/main.js"
];

var libFiles = [
  "node_modules/three/build/three.min.js",
  "node_modules/three/examples/js/effects/VREffect.js",
  "node_modules/three/examples/js/controls/VRControls.js",
  "node_modules/three/examples/js/objects/ShadowMesh.js",
  "node_modules/cannon/build/cannon.min.js",
  "node_modules/leapjs/leap-0.6.4.min.js",
  "node_modules/webvr-polyfill/build/webvr-polyfill.js",
  "node_modules/webvr-boilerplate/build/webvr-manager.js"
];

var copyFiles = libFiles.map( function ( s ) {
  return { src: s, dest: s.replace( /.*\/(.*).js/, "lib/$1.js" ) };
} );

var concatFile = "build/poolvr.js";
var uglifyFile = "build/poolvr.min.js";

var license = fs.readFileSync("LICENSE").toString();

var banner = "\
/* ############################################################################\n\
\n\
  <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today(\"yyyy-mm-dd\") %>\n\
\n\
  <%= pkg.homepage %>\n\
  <%= pkg.repository.url %>\n\
\n\
<%= license %>\n\
############################################################################ */\n\n";

module.exports = function ( grunt ) {
  grunt.initConfig( {
    pkg: grunt.file.readJSON( "package.json" ),
    license: license,
    clean: [ "build" ],
    jshint: {
      default: srcFiles
    },
    concat: {
      options: {
        process: function(src, path) {
          return "// #### " + path + "\n" + src;
        },
        separator: ";\n",
        banner: banner
      },
      default: {
        files: [{ src: srcFiles, dest: concatFile }]
      }
    },
    uglify: {
      options: {
        banner: banner
      },
      default: {
        files: [{ src: [concatFile], dest: uglifyFile }]
      }
    },
    copy: {
      default: {
        files: copyFiles
      }
    }
  } );

  grunt.loadNpmTasks( "grunt-contrib-clean" );
  grunt.loadNpmTasks( "grunt-contrib-copy" );
  grunt.loadNpmTasks( "grunt-contrib-jshint" );
  grunt.loadNpmTasks( "grunt-contrib-concat" );
  grunt.loadNpmTasks( "grunt-contrib-uglify" );

  grunt.registerTask( "default", [ "jshint", "clean", "concat", "uglify", "copy" ] );
};
