angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

})

.controller('ScanCtrl', function($scope, $state, $ionicHistory, $localStorage) {
  $scope.$storage = $localStorage.$default({
    ids: []
  });

  // wipe out ids
  //$scope.$storage.ids = [];

  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.go = function ( path ) {
    $state.go( path );
  };
})

.controller('EditCtrl', function($scope, $state, $ionicHistory, $localStorage, $sessionStorage, $ionicLoading) {
  $scope.id = [];
  $scope.page_title = 'Generate ID';
  $scope.button_title = 'Generate ID';
  $scope.isNew = true;
  $scope.$storage = $localStorage.$default({
    ids: []
  });
  $scope.sessionStorage = $sessionStorage;

  $scope.save = function(id) {
    if(id.password !== id.password2) {
        alert('passwords do not match');
        return;
    }
    if(!_.isUndefined(id.index)) {
        // id exists
        $scope.$storage.ids[id.index].title = id.title;
    } else {
        $ionicLoading.show({
          template: 'generating ...'
        });
        setTimeout(function() {
          // generating a new id
          var key = Bitcoin.ECKey.makeRandom();
          var reckey = Bitcoin.ECKey.makeRandom();
          var bip38 = new Bip38();
          var keyenc = bip38.encrypt(key.toWIF(), id.password, key.pub.getAddress().toString());
          $scope.$storage.ids.push({
              title: id.title,
              key: keyenc,
              reckey: reckey.pub.getAddress().toString()
          });
          alert(keyenc);
          $scope.sessionStorage.keyenc = keyenc;
          $scope.sessionStorage.reckeywif = reckey.toWIF();
          $ionicLoading.hide();
          $ionicHistory.nextViewOptions({
            disableBack: true
          });
          $state.go( 'app.export' );          
        }, 500);
    }
  };

})

.controller('ImportCtrl', function($scope) {
})

.controller('ExportCtrl', function($scope, $sessionStorage) {
  $scope.code = $sessionStorage.keyenc;
  new QRCode(document.getElementById("qrcode"), $sessionStorage.keyenc);
});
