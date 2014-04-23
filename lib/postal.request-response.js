/**
 * postal.request-response - postal.js add-on that provides a request/response pattern API.
 * Author: Jim Cowart (http://freshbrewedcode.com/jimcowart)
 * Version: v0.1.0
 * Url: http://github.com/postaljs/postal.request-response.js
 * License(s): MIT
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        // Node, or CommonJS-Like environments
        module.exports = function (postal) {
            return factory(require("underscore"), postal, this);
        }
    } else if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define(["underscore", "postal"], function (_, postal) {
            return factory(_, postal, root);
        });
    } else {
        // Browser globals
        root.postal = factory(root._, root.postal, root);
    }
}(this, function (_, postal, global, undefined) {
    var REQ_RES_CHANNEL = "postal.request-response";
    // I want this lib to be compatible with nearly any
    // promises-A-spec-compliant promise lib. For that 
    // to happen, though, you have to provide a factory
    // method implementation that returns a promise
    postal.configuration.promise = {
        createDeferred: function () {
            throw new Error("You need to provide an implementation for postal.configuration.promise.createDeferred that returns a deferred/promise instance.");
        },
        getPromise: function () {
            throw new Error("You need to provide an implementation for postal.configuration.promise.getPromise that returns a promise safe for consuming APIs to use.");
        },
        fulfill: "resolve",
        fail: "reject",
    };
    /**
     * Fast UUID generator, RFC4122 version 4 compliant.
     * @author Jeff Ward (jcward.com).
     * @license MIT license
     * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
     **/
    var UUID = (function () {
        var self = {};
        var lut = [];
        for (var i = 0; i < 256; i++) {
            lut[i] = (i < 16 ? '0' : '') + (i).toString(16);
        }
        self.create = function () {
            var d0 = Math.random() * 0xffffffff | 0;
            var d1 = Math.random() * 0xffffffff | 0;
            var d2 = Math.random() * 0xffffffff | 0;
            var d3 = Math.random() * 0xffffffff | 0;
            return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' + lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' + lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] + lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
        }
        return self;
    })();
    postal.ChannelDefinition.prototype.request = function (options) {
        var env = options.envelope ? options.envelope : {
            topic: options.topic,
            data: options.data
        };
        var requestId = UUID.create();
        var replyTopic = options.replyTopic || requestId;
        var replyChannel = options.replyChannel || REQ_RES_CHANNEL;
        var timeout;
        var promise = postal.configuration.promise.createDeferred();
        env.headers = env.headers || {};
        env.headers.replyable = true;
        env.headers.requestId = requestId;
        env.headers.replyTopic = replyTopic;
        env.headers.replyChannel = replyChannel;
        var sub = postal.subscribe({
            channel: replyChannel,
            topic: replyTopic,
            callback: function (data, env) {
                promise[postal.configuration.promise.fulfill](data);
            }
        }).once();
        if (options.timeout) {
            timeout = setTimeout(function () {
                promise[postal.configuration.promise.fail](new Error("Timeout limit exceeded for request."));;
            }, options.timeout);
        }
        this.publish(env);
        return postal.configuration.promise.getPromise(promise);
    };
    var oldPub = postal.publish;
    postal.publish = function (envelope) {
        if (envelope.headers && envelope.headers.replyable) {
            envelope.reply = function (data) {
                postal.publish({
                    channel: envelope.headers.replyChannel,
                    topic: envelope.headers.replyTopic,
                    headers: {
                        isReply: true,
                        requestId: envelope.headers.requestId
                    },
                    data: data
                })
            }
        }
        oldPub.call(this, envelope);
    }
    return postal;
}));