var mongodb = require('mongodb');
exports.builder = function(c, f) {
	var mongodb = require('mongodb');
	var Db = mongodb.Db;
	var Connection = mongodb.Connection;
	var Server = mongodb.Server;
	var ReplSetServers = mongodb.ReplSetServers;
	var BSON = mongodb.BSONNative;

	var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
	var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

	var servers = [new Server(host, port, {})];
	var db = new Db('mstest', new ReplSetServers(servers, {}), {native_parser:false});
	db.open(function(err, db) {
		if (err) {
			console.error('db.open error: ' + err);
		}
		f(err, db);
	});
}
