var mongoose = require('mongoose');
exports.builder = function(c, f) {

	var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
	var port = parseInt(process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : 27017);

	var connectSchema = mongoose.Schema(
		{ from: { type: String, required: true }
		, to: { type: String, required: true }
		, id: { type: String, required: true }
		, type: { type: String, required: true }
		})
	mongoose.connect('mongodb://'+host+':'+port+'/mstest');
	var Connection = mongoose.model('connections', connectSchema);
	var Connection_Archive = mongoose.model('connection_archive', connectSchema);

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
		console.log(mongoose.model('connections').find( { from: 'srj0gjgxrn9bn3' } ));
		f(null, mongoose);
	} );
};
