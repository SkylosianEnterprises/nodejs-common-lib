// member model
// special methods to operate on a member

var memberUpdateTsKeys = ['last_update_timestamp'];
var memberAddTsKeys = ['register_timestamp'];
var memberLcTsKeys = ['lastname', 'firstname', 'email'];

var setUpdateTimeValues = exports.setUpdateTimeValues = function (data) { 	memberUpdateTsKeys.forEach(function(v, i, a) {
		data[v] = new Date();
	});
	return data;
};

var setLcValues = exports.setLcValues = function (data) {
	memberLcTsKeys.forEach(function(v, i, a) {
		if(data[v]){
			data[v + '_lc'] = data[v].toLowerCase();
		}
	});
	return data;
};

var setAddTimeValues = exports.setAddTimeValues = function (data) {
	memberAddTsKeys.forEach(function(v, i, a) {
		data[v] = new Date();
	});
	return data;
};

var setLcValues = exports.setLcValues = function (data) {
	memberLcTsKeys.forEach(function(v, i, a) {
		if(data[v]){
			data[v + '_lc'] = data[v].toLowerCase();
		}
	});
	return data;
};

var buildUpdate = exports.buildUpdate = function (data) {
	// Build the update query
	return { '$set': setLcValues(setUpdateTimeValues(data)) };
};

var buildAdd = exports.buildAdd = function (data) {
	// Build the update query
	var ip = member.register_ip || '0.0.0.0';
	data._id = mkid(ip);

	return setLcValues(setAddTimeValues(setUpdateTimeValues(data)));
};








