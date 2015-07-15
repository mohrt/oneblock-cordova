angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

})

.controller('ScanCtrl', function($scope, $state, $ionicHistory) {
  $scope.ids = angular.fromJson(localStorage.getItem('ids')) || [];
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.go = function ( path ) {
    $state.go( path );
  };
})

.controller('EditCtrl', function($scope, $state, $ionicHistory, $ionicLoading) {
  $scope.id = [];
  $scope.page_title = 'Generate ID';
  $scope.button_title = 'Generate ID';
  $scope.isNew = true;
  $scope.ids = angular.fromJson(localStorage.getItem('ids')) || [];

  $scope.save = function(id) {
    if(id.password !== id.password2) {
        alert('passwords do not match');
        return;
    }
    if(!_.isUndefined(id.index)) {
        // id exists
        $scope.ids[id.index].title = id.title;
    } else {
        $ionicLoading.show({
          content: 'Loading',
          animation: 'fade-in',
          showBackdrop: true,
          maxWidth: 200,
          showDelay: 0
        });
        // generating a new id
        var key = Bitcoin.ECKey.makeRandom();
        var bip38 = new Bip38();
        var keyenc = bip38.encrypt(key.toWIF(), id.password, key.pub.getAddress().toString());
        $scope.ids.push({
            title: id.title,
            key: keyenc
        });
        localStorage.setItem('ids', angular.toJson($scope.ids));
        $ionicLoading.hide();
        $ionicHistory.nextViewOptions({
          disableBack: true
        });
        $state.go( 'app.scan' );
    }
  };

})

.controller('ImportCtrl', function($scope) {
})

.controller('ExportCtrl', function($scope) {
});
