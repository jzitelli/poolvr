/* global module */
var fs = require('fs')

var srcFiles = [
  "node_modules/yawvrb/src/App.js",
  "node_modules/yawvrb/src/Keyboard.js",
  "node_modules/yawvrb/src/Gamepad.js",
  "node_modules/yawvrb/src/AppUtils.js",
  "node_modules/three.py/js/three.py.js",
  "node_modules/three.py/js/CANNONize.js",
  "src/TextGeomUtils.js",
  "src/utils.js",
  "src/LeapInput.js",
  "src/WebVRSound.js",
  "src/SynthSpeaker.js",
  "src/actions.js",
  "src/config.js",
  "src/setup.js",
  "src/menu.js",
  "src/main.js"
];

var libFiles = [
  "node_modules/three.js/build/three.min.js",
  "node_modules/three.js/examples/js/effects/VREffect.js",
  "node_modules/three.js/examples/js/controls/VRControls.js",
  "node_modules/three.js/examples/js/objects/ShadowMesh.js",
  "node_modules/cannon/build/cannon.min.js",
  "node_modules/leapjs/leap-0.6.4.min.js",
  "node_modules/webvr-polyfill/build/webvr-polyfill.js"
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
  grunt.loadNpmTasks( "grunt-contrib-concat" );
  grunt.loadNpmTasks( "grunt-contrib-uglify" );

  grunt.registerTask( "default", [ "clean", "concat", "copy" ] );
};
