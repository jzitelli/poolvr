/* global module */

var files = [
      "obj/poolvr.js"
    ],
    uglifyFiles = files.map( function ( s ) {
      return {
        src: s,
        dest: s.replace( /.*\/(.*).js/, "build/$1.min.js" )
      };
    } ),
    copyFiles = files.map( function ( s ) {
      return {
        src: s,
        dest: s.replace( /.*\/(.*).js/, "build/$1.js" )
      };
    } );


module.exports = function ( grunt ) {
  grunt.initConfig( {
    pkg: grunt.file.readJSON( "package.json" ),
    jshint: {
      default: [
        "src/*.js",
        "node_modules/three.py/js/three.py.js",
        "node_modules/three.py/js/CANNONize.js",
        "node_modules/three.py/js/WebVRApplication.js",
        "node_modules/three.py/js/TextGeomUtils.js",
        "node_modules/three.py/js/utils.js"
      ]
    },
    clean: [ "obj", "build" ],
    concat: {
      options: {
        banner: "/*\n\
  <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today(\"yyyy-mm-dd\") %>\n\
  <%= pkg.license.type %>\n\
  Copyright (C) 2016 <%= pkg.author %>\n\
  <%= pkg.homepage %>\n\
  <%= pkg.repository.url %>\n\
*/\n",
        separator: ";\n",
        footer: "// ################## poolvr VERSION = \"v<%= pkg.version %>\";"
      },
      default: {
        files: {
          "obj/poolvr.js": [
            "node_modules/three.py/js/three.py.js",
            "node_modules/three.py/js/CANNONize.js",
            "node_modules/three.py/js/WebVRApplication.js",
            "node_modules/three.py/js/TextGeomUtils.js",
            "node_modules/three.py/js/utils.js",
            "src/LeapInput.js",
            "src/WebVRSound.js",
            "src/SynthSpeaker.js",
            "src/config.js",
            "src/sound.js",
            "src/setupCannon.js",
            "src/app.js"
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
