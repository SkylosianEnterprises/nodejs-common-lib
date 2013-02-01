var pg = require("pg");

var dbHost = process.env['COMPANY_DB_HOST'] != null ? process.env['COMPANY_DB_HOST'] : 'localhost';
var dbPort = parseInt(process.env['COMPANY_DB_PORT'] != null ? process.env['COMPANY_DB_PORT'] : 8530);

// get company details given a list of mids
exports.getCompanyDetailsLite = function (companyIDs, callback) {
	//var dbConnectString = "tcp://manta_app:I%20am%20glad%20I%20use%20HADD.@rsdb1.rs.ecnext.net:5433/manta";
	var dbConnectString = "tcp://manta_app:I%20am%20glad%20I%20use%20HADD.@" + dbHost + ":" + dbPort + "/manta";
	console.log("company DB connection string is:", dbConnectString);
	pg.connect(dbConnectString, function(err, client) {
		var endpoints = {};
		if (err) {
			console.log("error", err);
		}
		// set up our params so we can use a prepared statement with an IN clause
		var params = [];
		for (var i = 1; i <= Object.keys(companyIDs).length; i++) {
			params.push('$' + i);
		}
		client.query({name:'select mids ' + Object.keys(companyIDs).length, text:'SELECT mid, company_name, city, statebrv, zip, phones0_number, hide_address  FROM manta_claims_published WHERE mid IN (' + params.join(',') + ')', values: Object.keys(companyIDs)}, callback);
	});
}; 


// Encrypt/decrypt manta company IDs 
exports.decrypt_emid = function(input){
	if (input.length == 10) {
		return input;
	} else {
		var mid = _remap_base(input, 'mtv9rwxhk1bc7f2j3lgd8nsy045pqz6', '0123456789');
		while (mid.length < 10) {
			mid = "0" + mid;
		}
		return mid;
	}
};

exports.encrypt_mid = function(input){
	if (input.length == 7) {
		return input;  // already an emid
	} else {
		var emid =_remap_base(input, '0123456789', 'mtv9rwxhk1bc7f2j3lgd8nsy045pqz6');
		while (emid.length < 7) {
			emid = "m" + emid;
		}
	}
};

// Internal methods
var _express_base = function(val, symbols){
        var base = symbols.length;
        var expression = '';
        while(val > 0){
                expression = symbols.substr(val % base, 1) + expression;
                val = Math.floor(val / base);
        }
        return expression;
};

var _remap_base = function(code, from, to){
        var chars = code.split('');
        var val = 0;
        var j = 0;
        for(var i = chars.length - 1; i >= 0; i--){
                val = val + (from.indexOf(chars[i]) * Math.pow(from.length, j++));
        }
        return _express_base(val, to);
};

