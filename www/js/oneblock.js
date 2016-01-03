var Bitcore = require('bitcore');
var Mnemonic = require('bitcore-mnemonic');
var Message = require('bitcore-message');
var ECIES = require('bitcore-ecies');
var Buffer = Bitcore.deps.Buffer;
var JsonFormatter={stringify:function(r){var t={ct:r.ciphertext.toString(CryptoJS.enc.Base64)};return r.iv&&(t.iv=r.iv.toString()),r.salt&&(t.s=r.salt.toString()),JSON.stringify(t)},parse:function(r){var t=JSON.parse(r),e=CryptoJS.lib.CipherParams.create({ciphertext:CryptoJS.enc.Base64.parse(t.ct)});return t.iv&&(e.iv=CryptoJS.enc.Hex.parse(t.iv)),t.s&&(e.salt=CryptoJS.enc.Hex.parse(t.s)),e}};
