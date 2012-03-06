/**
 * Verification library to validate a set of rules against a data object
 *
 * THIS IS RUN IN THE BROWSER
 * Do not put any proprietary/sensitive code in here
 * Do not use trailing commas
 * Do not use any other ECMAScript 5 syntax
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
			return /^[A-Za-z0-9\+\._\-]@[A-Za-z0-9\.\+]\.[A-Za-z0-9\.]{2,4}$/;
		case 'name':
			return /^[A-Za-z0-9\'\s]+$/;
		case 'phone':
			return /^[0-9\s\-\+\(\)]+$/;
		default:
			return /.*/g;
	}
};

var verify = exports.verify = function(data, rules, throwExceptions){
	var rtn = { error: false, errors: [], fields: {}, badFields: [] };
	var throwExceptions = typeof throwExceptions == 'undefined' ? false : (throwExceptions ? true : false); // Throws up individual exceptions instead of gathering them all into a big array

	// Iterate all the defined rules
	for(var i in rules){
		// i = field name
		var rule = rules[i]; // Field rule
		var values = data[i]; // Field value

		// Munge the data into an array no matter what it is, to make it easier to work with
		if(rule.array && (!data[i] || typeof data[i] == 'undefined')){
			// If it should be an array but it doesn't exist, treat it as an empty array
			values = [];
		}else if(!rule.array){
			// If it's not an array, treat it like one anyway so we can just iterate over everything
			values = [ data[i] ];
		}else if(rule.array && !(data[i] instanceof Array)){
			// It should be an array but it's not
			var e = { type: 'InvalidField', field: i, message: 'Field ' + i + ' was supposed to be an array but its not' };
			if(throwExceptions) throw e;
			rtn.errors.push(e);
			values = [];
		}

		rtn.fields[i] = true; // Default to good status, then one-by-one check the rules and flip to false at any time

		// Special check for empty arrays which weren't defined -- if it was required we just need to make sure it had at least one element
		if( rule.array && ((data[i] instanceof Array && data[i].length == 0) || typeof data[i] == 'undefined') && rule.required ){
			rtn.fields[i] = false;
			var e = { type: 'RequiredField', field: i, message: 'Required field ' + i + ' was ' + (value instanceof Array ? 'empty' : 'undefined') };
			rtn.errors.push(e);
			if(throwExceptions) throw e;
		}

		// Now that we have an array of values (even for fields with only a single value), iterate them and check everything out
		for(var v = 0; v < values.length; v++){
			var value = values[v];
			var fieldName = rule.array ? i + '[' + v + ']' : i;

			// Read the rules declaration and parse all the generic things we have to check for, one by one, and throw up exceptions (or collect them in an array) wherever there are problems
			// Exceptions should be in the form: { type: 'Type', field: i, message: 'Something descriptive that explains what was wrong with the field' }
			if(typeof value == 'undefined' || value == null || (value instanceof Array && value.length == 0)){
				// No value, so let's see if it's required
				if(rule.required){
					rtn.fields[i] = false;
					var e = { type: 'RequiredField', field: fieldName, message: 'Required field ' + i + ' was ' + (value instanceof Array ? 'empty' : 'undefined') };
					rtn.errors.push(e);
					if(throwExceptions) throw e;
				}
			}else{
				// We have a value, apply any rules against it
				if(rule.type || rule.match || rule.tester || rule.instanceof || rule.enum || rule.maxlength || rule.minlength){ // This should be a list of all the supported rule types

					if(rule.instanceof || rule.instancesof){
						// The value should be an instanceof
						if(!(value instanceof rule.instanceof)){
							rtn.fields[i] = false;
							var message = 'Field ' + fieldName + ' was not an instance of ' + (typeof rule.instanceof.nameOf == 'function' ? rule.instanceof.nameOf() : 'the required type');
							var e = { type: 'InvalidInstance', field: fieldName, message: message };
							rtn.errors.push(e);
							if(throwExceptions) throw e;
						}
					}

					// Field length checks
					if(rule.minlength){
						// The value should be an instanceof
						if(value.length < rule.minlength){
							rtn.fields[i] = false;
							var e = { type: 'ValueLengthBelowExpectation', field: fieldName, message: 'Field ' + i + ' had a value whose length did not meet the minimum requirement: ' + rule.minlength };
							rtn.errors.push(e);
							if(throwExceptions) throw e;
						}
					}
					if(rule.maxlength){
						// The value should be an instanceof
						if(value.length > rule.maxlength){
							rtn.fields[i] = false;
							var e = { type: 'ValueLengthExceeded', field: fieldName, message: 'Field ' + i + ' had a value whose length exceeded: ' + rule.maxlength };
							rtn.errors.push(e);
							if(throwExceptions) throw e;
						}
					}

					// Only specific values allowed
					if(rule.enum){
						// The value should be one of the given values in the array
						if(!(rule.enum.indexOf(value) >= 0)){
							rtn.fields[i] = false;
							var e = { type: 'InvalidValue', field: fieldName, message: 'Field ' + i + ' did not have a valid value' };
							rtn.errors.push(e);
							if(throwExceptions) throw e;
						}
					}

					// Custom tester functions
					if(rule.tester && typeof rule.tester == 'function'){ // Custom testing function
						var result = true;
						try {
							result = rule.tester(value, data, rules); // Pass the data and fields rules as context, in case some data relies on other fields
						} catch(e) {
							e = e.extend({field: i});
							// Catch anything the tester threw up and aggregate it
							rtn.fields[i] = false;
							rtn.errors.push(e);
							if(throwExceptions) throw e;
						}
						if(!result){
							rtn.fields[i] = false;
							var e = { type: 'TesterFailed', fieldName: fieldName, message: 'Field ' + i + ' was run against custom tester method, returned false' };
							rtn.errors.push(e);
							if(throwExceptions) throw e;
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
							rtn.fields[i] = false;
							var e = { type: 'MatchFailed', field: fieldName, message: 'Field ' + i + ', with given value "' + value + '" didnt match the following expression: ' + expression };
							rtn.errors.push(e);
							if(throwExceptions) throw e;
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
