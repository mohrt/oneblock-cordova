angular.module('starter.controllers', [])

.controller('AppCtrl', function($ionicPlatform, $scope, $state, $localStorage, $sessionStorage) {
  $scope.$storage = $localStorage.$default({
    ids: [],
    selectedId: 0
  });
  $scope.$session = $sessionStorage;
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

})

.controller('ScanCtrl', function($window, $scope, $state, $ionicPlatform, $ionicHistory, $localStorage, $sessionStorage, $ionicLoading) {
  $scope.$storage = $localStorage;
  $scope.$session = $sessionStorage;

  $ionicHistory.nextViewOptions({
    disableBack: true,
    disableAnimate: true
  });

  // wipe out ids
  //$scope.$storage.ids = [];

  $ionicPlatform.ready(function() {
    if($scope.$storage.ids.length == 0) {
        $state.go( 'app.edit' );
        return;
    } else if (_.isEmpty($scope.$session.id)) {
        $state.go( 'app.unlock' );
        return;
    }
  });

  $scope.scan = function() {
      $("#login-buttons").addClass('hide');
      $("#success-dialog").addClass('hide');
      $("#error-dialog").addClass('hide');
      if(_.isUndefined($window.cordova)) {
        $scope.fakeScan();
      } else {
        $scope.scanQRCode();
      }
  }

  // for testing on web browser
  $scope.fakeScan = function() {
      if($scope.$storage.ids.length == 0) {
        $('#error-dialog').removeClass('hide');
        return;
      }
      $scope.challenge = 'oneblock://1block.io/api/login?x=ed484750fbc2fdaa5523bda074ce4d7b';
      var regex = /^oneblock:\/\/([^?]+)/;
      var matches = regex.exec($scope.challenge);
      $scope.login_url = matches[1];
      regex = /^oneblock:\/\/([^\/]+)/;
      matches = regex.exec($scope.challenge);
      $scope.login_host = matches[1];
      console.log('login_host', $scope.login_host);
      $scope.schema = 'https';
      $("#login-buttons").removeClass('hide');
  };

  $scope.scanQRCode = function() {
      $window.cordova.plugins.barcodeScanner.scan(
          function (result) {
              if(!result.cancelled && result.text != '') {
                var regex = /^oneblock:\/\/([^?]+)/;
                var matches = regex.exec(result.text);
                var regex2 = /^oneblock:\/\/([^\/]+)/;
                var matches2 = regex2.exec(result.text);
                $scope.$apply(function() {
                  $scope.challenge = result.text.replace('&u=1','');
                  $scope.login_url = matches[1];
                  $scope.login_host = matches2[1];
                  $scope.schema = result.text.indexOf('&u=1') == -1 ? 'https' : 'http';
                });
                $("#login-buttons").removeClass('hide');
              }
          },
          function (error) {
              $("#error-text").html(error);
              $("#error-dialog").removeClass('hide');
          }
      );
  };

  $scope.cancelLogin = function() {
      $("#login-buttons").addClass('hide');
      $("#success-dialog").addClass('hide');
      $("#error-dialog").addClass('hide');
  }

  $scope.submitLogin = function() {
      $ionicLoading.show({
          template: 'logging in ...'
      });
      _.defer(function() {
          // generate site key
          var siteBuffer = new Buffer($scope.$session.id.idPrvKey + $scope.login_host);
          var siteHash = Bitcore.crypto.Hash.sha256(siteBuffer);
          var siteBigNum = Bitcore.crypto.BN.fromBuffer(siteHash);
          var sitePrvKey = new Bitcore.PrivateKey(siteBigNum);
          // sign challenge with key
          var loginSig = Message($scope.challenge).sign(sitePrvKey).toString();
          // generate public key
          var sitePubAddress =  sitePrvKey.toPublicKey().toAddress().toString();
          // generate site revoke key
          var siteRevBuffer = new Buffer($scope.$session.id.revokePubKey + $scope.login_host);
          var siteRevHash = Bitcore.crypto.Hash.sha256(siteRevBuffer);
          var siteRevBigNum = Bitcore.crypto.BN.fromBuffer(siteRevHash);
          var siteRevPrvKey = new Bitcore.PrivateKey(siteRevBigNum);
          // generate revoke public key
          var siteRevPubKey =  siteRevPrvKey.toPublicKey().toString();
          // generate secret, store on server
          var siteRevSecret = ECIES().privateKey(siteRevPrvKey).publicKey(Bitcore.PublicKey($scope.$session.id.revokePubKey));
          // use sha256 of kEkM for comparison
          var siteRevSecretKey = CryptoJS.SHA256(siteRevSecret.kEkM.toString('hex')).toString();
          var data = JSON.stringify({
                loginSig: loginSig,
                pubAddress: sitePubAddress,
                pubKey: sitePrvKey.toPublicKey().toString(),
                revokePubKey: siteRevPubKey,
                revokeSecretKey: siteRevSecretKey,
                message: $scope.challenge
              });
          $.ajax({
              type: 'POST',
              url: $scope.challenge.replace(/^oneblock/, $scope.schema),
              contentType: "application/json",
              dataType: "json",
              data: data,
              success: function (data, text, xhr) {
                  //console.log('success', data, text, xhr.status);
                  $ionicLoading.hide();
                  $("#login-buttons").addClass('hide');
                  $("#success-dialog").removeClass('hide');
              },
              error: function (request, status, error) {
                  //console.log('error', request.responseText, status, error);
                  $ionicLoading.hide();
                  $("#error-text").html(request.responseText);
                  $("#error-dialog").removeClass('hide');
              }
          });
    });
  }

  $scope.go = function ( path ) {
    $state.go( path );
  };
})

.controller('EditCtrl', function($scope, $state, $ionicHistory, $localStorage, $sessionStorage, $ionicLoading) {
  $scope.page_title = 'Generate ID';
  $scope.button_title = 'Generate ID';
  $scope.isNew = true;
  $scope.$storage = $localStorage;
  $scope.$session = $sessionStorage;
  $scope.model = {};

  $scope.save = function(idForm) {
    if($scope.model.password !== $scope.model.password2) {
        alert('passwords do not match');
        return;
    }
    if(!_.isUndefined($scope.$session.foobar)) {
        // id exists, updating
        //$scope.$storage.ids[id.index].title = id.title;
    } else {
        $ionicLoading.show({
          template: 'generating ...'
        });
        _.defer(function() {
          // generate a new id key
          var prvkey = new Bitcore.PrivateKey();

          // generate new recovery key from mnemonic string
          var revokeMnemonic = new Mnemonic();
          $scope.$session.revokePhrase = revokeMnemonic.toString();

          var revokeBuffer = new Buffer(revokeMnemonic.toString());
          var revokeHash = Bitcore.crypto.Hash.sha256(revokeBuffer);
          var revokeBigNum = Bitcore.crypto.BN.fromBuffer(revokeHash);
          var revokePrvKey = new Bitcore.PrivateKey(revokeBigNum);

          // assemble object to encrypt
          var keyObject = {
              idPrvKey: prvkey.toWIF(),
              revokePubKey: revokePrvKey.toPublicKey().toString()
          };
          
          // make active id in session
          $scope.$session.id = keyObject;
          $scope.$session.id.title = $scope.model.title;

          // make JSON string
          var idString = JSON.stringify(keyObject);

          //console.log(idString);

          // get scrypt derived key: intentionally memory intensive
          //var skey = scrypt(id.password, 'SaltyBlock', 512, 256, 1, 32).toString('hex');

          // encrypt with AES, get result as string
          var keyenc = CryptoJS.AES.encrypt(idString, $scope.model.password, { format: JsonFormatter });
          //console.log(CryptoJS.AES.decrypt(keyenc, id.password).toString(CryptoJS.enc.Utf8))

          //var decrypted = CryptoJS.AES.decrypt(keyenc, id.password).toString(CryptoJS.enc.Utf8);
          //console.log('decrypted', JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)));

          // object to save to storage
          var idObject = {
              title: $scope.model.title,
              passHash: CryptoJS.SHA256($scope.model.password).toString(),
              keyObjectEnc: keyenc + ''
          }

          // save encrypted id
          $scope.$storage.ids.push(idObject);
          $ionicLoading.hide();
          $ionicHistory.nextViewOptions({
            disableBack: true
          });
          $state.go( 'app.revoke', {}, {reload: true});          
        });
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

.controller('UnlockCtrl', function($scope, $state, $ionicHistory, $ionicLoading, $localStorage, $sessionStorage) {
  $scope.$storage = $localStorage;
  $scope.$session = $sessionStorage;
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.model = {};

  $scope.unlockId = function(unlockForm) {
    var id = $scope.$storage.ids[$scope.$storage.selectedId];
    if(_.isEmpty($scope.model.password) || CryptoJS.SHA256($scope.model.password).toString() != id.passHash) {
        unlockForm.password.$setValidity("badPass", false);
    } else {
        $scope.$session.id = JSON.parse(CryptoJS.AES.decrypt(id.keyObjectEnc, $scope.model.password, { format: JsonFormatter }).toString(CryptoJS.enc.Utf8));
        $scope.$session.id.title = id.title;
        $state.go( 'app.scan' );
    }
  };

  $scope.go = function ( path ) {
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

      var skey = scrypt($scope.sessionStorage.exportPhrase, 'SaltyBlock', 256, 128, 1, 32).toString('hex');

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
