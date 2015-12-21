/* global module */

var fs = require( "fs" ),
    files = [
      "lib/three.js",
      "lib/three-r73.js",
      "lib/TextGeometry.js",
      "lib/FontUtils.js",
      "lib/VREffect.js",
      "lib/VRControls.js",
      "lib/webvr-polyfill.js",
      "lib/webvr-manager.js",
      "lib/socket.io.js",
      "lib/cannon.js",
      "lib/leap-0.6.4.js",
      "lib/leap.transform.js",
      "lib/ColladaLoader.js",
      "lib/Primrose.js",
      "lib/SPE.js",
      "obj/poolvr.js",
      "obj/configurator.js"
    ],
    uglifyFiles = files.map( function ( s ) {
      return {
        src: s,
        dest: s.replace( /.*\/(.*).js/, "bin/$1.min.js" )
      };
    } ),
    copyFiles = files.map( function ( s ) {
      return {
        src: s,
        dest: s.replace( /.*\/(.*).js/, "bin/$1.js" )
      };
    } );


module.exports = function ( grunt ) {
  grunt.initConfig( {
    pkg: grunt.file.readJSON( "package.json" ),
    jshint: { default: "src/*.js" },
    clean: [ "obj", "bin" ],
    concat: {
      options: {
        banner: "/*\n\
  <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today(\"yyyy-mm-dd\") %>\n\
  <%= pkg.license.type %>\n\
  Copyright (C) 2015 <%= pkg.author %>\n\
  <%= pkg.homepage %>\n\
  <%= pkg.repository.url %>\n\
*/\n",
        separator: ";\n",
        footer: "// ################## poolvr VERSION = \"v<%= pkg.version %>\";"
      },
      default: {
        files: {
          "obj/poolvr.js": [
              "three.py/js/WebVRApplication.js",
              "three.py/js/three.py.js",
              "three.py/js/MouseStuff.js",
              "three.py/js/TextGeomLogger.js",
              "src/LeapTools.js",
              "src/WebVRSound.js",
              "src/SynthSpeaker.js",
              "src/GfxTablet.js",
              "src/pyserver.js",
              "src/config.js",
              "src/sound.js",
              "src/app.js"
          ],
          "obj/configurator.js": [
              "three.py/js/WebVRApplication.js",
              "three.py/js/three.py.js",
              "three.py/js/MouseStuff.js",
              "three.py/js/TextGeomLogger.js",
              "src/LeapTools.js",
              "src/WebVRSound.js",
              "src/SynthSpeaker.js",
              "src/GfxTablet.js",
              "src/pyserver.js",
              "src/config.js",
              "src/sound.js",
              "src/configurator.js"
          ]
        }
      }
    },
    uglify: {
      default: {
        files: uglifyFiles
      }
    },
    copy: {
      default: {
        files: copyFiles
      }
    }
  } );

  grunt.loadNpmTasks( "grunt-contrib-clean" );
  grunt.loadNpmTasks( "grunt-exec" );
  grunt.loadNpmTasks( "grunt-contrib-copy" );
  grunt.loadNpmTasks( "grunt-contrib-jshint" );
  grunt.loadNpmTasks( "grunt-contrib-concat" );
  grunt.loadNpmTasks( "grunt-contrib-uglify" );

  grunt.registerTask( "default", [ "jshint", "clean", "concat", "uglify", "copy" ] );
};
