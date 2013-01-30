
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

exports.encrypt_subid = function(input){
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

