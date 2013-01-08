//var verification = require('./verification');
//
//var data = {
//	date: new Date(),
//	pirates: 'schfifty five',
//	email: 'tt@b.as',
//	name: undefined,
//	phone: '1-888-858-7777',
//	test: 'test',
//	fail: 'ff',
//	group: [ new Date(), {type: 'aa'}, {a: 55} ],
////	group: [{}, []],
//	single: { type: { id: 55 } },
//	bool: true,
//	nested: { a: { b: true } },
//	blank: undefined,
//	req: 'derp',
//};
//
//var fields = {
//				date:	{ required: 1, instanceof: Date }, // check if: date instanceof Date
//				email:	{ type: 'email', required: 1 },
//				name:	{ type: 'name' },
//				phone:	{ match: /^[0-9\-\s\(\)]+$/, required: 1 }, // Custom match rule. Note the ^ and $
//				test:	{ tester: function(i){ if(i=='test') return true; throw { type: 'Derp' }; } }, // Custom tester method, exceptions are caught and bundled in
//				test2:	{ tester: function(a, data, fields){console.dir([data, fields]); return true;} }, // Dump the extra context passed to tester methods
//				fail:	{ type: 'tacos', required: true }, // Invalid types will simply return /.*/g for the match pattern and always return true
//				group:	{ array: true, required: true, subdocument: { type: { required: true } } }, // array: true treats the field as an array of values but otherwise each value is evaluated exactly as if it weren't an array item
//				single:	{ subdocument: {
//								type: {
//									required: true,
//									subdocument: {
//										id: { required: true, match: /^[A-Za-z0-9\s]+$/ }
//									}
//								}
//							}
//						},
//				bool:	{ constructor: Boolean }, // check if: bool.constructor == Boolean
//				nested:	{ subdocument: { a: { required: true, subdocument: { b: { required: true, subdocument: {  } } } } } },
//				blank:	{ notblank: true },
//				req:    { requires: 'name' },
//			};
//
//console.dir(data);
//try {
//	var status = verification.verify(data, fields, false, 'a.b' /* fake context for all the variables to live inside*/);
//} catch (e) {
//	console.log(e);
//	console.log(e.stack);
//} finally {
//	if(!status || typeof status == 'undefined'){
//		status = {status: 0};
//	}
//}
//console.dir(status);
