module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: { clearContext: false },
    reporters: ['progress','kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
  // Use Chrome for local runs; CI can set CHROME_BIN and use ChromeHeadless if needed
  browsers: ['ChromeHeadless'],
    singleRun: true,
    restartOnFileChange: true
  });
};
