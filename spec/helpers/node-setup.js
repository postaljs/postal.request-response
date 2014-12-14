// Setup for running Mocha via Node
require( "should/should" );
global._ = require( "lodash" );
global.Q = require( "q" );
global.postal = require( "../../lib/postal.request-response.js" )( require( "../../node_modules/postal/lib/postal.js" ) );
