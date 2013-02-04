var pg = require("pg");

var dbHost = process.env['COMPANY_DB_HOST'] != null ? process.env['COMPANY_DB_HOST'] : 'localhost';
var dbPort = parseInt(process.env['COMPANY_DB_PORT'] != null ? process.env['COMPANY_DB_PORT'] : 8530);

// get minimal set of company details given a list of mids (returns an array of objects containing the details)
exports.getCompanyDetailsLite = function (companyIDs, callback) {
	//var dbConnectString = "tcp://manta_app:I%20am%20glad%20I%20use%20HADD.@rsdb1.rs.ecnext.net:5433/manta";
	var dbConnectString = "tcp://manta_app:I%20am%20glad%20I%20use%20HADD.@" + dbHost + ":" + dbPort + "/manta";
	pg.connect(dbConnectString, function(err, client) {
		var endpoints = {};
		if (err) {
			console.log("error", err);
		}
		// set up our params so we can use a prepared statement with an IN clause
		var params1 = [];
		for (var i = 1; i <= Object.keys(companyIDs).length * 2; i++) {
			params1.push('$' + i);
		}
		var params2 = [];
		for (var i = Object.keys(companyIDs).length + 1; i <= Object.keys(companyIDs).length * 2; i++) {
			params2.push('$' + i);
		}
		var paramValues = Object.keys(companyIDs);
		paramValues = paramValues.concat(Object.keys(companyIDs));

		// do a union select from manta_contents_2 and manta_claims_published to find the data.  Some mids only exist in one or the other of the
		// tables.  If data exists in the manta_claims_published, that takes precedence, so order by that table with the sortby field and only
		// include the first result for a mid in our results that we pass back.  This isn't the greatest solution, but the thinking is that this
		// query will be replaced by a call to the "company service" once one exists.
		client.query({name:'select mids ' + Object.keys(companyIDs).length, text:'SELECT mid, name1 as company_name, city, stabrv as statebrv, zip5 as zip, phone as phones0_number, 0 as hide_address, \'b\' sortby FROM manta_contents_2 WHERE mid IN (' + params1.join(',') + ') UNION (SELECT  mid, company_name, city, statebrv, zip, phones0_number, hide_address, \'a\' sortby FROM manta_claims_published WHERE mid IN (' + params2.join(',') + ')) ORDER BY sortby', values: paramValues}, 
		function(err, results) {
			var deDupedRows = [];
			var ids = [];
			if (!err) {
				// need to remove the duplicate if the record exists in both tables
				results.rows.forEach(function(row) {
					if (ids.indexOf(row.mid) == -1) {
						deDupedRows.push(row);
						ids.push(row.mid);
					}
				});
			}
			callback(err, deDupedRows);
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

