module.exports = function(grunt) {
  var path = require('path'),
      glob = require('glob'),
      fs = require('fs');

  var SRC_DIR = 'src';
  var MAIN_FILE = srcPath('main.js');
  var BUILD_FILE = 'build.js';

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  //require('time-grunt')(grunt); // Not installed

  grunt.loadNpmTasks('grunt-shell');

  pkg: grunt.file.readJSON('package.json');

  // Define the configuration for all the tasks.
  grunt.initConfig({
    // What?
    yeoman: {
      app: require('./bower.json').appPath || 'app',
      dist: 'dist'
    },

    // TODO(aramk) Convert shell to grunt logs.

    shell: {
      installBowerDep: {
        options: {
          stdout: true
        },
        command: ['echo "----- Installing bower dependencies -----"',
          'bower install',
          'echo "----- Installing bower dependencies -----"']
            .join('&&')
      },
      jsDoc: {
        command: 'rm -rf docs/ & jsdoc -c jsdoc.conf.json -l'
      },
      build: {
        options: {
          stdout: true
        },
        command: [
          'echo "----- Building -----"',
            'node node_modules/requirejs/bin/r.js -o ' + BUILD_FILE
        ].join('&&')
      }
    },

    // TODO(aramk) Use path.join() to ensure this works for Windows.

    copy: {
      bowerDep: {
        files: [
          {src: './lib/Requirejs/require.js', dest: './lib/require.js'},
          {src: './lib/Openlayers/index.js', dest: './lib/open-layers.js'},
          {src: './lib/Tinycolor/tinycolor.js', dest: './lib/tinycolor.js'},
          {src: './lib/Keycode/keycode.js', dest: './lib/keycode.js'},
          {src: './lib/numeraljs/min/numeral.min.js', dest: './lib/numeral.js'}
        ]
      }
    }
  });

  grunt.registerTask('install', ['shell:installBowerDep', 'copy:bowerDep']);

  grunt.registerTask('compile-imports',
      'Builds a RequireJS script to import all source files which are AMD modules.', function() {
        console.log('Compiling modules for importing...');
        var findResults = findAmdModules(SRC_DIR),
            modules = findResults.modules,
            notModules = findResults.notModules;

        modules = modules.filter(function(file) {
          return srcPath(file) !== MAIN_FILE;
        });
        console.log('Modules:');
        modules.forEach(function(file) {
          console.log(' ' + file);
        });
        console.log('\nNot Modules:');
        notModules.forEach(function(file) {
          console.log(' ' + file);
        });
        console.log('');

        var mainFile = '// This file is generated automatically - avoid modifying manually.\n' +
            "require(['" + modules.join("', '") + "']);\n";
        console.log('Writing to', MAIN_FILE);
        fs.writeFileSync(MAIN_FILE, mainFile);
        console.log('Compilation complete');
      });

  grunt.registerTask('build', ['compile-imports', 'shell:build']);
  grunt.registerTask('doc', ['shell:jsDoc']);

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // AUXILIARY
  //////////////////////////////////////////////////////////////////////////////////////////////////

  var RE_AMD_MODULE = /\b(?:define|require)\s*\(/;

  function findAmdModules(dir) {
    var files = glob.sync('**/*.js', {cwd: dir});
    var modules = [];
    var notModules = [];
    files.forEach(function(file) {
      var target = isAmdModule(path.join(dir, file)) ? modules : notModules;
      target.push(file);
    });
    modules.sort();
    notModules.sort();
    return {
      modules: modules,
      notModules: notModules
    };
  }

  function isAmdModule(file) {
    var data = readFile(file);
    return RE_AMD_MODULE.test(data);
  }

  function readFile(file) {
    return fs.readFileSync(file, {encoding: 'utf-8'});
  }

  function _prefixPath(dir, args) {
    var prefixedArgs = Array.prototype.slice.apply(args);
    prefixedArgs.unshift(dir);
    return path.join.apply(path, prefixedArgs);
  }

  function srcPath() {
    return _prefixPath(SRC_DIR, arguments);
  }

};
