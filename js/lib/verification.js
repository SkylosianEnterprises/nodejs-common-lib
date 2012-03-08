/**
 * Verification library to validate a set of rules against a data object
 *
 * THIS IS RUN IN THE BROWSER
 * DO NOT put any proprietary/sensitive code in here
 * DO NOT use trailing commas
 * DO NOT use any other advanced ECMAScript magic (no get/set, no proxies, limited Object properties interaction, etc)
 * DO Test it in IE
 */

var _defaultExpression = exports._defaultExpression = function(type){
	switch(type){
		case 'alpha':
			return /^[A-Za-z]+$/;
		case 'identifier':
			return /^[A-Za-z0-9\-]+$/;
		case 'alphanumeric':
			return /^[A-Za-z0-9\.\,]+$/;
		case 'numeric':
			return /^[0-9\.\s\,]+/;
		case 'email':
			return /^[A-Za-z0-9\+\._\-]+@[A-Za-z0-9\.\+]+\.[A-Za-z0-9\.]{2,4}$/;
		case 'name':
			return /^[A-Za-z0-9\'\s]+$/;
		case 'phone':
			return /^[0-9\s\-\+\(\)]{7,16}$/;
		default:
			return /.*/g;
	}
};

// TODO: Break all these out
var verify = exports.verify = function(data, rules, throwExceptions){
	var rtn = { error: false, errors: [], fields: {}, badFields: [] };
	var throwExceptions = typeof throwExceptions == 'undefined' ? false : (throwExceptions ? true : false); // Throws up individual exceptions instead of gathering them all into a big array

	var error = function(field, e){
		if(typeof field == 'object' && field.field){
			// No specified field name, try to derive it from the error
			e = field;
			field = e.field;
		}

		rtn.fields[field] = false; // Set the field to false
		rtn.errors.push(e); // Add the error to the list
		if(throwExceptions) throw e; // Optionally throw the error as an exception
	};

	// Iterate all the defined rules
	for(var i in rules){
		// i = field name
		var rule = rules[i]; // Field rule
		var values = data[i]; // Field value

		rtn.fields[i] = true; // Default to good status, then one-by-one check the rules and flip to false at any time

		// Munge the data into an array no matter what it is, to make it easier to work with
		if(rule.array && (!data[i] || typeof data[i] == 'undefined')){
			// If it should be an array but it doesn't exist, treat it as an empty array
			values = [];
		}else if(!rule.array){
			// If it's not an array, treat it like one anyway so we can just iterate over everything
			values = [ data[i] ];
		}else if(rule.array && !(data[i] instanceof Array)){
			// It should be an array but it's not
			error(i, { type: 'InvalidField', field: i, message: 'Field ' + i + ' was supposed to be an array but its not' });
			values = [];
		}

		// Special check for empty arrays which weren't defined -- if it was required we just need to make sure it had at least one element
		if( rule.array && ((data[i] instanceof Array && data[i].length == 0) || typeof data[i] == 'undefined') && rule.required ){
			error(i, { type: 'RequiredField', field: i, message: 'Required field ' + i + ' was ' + (value instanceof Array ? 'empty' : 'undefined') });
		}

		// Now that we have an array of values (even for fields with only a single value), iterate them and check everything out
		for(var v = 0; v < values.length; v++){
			var value = values[v];
			var fieldName = rule.array ? i + '[' + v + ']' : i;

			// Read the rules declaration and parse all the generic things we have to check for, one by one, and throw up exceptions (or collect them in an array) wherever there are problems
			// Exceptions should be in the form: { type: 'Type', field: fieldName, message: 'Something descriptive that explains what was wrong with the field' }
			if(typeof value == 'undefined' || value == null || (value instanceof Array && value.length == 0)){
				// No value, so let's see if it's required
				if(rule.required){
					error(i, { type: 'RequiredField', field: fieldName, message: 'Required field ' + i + ' was ' + (value instanceof Array ? 'empty' : 'undefined') });
				}
			}else{
				// See if the rule structure defines this field as a subdocument -- if so run just those rules against just this field and roll it all up
				if(rule.subdocument){
					var rpt = verify(value, rule.subdocument, throwExceptions);
					if(rpt.error){
						rtn.fields[i] = false; // Something in this field failed, so mark that
						// Sub-document had errors, roll the report up
						for(var f in rpt.fields){
							var n = i + (rule.array ? '[' + v + ']' : '') + '.' + f;
							rtn.fields[n] = rpt.fields[f];
						}
						for(var e in rpt.errors){
							// Update the references to include sub-document notation
							var n = i + (rule.array ? '[' + v + ']' : '');
							rpt.errors[e].field = n + '.' + rpt.errors[e].field;
							rpt.errors[e].message = n + ': ' + rpt.errors[e].message;
							error(rpt.errors[e].field, rpt.errors[e]);
						}
					}
				}

				// We have a value, apply any rules against it
				if(rule.type || rule.match || rule.tester || rule.instanceof || rule.enum || rule.maxlength || rule.minlength || rule.constructor){ // This should be a list of all the supported rule types

					// The value should be an instanceof
					if(rule.instanceof){
						if(!(value instanceof rule.instanceof)){
							var message = 'Field ' + fieldName + ' was not an instance of ' + (typeof rule.instanceof.nameOf == 'function' ? rule.instanceof.nameOf() : 'the required type');
							error(i, { type: 'InvalidInstance', field: fieldName, message: message });
						}
					}

					// Check the field's constructor
					if(rule.hasOwnProperty('constructor')){
						// The value should have a constructor of the given type
						if(!(value.constructor == Object.getOwnPropertyDescriptor(rule, 'constructor').value /* Reference to the actual constructor property, not Object */)){
							var message = 'Field ' + fieldName + ' was not constructed with ' + (typeof rule.constructor.nameOf == 'function' ? rule.constructor.nameOf() : 'the required constructor');
							error(i, { type: 'InvalidConstructor', field: fieldName, message: message });
						}
					}

					// Field length checks
					if(rule.minlength){
						// The value should be an instanceof
						if(value.length < rule.minlength){
							error(i, { type: 'ValueLengthBelowExpectation', field: fieldName, message: 'Field ' + i + ' had a value whose length did not meet the minimum requirement: ' + rule.minlength });
						}
					}
					if(rule.maxlength){
						// The value should be an instanceof
						if(value.length > rule.maxlength){
							error(i, { type: 'ValueLengthExceeded', field: fieldName, message: 'Field ' + i + ' had a value whose length exceeded: ' + rule.maxlength });
						}
					}

					// Only specific values allowed
					if(rule.enum){
						// The value should be one of the given values in the array
						if(!(rule.enum.indexOf(value) >= 0)){
							error(i, { type: 'InvalidValue', field: fieldName, message: 'Field ' + i + ' did not have a valid value' });
						}
					}

					// Custom tester functions
					if(rule.tester && typeof rule.tester == 'function'){ // Custom testing function
						var result = true;
						try {
							result = rule.tester(value, data, rules); // Pass the data and fields rules as context, in case some data relies on other fields
						} catch(e) {
							// Catch anything the tester threw up and aggregate it
							e = e.extend({field: fieldName});
							error(i, e);
						}
						if(!result){
							error(i, { type: 'TesterFailed', fieldName: fieldName, message: 'Field ' + i + ' was run against custom tester method, returned false' });
						}
					}

					if(rule.type || rule.match){ // Value matching, based on type or a direct regex
						var expression = _defaultExpression(rule.type); // Default based on data type
						if(rule.match) expression = rule.match; // Override the default if there's an explicit match rule
						if(!expression){
							throw { type: 'MissingExpression', message: 'There was no matching expression to test this type against' };
							continue;
						}

						// See if it matches the given expression
						if(!new String(value).match(expression)){ // Cast as a string to prevent comparison errors
							error(i, { type: 'MatchFailed', field: fieldName, message: 'Field ' + i + ', with given value "' + value + '" didnt match the following expression: ' + expression });
						}
					}

				}else{
					// We probably won't ever get here because it doesn't iterate the data, it iterates the rules and then pulls the data for that rule
					// Maybe we should still include the fields in the report?
				}
			}
		}
	}

	// Make a quick reference to tell if all the fields passed or not
	rtn.error = false;
	for(var i in rtn.fields){
		if(rtn.fields[i] == false){
			rtn.error = true;
			rtn.badFields.push(i); // Add the bad field to the list for another quick way of referencing
		}
	}

	return rtn;
};
