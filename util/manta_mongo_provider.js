var mongoose = require('mongoose');
exports.builder = function(c, f) {
	var Db = mongodb.Db;
	var Connection = mongodb.Connection;
	var Server = mongodb.Server;
	var ReplSetServers = mongodb.ReplSetServers;
	var BSON = mongodb.BSONNative;

	var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
	var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? parseInt(process.env['MONGO_NODE_DRIVER_PORT']) : Connection.DEFAULT_PORT;

	var Schema = mongoose.Schema;
	var conschema = new Schema({ name: "mstest" });
	var db = mongose.createConnection();
	db.openSet('mongodb://'+host+':'+port+'/mstest', function (err, dbl) {
		if (err) throw "MONGO CONNECT ERROR: " + err;
		f(err, dbl);
	} ):
	db.model('Connection', conschema, 'mstest')
}
