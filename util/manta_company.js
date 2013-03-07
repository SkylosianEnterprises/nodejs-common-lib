var pg = require("pg");
var url = require("url");
var Q = require("q");

/* configdata is a hash
 * { claimedDBConnectString: "..."
 * , unclaimedDBConnectString: "..."
 * }
 */
var MantaCompanyUtil = function (configdata) {
	console.log("COMPANY CONSTRUCTOR", configdata);

	getClaimed = { then: function (cb) { pg.connect(configdata.claimedDBConnectString, function(err, client) { if(err){throw err}cb(client); } ); return { done: function(){} } } };
	getUnclaimed = { then: function (cb) { pg.connect(configdata.unclaimedDBConnectString, function(err, client) { if(err){throw err}cb(client); } ); return { done: function(){} } } };
};
MantaCompanyUtil.prototype = {};

MantaCompanyUtil.testConnectivity = MantaCompanyUtil.prototype.testConnectivity = function(cb) {
	var that = this;
	try {
		getClaimed.then( function(client) {
			client.query("SELECT NOW()", function(err, result) {
				if (err) return cb(err);
				getUnclaimed.then( function(client) {
					client.query("SELECT NOW()", function(err, result) {
						if (err) return cb(err);
						cb(null);
					} );
				} ).done();
			} );
		} ).done();
	} catch (e) {
		cb(e);
	}
};

// get minimal set of company details given a list of mids (returns an array of objects containing the details)
MantaCompanyUtil.getCompanyDetailsLite = MantaCompanyUtil.prototype.getCompanyDetailsLite = function (companyIDs, callback) {
	getClaimed.then(function(client) {
		var endpoints = {};
		// set up our params so we can use a prepared statement with an IN clause
		var params1 = [];
		for (var i = 1; i <= Object.keys(companyIDs).length; i++) {
			params1.push('$' + i);
		}
		var paramValues = Object.keys(companyIDs);
		
		// First look in manta_claims_processed to get the company info.  For any IDs we didn't find, try those from manta_contents_2
		// This isn't the greatest solution, but the thinking is that this query will be replaced by a call to the "company service" once one exist.
		client.query({name:'select claimed mids ' + params1.length, text: 'SELECT mid, company_name, city, statebrv, zip, iso_country_cd, phones0_number, hide_address, logo_filename FROM manta_claims_published WHERE mid IN (' + params1.join(',') + ')', values: paramValues}, function(err, results) {
			if (err) return callback(err);
			var finalResults = {};
			results.rows.forEach( function (row) {
				finalResults[row.mid] = row;
			} );
			var unclaimedIDs = paramValues.filter( function (id) {
				var keys = Object.keys(finalResults);
				var test = keys.indexOf(id) == -1;
				return test;
			} );
			var params2 = [];
			for (var i=1; i <= unclaimedIDs.length; i++) {
				params2.push('$' + i);
			}
			// some IDs were not in the manta_claims_published, so look in manta_contents_2
			if (params2.length > 0) {
				getUnclaimed.then(function(client) {
					client.query(
						{ name: 'select unclaimed mids ' + params2.length
						, text: 'SELECT mid, name1 as company_name, city, stabrv as statebrv, zip5 as zip, iso_country_cd, phone as phones0_number, 0 as hide_address FROM manta_contents_2 WHERE mid IN (' + params2.join(',') + ')'
						, values: unclaimedIDs
						}, function(err, results) {
							if (err) return callback(err);
							results.rows.forEach(function(row) {
								finalResults[row.mid] = row;
							} );
							var notfoundIDs = unclaimedIDs.filter( function (id) {
								var keys = Object.keys(finalResults);
								var test = keys.indexOf(id) == -1;
								return test;
							} );
							if (notfoundIDs.length > 0) {
								// any remaining unfound IDs might be in manta_claims_saved, so we'll look there next
								var params3 = [];
								for (var i=1; i <= notfoundIDs.length; i++) {
									params3.push('$' + i);
								}
								client.query({name:'select saved mids ' + params3.length, text: 'SELECT mid, company_name, city, statebrv, zip, iso_country_cd, phones0_number, hide_address, logo_filename FROM manta_claims_saved WHERE mid IN (' + params3.join(',') + ')', values: notfoundIDs}, function(err, results) {
									if (err) return callback(err);
									results.rows.forEach( function (row) {
										finalResults[row.mid] = row;
									} );
									callback(err, Object.keys(finalResults).map(function(k){return finalResults[k]}));
								});
							} else {
								callback(err, Object.keys(finalResults).map(function(k){return finalResults[k]}));
							}
						}
					);
				} ).done();
			} else {
				callback(err, Object.keys(finalResults).map(function(k){return finalResults[k]}));
			}
		} );
	} ).done();
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
		return emid;
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


