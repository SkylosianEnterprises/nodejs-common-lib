var mongoose = require('mongoose');
var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = parseInt(process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : 27017);
mongoose.connect('mongodb://'+host+':'+port+'/mstest');

exports.builder = function(c, f) {

	var connectArchiveSchema = mongoose.Schema(
		{ from: { type: String, required: true }
		, to: { type: String, required: true }
		, id: { type: String, required: true }
		, type: { type: String, required: true }
		})
	var connectSchema = mongoose.Schema(
		{ from: { type: String, required: true }
		, to: { type: String, required: true }
		, id: { type: String, required: true }
		, type: { type: String, required: true }
		})
	var Connection = mongoose.model('connections', connectSchema);
	var Connection_Archive = mongoose.model('connections_archive', connectArchiveSchema);
	//var Connection_Archive = mongoose.model('connections_archive', connectSchema);

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
		console.log( Connection.find( { from: 'srj0gjgxrn9bn3' } , function (err, rec) { console.log("ERROR:", err, "RECORD:", rec); } ) );
		f(null, mongoose);
	} );
};
