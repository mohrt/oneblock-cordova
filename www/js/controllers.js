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

  //console.log($scope.$session.id);

  $scope.$session.login_url = '';

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
      $scope.$session.login_url = 'oneblock://1block.io/api/login?x=73b130bd13631e589a99144e3a3c41d7&u=1';
      var regex = /^oneblock:\/\/([^?]+)/;
      var matches = regex.exec($scope.$session.login_url);
      $scope.$session.login_host = matches[1];
      $state.go( 'app.site_confirm', {}, {reload: true});    
  };

  $scope.scanQRCode = function() {
      $window.cordova.plugins.barcodeScanner.scan(
          function (result) {
              if(!result.cancelled && result.text != '') {
                $scope.$session.login_url = result.text;
                var regex = /^oneblock:\/\/([^?]+)/;
                var matches = regex.exec(result.text);
                $scope.$session.login_host = matches[1];
                $state.go( 'app.site_confirm', {}, {reload: true});    
              }
          },
          function (error) {
              $("#error-text").html(error);
              $("#error-dialog").removeClass('hide');
          }
      );
  };

  $scope.go = function ( path ) {
    $state.go( path );
  };
})

.controller('SiteConfirmCtrl', function($window, $scope, $state, $ionicPlatform, $ionicHistory, $localStorage, $sessionStorage, $ionicLoading) {
  $scope.$storage = $localStorage;
  $scope.$session = $sessionStorage;

  $ionicHistory.nextViewOptions({
    disableBack: true,
    disableAnimate: true
  });

  $scope.cancelLogin = function() {
      $("#login-buttons").addClass('hide');
      $("#success-dialog").addClass('hide');
      $("#error-dialog").addClass('hide');
      $state.go( 'app.scan', {}, {reload: true});
  }

  $scope.submitLogin = function() {

      // get hostname only
      var regex = /^oneblock:\/\/([^\/]+)/;
      var matches = regex.exec($scope.$session.login_url);
      //$scope.$apply(function() {
        $scope.challenge = $scope.$session.login_url.replace('&u=1','');
        $scope.login_url = matches[1];
        $scope.schema = $scope.$session.login_url.indexOf('&u=1') == -1 ? 'https' : 'http';
      //});
      $("#login-buttons").removeClass('hide');
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
          //var siteRevBuffer = new Buffer($scope.$session.id.revokePubKey + $scope.login_host);
          //var siteRevHash = Bitcore.crypto.Hash.sha256(siteRevBuffer);
          //var siteRevBigNum = Bitcore.crypto.BN.fromBuffer(siteRevHash);
          //var siteRevPrvKey = new Bitcore.PrivateKey(siteRevBigNum);
          // generate revoke public key
          //var siteRevPubKey =  siteRevPrvKey.toPublicKey().toString();
          // generate secret, store on server
          //var siteRevSecret = ECIES().privateKey(siteRevPrvKey).publicKey(Bitcore.PublicKey($scope.$session.id.revokePubKey));
          // use sha256 of kEkM for comparison
          //var siteRevSecretKey = CryptoJS.SHA256(siteRevSecret.kEkM.toString('hex')).toString();
          var data = JSON.stringify({
                loginSig: loginSig,
                pubAddress: sitePubAddress,
                pubKey: sitePrvKey.toPublicKey().toString(),
                //revokePubKey: siteRevPubKey,
                //revokeSecretKey: siteRevSecretKey,
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
                  _.delay(function() {
                      $state.go( 'app.scan', {}, {reload: true});
                  }, 3000);
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

})

.controller('EditCtrl', function($scope, $state, $ionicHistory, $localStorage, $sessionStorage, $ionicLoading) {
  $scope.page_title = 'Generate ID';
  $scope.button_title = 'Generate ID';
  $scope.isNew = true;
  $scope.$storage = $localStorage;
  $scope.$session = $sessionStorage;
  $scope.model = {};

  $scope.save = function(idForm) {
  $scope.model.title = $scope.model.title.trim();
    if(_.isEmpty($scope.model.title)) {
        $("#error-text").html('Title cannot be empty.');
        $("#error-dialog").removeClass('hide');
        return;
    }
    if(_.isEmpty($scope.model.password)) {
        $("#error-text").html('Password cannot be empty.');
        $("#error-dialog").removeClass('hide');
        return;
    }
    if($scope.model.password !== $scope.model.password2) {
        $("#error-text").html('Passwords do not match.');
        $("#error-dialog").removeClass('hide');
        return;
    }
    if(!_.isUndefined($scope.$session.foobar)) {
        // id exists, updating
        //$scope.$storage.ids[id.index].title = id.title;
    } else {
        $("#error-dialog").addClass('hide');
        $ionicLoading.show({
          template: 'generating ...'
        });
        _.defer(function() {
          // generate a new id key

          try {
          var mnemonic = new Mnemonic();
          $scope.$session.prvKeyPhrase = mnemonic.toString().split(' ');

          var hdPrvKey = mnemonic.toHDPrivateKey();
          var derived = hdPrvKey.derive(0);
          var prvKey = derived.privateKey;

          //var prvKeyBuffer = new Buffer(prvKeyMnemonic.toString());
          //var prvKeyHash = Bitcore.crypto.Hash.sha256(prvKeyBuffer);
          //var prvKeyBigNum = Bitcore.crypto.BN.fromBuffer(prvKeyHash);
          //var prvKey = new Bitcore.PrivateKey(prvKeyBigNum);

          // assemble object to encrypt
          var keyObject = {
              idPrvKey: prvKey.toWIF(),
              //revokePubKey: revokePrvKey.toPublicKey().toString()
          };
          
          // make active id in session
          $scope.$session.id = keyObject;
          $scope.$session.id.title = $scope.model.title;

          // make JSON string
          var idString = JSON.stringify(keyObject);

          //console.log(idString);

          // get scrypt derived key: intentionally memory intensive
          //var skey = scrypt($scope.model.password, 'SaltyBlock', 512, 256, 1, 32).toString('hex');
          //var keyenc = CryptoJS.AES.encrypt(idString, skey, { format: JsonFormatter });

          // no scrypt
          var keyenc = CryptoJS.AES.encrypt(idString, $scope.model.password, { format: JsonFormatter });
          //console.log(CryptoJS.AES.decrypt(keyenc, $scope.model.password).toString(CryptoJS.enc.Utf8))

          //var decrypted = CryptoJS.AES.decrypt(keyenc, $scope.model.password).toString(CryptoJS.enc.Utf8);
          //console.log('decrypted', JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)));

          // object to save to storage
          var idObject = {
              title: $scope.model.title,
              passHash: CryptoJS.SHA256($scope.model.password).toString().substr(0,16),
              keyObjectEnc: keyenc + ''
          }

          // save encrypted id
          $scope.$storage.ids.push(idObject);
          $ionicLoading.hide();
          $ionicHistory.nextViewOptions({
            disableBack: true
          });
          //$state.go( 'app.revoke', {}, {reload: true});          
          $state.go( 'app.preexport', {}, {reload: true});          
        } catch(e) {
            $("#error-text").html('Unknown error.');
            $("#error-dialog").removeClass('hide');
        }
        });
    }
  };

})

.controller('ImportCtrl', function($window, $scope, $state, $ionicHistory, $sessionStorage) {
  $scope.sessionStorage = $sessionStorage;
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.model = {title: '', password: ''};
  $scope.phrase = [];
  $scope.scan = function() {
    $("#success-dialog").addClass('hide');
    $("#error-dialog").addClass('hide');
    $("#success-dialog-phrase").addClass('hide');
    $("#error-dialog-phrase").addClass('hide');
      $window.cordova.plugins.barcodeScanner.scan(
          function (result) {
              if(!result.cancelled && result.text != '') {
                alert(result.text);
                  var id = JSON.parse(result.text);
                  if(id && id.keyObjectEnc && id.title) {
                     $scope.$storage.ids.push(id);
                     $("#success-text").html("Imported ID: " + id.title);
                     $("#success-dialog").removeClass('hide');
                  } else {
                    $("#error-text").html('Error importing ID');
                    $("#error-dialog").removeClass('hide');
                  }
              }
          },
          function (error) {
              $("#error-text").html(error);
              $("#error-dialog").removeClass('hide');
          }
      );
  };

  $scope.importPhrase = function() {
    $("#success-dialog").addClass('hide');
    $("#error-dialog").addClass('hide');
    $("#success-dialog-phrase").addClass('hide');
    $("#error-dialog-phrase").addClass('hide');
    $scope.phrase = _.map($scope.phrase, function(item) { return item.trim().toLowerCase() });
    var phraseString = $scope.phrase.join(' ');
    $scope.model.title = $scope.model.title.trim();
    $scope.model.password = $scope.model.password.trim();
    if(!Mnemonic.isValid(phraseString)) {
      $("#error-text-phrase").html('Invalid Phrase.');
      $("#error-dialog-phrase").removeClass('hide');
    } else if (_.isEmpty($scope.model.title)) {
      $("#error-text-phrase").html('Empty Title.');
      $("#error-dialog-phrase").removeClass('hide');
    } else if (_.isEmpty($scope.model.password)) {
      $("#error-text-phrase").html('Empty Passcode.');
      $("#error-dialog-phrase").removeClass('hide');
    } else if ($scope.model.password != $scope.model.password2) {
      $("#error-text-phrase").html('Passcodes do not match.');
      $("#error-dialog-phrase").removeClass('hide');
    } else {
          var mnemonic = new Mnemonic(phraseString);
          var hdPrvKey = mnemonic.toHDPrivateKey();
          var derived = hdPrvKey.derive(0);
          var prvKey = derived.privateKey;
          //console.log('prvKey', prvKey.toWIF());

          var keyObject = {
              idPrvKey: prvKey.toWIF(),
          };
          
          // make active id in session
          $scope.$session.id = keyObject;
          $scope.$session.id.title = $scope.model.title;

          // make JSON string
          var idString = JSON.stringify(keyObject);

          // encrypt the key with 256 bit AES
          var keyenc = CryptoJS.AES.encrypt(idString, $scope.model.password, { format: JsonFormatter });

          // object to save to storage
          var idObject = {
              title: $scope.model.title,
              passHash: CryptoJS.SHA256($scope.model.password).toString().substr(0,16),
              keyObjectEnc: keyenc + ''
          }

          // save encrypted id
          $scope.$storage.ids.push(idObject);

          // reset form
          $scope.model = {title: '', password: ''};
          $scope.phrase = [];

          // go to scan page
          $state.go( 'app.scan', {}, {reload: true});        
  }
  };

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
    if(_.isEmpty($scope.model.password) || CryptoJS.SHA256($scope.model.password).toString().substr(0,16) != id.passHash) {
        unlockForm.password.$setValidity("badPass", false);
    } else {
        $scope.$session.id = JSON.parse(CryptoJS.AES.decrypt(id.keyObjectEnc, $scope.model.password, { format: JsonFormatter }).toString(CryptoJS.enc.Utf8));        
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
    _.defer(function() {
      new QRCode($('#qrcode_revoke')[0], $sessionStorage.revokePhrase );
    });
  });
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
  $scope.finish = function() {
    $scope.$session.prvKeyPhrase = null;
    $ionicHistory.nextViewOptions({
      disableBack: true
    });
    $state.go( 'app.scan', {}, {reload: true});        
  }

})

.controller('ExportCtrl', function($scope, $state, $ionicHistory, $localStorage, $sessionStorage) {
  $scope.$storage = $localStorage;
  $scope.$session = $sessionStorage;
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.go = function ( path ) {
    $state.go( path, {}, {reload: true});
  };
  _.defer(function() {
    new QRCode($('#qrcode_export')[0], JSON.stringify($scope.$storage.ids[$scope.$storage.selectedId]));    
  });
  $scope.print = function() {
  }
})
