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

  $scope.scanQRCode = function() {
      cordova.plugins.barcodeScanner.scan(
          function (result) {
              if(!result.cancelled && result.text != '') {
                  $scope.scanText = result.text;
                  alert($scope.scanText);
              }
          },
          function (error) {
              alert("Scanning failed: " + error);
          }
      );
  };

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
    $sessionStorage.id = id;
    if(id.password !== id.password2) {
        alert('passwords do not match');
        return;
    }
    if(!_.isUndefined(id.index)) {
        // id exists, updating
        //$scope.$storage.ids[id.index].title = id.title;
    } else {
        $ionicLoading.show({
          template: 'generating ...'
        });
        setTimeout(function() {
          // generate a new id key
          var prvkey = new Bitcore.PrivateKey();

          // generate new recovery key from mnemonic string
          var revokeMnemonic = new Mnemonic();
          $scope.sessionStorage.revokePhrase = revokeMnemonic.toString();

          var revokeBuffer = new Buffer(revokeMnemonic.toString());
          var revokeHash = Bitcore.crypto.Hash.sha256(revokeBuffer);
          var revokeBigNum = Bitcore.crypto.BN.fromBuffer(revokeHash);
          var revokePrvKey = new Bitcore.PrivateKey(revokeBigNum);

          // assemble object to encrypt
          var keyObject = {
              idPrvKey: prvkey.toWIF(),
              revokePubKey: revokePrvKey.toAddress().toString()
          };
          // make JSON string
          var idString = JSON.stringify(keyObject);

          //console.log(idString);

          // get scrypt derived key: intentionally memory intensive
          //var skey = scrypt(id.password, Bitcore.PrivateKey().toWIF(), 512, 256, 1, 64).toString('hex');

          // encrypt with AES, get base64 string
          var keyenc = CryptoJS.AES.encrypt(idString, id.password).toString();

          //var decrypted = CryptoJS.AES.decrypt(keyenc, id.password).toString(CryptoJS.enc.Utf8);
          //console.log('decrypted', JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)));

          // object to save to storage
          var idObject = {
              title: $scope.sessionStorage.id.title,
              keyObjectEnc: keyenc
          }
          // save to session for exporting
          $scope.sessionStorage.idObjectString = JSON.stringify(idObject);
          // save encrypted id
          $scope.$storage.ids.push(idObject);
          $ionicLoading.hide();
          $ionicHistory.nextViewOptions({
            disableBack: true
          });
          $state.go( 'app.revoke', {}, {reload: true});          
        }, 500);
    }
  };

})

.controller('ImportCtrl', function($scope) {
})

.controller('RevokeCtrl', function($scope, $state, $ionicHistory, $sessionStorage) {
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.go = function ( path ) {
    $sessionStorage.revokePhrase = null;
    $state.go( path, {}, {reload: true});
  };
  $scope.title = $sessionStorage.id.title;
  $scope.sessionStorage = $sessionStorage;
  $scope.$on('$ionicView.afterEnter', function(){
    _.delay(function() {
      new QRCode($('ion-nav-view').children('ion-view[nav-view="active"]').find('#qrcode_revoke')[0], $sessionStorage.revokePhrase );
    }, 1000);
  });
  $scope.print = function() {
    //var page = document.body.innerHTML;
    //$cordovaPrinter.print(page);
  }
})

.controller('PreExportCtrl', function($scope, $state, $ionicLoading, $ionicHistory, $sessionStorage) {
  $scope.sessionStorage = $sessionStorage;
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.go = function ( path ) {
    $state.go( path, {}, {reload: true});
  };
  $scope.title = $sessionStorage.id.title;
  $scope.export = function() {
    $ionicLoading.show({
            template: 'encrypting ...'
    });
    setTimeout(function() {
      // generate new recovery key from mnemonic string
      $scope.sessionStorage.exportPhrase = Bitcore.PrivateKey().toWIF().substr(6,6);

      var skey = scrypt($scope.sessionStorage.exportPhrase, Bitcore.PrivateKey().toWIF(), 512, 256, 1, 64).toString('hex');

      // encrypt with AES, get base64 string
      var keyenc = CryptoJS.AES.encrypt($scope.sessionStorage.idObjectString, skey).toString();

      //var decrypted = CryptoJS.AES.decrypt(keyenc, id.password).toString(CryptoJS.enc.Utf8);
      //console.log('decrypted', JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)));

      // object to save to storage
      var idObject = {
          title: $scope.sessionStorage.id.title,
          keyObjectEnc: keyenc
      }
      // save to session for exporting
      $scope.sessionStorage.idObjectString = JSON.stringify(idObject);
      $ionicLoading.hide();
      $ionicHistory.nextViewOptions({
        disableBack: true
      });
      $state.go( 'app.export', {}, {reload: true});        
    }, 500);
  }

})

.controller('ExportCtrl', function($scope, $state, $ionicHistory, $sessionStorage) {
  $scope.sessionStorage = $sessionStorage;
  $scope.title = $scope.sessionStorage.id.title;
  $scope.exportPhrase = $scope.sessionStorage.exportPhrase;
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.go = function ( path ) {
    $sessionStorage.id = null;
    $state.go( path, {}, {reload: true});
  };
  $scope.title = $sessionStorage.id.title;
  _.delay(function() {
    new QRCode($('ion-nav-view').children('ion-view[nav-view="active"]').find('#qrcode_export')[0], $scope.sessionStorage.idObjectString);    
  }, 1000);
  $scope.print = function() {
  }
})
