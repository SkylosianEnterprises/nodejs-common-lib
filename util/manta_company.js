var pg = require("pg");
var url = require("url");
var Q = require("q");

var configDefer = Q.defer();
var getConfig = configDefer.promise;
var claimedDefer = Q.defer();
var unclaimedDefer = Q.defer();
var getClaimed = claimedDefer.promise;
var getUnclaimed = unclaimedDefer.promise;

var MantaCompanyUtil = function (configdata) {
	console.log("COMPANY CONSTRUCTOR", configdata);
	configDefer.resolve(configdata);

	claimedDefer.resolve(new pg.Client(configdata.claimedDBConnectString));
	unclaimedDefer.resolve(new pg.Client(configdata.unclaimedDBConnectString));
};
MantaCompanyUtil.prototype = {};

// set configuration datA
MantaCompanyUtil.setConfigData = function (configdata) {
	configDefer.resolve(configdata);
}

MantaCompanyUtil.testDBConnectivity = MantaCompanyUtil.prototype.testDBConnectivity = function(cb) {
	var that = this;
	getClaimed.then( function(client) {
		client.connect(function (err) {
			if(err) throw err;
			getUnclaimed.then( function(client) {
				client.connect(function(err) {
					if(err) throw err;
					cb(null);
				} );
			} );
		} );
	} );
};

// get minimal set of company details given a list of mids (returns an array of objects containing the details)
MantaCompanyUtil.getCompanyDetailsLite = MantaCompanyUtil.prototype.getCompanyDetailsLite = function (companyIDs, callback) {
	getClaimed.then(function(client) { client.connect( function (err) { if (err) throw err;
		var endpoints = {};
		// set up our params so we can use a prepared statement with an IN clause
		var params1 = [];
		for (var i = 1; i <= Object.keys(companyIDs).length; i++) {
			params1.push('$' + i);
		}
		var paramValues = Object.keys(companyIDs);
		
		// First look in manta_claims_processed to get the company info.  For any IDs we didn't find, try those from manta_contents_2
		// This isn't the greatest solution, but the thinking is that this query will be replaced by a call to the "company service" once one exists.
		client.query({name:'select claimed mids ' + params1.length, text: 'SELECT mid, company_name, city, statebrv, zip, phones0_number, hide_address FROM manta_claims_published WHERE mid IN (' + params1.join(',') + ')', values: paramValues}, function(err, results) {
			var finalResults = {};
			results.rows.forEach( function (row) {
				finalResults[row.mid] = row;
			} );
			var unclaimedIDs = paramValues.filter( function (id) {
				return !(id in Object.keys(finalResults));
			} );
			var params2 = [];
			for (var i=1; i <= unclaimedIDs.length; i++) {
				params2.push('$' + i);
			}
			// some IDs were not in the manta_claims_published, so look in manta_contents_2
			if (params2.length > 0) {
				getUnclaimed.then(function(client) { client.connect( function (err) { if (err) throw err;
					client.query(
						{ name: 'select unclaimed mids ' + params2.length
						, text: 'SELECT mid, name1 as company_name, city, stabrv as statebrv, zip5 as zip, phone as phones0_number, 0 as hide_address FROM manta_contents_2 WHERE mid IN (' + params2.join(',') + ')'
						, values: unclaimedIDs
						}, function(err, results) {
							results.rows.forEach(function(row) {
								finalResults[row.mid] = row;
							} );
							callback(err, Object.keys(finalResults).map(function(k){return finalResults[k]}));
						}
					);
				} ); } );
			} else {
				callback(err);
			}
		} );
	} ); } );
};


// Encrypt/decrypt manta company IDs
MantaCompanyUtil.decrypt_emid = MantaCompanyUtil.prototype.decrypt_emid = function(input){
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

MantaCompanyUtil.encrypt_mid = MantaCompanyUtil.prototype.encrypt_mid = function(input){
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

module.exports = MantaCompanyUtil;


