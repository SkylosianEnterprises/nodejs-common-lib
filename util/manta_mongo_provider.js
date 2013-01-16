var mongoose = require('mongoose');
exports.builder = function(c, f) {

	var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
	var port = parseInt(process.env['MONGO_NODE_DRIVER_PORT'] != null ? parseInt(process.env['MONGO_NODE_DRIVER_PORT']) : throw "Need a node driver port";

	var connectSchema = mongoose.Schema({ from: String, to: String, id: String, type: String })
	var Connection = mongoose.model('Connection', connectSchema);
	mongoose.connect('mongodb://'+host+':'+port+'/mstest');
	var db = mongose.connection;
	db.on('error', function (err) {
		f(err, Connection);
	} );
	db.once('open', function () {
		f(null, dbl);
	} );
	Connection.find( { from: 'srj0gjgxrn9bn3' } );
};
