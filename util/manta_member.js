var crypto = require('crypto');
var request = require('request');
var url = require('url');
var Q = require("q");
var async = require("async");

var configDefer = Q.defer();
var getConfig = configDefer.promise;

var _secretKey = 'fu2u3@*s@I*Ig834TJJGS238*%@asdjflkasjdfAWIUHG23176wj2384htg@#$R%';
var _salt = 'Brisket swine drumstick cow corned beef bacon. Tail spare ribs venison, brisket pork ham hock andouille meatball pork belly';

var MantaMemberUtil = function (configdata) {
	console.log("MEMBERUTIL CONSTRUCTOR", configdata);
	configDefer.resolve(configdata);
}
MantaMemberUtil.prototype = {};

// set configuration data
MantaMemberUtil.setConfigData = function (configdata) {
	configDefer.resolve(configdata);
}

MantaMemberUtil.testMemberServiceConnectivity = MantaMemberUtil.prototype.testMemberServiceConnectivity = function(cb) {
	var that = this;
	getConfig.then(function(config) {
		request(config.memberServiceBaseUrl+'/health-check' , function(err, response, body) {
			if (err) {
				cb({error :"Error connecting to Member Service at " + url.parse(config.memberServiceBaseUrl).host, details: err });
			} else {
				cb(null);	
			}
		} );
	} );
}

// get member data for the specified list of IDs
MantaMemberUtil.getMemberDetails = MantaMemberUtil.prototype.getMemberDetails = function (memberIDs, callback) {
	// member service caps us out at 500 per request, so split the calls up if need be
	var memberIDsArr = Object.keys(memberIDs);
	var numRemainingMemberIDs = memberIDsArr.length;
	var memberURLChunks = [];
	var lastIndex = 0;
	var memberData = [];

	getConfig.then( function ( config ) {
		var memberURL = config.memberServiceQueryURL;

		while (numRemainingMemberIDs > 0) {
			if (numRemainingMemberIDs > 500) {
				memberURLChunks.push(memberURL + JSON.stringify({"_id":{"$in": memberIDsArr.slice(lastIndex, lastIndex + 500) }}));
				lastIndex += 500;
				numRemainingMemberIDs -= 500;
			} else {
				memberURLChunks.push(memberURL + JSON.stringify({"_id":{"$in": memberIDsArr.slice(lastIndex) }}));
				numRemainingMemberIDs = 0;
			}
		}

		async.each(memberURLChunks, 
			function (myURL, cb) {
				request( myURL, function(error, response, body) {
					if (error) return cb(error);
					try {
						var memberDataObj = JSON.parse(body);
					}
					catch (e) { cb(e) }
					console.log("getMemberDetails getting data for memberIDs of size: ", memberDataObj.data.length);
					memberData = memberData.concat(memberDataObj.data);
					cb(null);
				});
			}
		, function(err) {
			console.log("all have finished and memberData is now of size", memberData.length);
			callback(err, memberData);
		});

	});
};

// Hash password with the user id
MantaMemberUtil.hashPassword = MantaMemberUtil.prototype.hashPassword = function(password, userId){
	var data = password + '&' + _salt + '&' + userId; // Form a standard salted password string
	var hmac = crypto.createHmac('sha1', _secretKey);
	var hash = hmac.update(data); // hmac_sha1 the salted password string
	var digest = hmac.digest(encoding="hex"); // Return hex representation
	return digest;
}

// Encrypt/decrypt manta Sub IDs
MantaMemberUtil.decrypt_subid = MantaMemberUtil.prototype.decrypt_subid = function(input){
        if (subId.indexOf("MT") != 0) return subId;
        if (subId.indexOf("_") != subId.length-1){
            subId = subId.substring(0, subId.length-1);
            return subId;
        }
	var dsid = _remap_base(input, 'utv9rc7f2j35pqzmlgd8nswxhk1by046', 'XMT0123456789');
        // if decrypted subId doesn't match "MT" then return the original subId;
        if(dsid.indexOf("MT") != 0) return subId;
	return dsid;
};

MantaMemberUtil.encrypt_subid = MantaMemberUtil.prototype.encrypt_subid = function(input){
	if (input.indexOf('MT') != 0) {
		return input;
	}
	return _remap_base(input, 'XMT0123456789', 'utv9rc7f2j35pqzmlgd8nswxhk1by046');
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

module.exports = MantaMemberUtil;
