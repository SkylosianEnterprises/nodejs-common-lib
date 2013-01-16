var mongoose = require('mongoose');
exports.builder = function(c, f) {
	var Db = mongodb.Db;
	var Connection = mongodb.Connection;
	var Server = mongodb.Server;
	var ReplSetServers = mongodb.ReplSetServers;
	var BSON = mongodb.BSONNative;

	var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
	var port = parseInt(process.env['MONGO_NODE_DRIVER_PORT'] != null ? parseInt(process.env['MONGO_NODE_DRIVER_PORT']) : Connection.DEFAULT_PORT);

	var connectSchema = mongoose.Schema({ from: String, to: String, id: String, type: String })
	var Connection = mongoose.model('Connection', connectSchema);
	mongoose.connect('mongodb://'+host+':'+port+'/mstest');
	var db = mongose.connection;
	db.on('error', function (err) {
		f(err, Connection);
	} ):
	db.once('open', function () {
		f(null, dbl);
	} );
	Connection.find( { from: 'srj0gjgxrn9bn3' } );
};
