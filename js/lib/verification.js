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
var verify = exports.verify = function(data, rules, throwExceptions, path){
	var path = (typeof path == 'undefined') ? '' : path + '.'; // Just a nice reference to work with subdocuments
	var rtn = { error: false, errors: [], fields: {}, badFields: [] };
	var throwExceptions = typeof throwExceptions == 'undefined' ? false : (throwExceptions ? true : false); // Throws up individual exceptions instead of gathering them all into a big array

	var error = function(field, e){
		if(typeof field == 'object' && (field.field || field.path)){
			// No specified field name, try to derive it from the error
			e = field;
			field = e.path ? e.path : e.field;
		}

		rtn.fields[field] = false; // Set the field to false
		rtn.errors.push(e); // Add the error to the list
		if(throwExceptions) throw e; // Optionally throw the error as an exception
	};

	var extend = function(o, n){
		for(var i in n){
			o[i] = n[i];
		}
		return o;
	};

	// Iterate all the defined rules
	for(var i in rules){
		// i = field name
		var rule = rules[i]; // Field rule
		var values = data[i]; // Field value
		var fieldName = i;
		var fieldPath = path + fieldName;
		var e = { field: fieldName, path: fieldPath }; // Error stub

		// If this field is a value itself, create a status indicator
		if(!rule.array && !rule.subdocument){
			rtn.fields[fieldPath] = true; // Default to good status, then one-by-one check the rules and flip to false at any time
		}

		// Munge the data into an array no matter what it is, to make it easier to work with
		if(rule.array && (!data[i] || typeof data[i] == 'undefined')){
			// If it should be an array but it doesn't exist, treat it as an empty array
			values = [];
		}else if(!rule.array){
			// If it's not an array, treat it like one anyway so we can just iterate over everything
			values = [ data[i] ];
		}else if(rule.array && !(data[i] instanceof Array)){
			// It should be an array but it's not
			error(fieldPath, extend(e, { type: 'InvalidField', message: 'Field ' + fieldName + ' was supposed to be an array but its not' }));
			values = [];
		}

		// Special check for empty arrays which weren't defined -- if it was required we just need to make sure it had at least one element
		if( rule.array && ((data[i] instanceof Array && data[i].length == 0) || typeof data[i] == 'undefined') && rule.required ){
			error(fieldPath, extend(e, { type: 'RequiredField', message: 'Required field ' + fieldName + ' was ' + (value instanceof Array ? 'empty' : 'undefined') }));
		}

		// Check if the array size is greater or less than the maxcount / mincount respectively
		if(rule.array){
			if(rule.maxcount){
				if(values.length > rule.maxcount){
					error(fieldPath, extend(e, { type: 'MaxCountExceeded', message: 'The field ' + fieldName + ' had more elements (' + values.length + ') than are allowed for this collection (' + rule.maxcount + ')' }));
				}
			}
			if(rule.mincount){
				if(values.length < rule.mincount){
					error(fieldPath, extend(e, { type: 'MinCountNotMet', message: 'The field ' + fieldName + ' had fewer elements (' + values.length + ') than are required for this collection (' + rule.mincount + ')' }));
				}
			}
		}

		// Now that we have an array of values (even for fields with only a single value), iterate them and check everything out
		for(var v = 0; v < values.length; v++){
			var value = values[v];
			fieldName = rule.array ? i + '.' + v : i;
			fieldPath = path + fieldName;
			e = { field: fieldName, path: fieldPath }; // Error stub

			// Read the rules declaration and parse all the generic things we have to check for, one by one, and throw up exceptions (or collect them in an array) wherever there are problems
			// Exceptions should be in the form: { type: 'Type', field: fieldName, path: fieldPath, message: 'Something descriptive that explains what was wrong with the field' }
			// Or   extend(e, { type: 'Type', message: 'Friendly message' })   to derive the field and path parts automatically
			if(typeof value == 'undefined' || value == null || (value instanceof Array && value.length == 0)){
				// No value, so let's see if it's required
				if(rule.required){
					error(fieldPath, extend(e, { type: 'RequiredField', message: 'Required field ' + fieldName + ' was ' + (value instanceof Array ? 'empty' : 'undefined') }));
				}
				// Not required but it's supposed to be a subdocument
				if(!rule.required && rule.subdocument){
					error(fieldPath, extend(e, { type: 'InvalidSubdocument', message: 'Field ' + fieldName + ' was expected to be a subdocument but was undefined' }));
				}
			}else{
				// See if the rule structure defines this field as a subdocument -- if so run just those rules against just this field and roll it all up
				if(rule.subdocument){
					var rpt = verify(value, rule.subdocument, throwExceptions, fieldPath);
					if(rpt.error){
						// Sub-document had errors, roll the report up
						for(var f in rpt.fields){
							rtn.fields[f] = rpt.fields[f];
						}
						for(var e in rpt.errors){
							// Update the references to include sub-document notation
							rtn.errors.push(rpt.errors[e]);
						}
					}
				}

				// We have a value, apply any rules against it
				if(rule.type || rule.match || rule.tester || rule.instanceof || rule.enum || rule.maxlength || rule.minlength || rule.constructor){ // This should be a list of all the supported rule types

					// The value should be an instanceof
					if(rule.hasOwnProperty('instanceof')){
						var iof = Object.getOwnPropertyDescriptor(rule, 'instanceof').value;
						if(!(value instanceof iof)){
							var message = 'Field ' + fieldName + ' was not an instance of ' + (typeof iof.nameOf == 'function' ? iof.nameOf() : 'the required type');
							error(fieldPath, extend(e, { type: 'InvalidInstance', message: message }));
						}
					}

					// Check the field's constructor
					if(rule.hasOwnProperty('constructor')){
						// The value should have a constructor of the given type
						if(!(value.constructor == Object.getOwnPropertyDescriptor(rule, 'constructor').value /* Reference to the actual constructor property, not Object */)){
							var message = 'Field ' + fieldName + ' was not constructed with ' + (typeof rule.constructor.nameOf == 'function' ? rule.constructor.nameOf() : 'the required constructor');
							error(fieldPath, extend(e, { type: 'InvalidConstructor', message: message }));
						}
					}

					// Field length checks
					if(rule.minlength){
						// The value should be an instanceof
						if(value.length < rule.minlength){
							error(fieldPath, extend(e, { type: 'ValueLengthBelowExpectation', message: 'Field ' + i + ' had a value whose length did not meet the minimum requirement: ' + rule.minlength }));
						}
					}
					if(rule.maxlength){
						// The value should be an instanceof
						if(value.length > rule.maxlength){
							error(fieldPath, extend(e, { type: 'ValueLengthExceeded', message: 'Field ' + i + ' had a value whose length exceeded: ' + rule.maxlength }));
						}
					}

					// Only specific values allowed
					if(rule.enum){
						// The value should be one of the given values in the array
						if(!(rule.enum.indexOf(value) >= 0)){
							error(fieldPath, extend(e, { type: 'InvalidValue', message: 'Field ' + i + ' did not have a valid value' }));
						}
					}

					// Custom tester functions
					if(rule.tester && typeof rule.tester == 'function'){ // Custom testing function
						var result = true;
						try {
							result = rule.tester(value, data, rules); // Pass the data and fields rules as context, in case some data relies on other fields
						} catch(err) {
							// Catch anything the tester threw up and aggregate it
							err = extend(err, e);
							error(fieldPath, err);
						}
						if(!result){
							error(fieldPath, extend(e, { type: 'TesterFailed', message: 'Field ' + i + ' was run against custom tester method, returned false' }));
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
							error(fieldPath, extend(e, { type: 'MatchFailed', message: 'Field ' + i + ', with given value "' + value + '" didnt match the following expression: ' + expression }));
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
