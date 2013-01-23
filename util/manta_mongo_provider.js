var mongoose = require('mongoose');
var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = parseInt(process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : 27017);
mongoose.connect('mongodb://'+host+':'+port+'/mstest');

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
	, subType: { type: String, required: true }
	, createdDate: { type: Date, required: true }
	, updatedDate: { type: Date, required: true }
	, createdBy: { type: String, required: true }
	, updatedBy: { type: String, required: false }
	, attrs: { type: mongoose.Schema.Types.Mixed }
	, reports: [ ReportSchema ]
	, status: { type: String, required: false }
	});

var Connection = mongoose.model( 'Connection', connectSchema, 'connections' );
var Connection_Archive = mongoose.model( 'ConnectionArchive', connectSchema, 'connections_archive' );

exports.builder = function(c, f) {

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
