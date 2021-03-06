<pre>
Title: 1Block address authentication protocol (1Block)
Author: Monte Ohrt @mohrt
Status: Draft
</pre>

# Abstract

The following is an open protocol allowing simple and secure
authentication based on Blockchain ECC. By authentication we mean to
prove to a service/application that we control a specific Blockchain
address by signing a challenge, and that all related data and settings
may securely be linked to our session. The Blockchain is a reference to
the underlying Elliptic Curve Cryptography technology that powers Bitcoin.
1Block uses the Blockchain technology, but is not directly related to Bitcoin
currency or used for Bitcoin transactions. A Bitcoin wallet is not required
to use 1Block.

The original premise came from the Bitcoin community with the idea of
using Bitcoin signatures to manage authentication. Eric Larcheveque came
up with the BitID protocol outlining these ideas. 1Block has
similarities to it, but does diverge enough to be its own protocol.
Namely, uncoupling itself from Bitcoin wallets using only the Bitcoin
message signing for authentication, separating individual services with
separate private key pairs, and adding a ID revoking mechanism to the
core protocol. 1Block adheres to BitID similarities where it can. SQRL
by Steve Gibson is another similar open protocol using ECC for
authentication, however it does not use Blockchain technology. Some
ideas come from SQRL, namely the Diffie-Hellman key exchange to manage a
secure key revoking mechanism.

One of the driving purposes of using Blockchain is the available toolsets
for Javascript and browsers. This made it possible to write the 1Block
clients completely in HTML, CSS and Javascript, making a very flexible
and portable platform.

# Motivation

Web sites and applications shouldn’t have to rely on problematic
identification methods such as usernames and passwords :

- This is a human problem.
- This is a customer support problem.
- This is an industry problem.

Using 1Block for authentication purposes has many benefits :

- supported by nearly all smart phones and browsers
- simple registration and login process for end user
- eliminates keyboard interaction
- reduces phishing/malware risks
- reduces need for 2nd factor auth
- no need to remember, create or change passwords
- services know only site-specific public addresses
- no personal or sensitive information supplied with a login
- each login is unique, no useful information to sniff

Classical password authentication is an insecure process that could be
solved with public key cryptography. The problem, however, is that it
theoretically offloads a lot of complexity and responsibility on the
user. Managing private keys securely is complex. However this complexity
is already being addressed in the Blockchain ecosystem. 1Block leverages
these efforts and makes authentication a much simpler and safer process
for the end user.

See complete 1Block presentation : https://1block.io/

# Mobile Application

The mobile app is written in Apache Cordova, and therefore should be
compatible with any platform Cordova supports. 1Block has been tested on
various Android and iPhone devices. Ionic Framework is the working
engine, which combines Cordova with a foundation of custom CSS and
AngularJS.

# Specification

You can think of a 1Block ID as your keychain. A single ID is used to
log into any number of services. Usually one ID is all you need.
However, the 1Block client supports multiple IDs. For instance, you may
have an ID for personal use and another for business use. Or, maybe you
have multiple IDs for a single service that you manage. The IDs are
generated by the client for you. They are generated by a mnemonic pass
phrase (See BIP39) and are stored offline by writing the phrase down.
The IDs can be copied to multiple devices via QR code or by regeneration
from the pass phrase.

In order to access a restricted area or authenticate oneself against a
given service, the user is presented a QR code :

TODO: add QR code graphic

The client browser then begins polling the service for a successful
signature. This is polled via javascript ajax requests or possibly by a
single websocket connection.

The QR code contains a login challenge of the following format :

```
oneblock://www.site.com/callback?x={NONCE}
```

- **oneblock** is the protocol scheme
- **www.site.com/callback** is the callback URL
- **x** is a one-time identifier for the session,
    or in cryptographic terms a "nonce"

HTTPS is highly recommended, however HTTP is supported via the **&u=1**
parameter.

The end user unlocks their 1Block ID on the device, scans the QR code,
confirms the website URL being logged into, and submits (signs) the QR
challenge.  Alternately the QR code can be clicked/tapped to launch a
browser extension or app to complete the signature.

TODO: show steps

The 1Block client hashes the service URL with the 1Block ID on-the-fly
to generate a unique key-pair for the given service. This key-pair is used
for all subsequent logins for this service. This avoids services storing
any identifiable data between each other. The signature along with the
public address is POSTed to the callback URL. Note that the service only
stores public addresses, not public keys. A public address is a RIPE160
hash of the public key. This provides another layer of security on the
service side.

Signatures must comply to the Bitcoin signed message format :
`\x18Bitcoin Signed Message:\n#{message.size.chr}#{message}`

<pre>
\x18Bitcoin Signed Message:
%oneblock://www.site.com/callback?x={NONCE}
</pre>

The details surrounding Bitcoin message signing and verification are
handled by Bitcoin libraries. The 1Block client uses the Bitcore
javascript library. The service side is dependent on the implementation.

The receiving server verifies the validity of the signature and proceeds
to authenticate the user. The server only stores the public address for
the service along with information for revoking an ID. A timeout for the
validity of the nonce should be implemented by the server in order to
prevent replay attacks. The example services implement a 5 minute
timeout window. The service should also check the IP of the client
browser during polling to further midigate session hijacking.

# Compatibility

In the event that a camera is not accessible for QR code data transfer,
the 1Block client supports the ability to manually copy and paste the
1Block challenge. The chrome extension will scrape the challenge from the page
instead of using QR codes. You can also manually copy and paste your ID to
transfer your ID between devices. The ID is always transferred in encrypted form.

# Revoking

Hopefully the need to revoke a key is a very rare occurance. Your ID
exists only on your device and is encrypted with an unlock code. However, it is
possible to lose a device and have a weak enough unlock code for a hacker to
eventually unlock. For this reason, a revoke/replace mechanism is built into the
protocol. 1Block utilizes the Diffie-Hellman key exchange protocol to ensure only
site-specific information exists server side.

When a 1BlockID is first generated, a revoke key is also generated. The revoke
private key exists nowhere on a device, only offline in paper form via the
mnemonic phrase. The revoke public key is retained on the client device along with
the 1Block ID. Upon initial sign-in to a service, a random site revoke key-pair is
generated. The site revoke private key is mixed with the revoke public key to
create a shared key-pair. Then some text (login host) is signed with the
shared key-pair. The site revoke private key is then discarded. Each service stores
the site revoke public key and the signature. 

To revoke an ID, the user must restore the revoke private key to a
client device by entering the mnemonic phrase. Now the 1Block ID can be
placed into "revoke" mode. A separate 1Block ID is chosen to replace it.
Upon the next login to a service, The service identifies the mode and
sends the site revoke public key back to the client. The
client then mixes the revoke private key with the site revoke public key
to re-create the shared key-pair. This can then be used to sign the text
(login host) and POST it back, along with the new ID information. The service
verifies the signature with the shared public address. If it is successful,
the 1Block ID is removed and replaced with the new one.

**Please reference the Diffie-Hellman key exchange protocol for the
details of how the above works.**

It is important to note that if a 1Block ID is ever compromised, a
hacker could only log in as that user but not revoke the ID themselves.
The offline revoke private key is required to revoke the ID.

# Recovery from Lost IDs

Since the 1Block ID only exists on a client device and the revoke key
only exists offline, it is imperative that the user is responsible with
this information (ie. store in a safety deposit box.) In the event that
a 1Block ID is lost and/or a revoke key is lost, the only recovery
method would be of something outside the protocol, such as contacting
each service and have them manually reset the 1Block ID on the account.

# Reference implementation

A demonstration of the workflow is available here :  
https://1block.io/

# See also

BitID protocol :
https://github.com/bitid/bitid

SQRL, a similar proposal not implemented in Blockchain ECC :
https://www.grc.com/sqrl/sqrl.htm
