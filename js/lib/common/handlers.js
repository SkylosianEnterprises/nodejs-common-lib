/**
 * Common routes that can be used for any service
 */

var fs = require('fs');

var manta_session = require('util/manta_session');
var manta_member = require('util/manta_member');
var bw = require('util/bad_words');

/**
 * Health monitor
 *
 * @param req httpRequest
 * @param res httpResponse
 * @param next Function
 */
var pulse = exports.pulse = function(req, res, next, testCollection){
	res._output_raw = 'test http response: ok\n';
	if(testCollection){
		res._output_raw += 'test db connection: ';
		try {
			testCollection.findOne({}, function(e, r){
				if(e){
					res._output_raw += 'fail [no connection]';
					flush(req, res);
				}else{
					if(r){
						res._output_raw += 'ok';
					}else{
						res._output_raw += 'fail [no results]';
					}
					flush(req, res);
				}
			});
		} catch(e) {
			res._output_raw += 'fail';
			flush(req, res);
		}
	}else{
		flush(req, res);
	}
};

/**
 * Prepare input (read attrs, unserialize dates, etc)
 *
 * @param req httpRequest
 * @param res httpResponse
 * @param next Function
 */
var prepareInput = exports.prepareInput = function(req, res, next){
	try {
		if(req.body) req.body = req.body.unserializeDates();
		if(req.query) req.query = req.query.unserializeDates();
		if(req.params) req.params = req.params.unserializeDates();
	} catch(e) {
		console.warn(e);
		req._output_struct = e.extend({'ok': false, 'error': true}, false);
		flush(req,res);
		return;
	}
	
	try {
		if (req.query.attrs) {
			req.attrs = JSON.parse(unescape(req.query.attrs));
			req.attrs.unserializeDates();
		}
	} catch(e) {
		console.warn(e);
	} finally {
		if (!req.attrs) {
			req.attrs = {};
		}
	}

	try {
		var newlines = function(v){
			if(typeof v == 'string') v = v.replace(/\r\n/g, '\n');
			return v;
		};

		if(req.attrs) Object.prototype.walk(req.attrs, newlines);
		Object.prototype.walk(req.body, newlines);
		Object.prototype.walk(req.query, newlines);
	} catch (e) {
		console.warn(e);
	}

	if (next) {
		next();
	}
};

/**
 * Flush the output and end the response
 *
 * @param req httpRequest
 * @param res httpResponse
 */
var flush = exports.flush = function(req, res){
	if(req._output_struct){
		// Legacy mode
		res._output = req._output_struct;
	}

	if(res._output){
		if(typeof res._output.serializeDates == 'function'){
			res._output.serializeDates(); // Make sure any dates are serialized before going out
		}
		res._output_raw = JSON.stringify(res._output);
	}

	if(!res._output_raw){
		res._output_raw = '';
		res.setHeader('Status', '500 Empty Response');
		res.end('');
		return;
	}

	var output = res._output_raw;
	var callback = req && req.query && (req.query.callback || req.query.jsonp_callback) ? req.query.callback || req.query.jsonp_callback : false;
	if(callback){
		// Wrap the data in a callback
		output = callback + "(" + output + ");";
	}

	// Set content type
	if(callback){
		res.setHeader('Content-Type', 'application/javascript');
	}else{
		res.setHeader('Content-Type', 'application/json');
	}

	try {
		res.end(output);
		return output;
	} catch(e) {
		console.warn(e);
		return e;
	}

	return false;
};

/**
 * Construct an ok response wrapper and flush it
 *
 * @param	req		httpRequest
 * @param	res		httpResponse
 * @param	extra	extra data to be extended onto the output
 */
var ok = exports.ok = function(req, res, data, extra){
	res._output = { ok: true };

	// Add data if there is any
	if(data){
		res._output.data = data;
	}

	// Extend the response with extra
	if(extra && typeof extra == 'object' && extra.constructor == Object){
		res._output.extend(extra, false); // Append any extra attributes on
	}

	// Flush it
	return flush(req, res);
};

/**
 * Construct an error response wrapper and flush it
 *
 * @param req httpRequest
 * @param res httpResponse
 */
var error = exports.error = function(req, res, err, extra){
	res._output = { ok: false, error: true };

	// Add err if there is any
	if(err){
		res._output.error = err;
	}

	// Extend the response with extra
	if(extra && typeof extra == 'object' && extra.constructor == Object){
		res._output.extend(extra, false); // Append any extra attributes on
	}

	// Flush it
	return flush(req, res);
};

/**
 * This request handler will populate the request with the user
 *
 * @param req httpRequest
 * @param res httpResponse
 * @param next Function
 */
var populateUser = exports.populateUser = function(req, res, next) {
	try {
		if(req.cookies && req.cookies.member_session){
			var cookie_string = req.cookies.member_session;
			var cookie = manta_session.thaw(cookie_string);
			if(!(cookie && cookie.data && cookie.data.member && cookie.data.member.sub_id)) {
				throw { type:'MemberSessionInvalidException', message:'The member session cookie is invalid' };
			}
			req.user = cookie.data.member;
			next();
		}
		else {
			throw { type:'MemberSessionUndefinedExcpetion', message:'The member session cookie is undefined' };
		}
	}
	catch(e) {
		error(req, res, e);
	}
};

/**
 * This request handler will populate the request with the user
 *
 * @param req httpRequest
 * @param res httpResponse
 * @param next Function
 */
var populateUserIfExists = exports.populateUserIfExists = function(req, res, next) {
	try {
		if(req.cookies && req.cookies.member_session){
			var cookie_string = req.cookies.member_session;
			var cookie = manta_session.thaw(cookie_string);
			if(!(cookie && cookie.data && cookie.data.member && cookie.data.member.sub_id)) {
				throw { type:'MemberSessionInvalidException', message:'The member session cookie is invalid' };
			}
			req.user = cookie.data.member;
		}
		next();
	}
	catch(e) {
		error(req, res, e);
	}
};

var spamCheck = exports.spamCheck = function(req, res, next){
	var input;
	if(req.rawBody){
		input = req.rawBody;
	}else if(req.query && req.query.value){
		input = req.query.value;
	}

	try {
		if(!input){
			throw { type: 'SpamCheckUndefined', message: 'You havent passed any text to be checked by the spam service' };
		}

		if(bw.hasBadWords(input)){
			throw { type: 'SpamCheckFail', message: 'This message contained content not allowed to be posted' };
		}
	}
	catch (e) {
		error(req, res, e);
		return;
	}

	ok(req, res);
};

// This is dirty but it'll work for everything
var wrapModule = function(name, data){
	var name = name.replace(/'/, "\\'");
	var output = "";
	output += "if(!window.lib) window.lib = {};\n";
	output += "window.lib['" + name + "'] = {};\n";
	output += "var require = function(lib){ if(window.lib[lib]){ return window.lib[lib]; }else{ alert('Missing lib: ' + lib); return false; } };\n";
	output += "(function(exports, require){\n";
	output += data;
	output += "\n})(window.lib['" + name + "'], require);";
	return output;
};

// For returning the source code for common libraries
// This is so we can have the aggregator on the frontend collect in backend JS files without us losing control over who gets to see what
var getLib = exports.getLib = function(req, res, next, raw){
	var raw = raw == true ? true : false;
	var allowed = [ 'core', 'verification', 'member-verifier' ]; // Probably move this elsewhere or something...
	if(req.ctx.lib && allowed.indexOf(req.ctx.lib) >= 0){
		// Resolve the library name
		var path = require.resolve(req.ctx.lib);
		fs.readFile(path, function(err, data){
			if(!err){
				// Wrap it in a helper function so we can use the exports system seamlessly
				var output;
				if(raw){
					output = data.toString();
				}else{
					output = wrapModule(req.ctx.lib, data.toString());
				}
				res.setHeader('Content-Type', 'application/javascript');
				res.end(output);
			}else{
				res.end(JSON.stringify(err));
			}
		});
	}else{
		res.writeHead('Status: 404 Not Found');
		res.end('');
	}
};

var exit = exports.exit = function(req, res, next){
	req._output_struct = {pid: process.pid}
	flush(req, res);
	process.exit();
};
