var mongoose = require('mongoose');
exports.builder = function(c, f) {

	var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
	var port = parseInt(process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : 27017);

	var connectSchema = mongoose.Schema({ from: String, to: String, id: String, type: String })
	var Connection = mongoose.model('Connection', connectSchema);
	mongoose.connect('mongodb://'+host+':'+port+'/mstest');
	var db = mongoose.connection;
	db.on('error', function (err) {
		f(err, Connection);
	} );
	db.once('open', function () {
		f(null, db);
	} );
	var query = Connection.find( { from: 'srj0gjgxrn9bn3' } );
};
