var crypto = require('crypto');
var querystring = require('querystring');

var _key_text = "iamthekeyqwertyu";
var _debug = false; // true for debugging messages

/**
 * manta_session.decrypt	Decrypt a base64-compliant string encrypted by Manta::Cipher::Cookie->encrypt
 *
 * @param	input	base64	Base64 encoded string representing: base64(IV) . '&' . base64(ciphertext)
 * @return	string			Decrypted text, or false for failure
 */
exports.decrypt = function(input){
	var input_b64 = input;

	var input_buffer = new Buffer(input_b64, 'base64'); // Read it into a buffer
	if (_debug) console.log('Decrypting packet: ' + input_buffer.toString());

	// Extract the IV
	var andLocation = input_buffer.toString().indexOf('&'); // Find the &
	var iv = new Buffer(input_buffer.slice(0, andLocation).toString('ascii'), 'base64'); // Read the ascii-encoded base64 string in, cutting out the IV
	var binaryIv = iv.toString('binary');

	// Extract the real ciphertext
	var ciphertext = new Buffer(input_buffer.slice(andLocation + 1).toString('ascii'), 'base64');

	// Prepare the crypto module, given the normal key, and the extracted iv in binary
	var d = crypto.createDecipheriv('aes-128-cbc', _key_text, binaryIv);

	var decrypted = d.update(ciphertext.toString('binary'), 'binary');
	var d_final = d.final();
	if((!decrypted || decrypted.length == 0) && d_final.length == 0){
		if (_debug) console.log('Decryption failed');
		return false;
	}
	decrypted += d_final;
	if (_debug) console.log('Decrypted: ' + decrypted);

	return decrypted;
}

/**
 * manta_session.thaw		Thaws a cookie value (de-obfuscation, then decryption, then JSON parsing)
 *
 * @param	input	string	The cookie value, exactly as-is, URL-encoded and run through the base64-chars obfuscation
 * @return	string			The thawed cookie structure
 */
exports.thaw = function(input){
	if (_debug) console.log('Thawing: ' + input);

	// Undo urlencoding
	var session = querystring.unescape(input);

	// Undo obfuscation
	var base64crypt = session.replace('%5B', '[')
		.replace(/%5D/g, ']')
		.replace(/\[P\]/g, '+')
		.replace(/\[S\]/g, '/')
		.replace(/\[E\]/g, '=');
	
	base64crypt = base64crypt.replace(/^V2=/,'');

	// Decrypt
	var plaintext = this.decrypt(base64crypt);
	if(!plaintext){
		return false;
	}

	// Parse JSON
	try {
		var o = JSON.parse(plaintext);
	} catch (e) {
		if (_debug) console.dir(e.message);
		return false;
	}

	return o;
};
