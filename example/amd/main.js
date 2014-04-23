require.config({
	paths: {
		underscore: "../../bower/underscore/underscore",
		postal : "../../bower/postal.js/lib/postal",
		jquery : "../../bower/jquery/jquery",
		"postal.request-response" : "../../lib/postal.request-response"
	},
	shim : {
		"underscore" : {
			exports: "_"
		}
	}
});

define(["postal", "jquery", "postal.request-response"], function(postal, $) {
	// We have to tell postal how to get an deferred instance
	postal.configuration.promise.createDeferred = function() {
		return new $.Deferred();
	};
	// We have to tell postal how to get a "public-facing"/safe promise instance
	postal.configuration.promise.getPromise = function(dfd) {
		return dfd.promise();
	};

	var chn1 = postal.channel("channel1");

	var getLoginInfo = function(userId) {
		return { time: (new Date()).toUTCString() };
	};

	function writeToDom(str) {
		$("body").append("<div>" + str + "</div>");
	};

	// And to show what the other end of the request looks like:
	chn1.subscribe("last.login", function(data, envelope) {
		var result = getLoginInfo(data.userId);
		writeToDom("Received request on last.login for userId: " + data.userId);
		envelope.reply({ time: result.time, userId: data.userId  });
	});

	$("#btnReq").on("click", function(){
		chn1.request({
			topic: "last.login",
			data: { userId: 8675309 },
			timeout: 2000
		}).then(
			function(data) {
				writeToDom("Received response. Last login for userId: " + data.userId + " occurred on " + data.time);
			},
			function(err) {
				writeToDom("Uh oh! Error: " + err);
			}
		);
	});
});