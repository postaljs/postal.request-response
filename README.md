# postal.request-response

##v 0.1.2

## What is it?
postal.request-response is an add-on for [postal.js](https://github.com/postaljs/postal.js) which gives postal a request/response pattern API alongside the normal messaging (publish/subscribe) API which postal's core supports. A publisher can invoke `request` instead of `publish` - this returns a promise which can be used to handle the reply (via the success callback) or the timeout (if you've set one) via the error handler.

## How do I use it?
This add-on adds a `request` method to the `ChannelDefinition` prototype, with a method signature of `channel.request(options)`, where `options` can contain the following:

* `topic` - the topic for the message
* `data` - the message data
* `timeout` - a timeout value in milliseconds. If the reply does not occur within this threshold, the promise moves to failed/rejected state, invoking the error handler the user passed to `.then()`
* `envelope` - it's possible you may want to customize your envelope. If this is the case, you can pass a full envelope instead of `topic` and `data`, and it will be used to build up the message itself. *Important: you should not pass `envelope` **and** `topic`/`data`, choose one or the other, as the `envelope` option will be picked over `topic`/`data` if it exists.
* `replyTopic` - the topic that should be used on the reply. This defaults to the `requestId` that is generated for this request.
* `replyChannel` - the channel name that should be used on the reply. This defaults to `postal.request-response`, but you can override it to whatever you like.

The `request` method returns a promise, which you can call `then` on and pass in success & error handlers.  The success handler receives the message `data` arg. The error handler takes a single JavaScript `Error` argument.

### Enough Talk, Show Me Code
To make a request, you can do the following:

```
var chn1 = postal.channel("user");

chn1.request({
	topic: "last.login",
	data: { userId: 8675309 },
	timeout: 2000
}).then(
	function(data) {
		console.log("Last login for userId: " + data.userId + " occurred on " + data.time);
	},
	function(err) {
		console.log("Uh oh! Error: " + err);
	}
);
```

To handle requests:

```
var subscription = chn1.subscribe("last.login", function(data, envelope) {
	var result = getLoginInfo(data.userId);
	envelope.reply({ time: result.time, userId: data.userId });
});
```

###Wait - What Promise Lib Are You Using?!
That's up to you, actually. I have no desire to force another dependency on you. So, you get to pick. The only catch is you need to tell postal how to create a "deferred" instance and a "promise" instance.

>By "deferred", I'm referring to the internal instance supported by most major libs that expose methods like `resolve`, `reject`, etc. In other words, the instance that has the ability to both observer *and* change state.
>
> By "promise" instance, I'm referring to the value that you'd hand off to the caller which should have a `then` method.

Let's look at some examples:

####Using [jQuery](http://api.jquery.com/category/deferred-object/)
```
// We need to tell postal how to get a deferred instance
postal.configuration.promise.createDeferred = function() {
	return new $.Deferred();
};
// We need to tell postal how to get a "public-facing"/safe promise instance
postal.configuration.promise.getPromise = function(dfd) {
	return dfd.promise();
};
```

####Using [Q](https://github.com/kriskowal/q) (v0.9)
```
// We need to tell postal how to get a deferred instance
postal.configuration.promise.createDeferred = function() {
	return Q.defer();
};
// We need to tell postal how to get a "public-facing"/safe promise instance
postal.configuration.promise.getPromise = function(dfd) {
	return dfd.promise;
};
```

####Using [when.js](https://github.com/cujojs/when)
```
// We need to tell postal how to get a deferred instance
postal.configuration.promise.createDeferred = function() {
	return when.defer();
};
// We need to tell postal how to get a "public-facing"/safe promise instance
postal.configuration.promise.getPromise = function(dfd) {
	return dfd.promise;
};
```

####Using [rsvp](https://github.com/tildeio/rsvp.js/)
```
// We need to tell postal how to get a deferred instance
postal.configuration.promise.createDeferred = function() {
	return RSVP.defer();
};
// We need to tell postal how to get a "public-facing"/safe promise instance
postal.configuration.promise.getPromise = function(dfd) {
	return dfd.promise;
};
```

##How Does It work?
This is an add-on for [postal.js](https://github.com/postaljs/postal.js) - which is an in-memory message bus. The core behavior in postal is that publishers publish messages to which any number of susbcribers can listen (and subscribers never need a direct reference to the publisher(s)). These messages are "fire and forget". It's perfectly reasonable to set up your own "request/response" implementation using your own custom topics for both the request and response side of things, etc. In other words - you can achieve "request/response" behavior indirectly through "event/informational" messages, instead of "command/RPC" messages. However, there are times where having the clearly expressed intent of "request/response" is the best fit for the job - that's why I wrote this.

The `request` method wraps the `publish` call, and adds some extra fields to the envelope, so a request message may look something like this:

```
{
    "topic": "last.login",
    "data": {
        "userId": 8675309
    },
    "headers": {
        "replyable": true,
        "requestId": "d76b71be-d8d7-44ac-95d4-1d2f87251715",
        "replyTopic": "d76b71be-d8d7-44ac-95d4-1d2f87251715",
        "replyChannel": "postal.request-response"
    },
    "channel": "channel1",
    "timeStamp": "2014-04-23T04:03:56.814Z"
} 
```

Notice the headers? This request has been given a unique ID (an RFC4122 version 4 compliant GUID). When postal sees this metadata on the envelope, it will add a `reply` method to the envelope before handing the envelope to the subscriber's callback method. This allows the subscriber a simple way to reply without having to worry about knowing the ID, reply topic and reply channel to use. By default, postal will use the `requestId` as the topic, and `postal.request-reponse` as the channel on the reply. An example reply to the above message might look like this:

```
{
    "channel": "postal.request-response",
    "topic": "d76b71be-d8d7-44ac-95d4-1d2f87251715",
    "headers": {
        "isReply": true,
        "requestId": "d76b71be-d8d7-44ac-95d4-1d2f87251715"
    },
    "data": {
        "time": "Wed, 23 Apr 2014 04:03:56 GMT",
        "userId": 8675309
    },
    "timeStamp": "2014-04-23T04:03:56.819Z"
} 
```

>WAIT A SECOND, JIM! I thought you said to never ever add behavior to the envelope?

Well - to be clear, I've said never *publish behavior* (functions). Aside from being an anti-pattern, publishing functions on your messages results in a payload that can't be serialized (to JSON), so the moment you need to send messages across boundaries (to node.js, an iframe, web worker, etc.), then you will have problems!

However, it **is** OK for postal to manage adding convenience behaviors to an envelope before it hands it to subscriber callbacks if that behavior can be generated dynamically based on envelope data that *can* be serialized. The above request message is easily serializable, and the remote instance of postal (in an iframe, for example) would handle adding the `reply` method to the envelope as if the message originated locally in that iframe.

##License?
MIT. Go forth.