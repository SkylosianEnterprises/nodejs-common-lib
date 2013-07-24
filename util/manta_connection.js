var Q = require("q");
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

var connectionsDefer = Q.defer();
var archiveDefer = Q.defer();
var getConnections = connectionsDefer.promise;
var getArchive = archiveDefer.promise;

function MantaConnectionUtil (configdata) {
	var self = this;
	console.log("CONNECTION CONSTRUCTOR", configdata);


	function setConnection () {
		mongoose.connect(configdata.mongoURL);
		self.connection = mongoose.connection;
	}

	setConnection();

	var errinit = function (err) { self.error = err; throw("CONNECT ERROR", err);  };
	this.connection.on('error', errinit);
	this.connection.once('open', function () {
		delete self.error;
		connectionsDefer.resolve(Connection);
		archiveDefer.resolve(Connection_Archive);
		// Since we have gotten an open, we remove the init handler and replace it
		// with this error handler for subsequent errors
		self.connection.removeListener('error', errinit);

		function handle ( name) {
			return function (err) {
				self.error = err;
				console.log("mongoose "+name, err);
				setConnection();
			}
		}

		self.connection.on( 'error', handle ('Error') );
		self.connection.on( 'close', handle ('Close') );
	} );
	this.Connections = getConnections;
	this.Connections_Archive = getArchive;
	this.ObjectId = mongoose.Types.ObjectId;
};


MantaConnectionUtil.testConnectivity = MantaConnectionUtil.prototype.testConnectivity = function(cb) {
	var self = this;
	try {
		mongoose.connection.db.command({'ping':1}, function (err, result) {
			if (err) return cb(err);
			cb(null);
		} );
	} catch (e) {
		cb(e);
	}
};

module.exports = MantaConnectionUtil;


