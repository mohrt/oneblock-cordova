<pre>
Title: 1Block address authentication server-side API protocol (1Block)
Author: Monte Ohrt @mohrt
Status: Draft
</pre>

# API

The 1Block server-side is a REST API that must adhere to the following protocol.

These endpoints can reside on a longer URL path, they are shortened to a single word for brevity.

GET      /login
===============

This endpoint will generate a challenge string of the format:

HTTPS:
oneblock://{host}/{path}/login?x={nonce}

HTTP:
oneblock://{host}/{path}/login?x={nonce}&u=1

host = hostname for service
path = URL path to login REST endpoint
nonce = unique 32 char hex string

RETURN:

Header:
Content-Type: application/json

Body:
{"challenge":"CHALLENGE_STRING"}


OPTIONS  /login
===============

More recently browsers are checking OPTIONS before a POST. Handle the request and set access control.

headers:
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type


POST     /login
===============

headers:
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type

This endpoint needs to use a Bitcoin library to verify the signature against the public address.
if valid, the address is used to identify the account (or register a new one if applicable.)
It will respond with 200 for success and 403 for invalid. It willreturn a JSON payload of:

{"hasRevoke":1}

or

{"hasRevoke":0, "revokeURL":"URL"}


If this is an existing account hasRevoke will be set to 1. If not, a revokeURL must be
supplied, something like:  "https://host.dom/path/to/setrevoke". The client will then
respond with the revoke information to this endpoint. This happens only for new 


POST     /check
===============

This endpoint is repeatedly checked from the website to see if a successful login has
been completed. If so it sets up the session redirects the user to a logged in page.


POST     /setrevoke
===================

This is the endpoint to set the revoke data on a new account. This happens on the first
registration of the ID.

OPTIONS  /setrevoke
===================

More recently browsers are checking OPTIONS before a POST. Handle the request and set access control.

headers:
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type



