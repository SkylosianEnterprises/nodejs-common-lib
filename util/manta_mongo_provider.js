var mongoose = require('mongoose');

var ReportSchema = mongoose.Schema(
// TODO @whomever fill this in
		);

var connectSchema = mongoose.Schema(
	{ from: 
		{ type: { type: String, required: true }
		, id: { type: String, required: true }
		}
	, to:
		{ type: { type: String, required: true }
		, id: { type: String, required: true }
		}
	, type: { type: String, required: true }
	, subType: { type: String, required: false }
	, createdDate: { type: Date, required: true }
	, updatedDate: { type: Date, required: true }
	, createdBy: 
		{ type: { type: String, required: false }
		, id: { type: String, required: false }
		}
	, updatedBy: 
		{ type: { type: String, required: false }
		, id: { type: String, required: false }
		}
	, attrs: { type: mongoose.Schema.Types.Mixed }
	, reports: [ ReportSchema ]
	, status: { type: String, required: false }
	});

var Connection = mongoose.model( 'Connection', connectSchema, 'connections' );
var Connection_Archive = mongoose.model( 'ConnectionArchive', connectSchema, 'connections_archive' );

exports.builder = function(c, f) {

	// this uses the provider_sys interface
	c.get('config', function(err, config) {
		if (err) throw err;
		// this uses the nconf interface
		config.get("connectionsDB", function (err, mongoURL) {
			if(err) throw err;
			mongoose.connect(mongoURL);
		} );
	} );

	var conn = mongoose.connection;
	// This error handler for connect errors returns to the caller, since there
	// will be no open
	var errinit;
	conn.on('error', errinit = function (err) { f(err) } );
	conn.once('open', function () {
		// Since we have gotten an open, we remove the init handler and replace it
		// with this error handler for subsequent errors
		conn.removeListener('error', errinit);
		conn.on('error', function (err) {
			throw("mongoose Error", err);
		} );
		f(null, { Connections: Connection, Connections_Archive: Connection_Archive, mongoose: mongoose });
	} );
};
