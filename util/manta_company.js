var pg = require("pg");
var url = require("url");

// set configuration data
exports.setConfigData = function (configdata) {
	this.config = configdata;
}

exports.testDBConnectivity = function(cb) {
	var that = this;
	pg.connect(that.config.claimedDBConnectString, function(err, client) {
		if (err) {
			cb({error :"Error connecting to claimed company DB at " + url.parse(that.config.claimedDBConnectString).host, pgdetails: err });
		} else {
			pg.connect(that.config.unclaimedDBConnectString, function(err, client) {
				if (err) {
					cb({error :"Error connecting to unclaimed company DB at " + url.parse(that.config.unclaimedDBConnectString).host, pgdetails: err });
				} else {
					cb(null);
				}
			});
		}
	});
}

// get minimal set of company details given a list of mids (returns an array of objects containing the details)
exports.getCompanyDetailsLite = function (companyIDs, callback) {
	pg.connect(this.config.claimedDBConnectString, function(err, client) {
		var endpoints = {};
		if (err) {
			console.log("error", err);
		}
		// set up our params so we can use a prepared statement with an IN clause
		var params1 = [];
		for (var i = 1; i <= Object.keys(companyIDs).length; i++) {
			params1.push('$' + i);
		}
		var paramValues = Object.keys(companyIDs);
		
		// First look in manta_claims_processed to get the company info.  For any IDs we didn't find, try those from manta_contents_2
		// This isn't the greatest solution, but the thinking is that this query will be replaced by a call to the "company service" once one exists.
		client.query({name:'select claimed mids ' + params1.length, text: 'SELECT mid, company_name, city, statebrv, zip, phones0_number, hide_address FROM manta_claims_published WHERE mid IN (' + params1.join(',') + ')', values: paramValues}, function(err, results) {
			var unclaimedIDs = paramValues;
			var finalResults = [];
			if (!err) {
				results.rows.forEach(function(row) {
					unclaimedIDs.splice(unclaimedIDs.indexOf(row.mid),1);
					finalResults.push(row);
				});
				if (unclaimedIDs.length > 0) {
					var params2 = [];
					for (var i=1; i <= unclaimedIDs.length; i++) {
						params2.push('$' + i);
					}
					// some IDs were not in the manta_claims_published, so look in manta_contents_2
					pg.connect(this.config.unclaimedDBConnectString, function(err, client) {
					client.query({name:'select unclaimed mids ' + params2.length, text:'SELECT mid, name1 as company_name, city, stabrv as statebrv, zip5 as zip, phone as phones0_number, 0 as hide_address FROM manta_contents_2 WHERE mid IN (' + params2.join(',') + ')', values: unclaimedIDs}, function(err, results) {
							results.rows.forEach(function(row) {
								finalResults.push(row);
							});
							callback(err, finalResults);
						});
					});
				} else {
					callback(err, finalResults);
				}
			} else {
				callback(err);
			}
		});
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

