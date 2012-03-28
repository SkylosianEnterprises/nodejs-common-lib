/**
 * Augment the basic javascript types with some helper methods
 */

if (!Object.prototype.isPlainObject) {
	/**
	 * Object.prototype.isObject(v)
	 *
	 * Checks if the variable is a plain object (as best as we can tell)
	 * This falls victim to a couple false positives:
	 *   Object.create(null) // Objects who have no prototype
	 *   { constructor: someval } // Objects who have a property called "constructor"
	 * Test: ['55', 55, 'asdf', new String('asdf'), parseInt('asdf', 10), new Number(234), null, undefined, [], new Date(), Date, function(){}, Object.create(null), {}, {a:5}].forEach(function(v){ console.log(Object.isPlainObject(v)); });
	 *
	 * @return	Bool
	 */
	Object.defineProperty(Object.prototype, "isPlainObject", {
		enumerable: false,
		value: function(v){
			return (v != null && v.constructor === Object);
		}
	});
}

if (!Object.prototype.extend) {
	/**
	 * extend
	 *
	 * This method will extend the object with the passed object
	 * 
	 * @param Object
	 */
	Object.defineProperty(Object.prototype, "extend", {
		enumerable: false,
		value: function(from, existingPropsOnly, copyDirectly) {
			var existingPropsOnly = existingPropsOnly == false ? false : true;
			var props = Object.getOwnPropertyNames(from);
			var dest = this;
			props.forEach(function(name) {
				if (!existingPropsOnly || name in dest) {
					var destination = Object.getOwnPropertyDescriptor(from, name);
					if(Object.isPlainObject(from[name]) && name != '_id'){
						// If the field is an object and it's not an _id, clone it
						var old = destination.value;
						destination.value = old.clone();
					}
					if(!copyDirectly){
						try {
							Object.defineProperty(dest, name, destination);
						} catch(e) {
							//we want to ignore some thangs	
						}
					}else{
						// We're dealing with a finnicky object, try just directly copying the field in
						dest[name] = destination.value;
					}
				}
			});
			return this;
		}
	});
}

if (!Object.prototype.clone) {
	/**
	 * clone
	 *
	 * Clones an object by calling {}.extend(this, false)
	 *
	 * @param	Object
	 */
	Object.defineProperty(Object.prototype, 'clone', {
		enumerable: false,
		value: function(){
			return {}.extend(this, false);
		}
	});
}

if (!Object.prototype.isEmpty) {
	/**
	 * Object.prototype.isEmpty()
	 *
	 * Checks if the object has any enumerable properties
	 *
	 * @return	Bool
	 */
	Object.defineProperty(Object.prototype, "isEmpty", {
		enumerable: false,
		value: function(){
			for(var i in this){
				if(this.hasOwnProperty(i)){
					return false;
				}
			}

			return true;
		}
	});
}

if (!Object.prototype.diff) {
	/**
	 * Object.prototype.diff(b)
	 *
	 * Diff the two objects ( a.diff(b) ) and return a third object where each field is the value from object b for only fields which differ
	 * Fields which exist in a and not in b will be returned as fieldname: undefined
	 *
	 * @return	Object
	 */
	Object.defineProperty(Object.prototype, "diff", {
		enumerable: false,
		value: function(b){
			var keys;
			var a = this;
			var diff = {};
			if(typeof a != typeof b){
				// Different types, don't even try to do deep comparison, just copy b to a
				return b;
			}

			// First find any fields in b which don't even exist in a and just copy them over
			keys = Object.keys(b);
			keys.remove('_id'); // Ignore _id fields
			for(var i = 0; i < keys.length; i++){
				var key = keys[i];
				if(!a.hasOwnProperty(key)){
					diff[key] = b[key];
				}
			}

			// Then compare all fields that exist in a and store fields which differ from b
			keys = Object.keys(a);
			keys.remove('_id'); // Ignore _id fields
			for(var i = 0; i < keys.length; i++){
				var key = keys[i];
				if(Object.isPlainObject(b[key])){
					// The field is an object
					if(b.hasOwnProperty(key)){
						// And it exists in b, diff them
						var d = a[key].diff(b[key]);
						if(d && (typeof d != 'object' || !d.isEmpty())){
							diff[key] = d;
						}
					}else{
						// It only exists in a, so we want to delete it in b
						diff[key] = undefined;
					}
				}else if(b[key] instanceof Array){
					// The field is an array
					//TODO: Maybe some complex merging here? For now just copy it over
					if(b[key].length > 0 || !(b[key] instanceof Array)){
						diff[key] = b[key];
					}
				}else{
					// The field is just a regular field
					if(b[key] != a[key]){
						diff[key] = b[key];
					}
				}
			}

			return diff;
		}
	});
}


if (!Object.prototype.serializeDates) {
	/**
	 * Object.prototype.serializeDates()
	 *
	 * Recursively serialize all the object fields of type Date into the format:
	 * { '$date': 999999999999999 }
	 * Given that 999999999999999 is a unix timestamp in milliseconds since the epoch (NOT seconds!)
	 *
	 * @return	Object
	 */
	Object.defineProperty(Object.prototype, "serializeDates", {
		enumerable: false,
		value: function(level){
			var level = level > 0 ? level : 1; // Recursion level, for reference and preventing infinite recursion
			if(level > 10){
				// This probably means you passed a circular reference, but rather than allow node to crash itself we should just stop trying
				throw { message: 'Too much recursion in serializeDates, perhaps you passed a circular reference?', type: 'TooMuchRecursionException' };
				return false;
			}

			var o = this;
			if(o instanceof Date){
				o = {'$date': o.getTime()};
			}else if(o instanceof Array){
				o.forEach(function(i){ i.serializeDates(level + 1); });
			}else if(typeof o == 'object'){
				for(var k in o){
					if(o[k] != null && typeof o[k] == 'object' && o[k] instanceof Date){
						var time = o[k].getTime();
						o[k] = {'$date': time};
					}else if(o[k] != null && typeof o[k] == 'object' && !(o[k] instanceof Array)){
						o[k].serializeDates(level + 1);
					}else if(o[k] instanceof Array){
						// In the case of an array of dates
						o[k].forEach(function(v, i, o){
							if(v instanceof Date){
								o[i] = {'$date': v.getTime()};
							}else if(Object.isPlainObject(v)){
								o[i].serializeDates(level + 1);
							}
						});
					}
				}
			}
		}
	});
}

if (!Object.prototype.unserializeDates) {
	/**
	 * Object.prototype.unserializeDates()
	 *
	 * Recursively unserialize all the object fields from the following format into Date:
	 * { '$date': 999999999999999 }
	 * Given that 999999999999999 is a unix timestamp in milliseconds since the epoch (NOT seconds!)
	 *
	 * @return	Object
	 */
	Object.defineProperty(Object.prototype, "unserializeDates", {
		enumerable: false,
		value: function(level){
			var level = level > 0 ? level : 1; // Recursion level, for reference and preventing infinite recursion
			if(level > 10){
				// This probably means you passed a circular reference, but rather than allow node to crash itself we should just stop trying
				throw { message: 'Too much recursion in unserializeDates, perhaps you passed a circular reference?', type: 'TooMuchRecursionException' };
				return false;
			}

			var o = this;
			if(Object.isPlainObject(o) && o['$date'] && parseInt(o['$date'], 10) > 0){
				// It's a serialized date
				o = new Date(o['$date']);
			}else if(o instanceof Array){
				// It's an array, unserialize every item inside it
				o.forEach(function(i){ i.unserializeDates(level + 1); });
			}else if(Object.isPlainObject(o)){
				// It's an iterable hash
				for(var k in o){
					if(Object.isPlainObject(o[k]) && o[k]['$date'] && !isNaN(parseInt(o[k]['$date'], 10)) ){
						var date = new Date(parseInt(o[k]['$date'], 10));
						o[k] = date;
					}else if(Object.isPlainObject(o[k]) && !(o[k] instanceof Array)){
						o[k].unserializeDates(level + 1);
					}else if(o[k] instanceof Array){
						// In the case of an array of dates
						o[k].forEach(function(v, i, o){ if(Object.isPlainObject(v) && v['$date'] && !isNaN(parseInt(v['$date'], 10)) ){ o[i] = new Date(v['$date']); } } );
					}
				}
			}
		}
	});
}

if (!Object.prototype.flatten) {
	/**
	 * Object.prototype.flatten()
	 *
	 * Recursively serialize all the object fields of type Date into the format:
	 *	{ 'name.first': 'Nate',
	 *	  'name.last': 'Romano',
	 *	  'success.0.first': 'Yes',
     *	  'success.1': 'second',
	 *	  'success.2': 1,
	 *	  test: [Function] }
	 *
	 * @return	Object
	 */
	Object.defineProperty(Object.prototype, "flatten", {
		enumerable: false,
		value: function(){
			var kv, name;
			kv = {};
			name = [];
			function step(obj) {
				var i, k, v, t;
				for (k in obj) {
					name.push(k);
					v = obj[k];
					t = typeof v;
					if (t === 'array') {
						// It's an array, iterate the results and recurse for each
						for(i=0; i<v.length; i++) {
							name.push(i);
							step(v);
							name.pop();
						}
					}
					else if (t === 'object' && v != null) {
						if (Object.isPlainObject(v)) {
							// Check if the object contains a $command key
							var command = false;
							for(var j in v){
								if(j && j.match(/^\$/)){
									command = j;
								}
							}
							if(command){
								// It does
								kv[name.join('.')] = v;
							}else{
								// No command, just recurse
								step(v);
							}
						}
						else {
							// Non-iterable object, just copy it directly
							kv[name.join('.')] = v;
						}
					}
					else {
						// Non-iterable, just copy the value
						kv[name.join('.')] = v;
					}
					name.pop();
				}
			}
			step(this);
			return kv;
		}
	});
}

if (!Object.prototype.nameOf) {
	/**
	 * Object.prototype.nameOf()
	 *
	 * Guess the name of an Object
	 *
	 * @return	String
	 */
	Object.defineProperty(Object.prototype, "nameOf", {
		enumerable: false,
		value: function(){
			return "".concat(this).replace(/^.*function\s+([^\s]*|[^\(]*)\([^\x00]+$/, "$1") || "anonymous";
		}
	});
}

if (!String.prototype.trim) {
	/**
	 * String.prototype.trim()
	 *
	 * Trims the string of whitespace on either end
	 *
	 * @return String
	 */
	Object.defineProperty(String.prototype, "trim", {
		enumerable: false,
		value: function() {
			return this.replace(/^\s*/,'').replace(/\s*^/, '').replace(/\r\n/,'');
		}
	});
}

if (!String.prototype.quote) {
	/**
	 * String.prototype.quote(delim)
	 *
	 * Quotes the string with delim (default double quote) (and escapes instances of delim inside of string with \)
	 *
	 * @return String
	 */
	Object.defineProperty(String.prototype, "quote", {
		enumerable: false,
		value: function(delim, escaper) {
			var delim = typeof delim == 'string' ? delim : '"'; // Default: double quote
			var escaper = typeof escaper == 'string' ? escaper : "\\"; // Default: single backslash

			return delim + this.replace(new RegExp(delim, 'g'), escaper + delim) + delim;
		}
	});
}

if (!Array.prototype.has) {
	/**
	 * Array.prototype.has(o)
	 *
	 * Determines if we have the passed object or not
	 *
	 * @return Boolean
	 */
	Object.defineProperty(Array.prototype, "has", {
		enumerable: false,
		value: function(o) {
			return this.indexOf(o) > -1;
		}
	});
}

if (!Array.prototype.without) {
	/**
	 * Array.prototype.without(o)
	 *
	 * Returns an Array without the object
	 */
	Object.defineProperty(Array.prototype, "without", {
		enumerable: false,
		value: function(o) {
			var index = this.indexOf(o);
			if (index < 0) {
				return this.slice(0);
			}
			var without = this.slice(0);
			without.splice(index,1);
			return without;
		}
	});
}

if (!Array.prototype.remove) {
	/**
	 * Array.prototype.remove(o)
	 *
	 * Removes an item
	 *
	 * @return Boolean
	 */
	Object.defineProperty(Array.prototype, "remove", {
		enumerable: false,
		value: function(o) {
			var index = this.indexOf(o);
			if (index > -1 ) {
				this.splice(index, 1);
			}
		}
	});
}

if (!Array.prototype.add) {
	/**
	 * Array.prototype.add(o)
	 *
	 * Adds an item if it does not exist
	 *
	 * @return Boolean
	 */
	Object.defineProperty(Array.prototype, "add", {
		enumerable: false,
		value: function(o) {
			var index = this.indexOf(o);
			if (index < 0) {
				this.push(o);
			}
		}
	});
}

// Walk over objects
if (!Object.prototype.walk) {
	Object.defineProperty(Object.prototype, 'walk', {
		enumerable: false,
		value: function(o, fn) { // Recursively apply the given function to non-iterable items (iterating automatically over those which can be iterated)
			for (var p in o){
				if (o.hasOwnProperty(p)){
					if (Array.isArray(o[p]) || Object.isPlainObject(o[p])){
						// It's a normal array or object, iterate it
						walk(o[p], fn);
					}else{
						// Otherwise we have no idea what it is, just run the method on it directly and store the returned result in place
						o[p] = fn(o[p], p, o);
					}
				}
			}
		}
	});
}

// Return a list of iterable keys for a given Object
if (!Object.prototype.keys) {
	(function () {
		var hasOwnProperty = Object.prototype.hasOwnProperty,
			hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
			dontEnums = [
				'toString',
				'toLocaleString',
				'valueOf',
				'hasOwnProperty',
				'isPrototypeOf',
				'propertyIsEnumerable',
				'constructor'
			],
			dontEnumsLength = dontEnums.length;
			Object.defineProperty(Object.prototype, 'keys', {
				enumerable: false,
				value: function(obj){
					if(typeof obj !== 'object' && typeof obj !== 'function' || obj === null) throw new TypeError('Object.keys called on non-object')

					var result = [];

					for(var prop in obj){
						if(hasOwnProperty.call(obj, prop)) result.push(prop);
					}

					if(hasDontEnumBug){
						for(var i=0; i < dontEnumsLength; i++){
							if(hasOwnProperty.call(obj, dontEnums[i])) result.push(dontEnums[i]);
						}
					}
					return result;
				}
			});
	})();
};

/**
 * Copyright (c) 2011 Manta Media, Inc.
 *
 * All Rights Reserved.  Unauthorized reproduction, transmission, or
 * distribution of this software is a violation of applicable laws.
 */
