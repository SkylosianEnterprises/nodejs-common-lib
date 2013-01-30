var crypto = require('crypto');

var _secretKey = 'fu2u3@*s@I*Ig834TJJGS238*%@asdjflkasjdfAWIUHG23176wj2384htg@#$R%';
var _salt = 'Brisket swine drumstick cow corned beef bacon. Tail spare ribs venison, brisket pork ham hock andouille meatball pork belly';

// Hash password with the user id
exports.hashPassword = function(password, userId){
	var data = password + '&' + _salt + '&' + userId; // Form a standard salted password string
	var hmac = crypto.createHmac('sha1', _secretKey);
	var hash = hmac.update(data); // hmac_sha1 the salted password string
	var digest = hmac.digest(encoding="hex"); // Return hex representation
	return digest;
}

// Encrypt/decrypt manta Sub IDs
exports.decrypt_subid = function(input){
	return _remap_base(input, 'utv9rc7f2j35pqzmlgd8nswxhk1by046', 'XMT0123456789');
};

exports.encrypt_subid = function(input){
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

