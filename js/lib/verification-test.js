var verification = require('./verification');

var data = {date: new Date(), pirates:'schfifty five', email: '@b.as', name: undefined, phone: '1-888-858-7777', test: 'test', fail: 'ff'};

var fields = {
				date:	{ required: 1, instanceof: Date },
				email:	{ type: 'email', required: 1 },
				name:	{ type: 'name' },
				phone:	{ match: /^[0-9\-\s\(\)]+$/, required: 1 }, // Custom match rule. Note the ^ and $
				test:	{ tester: function(i){ if(i=='test') return true; } }, // Custom tester method
				test2:	{ tester: function(a, data, fields){console.dir([data, fields]); return true;} }, // Dump the extra context passed to tester methods
				fail:	{ type: 'tacos', required: 1 } // Invalid types will simply return /.*/g for the match pattern
			};

try {
	var status = verification.verify(data, fields, true);
} catch (e) {
	console.log(e);
} finally {
	if(!status || typeof status == 'undefined'){
		status = {status: 0};
	}
}
console.dir(status);
