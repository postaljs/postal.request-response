# postal.request-response

##(still in alpha, not version number ready)
The API is still in flux, and I may settle on a fully async version, so consider this unstable for now.

## What is it?
postal.request-response is an add-on for [postal.js](https://github.com/postaljs/postal.js) which gives postal a request/response pattern API alongside the normal messaging (publish/subscribe) API which postal's core supports. A publisher can invoke `request` instead of `publish`, and pass an `onReply` callback to be invoked when the subscriber on the other end replies, and also an optional `onTimeout` error callback.

## How do I use it?
To make a request, you can do the following:

```
var ch = postal.channel("hai");
ch.request({
    topic: "login.last", 
    data: {
    	userId: 8675309
    }, 
    timeout: 500, //milliseconds
    onReply: function(data) { 
        console.log("User last logged in at " + data.time);
    },
    onTimeout:function() {
    	console.log("Shoot - we hit the timeout limit.");	
    }
});
```

To handle requests:

```
var subscription = ch.subscribe(
    "login.last",
    function(data, envelope) {
    	var result = getLastLoginFor(data.userId);
        enevelope.reply({ time: result.time });
    }
);
```