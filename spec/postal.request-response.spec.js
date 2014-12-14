/* global postal, describe, before, after, it, Q */

var subscription;
var sub;
var channel;
var caughtSubscribeEvent = false;
var caughtUnsubscribeEvent = false;
var origCreateDeferred = postal.configuration.promise.createDeferred;
var origGetPromise = postal.configuration.promise.getPromise;

describe( "postal.request-response", function() {
	describe( "when not specifying a promise provider", function() {
		before( function() {
			postal.configuration.promise.createDeferred = origCreateDeferred;
			postal.configuration.promise.getPromise = origGetPromise;
		} );
		after( function() {
			postal.reset();
		} );
		it( "should throw an exception if createDeferred hasn't been implemented", function() {
			var chn1 = postal.channel( "channel1" );
			var sub = chn1.subscribe( "who.are.you", function( data, envelope ) {
				reqMsg = envelope;
				envelope.reply( null, { name: "I'm the Doctor" } );
			} );
			( function() {
				chn1.request( {
					topic: "who.are.you",
					data: { asking: "Martha" }
				} )
			} ).should.throw( /You need to provide an implementation for postal.configuration.promise/ );
		} );
		it( "should throw an exception if getPromise hasn't been implemented", function() {
			postal.configuration.promise.createDeferred = function() {
				return Q.defer();
			};
			var chn1 = postal.channel( "channel1" );
			var sub = chn1.subscribe( "who.are.you", function( data, envelope ) {
				reqMsg = envelope;
				envelope.reply( null, { name: "I'm the Doctor" } );
			} );
			( function() {
				chn1.request( {
					topic: "who.are.you",
					data: { asking: "Martha" }
				} )
			} ).should.throw( /You need to provide an implementation for postal.configuration.promise/ );
		} );
	} );
	describe( "when having specified valid promise provider", function() {
		before( function() {
			// We need to tell postal how to get a deferred instance
			postal.configuration.promise.createDeferred = function() {
				return Q.defer();
			};
			// We need to tell postal how to get a "public-facing"/safe promise instance
			postal.configuration.promise.getPromise = function( dfd ) {
				return dfd.promise;
			};
		} );
		describe( "when sending a request", function() {
			var chn1, sub, reqMsg, p;
			before( function() {
				chn1 = postal.channel( "channel1" );
				sub = chn1.subscribe( "who.are.you", function( data, envelope ) {
					reqMsg = envelope;
					envelope.reply( null, { name: "I'm the Doctor" } );
				} );
				p = chn1.request( {
					topic: "who.are.you",
					data: { asking: "Martha" }
				} );
			} );
			after( function() {
				postal.reset();
			} );
			it( "should send a request message", function() {
				reqMsg.should.be.ok;
				reqMsg.headers.should.be.ok;
				reqMsg.headers.replyable.should.equal( true );
				reqMsg.headers.requestId.should.equal( reqMsg.headers.replyTopic );
				reqMsg.headers.replyChannel.should.equal( "postal.request-response" );
			} );
			it( "should send a response message", function( done ) {
				p.then( function( data ) {
					data.should.be.ok;
					data.name.should.equal( "I'm the Doctor" );
					done();
				}, function( err ) {
						throw err;
					}
				);
			} );
		} );
		describe( "when a request times out", function() {
			var chn1, sub, reqMsg, p;
			before( function() {
				chn1 = postal.channel( "channel2" );
				sub = chn1.subscribe( "y.u.no", function( data, envelope ) {
					setTimeout( function() {
						envelope.reply( null, { msg: "u mad bro?" } );
					}, 1000 );
				} );
				p = chn1.request( {
					topic: "y.u.no",
					data: {},
					timeout: 500
				} );
			} );
			after( function() {
				postal.reset();
			} );
			it( "should invoke error handler", function( done ) {
				p.then( function( data ) {}, function( err ) {
					err.should.be.ok;
					err.toString().should.equal( "Error: Timeout limit exceeded for request." );
					done();
				}
				);
			} );
		} );
		describe( "when replying with an error", function() {
			var chn3, sub, reqMsg, p;
			before( function() {
				chn3 = postal.channel( "channel3" );
				sub = chn3.subscribe( "y.u.no", function( data, envelope ) {
					setTimeout( function() {
						envelope.reply( { msg: "OHSNAP! You failed." } );
					}, 0 );
				} );
				p = chn3.request( {
					topic: "y.u.no",
					data: {}
				} );
			} );
			after( function() {
				postal.reset();
			} );
			it( "should invoke error handler", function( done ) {
				p.then( function( data ) {}, function( err ) {
					err.should.be.ok;
					err.msg.should.equal( "OHSNAP! You failed." );
					done();
				}
				);
			} );
		} );
		describe( "when using `resolveNoCache` header value of true", function() {
			var chn1, sub, reqMsg, p;
			before( function() {
				//postal.configuration.resolver.cache = {};
				chn1 = postal.channel( "channel1" );
				sub = chn1.subscribe( "who.are.you", function( data, envelope ) {
					reqMsg = envelope;
					envelope.reply( null, { name: "I'm the Doctor" } );
				} );
				p = chn1.request( {
					topic: "who.are.you",
					data: { asking: "Martha" },
					headers: {
						resolverNoCache: true
					}
				} );
			} );
			after( function() {
				postal.reset();
			} );
			it( "should send a request message", function() {
				reqMsg.should.be.ok;
				reqMsg.headers.should.be.ok;
				reqMsg.headers.replyable.should.equal( true );
				reqMsg.headers.requestId.should.equal( reqMsg.headers.replyTopic );
				reqMsg.headers.replyChannel.should.equal( "postal.request-response" );
			} );
			it( "should send a response message", function( done ) {
				p.then( function( data ) {
					data.should.be.ok;
					data.name.should.equal( "I'm the Doctor" );
					done();
				}, function( err ) {
						throw err;
					}
				);
			} );
			it( "should not cache the topic/binding match in the resolver", function() {
				postal.configuration.resolver.cache.should.be.empty;
			} )
		} );
	} );
} );
