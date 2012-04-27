/**
 * Augment the basic javascript types with some helper methods
 */

var dumbBrowser = false;
if (Object.defineProperty) {
	try {
		// This disgraceful piece of nonsense is to see if we're in the wonderful world of IE8, Object.defineProperty throws an error on non-DOM elements (WTF.)
		Object.defineProperty(Array.prototype, '_z', { value: function(){} });
	}
	catch (e) {
		dumbBrowser = true;
	}
	finally {
		if(Array.prototype._z) delete Array.prototype._z; // Undo our test
	}
}else{
	dumbBrowser = true;
}

var fakePrototype = function(proto){
	var prototype;
	if(!dumbBrowser && typeof console.log == 'function') console.log('You probably shouldnt call fakePrototype in a smart browser');
	switch(proto){
		case Object.prototype:
		case Object:
			return Object;
		case Array.prototype:
		case Array:
			return Array;
		case String.prototype:
		case String:
			return String;
		case Number.prototype:
		case Number:
			return Number;
		case Boolean.prototype:
		case Boolean:
			return Boolean;
		default:
			return proto;
	}
}

var defineProperty;
if(dumbBrowser){
	// We're in a dumb browser that doesn't have a decent Object.defineProperty
	// Make a fake one (beware: these prototype methods are enumerated whenever you iterate your objects)
	// Also don't even try to build anything that uses any special Object property descriptor syntax (only inject if !dumbBrowser)

	defineProperty = function(obj, prop, desc){
		// So what we do here is fetch the value of the property which they were hoping to set, via desc.value
		// Then we use fakePrototype to see if we're attaching to the Object.prototype (or other basic prototype),
		//   and if so, attach it directly to the Object method itself
		// This is because IE doesn't support non-enumerable properties, so enumerable methods pollute other libraries,
		//   which expect to iterate over objects and arrays and only receive the values contained
		var prototype = fakePrototype(obj);
		prototype[prop] = desc.value;
	};
}else{
	// For everything else, we _do_ want our methods on the prototype, except portable code which runs in both cases needs to be able to work
	// So what we do is wrap normal Object.defineProperty behavior by also adding a quick reference onto the class method itself
	// So:  Object.defineProperty(String.prototype, 'foo', {enumerable:false,value:'bar'})
	//  would add a reference to String.foo, which you would use with .call to pass the correct object context
	//  and it would safely resolve to the correct function in all environments, while retaining the prototype method in smarter environments
	defineProperty = function(obj, prop, desc){
		// Create a reference to the prototype method on the class method, so we can do String.reverse.call() and use that same code in IE
		var c = false;
		switch(obj){
			case Array.prototype:
				c = Array; break;
			case Object.prototype:
				c = Object; break;
			case String.prototype:
				c = String; break;
			case Number.prototype:
				c = Number; break;
			case Boolean.prototype:
				c = Boolean; break;
		}

		if(c){
			// Dealing with a basic type, let's add a reference
			Object.defineProperty(c, prop, desc);
		}

		var myReturn = Object.defineProperty(obj, prop, desc);
	};
}

if (!Array.prototype.forEach) {
	// Emulate forEach
	defineProperty(Array.prototype, "forEach", {
		enumerable: false,
		value: function(f){
			for(var i = 0; i < this.length; i++){
				f(this[i], i, this);
			}
		}
	});
}
if (!Array.forEach) {
	// Shim reference for Array.forEach in environments with native forEach
	Object.defineProperty(Array, 'forEach', {value: Array.prototype.forEach});
}

if (!Object.prototype.keys) {
	defineProperty(Object.prototype, "keys", {
		enumerable: false,
		value: function(o){
			if(o !== Object(o)) throw new TypeError('Object.keys called on non-object');
			var ret = [], p;
			for(p in o){
				if(Object.prototype.hasOwnProperty.call(o,p)){
					ret.push(p);
				}
			}
			return ret;
		}
	});
}

if (!Object.prototype.isPlainObject) {
	/**
	 * Object.prototype.isPlainObject(v)
	 *
	 * Checks if the variable is a plain object (as best as we can tell)
	 * This falls victim to a couple false positives:
	 *   Object.create(null) // Objects who have no prototype
	 *   { constructor: someval } // Objects who have a property called "constructor"
	 * Test: ['55', 55, 'asdf', new String('asdf'), parseInt('asdf', 10), new Number(234), null, undefined, [], new Date(), Date, function(){}, Object.create(null), {}, {a:5}].forEach(function(v){ console.log(Object.isPlainObject(v)); });
	 *
	 * @return	Bool
	 */
	defineProperty(Object.prototype, "isPlainObject", {
		enumerable: false,
		value: function(v){
			return (v != null && v.constructor === Object);
		}
	});
}

if (!Object.prototype.extend && !dumbBrowser) {
	/**
	 * extend
	 *
	 * This method will extend the object with the passed object
	 * 
	 * @param Object
	 */
	defineProperty(Object.prototype, "extend", {
		enumerable: false,
		value: function(from, existingPropsOnly, copyDirectly) {
			var existingPropsOnly = existingPropsOnly == false ? false : true;
			var props = Object.getOwnPropertyNames(from);
			var dest = this;
			Array.forEach.call(props, function(name) {
				if (!existingPropsOnly || name in dest) {
					var destination = Object.getOwnPropertyDescriptor(from, name);
					if(Object.isPlainObject(from[name]) && name != '_id'){
						// If the field is an object and it's not an _id, clone it
						var old = destination.value;
						destination.value = old.clone();
					}
					if(!copyDirectly){
						try {
							defineProperty(dest, name, destination);
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

if (!Object.prototype.clone && !dumbBrowser) {
	/**
	 * clone
	 *
	 * Clones an object by calling {}.extend(this, false)
	 *
	 * @param	Object
	 */
	defineProperty(Object.prototype, 'clone', {
		enumerable: false,
		value: function(){
			return {}.extend(this, false);
		}
	});
}

if (!Object.prototype.isEmpty && !dumbBrowser) {
	/**
	 * Object.prototype.isEmpty()
	 *
	 * Checks if the object has any enumerable properties
	 *
	 * @return	Bool
	 */
	defineProperty(Object.prototype, "isEmpty", {
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

if (!Object.prototype.diff && !dumbBrowser) {
	/**
	 * Object.prototype.diff(b)
	 *
	 * Diff the two objects ( a.diff(b) ) and return a third object where each field is the value from object b for only fields which differ
	 * Fields which exist in a and not in b will be returned as fieldname: undefined
	 *
	 * @return	Object
	 */
	defineProperty(Object.prototype, "diff", {
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
	defineProperty(Object.prototype, "serializeDates", {
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
				Array.forEach.call(o, function(i){ Object.serializeDates.call(i, level + 1); });
			}else if(typeof o == 'object'){
				for(var k in o){
					if(o[k] != null && typeof o[k] == 'object' && o[k] instanceof Date){
						var time = o[k].getTime();
						o[k] = {'$date': time};
					}else if(o[k] != null && typeof o[k] == 'object' && !(o[k] instanceof Array)){
						Object.serializeDates.call(o[k], level + 1);
					}else if(o[k] instanceof Array){
						// In the case of an array of dates
						Array.forEach.call(o[k], function(v, i, o){
							if(v instanceof Date){
								o[i] = {'$date': v.getTime()};
							}else if(Object.isPlainObject(v)){
								Object.serializeDates.call(o[i], level + 1);
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
	defineProperty(Object.prototype, "unserializeDates", {
		enumerable: false,
		value: function(level){
			var clonedObject;
			var level = level > 0 ? level : 1; // Recursion level, for reference and preventing infinite recursion
			if(level > 10){
				// This probably means you passed a circular reference, but rather than allow node to crash itself we should just stop trying
				throw { message: 'Too much recursion in unserializeDates, perhaps you passed a circular reference?', type: 'TooMuchRecursionException' };
				return false;
			}

			var o = this;
			if(Object.isPlainObject(o) && o['$date'] && parseInt(o['$date'], 10) > 0){
				// It's a serialized date
				clonedObject = new Date(o['$date']);
			}else if(o instanceof Array){
				// It's an array, unserialize every item inside it
				clonedObject = [];
				Array.forEach.call(o, function(i){ clonedObject.push(Object.unserializeDates.call(i, level + 1)); });
			}else if(Object.isPlainObject(o)){
				clonedObject = {};
				// It's an iterable hash
				for(var k in o){
					if(Object.isPlainObject(o[k]) && o[k]['$date'] && !isNaN(parseInt(o[k]['$date'], 10)) ){
						clonedObject[k] = new Date(parseInt(o[k]['$date'], 10));
					}else if(Object.isPlainObject(o[k]) && !(o[k] instanceof Array)){
						clonedObject[k] = Object.unserializeDates.call(o[k], level + 1);
					}else if(o[k] instanceof Array){
						// In the case of an array of dates
						clonedObject = [];
						Array.forEach.call(o[k], function(v, i, o){ if(Object.isPlainObject(v) && v['$date'] && !isNaN(parseInt(v['$date'], 10)) ){ clonedObject[i] = new Date(v['$date']); } } );
					}else{
						clonedObject = o;
					}
				}
			}
			return clonedObject;
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
	defineProperty(Object.prototype, "flatten", {
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
	defineProperty(Object.prototype, "nameOf", {
		enumerable: false,
		value: function(){
			return "".concat(this).replace(/^.*function\s+([^\s]*|[^\(]*)\([^\x00]+$/, "$1") || "anonymous";
		}
	});
}

if (!Object.prototype.walk && !dumbBrowser) {
	// Walk over objects
	defineProperty(Object.prototype, 'walk', {
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

if (!Object.prototype.keys) {
	// Return a list of iterable keys for a given Object
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
			defineProperty(Object.prototype, 'keys', {
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

if (!String.prototype.trim) {
	/**
	 * String.prototype.trim()
	 *
	 * Trims the string of whitespace on either end
	 *
	 * @return String
	 */
	defineProperty(String.prototype, "trim", {
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
	defineProperty(String.prototype, "quote", {
		enumerable: false,
		value: function(delim, escaper) {
			var delim = typeof delim == 'string' ? delim : '"'; // Default: double quote
			var escaper = typeof escaper == 'string' ? escaper : "\\"; // Default: single backslash

			return delim + this.replace(new RegExp(delim, 'g'), escaper + delim) + delim;
		}
	});
}

if (!String.escapejQuerySelector) {
	/**
	 * String.escapejQuerySelector()
	 *
	 * Escape the following jQuery selector characters: #;&,.+*~':"!^$[]()=>|/%
	 *
	 * @return String
	 */
	defineProperty(String.prototype, "escapejQuerySelector", {
		enumerable: false,
		value: function(escaper) {
			var escaper = typeof escaper == 'string' ? escaper : "\\"; // Default: single backslash

			return this.replace(/([#;&,\.\+*~'\:"\!\^\$\[\]\(\)=\>|\/%])/g, escaper + "$1");
		}
	});
}

if (!String.prototype.reverse) {
	/**
	 * String.prototype.reverse()
	 *
	 * Return the reverse of the string
	 *
	 * @param	trickMethod		bool	false to not use the Array.reverse trick (which is much slower for small strings)
	 *
	 * @return String
	 */
	defineProperty(String.prototype, "reverse", {
		enumerable: false,
		value: function(trickMethod){
			if(trickMethod === false){
				var i, s = "";
				for(i = this.length; i >= 0; i--){
					s += this.charAt(i);
				}
				return s;
			}else{
				// Trick using Array.reverse
				// Note that for strings smaller than 64 bytes (on average) this method is about 200% slower than the normal char-by-char method
				return this.split('').reverse().join('');
			}
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
	defineProperty(Array.prototype, "has", {
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
	defineProperty(Array.prototype, "without", {
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
	defineProperty(Array.prototype, "remove", {
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
	defineProperty(Array.prototype, "add", {
		enumerable: false,
		value: function(o) {
			var index = this.indexOf(o);
			if (index < 0) {
				this.push(o);
			}
		}
	});
}

/**
 * Copyright (c) 2011 Manta Media, Inc.
 *
 * All Rights Reserved.  Unauthorized reproduction, transmission, or
 * distribution of this software is a violation of applicable laws.
 */
