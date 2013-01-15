var async = require('async'); 
var providerSysTmpl = {
	cache: {},
	cfg: {},
	get: function(name, f) {
		var me = this;
		r = me.cache[name];
		if (r === undefined) {
			if (me.cfg[name]) {
				me.cfg[name].builder(me, function(err, v) {
					me.cache[name] = v;
					f(null, v);
				});
				return;
			}
		}
		f(null, r);
	},
	getMany: function(names, f) {
		var me = this;
		var parallels = {};
		for (var i = 0; i < names.length; i++) {
			parallels[names[i]] = function(name) {
				return function(cb) {
					me.get(name, cb);
				};
			}(names[i]);
		}
		async.parallel(parallels, f);
	}
};

var mkProvider = function(cfg) {
	var o = Object.create(providerSysTmpl);
	o.cfg = cfg;
	return o;
};

var middleware = function(cfg) {
	return function(req, res, next) {
		req.provider = mkProvider(cfg);
		req.provider.req = req;
		next();
	};
};

exports.mkProvider = mkProvider;
exports.middleware = middleware;
