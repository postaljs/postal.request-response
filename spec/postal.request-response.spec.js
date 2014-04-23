(function(global) {
    var postal = typeof window === "undefined" ? require("../bower/postal.js/lib/postal.js") : window.postal;
    var preqres = typeof window === "undefined" ? require("../lib/postal.request-response.js")(postal) : window.postal;
    var expect = typeof window === "undefined" ? require("../node_modules/expect.js") : window.expect;
    var Q = typeof window === "undefined" ? require("../node_modules/q") : window.Q;
    var _ = typeof window === "undefined" ? require("underscore") : window._;
    var subscription;
    var sub;
    var channel;
    var caughtSubscribeEvent = false;
    var caughtUnsubscribeEvent = false;

    // We need to tell postal how to get a deferred instance
    postal.configuration.promise.createDeferred = function() {
        return Q.defer();
    };
    // We need to tell postal how to get a "public-facing"/safe promise instance
    postal.configuration.promise.getPromise = function(dfd) {
        return dfd.promise;
    };


    describe("postal.request-response", function() {
        describe("when sending a request", function() {
            var chn1, sub, reqMsg, p;
            before(function(){
                chn1 = postal.channel("channel1");
                sub = chn1.subscribe("who.are.you", function(data, envelope) {
                    reqMsg = envelope;
                    envelope.reply({ name: "I'm the Doctor" });
                });
                p = chn1.request({
                    topic: "who.are.you",
                    data: { asking: "Martha" }
                });
            });
            after(function(){
                postal.reset();
            });
            it("should send a request message", function() {
                expect(reqMsg).to.be.ok();
                expect(reqMsg.headers).to.be.ok();
                expect(reqMsg.headers.replyable).to.be(true);
                expect(reqMsg.headers.requestId).to.be(reqMsg.headers.replyTopic);
                expect(reqMsg.headers.replyChannel).to.be("postal.request-response");
            });
            it("should send a response message", function(done) {
                p.then(
                    function(data) {
                        expect(data).to.be.ok();
                        expect(data.name).to.be("I'm the Doctor");
                        done();
                    },
                    function(err) {
                        throw err;
                    }
                );
            });
        });
        describe("when a request times out", function(){
            var chn1, sub, reqMsg, p;
            before(function(){
                chn1 = postal.channel("channel2");
                sub = chn1.subscribe("y.u.no", function(data, envelope) {
                    setTimeout(function(){
                        envelope.reply({ msg: "u mad bro?" });
                    }, 1000);
                });
                p = chn1.request({
                    topic: "y.u.no",
                    data: {},
                    timeout: 500
                });
            });
            after(function(){
                postal.reset();
            });
            it("should invoke error handler", function(done) {
                p.then(
                    function(data) {
                        
                    },
                    function(err) {
                        expect(err).to.be.ok();
                        expect(err.toString()).to.be("Error: Timeout limit exceeded for request.");
                        done();
                    }
                );
            });
        });
    });

}(this));