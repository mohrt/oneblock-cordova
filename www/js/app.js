// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'ngStorage', 'ngMessages'])

.run(function($ionicPlatform, $ionicHistory, $rootScope, $localStorage, $sessionStorage, $state, $window) {
  $ionicPlatform.ready(function() {
    $rootScope.$storage = $localStorage;
    $rootScope.$session = $sessionStorage;
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
    $window.addEventListener('LaunchUrl', function(event) {
        $rootScope.$session.login_url = event.detail.login_url;
        var regex = /^oneblock:\/\/([^?]+)/;
        var matches = regex.exec($rootScope.$session.login_url);
        $rootScope.$session.login_host = matches[1];
        $state.go( 'app.site_confirm', {}, {reload: true});    
    });
  });
  function onDeviceReady() {
    document.addEventListener("pause", onDevicePause, false);
    document.addEventListener("resume", onDeviceResume, false);
  }
  function onDevicePause() {
    //$sessionStorage.$reset();
  }
  function onDeviceResume() {
    //$state.go('app.scan', {}, {reload: true});
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

  .state('app.site_confirm', {
    cache: false,
    url: '/site_confirm',
    views: {
      'menuContent': {
        templateUrl: 'templates/site_confirm.html',
        controller: 'SiteConfirmCtrl'
      }
    }
  })

  .state('app.new', {
    cache: false,
    url: '/new',
    views: {
      'menuContent': {
        templateUrl: 'templates/new.html',
        controller: 'NewCtrl'
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

  .state('app.phrase', {
    cache: false,
    url: '/phrase',
    views: {
      'menuContent': {
        templateUrl: 'templates/phrase.html',
        controller: 'PhraseCtrl'
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

  .state('app.unlock', {
    cache: false,
    url: '/unlock',
    views: {
      'menuContent': {
        templateUrl: 'templates/unlock.html',
        controller: 'UnlockCtrl'
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

  .state('app.logout', {
    cache: false,
    url: '/logout',
    views: {
      'menuContent': {
        templateUrl: 'templates/logout.html',
        controller: 'LogoutCtrl'
      }
    }
  })
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/scan');
});
