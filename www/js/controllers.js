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

  //$scope.$session.id = null;

  //console.log($scope.$session.id);
  //console.log($scope.$storage.ids);

  $scope.$session.login_url = '';
  $scope.model = {login_url:''};

  $ionicPlatform.ready(function() {
    if($scope.$storage.ids.length == 0) {
        $state.go( 'app.new', {}, {reload: true} );
        return;
    } else if (_.isEmpty($scope.$session.id)) {
        $state.go( 'app.unlock',{}, {reload: true} );
        return;
    }
  });

  $scope.scan = function() {
      $("#login-buttons").addClass('hide');
      $("#success-dialog").addClass('hide');
      $("#error-dialog").addClass('hide');
      if(_.isUndefined($window.cordova) || _.isUndefined($window.cordova.plugins) || _.isUndefined($window.cordova.plugins.barcodeScanner)) {
          $("#error-text").html('barcode scanner not found.');
          $("#error-dialog").removeClass('hide');
          return;
      } else {
        $scope.scanQRCode();
      }
  }

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

  $scope.manual = function() {
      if($scope.$storage.ids.length == 0) {
        $('#error-dialog').removeClass('hide');
        return;
      }
      $scope.$session.login_url = $scope.model.login_url;
      var regex = /^oneblock:\/\/([^?]+)/;
      var matches = regex.exec($scope.$session.login_url);
      $scope.$session.login_host = matches[1];
      $state.go( 'app.site_confirm', {}, {reload: true});    
  };


  $scope.go = function ( path ) {
    $state.go( path );
  };
})

.controller('SiteConfirmCtrl', function($window, $scope, $state, $ionicPlatform, $ionicHistory, $localStorage, $sessionStorage, $ionicLoading) {
  $scope.$storage = $localStorage;
  $scope.$session = $sessionStorage;

  var sitePubAddress = null;

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
      _.delay(function() {
          // generate site key
          var siteBuffer = new Buffer($scope.$session.id.idPrvKey + $scope.login_host);
          var siteHash = Bitcore.crypto.Hash.sha256(siteBuffer);
          var siteBigNum = Bitcore.crypto.BN.fromBuffer(siteHash);
          var sitePrvKey = new Bitcore.PrivateKey(siteBigNum);
          // sign challenge with key
          var loginSig = Message($scope.challenge).sign(sitePrvKey).toString();
          // generate public key
          sitePubAddress =  sitePrvKey.toPublicKey().toAddress().toString();
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
                  if(!data.hasRevoke) {
                    //console.log('setting revoke');
                    $scope.submitRevoke();
                  }
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
    }, 500);
  }

  $scope.submitRevoke = function() {
    // generate site revoke key
    try {
      var siteRevBuffer = new Buffer($scope.$session.id.revokePubKey + $scope.login_host);
      var siteRevHash = Bitcore.crypto.Hash.sha256(siteRevBuffer);
      var siteRevBigNum = Bitcore.crypto.BN.fromBuffer(siteRevHash);
      var siteRevPrvKey = new Bitcore.PrivateKey(siteRevBigNum);
      // generate revoke public key
      var siteRevPubKey =  siteRevPrvKey.toPublicKey().toString();
      // generate secret, store on server
      var siteRevSecret = ECIES().privateKey(siteRevPrvKey).publicKey(Bitcore.PublicKey($scope.$session.id.revokePubKey));
      // use 32 chars of sha256 of kEkM for comparison
      var siteRevSecretKey = CryptoJS.SHA256(siteRevSecret.kEkM.toString('hex')).toString().substr(0,32);      
    } catch(e) {
      // unknown error generating revoke secret, quit
      return;
    }
    var data = JSON.stringify({
      pubAddress: sitePubAddress,
      revokePubKey: siteRevPubKey,
      revokeSecretKey: siteRevSecretKey,
    });
    //console.log('revoke data', data);
    var regex = /^oneblock:\/\/([^?]+)/;
    var matches = regex.exec($scope.$session.login_url);
    var revoke_url = $scope.schema + '://' + matches[1] + '/setrevoke';
    //console.log('revoke_url', revoke_url);
    // send revoke secret back to server
    $.ajax({
        type: 'POST',
        url: revoke_url,
        contentType: "application/json",
        dataType: "json",
        data: data,
        success: function (data, text, xhr) {
            //console.log('success setting revoke', data, text, xhr.status);
        },
        error: function (request, status, error) {
            //console.log('error setting revoke', request.responseText, status, error);
        }
    });
  }

})

.controller('EditCtrl', function($scope, $state, $ionicHistory, $localStorage, $sessionStorage, $ionicLoading) {
  $scope.page_title = 'Edit ID';
  $scope.button_title = 'Edit ID';
  $scope.isNew = false;
  $scope.$storage = $localStorage;
  $scope.$session = $sessionStorage;

  if(_.isEmpty($scope.$session.id)) {
    $state.go( 'app.unlock', {}, {reload: true});        
    return;    
  }

  var id = $scope.$storage.ids[$scope.$storage.selectedId];
  $scope.model = {title: id.title, passwordOld:'',password:'',password2:''};

  $scope.confirmDelete = function(idForm) {
    $("#button-delete").addClass('hide');
    $("#button-confirm-delete").removeClass('hide');
    $("#button-cancel-delete").removeClass('hide');
  };

  $scope.cancelDelete = function(idForm) {
    $("#button-delete").removeClass('hide');
    $("#button-confirm-delete").addClass('hide');
    $("#button-cancel-delete").addClass('hide');
  };

  $scope.delete = function(idForm) {
    $scope.$storage.ids.splice($scope.$storage.selectedId, 1);
    $scope.$session.id = null;
    $("#success-dialog").html('ID: ' + id.title + ' deleted');
    $("#success-dialog").removeClass('hide');
    $("#error-dialog").addClass('hide');
    _.delay(function() {
      $state.go( 'app.unlock', {}, {reload: true});
    }, 3000); 
  };

  $scope.save = function(idForm) {
    $scope.model.title = $scope.model.title.trim();
    $scope.model.passwordOld = $scope.model.passwordOld.trim();
    $scope.model.password = $scope.model.password.trim();
    $scope.model.password2 = $scope.model.password2.trim();
    if(_.isEmpty($scope.model.title)) {
        $("#success-dialog").addClass('hide');
        $("#error-text").html('Title cannot be empty.');
        $("#error-dialog").removeClass('hide');
        return;
    }
    if(_.isEmpty($scope.model.passwordOld)) {
        $("#success-dialog").addClass('hide');
        $("#error-text").html('Unlock code cannot be empty.');
        $("#error-dialog").removeClass('hide');
        return;
    }
    if(!_.isEmpty($scope.model.password) && $scope.model.password !== $scope.model.password2) {
        $("#success-dialog").addClass('hide');
        $("#error-text").html('Unlock codes do not match.');
        $("#error-dialog").removeClass('hide');
        return;
    }
    var $passHash = CryptoJS.SHA256($scope.model.passwordOld).toString().substr(0,16);
    if($passHash != id.passHash) {
        $("#success-dialog").addClass('hide');
        $("#error-text").html('Unlock codes is not valid.');
        $("#error-dialog").removeClass('hide');
        return;      
    }
    $("#success-dialog").removeClass('hide');
    $("#error-dialog").addClass('hide');

    var newId = {
        title: $scope.model.title,
    }

    if(!_.isEmpty($scope.model.password)) {
      // re-encrypt with new password
      var keyString = CryptoJS.AES.decrypt(id.keyObjEnc, $scope.model.passwordOld, { format: JsonFormatter }).toString(CryptoJS.enc.Utf8);        
      newId.keyObjEnc = CryptoJS.AES.encrypt(keyString, $scope.model.password, { format: JsonFormatter }) + '';
      newId.passHash = CryptoJS.SHA256($scope.model.password).toString().substr(0,16);
    } else {
      // keep old password
      newId.keyObjEnc = id.keyObjEnc;
      newId.passHash = id.passHash;      
    }

    // store changes to id
    $scope.$storage.ids[$scope.$storage.selectedId] = newId;
    // switch to this id
    $scope.$session.id = newId;
    // go to scan page
    $state.go( 'app.scan', {}, {reload: true});
  };
})

.controller('NewCtrl', function($scope, $state, $ionicHistory, $localStorage, $sessionStorage, $ionicLoading) {
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
    } else {
        $("#error-dialog").addClass('hide');
        $ionicLoading.show({
          template: 'generating ...'
        });
        _.delay(function() {
          // generate a new id key

          try {
            var mnemonic = new Mnemonic();
            $scope.$session.prvKeyPhrase = mnemonic.toString().split(' ');

            var hdPrvKey = mnemonic.toHDPrivateKey();
            var key = hdPrvKey.derive(0);
            var rkey = hdPrvKey.derive(1);

            // assemble object to encrypt
            var keyObj = {
                idPrvKey: key.privateKey.toWIF(),
                revokePubKey: rkey.publicKey.toString()
            };
            
            // make active id in session
            $scope.$session.id = keyObj;
            $scope.$session.id.title = $scope.model.title;

            // make JSON string
            var idString = JSON.stringify(keyObj);

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
                keyObjEnc: keyenc + ''
            }

            //console.log('idObject', idObject);

            // save encrypted id
            $scope.$storage.ids.push(idObject);
            $scope.$storage.selectedId = $scope.$storage.ids.length - 1;
            $ionicLoading.hide();
            $ionicHistory.nextViewOptions({
              disableBack: true
            });
            //$state.go( 'app.revoke', {}, {reload: true});          
            $state.go( 'app.phrase', {}, {reload: true});          
          } catch(e) {
              //console.log(e);
              $("#error-text").html('error generating id.');
              $("#error-dialog").removeClass('hide');
              $ionicLoading.hide();
          }
        }, 500);
    }
  };

})

.controller('ImportCtrl', function($window, $scope, $state, $ionicHistory, $sessionStorage) {
  $scope.$session = $sessionStorage;
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
    if(_.isUndefined($window.cordova) || _.isUndefined($window.cordova.plugins) || _.isUndefined($window.cordova.plugins.barcodeScanner)) {
          $("#error-text").html('barcode scanner not found.');
          $("#error-dialog").removeClass('hide');
          return;
    } else {
      $window.cordova.plugins.barcodeScanner.scan(
          function (result) {
              if(!result.cancelled && result.text != '') {
                  var id = JSON.parse(result.text);
                  if(id && id.keyObjEnc && id.title) {
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
    }
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

          var keyObj = {
              idPrvKey: hdPrvKey.derive(0).prvKey.toWIF(),
              revokePubKey: hdPrvKey.derive(1).pubAddress()
          };
          
          // make active id in session
          $scope.$session.id = keyObj;
          $scope.$session.id.title = $scope.model.title;

          // make JSON string
          var idString = JSON.stringify(keyObj);

          // encrypt the key with 256 bit AES
          var keyenc = CryptoJS.AES.encrypt(idString, $scope.model.password, { format: JsonFormatter });

          // object to save to storage
          var idObject = {
              title: $scope.model.title,
              passHash: CryptoJS.SHA256($scope.model.password).toString().substr(0,16),
              keyObjEnc: keyenc + ''
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

  $scope.manual = function() {
    $("#success-dialog-manual").addClass('hide');
    $("#error-dialog-manual").addClass('hide');
    try {
      var id = JSON.parse($('#id-manual').val());
    } catch (e) {
      $("#error-dialog-manual").html('Error importing ID: Bad JSON');
      $("#error-dialog-manual").removeClass('hide');
      return;
    }
    if(id && id.keyObjEnc && id.title) {
       $scope.$storage.ids.push(id);
       $("#success-text-manual").html("Imported ID: " + id.title);
       $("#success-dialog-manual").removeClass('hide');
    } else {
      $("#error-text-manual").html('Error importing ID');
      $("#error-dialog-manual").removeClass('hide');
    }
  };


  $scope.go = function ( path ) {
    $scope.$session.id = null;
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

  if($scope.$storage.ids.length == 0) {
      $state.go( 'app.new', {}, {reload: true} );
      return;
  }

  $scope.unlockId = function(unlockForm) {
    var id = $scope.$storage.ids[$scope.$storage.selectedId];
    if(_.isEmpty($scope.model.password) || CryptoJS.SHA256($scope.model.password).toString().substr(0,16) != id.passHash) {
        unlockForm.password.$setValidity("badPass", false);
    } else {
        var sessionId = {
          title: id.title,
          idPrvKey: CryptoJS.AES.decrypt(id.keyObjEnc, $scope.model.password, { format: JsonFormatter }).toString(CryptoJS.enc.Utf8)
        }
        $scope.$session.id = sessionId;
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

.controller('PhraseCtrl', function($scope, $state, $ionicLoading, $ionicHistory, $sessionStorage) {
  $scope.$session = $sessionStorage;
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.go = function ( path ) {
    $state.go( path, {}, {reload: true});
  };
  $scope.title = $scope.$session.id.title;
  $scope.finish = function() {
    $scope.$session.prvKeyPhrase = null;
    $ionicHistory.nextViewOptions({
      disableBack: true
    });
    $state.go( 'app.scan', {}, {reload: true});        
  }

})

.controller('LogoutCtrl', function($scope, $state, $ionicHistory, $localStorage, $sessionStorage) {
  $sessionStorage.id = null;
  $state.go( 'app.unlock', {}, {reload: true});
})

.controller('ExportCtrl', function($scope, $state, $ionicHistory, $localStorage, $sessionStorage) {
  $scope.$storage = $localStorage;
  $scope.$session = $sessionStorage;
  $ionicHistory.nextViewOptions({
    disableBack: true
  });
  $scope.$session.exportString = JSON.stringify($scope.$storage.ids[$scope.$storage.selectedId]);
  var clipboard = new Clipboard('.clipboard-btn');
  clipboard.on('success', function(e) {
      $("#success-dialog-clipboard").removeClass('hide');
      $("#error-dialog-clipboard").addClass('hide');
      _.delay(function() {
          $("#success-dialog-clipboard").addClass('hide');
      }, 2000);
  });
  if(_.isEmpty($scope.$session.id)) {
    $state.go( 'app.unlock', {}, {reload: true});        
    return;    
  }
  $scope.go = function ( path ) {
    $state.go( path, {}, {reload: true});
  };
  _.defer(function() {
    new QRCode($('#qrcode_export')[0], $scope.$session.exportString);    
  });
  $scope.print = function() {
  }
})
