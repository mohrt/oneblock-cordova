angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $state, $localStorage, $sessionStorage) {
  $scope.$storage = $localStorage.$default({
    ids: [],
    selectedId: 0
  });
  if($scope.$storage.ids.length == 0) {
      $state.go( 'app.edit' );
  }
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

})

.controller('ScanCtrl', function($scope, $state, $ionicHistory, $localStorage, $sessionStorage, $ionicModal, $ionicLoading) {
  $scope.$storage = $localStorage;
  $scope.sessionStorage = $sessionStorage;

  // wipe out ids
  //$scope.$storage.ids = [];

  // change ng-click on web page for testing
  $scope.fakeScanTest = function() {
      if($scope.$storage.ids.length == 0) {
        $('#error-dialog').removeClass('hide');
        return;
      }
      $scope.challenge = 'oneblock://1block.io/api/login?x=c44f3a4d0a9e0ce36de4b086d51ca1a5';
      var regex = /^oneblock:\/\/([^?&]+)/;
      var matches = regex.exec($scope.challenge);
      $scope.login_url = matches[1];
      $("#login-buttons").removeClass('hide');
  };

  $scope.scanQRCode = function() {
      cordova.plugins.barcodeScanner.scan(
          function (result) {
              if(!result.cancelled && result.text != '') {
                var regex = /^oneblock:\/\/([^?&]+)/;
                var matches = regex.exec(result.text);
                $scope.$apply(function() {
                  $scope.challenge = result.text;
                  $scope.login_url = matches[1];
                });
                $("#login-buttons").removeClass('hide');
              }
          },
          function (error) {
              alert("Scanning failed: " + error);
          }
      );
  };

  $scope.cancelLogin = function() {
    $("#login-buttons").addClass('hide');
  };

  $scope.continueLogin = function() {
      $scope.modal.password = '';
      $scope.openModal();
  };

  $scope.submitPassword = function() {
    var id = $scope.$storage.ids[$scope.$storage.selectedId];
    if(_.isEmpty($scope.modal.password) || CryptoJS.SHA256($scope.modal.password).toString() != id.passHash) {
        $('.invalid-password').removeClass('hide');
    } else {
      //console.log('decrypted', decrypted);
      $('.invalid-password').addClass('hide');
      $scope.closeModal();      
      $ionicLoading.show({
          template: 'logging in ...'
      });
      setTimeout(function() {
          var keyObjectEnc = id.keyObjectEnc;
          var decrypted = JSON.parse(CryptoJS.AES.decrypt(keyObjectEnc, $scope.modal.password, { format: JsonFormatter }).toString(CryptoJS.enc.Utf8));
          //var idPrivateKey = Bitcore.PrivateKey.fromWIF(decrypted.idPrvKey);
          // generate site key
          var siteBuffer = new Buffer(decrypted.idPrvKey + $scope.login_url);
          var siteHash = Bitcore.crypto.Hash.sha256(siteBuffer);
          var siteBigNum = Bitcore.crypto.BN.fromBuffer(siteHash);
          var sitePrvKey = new Bitcore.PrivateKey(siteBigNum);
          // sign challenge with key
          var loginSig = Message($scope.challenge).sign(sitePrvKey).toString();
          // generate public key
          var sitePubAddress =  sitePrvKey.toPublicKey().toAddress().toString();
          // generate site revoke key
          var siteRevBuffer = new Buffer(decrypted.revokePubKey + $scope.login_url);
          var siteRevHash = Bitcore.crypto.Hash.sha256(siteRevBuffer);
          var siteRevBigNum = Bitcore.crypto.BN.fromBuffer(siteRevHash);
          var siteRevPrvKey = new Bitcore.PrivateKey(siteRevBigNum);
          // generate revoke public key
          var siteRevPubKey =  siteRevPrvKey.toPublicKey().toString();
          // generate secret, store on server
          var siteRevSecret = ECIES().privateKey(siteRevPrvKey).publicKey(Bitcore.PublicKey(decrypted.revokePubKey));
          var siteRevSecretKey = siteRevSecret.kEkM.toString('hex');
          $.ajax({
              type: 'post',
              url: $scope.challenge.replace(/^oneblock/, 'https'),
              data: JSON.stringify({
                loginSig: loginSig,
                pubAddress: sitePubAddress,
                revokePubKey: siteRevPubKey,
                revokeSecretKey: siteRevSecretKey
              }),
              success: function (data, text, xhr) {
                  console.log('success', data, text, xhr.status);
                  $ionicLoading.hide();
                  $("#login-buttons").addClass('hide');
              },
              error: function (request, status, error) {
                  console.log('error', request.responseText, status, error);
                  $ionicLoading.hide();
              }
          });
      });
    }
  }

  $scope.cancelPassword = function() {
      $('.invalid-password').addClass('hide');
      $scope.closeModal();
  };


  $ionicModal.fromTemplateUrl('password-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  });

  $scope.openModal = function() {
    $scope.modal.show();
  };
  $scope.closeModal = function() {
    $scope.modal.hide();
  };
  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });
  // Execute action on hide modal
  $scope.$on('modal.hidden', function() {
    // Execute action
  });
  // Execute action on remove modal
  $scope.$on('modal.removed', function() {
    // Execute action
  });

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
  $scope.$storage = $localStorage;
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
              revokePubKey: revokePrvKey.toPublicKey().toString()
          };
          // make JSON string
          var idString = JSON.stringify(keyObject);

          //console.log(idString);

          // get scrypt derived key: intentionally memory intensive
          //var skey = scrypt(id.password, Bitcore.PrivateKey().toWIF(), 512, 256, 1, 64).toString('hex');

          // encrypt with AES, get result as string
          var keyenc = CryptoJS.AES.encrypt(idString, id.password, { format: JsonFormatter });
          //console.log(CryptoJS.AES.decrypt(keyenc, id.password).toString(CryptoJS.enc.Utf8))

          //var decrypted = CryptoJS.AES.decrypt(keyenc, id.password).toString(CryptoJS.enc.Utf8);
          //console.log('decrypted', JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)));

          // object to save to storage
          var idObject = {
              title: $scope.sessionStorage.id.title,
              passHash: CryptoJS.SHA256(id.password).toString(),
              keyObjectEnc: keyenc + ''
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

.controller('ImportCtrl', function($scope, $state, $ionicHistory, $sessionStorage) {
  $scope.sessionStorage = $sessionStorage;
  $scope.exportPhrase = $scope.sessionStorage.exportPhrase;
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.go = function ( path ) {
    $sessionStorage.id = null;
    $state.go( path, {}, {reload: true});
  };
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
      $scope.sessionStorage.exportPhrase = Bitcore.PrivateKey().toWIF().substr(6,6).toUpperCase();

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
  $scope.$storage = $sessionStorage;
  $scope.exportPhrase = $scope.$storage.exportPhrase;
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.go = function ( path ) {
    $sessionStorage.id = null;
    $state.go( path, {}, {reload: true});
  };
  _.delay(function() {
    new QRCode($('ion-nav-view').children('ion-view[nav-view="active"]').find('#qrcode_export')[0], $scope.sessionStorage.idObjectString);    
  }, 1000);
  $scope.print = function() {
  }
})
