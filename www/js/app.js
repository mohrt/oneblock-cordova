// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'ngStorage'])

.run(function($ionicPlatform, $rootScope, $sessionStorage) {
  $ionicPlatform.ready(function() {
    $rootScope.$sessionStorage = $sessionStorage;
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
    document.addEventListener("deviceready", onDeviceReady, false);
  });
  function onDeviceReady() {
    document.addEventListener("pause", onDevicePause, false);
    document.addEventListener("resume", onDeviceResume, false);
  }
  function onDevicePause() {
    // clear all the session data on sleep
    $rootScope.$sessionStorage.$reset();
  }
  function onDeviceResume() {
  }
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

    .state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'AppCtrl'
  })

  .state('app.scan', {
    cache: false,
    url: '/scan',
    views: {
      'menuContent': {
        templateUrl: 'templates/scan.html',
        controller: 'ScanCtrl'
      }
    }
  })

  .state('app.edit', {
    cache: false,
    url: '/edit',
    views: {
      'menuContent': {
        templateUrl: 'templates/edit.html',
        controller: 'EditCtrl'
      }
    }
  })

  .state('app.import', {
    cache: false,
    url: '/import',
    views: {
      'menuContent': {
        templateUrl: 'templates/import.html',
        controller: 'ImportCtrl'
      }
    }
  })

  .state('app.revoke', {
    cache: false,
    url: '/revoke',
    views: {
      'menuContent': {
        templateUrl: 'templates/revoke.html',
        controller: 'RevokeCtrl'
      }
    }
  })

  .state('app.preexport', {
    cache: false,
    url: '/preexport',
    views: {
      'menuContent': {
        templateUrl: 'templates/preexport.html',
        controller: 'PreExportCtrl'
      }
    }
  })

  .state('app.export', {
    cache: false,
    url: '/export',
    views: {
      'menuContent': {
        templateUrl: 'templates/export.html',
        controller: 'ExportCtrl'
      }
    }
  })
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/scan');
});
