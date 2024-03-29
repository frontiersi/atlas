// Karma configuration
// Generated on Wed Jan 15 2014 11:11:25 GMT+1100 (EST)

/* global module */
module.exports = function(config) {
  config.set({

    // base path, that will be used to resolve files and exclude
    basePath: '../..',

    // frameworks to use
    frameworks: ['jasmine', 'requirejs'],

    // list of files / patterns to load in the browser
    files: [
      'atlas/test/test-main.js',
      {pattern: 'atlas/assets/**/*', included: false},
      {pattern: 'atlas/src/**/*', included: false},
      {pattern: 'atlas/lib/**/*', included: false},
      {pattern: 'atlas/test/lib/**/*.js', included: false},
      {pattern: 'atlas/test/specs/**/*Spec.js', included: false}
    ],

    // list of files to exclude
    exclude: [
      'atlas/lib/**/node_modules/**/*',
      'atlas/lib/**/bower_components/**/*',
      '**/docs/**/*',
      '**/dist/**/*'
    ],

    // Pre-process for code coverage
    preprocessors: {
      'atlas/src/**/*.js': 'coverage'
    },

    coverageReporter: {
      dir: 'atlas/coverage/',
      reporters: [
        {type: 'html', subdir: 'report-html'},
        {type: 'lcovonly', subdir: '.', file: 'lcov.dat'}
      ]
    },

    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'gowl', 'coverage'
    reporters: ['progress', 'coverage'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE, config.LOG_ERROR, config.LOG_WARN,
    //     config.LOG_INFO, config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera (has to be installed with `npm install karma-opera-launcher`)
    // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
    // - PhantomJS
    // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
    browsers: ['Firefox'],

    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: true
  });
};
