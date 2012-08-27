/**
 * member-verifier.js
 *
 * Represents how to validate a member object (first the data then the structure)
 *
 * THIS IS RUN IN THE BROWSER
 * DO NOT put any proprietary/sensitive code in here
 * DO NOT use trailing commas
 * DO NOT use any other advanced ECMAScript magic (no get/set, no proxies, limited Object properties interaction, etc)
 * DO Test it in IE
 */

var verification = exports.verification = require('verification');

/**
 * Rules to validate the data
 * This also doubles as the structure check
 */
var     social_profile = {
                             id:      { required: true, maxlength: 200 },
                             public:  { "constructor": Boolean }
                         };

var _rules = exports.rules = {
    // Record data fields
    "email"                        : { required: true, type: "email" },
    "alt_email"                    : { type: "email" },
    "user_password"                : { internal: true, required: true },

    // Personal data fields
    "firstname"                    : { required: true, match: /^[A-Za-z\s]+$/ },
    "middlename"                   : { match: /^[A-Za-z\s]+$/ },
    "lastname"                     : { required: true, match: /^[A-Za-z\s]+$/ },
    "namesuffix"                   : { match: /^[A-Za-z0-9\s]+$/ },
    "screenname"                   : { },
    "address1"                     : { },
    "address2"                     : { },
    "city"                         : { },
    "state"                        : { requires: 'city' },
    "zip"                          : { },
    "country"                      : { requires: ['state','city'] },
    "role1"                        : { },
    "role2"                        : { },
    "role3"                        : { },
    "bio"                          : { maxlength: 500 },
    "phone"                        : { },
    "display_name_fmt"             : { },
    "twitter_screen_name"          : { }, // move into social_profiles.$i.id      where type=twitter
    "linkedin_profile_url"         : { }, // move into social_profiles.$i.id      where type=linkedin
    "twitter_public"               : { }, // move this social_profiles.$i.public  where type=twitter
    "linkedin_profile_public"      : { }, // move into social_profiles.$i.public  where type=linkedin
    "no_affiliation_reason"        : { },
    "photo_id"                     : { }, // To be used with ImageService
    "social_login_site"            : { }, // gigya-populated social source
    "social_profiles"              : { subdocument:
                                         {
                                             twitter:   { subdocument: social_profile },
                                             linkedin:  { subdocument: social_profile }
                                         }
                                     },
    "interests"                    : { array: true, maxcount: 10, maxlength: 250 },
    "certifications"               : { array: true, maxcount: 10, maxlength: 250 },
    "skills"                       : { array: true, maxcount: 10, maxlength: 250 },
    "links"                        : { array: true, maxcount: 10, subdocument: {
                                             name:         { required: true, maxlength: 250 },
                                             url:          { required: true, maxlength: 2083, type: 'url' }, // Yup. 2083.
                                             description:  { required: true, maxlength: 300 },
	                                         date: { required: true, "instanceof": Date }
                                         }
                                     },
    "favorite_sites"               : { array: true, maxcount: 10, subdocument: {
                                             name:         { required: true, maxlength: 250 },
                                             url:          { maxlength: 2083, type: 'url' }, // Yup. 2083.
                                             description:  { required: true, maxlength: 300 },
                                             date: { required: true, "instanceof": Date }
                                         }
                                     },
    "quotes"                       : { array: true, maxcount: 10, subdocument:
                                         {
                                             by:     { required: true, maxlength: 100 },
                                             quote:  { required: true, maxlength: 500 },
	                                         date: { required: true, "instanceof": Date }
                                         }
                                     },
    "intentions"                   : { maxcount: 10, subdocument:
                                         {
                                             advice:    { "constructor": Boolean },
                                             build:     { "constructor": Boolean },
                                             network:   { "constructor": Boolean },
                                             promote:   { "constructor": Boolean },
                                             research:  { "constructor": Boolean },
                                             questions: { "constructor": Boolean }
                                         }
                                     },
    "worth_noting"                 : { }, // Unknown
    "status"                       : { subdocument:
                                         {
                                             text: { required: true, maxlength: 1000 },
                                             date: { required: true, "instanceof": Date }
                                         }
                                     },
    "hide_claimed_companies"       : { "constructor": Boolean },
    "promote_my_profile"           : { "constructor": Boolean },

    // Meta-data fields
    "url_slug"                     : { match: /^[a-z0-9\-_]+$/, maxlength: 50, notblank: true }, // notblank behaves like require except it only checks the field if it is defined
    "activated"                    : { internal: true, type: "date" },
    "alt_email_activated"          : { internal: true },
    "register_timestamp"           : { internal: true, type: "date" },
    "register_ip"                  : { internal: true },
    "last_login_timestamp"         : { internal: true, type: "date" },
    "last_update_timestamp"        : { internal: true, type: "date" },
    "last_update_ip"               : { internal: true },
    "legacy_userid"                : { },
    "avatar_id"                    : { },
    "avatar_filename"              : { },
    "migration_timestamp"          : { internal: true, type: "date" },
    "migration_type"               : { internal: true },
    "reg_referer_id"               : { internal: true },
    "reg_learned_about_manta"      : { internal: true },
    "reg_rl"                       : { internal: true },
    // Footprints.
    "private_browsing_mode"        : { internal: true },
    //chamber of commerce
    "chamber_of_commerce"          : { },
    // Private messaging settings (persisted)
    "autoarchive_days"             : { },
    "pm_notify"                    : { },
    // Public/private indicators (persisted)
    "email_public"                 : { },
    "phone_public"                 : { },
    "roles_public"                 : { },
    "company_public"               : { },
    "bio_public"                   : { },
    "websites_public"              : { },
    "address_public"               : { },
    "company_claim_owner"          : { },
    "company_claim_agent"          : { },
    "company_claim_employee"       : { },
    // member type -- currently 'STANDARD', 'INTERNAL', and 'ADMIN'
    "member_type"                  : { internal: true },
    // new role system
    "role_owner_flag"              : { },
    "role_position"                : { },
    "role_function_1"              : { },
    "role_function_2"              : { },
    "role_title"                   : { },
    // computed values (persisted) :
    "public_subid"                 : { internal: true },
    "display_name"                 : { },

    // Who knows / legacy
    "email_other_sw"               : { internal: true },
    "email_mantaview_sw"           : { internal: true },
    "n_cqa_questions"              : { internal: true },
    "n_flagged_cqa_questions"      : { internal: true },
    "n_cqa_answers"                : { internal: true },
    "n_flagged_cqa_answers"        : { internal: true },
    "n_active_uecps"               : { internal: true },
    "n_flagged_content"            : { internal: true },
    "n_unread_messages"            : { internal: true },
    "company_upcid"                : { }
    // No trailing comma :(
};

/**
 * Filter the object to remove any elements that don't belong
 *
 * @param    removeInternal   To remove internal fields or not (default to true) (optional argument)
 * @param    obj              The object to filter
 * @param    altRules         An alternate set of rules to filter by
 *
 * @return   void
 */
var filterStructure = exports.filterStructure = function (obj, altRules) {
	var removeInternal = true;
	if(typeof obj == 'boolean'){
		// They passed removeInternal, shift everything back
		removeInternal = arguments[0] === false ? false : true;
		obj = arguments[1];
		altRules = arguments[2];
	}

	var keys = Object.keys.call(null, obj);
	var rules = (Object.isPlainObject(altRules) ? altRules : _rules);
	Array.each.call(keys, function(v) {
		if(v != '_id'){
			if(!rules.hasOwnProperty(v)){
				// No rule for this field, remove it
				console.log('Found erroneous field, removing: ' + v);
				delete obj[v];
			}else if(rules.hasOwnProperty(v) && (removeInternal && rules[v].internal === true)){
				// Rule says this field is internal (and they didn't specify otherwise), remove it
				console.log('Found internal field, removing: ' + v);
				delete obj[v];
			}else if(rules[v].subdocument){
				// It's supposed to be a subdocument (including arrays of them)
				if(Object.isPlainObject(obj[v]) || obj[v] instanceof Array){
					// The data matches up
					if(obj[v] instanceof Array){
						// Array of subdocuments
						if(rules[v].array){
							// Iterate over each value and filter them
							for(var x = 0; x < obj[v].length; x++){
								if(Object.isPlainObject(obj[v][x])){
									// But only if they actually are subdocuments
									filterStructure(obj[v][x], rules[v].subdocument);
								}else{
									if(obj[v][x] !== null && typeof obj[v][x] !== 'undefined'){
										// Otherwise remove them
										console.log('Found erroneous field, should be subdocument, removing: ' + v + '.' + x);
										delete obj[v][x];
									}
								}
							}
						}else{
							// Got an array that wasn't supposed to be an array
							console.log('Found erroneous array, removing: ' + v);
							delete obj[v];
						}
					}else{
						// Just a single subdocument
						if(Object.isPlainObject(obj[v])){
							// And the data agrees
							filterStructure(obj[v], rules[v].subdocument);
						}else{
							if(obj[v] !== null && typeof obj[v] !== 'undefined'){
								// Expected a single subdocument, got something else
								console.log('Found erroneous field, should be subdocument, removing: ' + v);
								delete obj[v];
							}
						}
					}
				}else{
					if(obj[v] !== null && typeof obj[v] !== 'undefined'){
						// It's not a subdocument or an array of subdocuments, remove it
						console.log('Found erroneous field, should be subdocument/array, removing: ' + v);
						delete obj[v];
					}
				}
			}else if(rules[v].array){
				// It's not a subdocument  but it's an array of simple values
				if(obj[v] instanceof Array){
					// It's an array, iterate the values
					for(var x = 0; x < obj[v].length; x++){
						if(Object.isPlainObject(obj[v][x]) || obj[v][x] instanceof Array){
							// We got a complex value where we expected simple
							console.log('Found erroneous field, expected simple value and received subdocument/array, removing: ' + v + '.' + x);
							delete obj[v][x];
						}
					}
				}else{
					// It's not an array as it claims, delete it
					console.log('Found erroneous field, should be an array, removing: ' + v);
					delete obj[v];
				}
			}else if(!rules[v].subdocument && !rules[v].array){
				// It's not supposed to be an array or a subdocument, so ensure that
				if(obj[v] instanceof Array || Object.isPlainObject(obj[v])){
					console.log('Found erroneous subdocument/array, should be simple value, removing: ' + v);
					delete obj[v];
				}
			}
		}
	});
};

/**
 * Given a complete member object, verify it against the entire set of rules (or user-specified altRules) and return (or pass to callback) the error report
 *
 * @param   obj        The complete member object to check
 * @param   altRules   An alternate set of rules than the internal ones to be used (optional)
 * @param   cb         The callback to call in the form of function(errorReport)
 *                     This is optional, without it the errorReport will be returned directly
 */
var verify = exports.verify = function (obj, altRules /* optional */, cb) {
	// Handle optional arguments
	if(typeof altRules == 'function'){
		// no altRules, shift arguments
		cb = altRules;
		altRules = undefined;
	}
	if(arguments.length == 1) altRules = cb = undefined; // Didn't pass either

	// Ensure that the callback is a function
	if(typeof cb != 'function') cb = undefined;

	filterStructure(obj); // Remove erroneous fields

	// Perform verification and return the report in whichever way they asked for
	var report = verification.verify(obj, (altRules ? altRules : _rules));
	if(cb && typeof cb == 'function'){
		// Callback style
		cb( report );
	}else{
		// Return style
		return report;
	}
};

/**
 * Given a single field name and it's value, verify it against that rule only
 *
 * @param	field	The field name to check
 * @param	value	The value of the field to check against
 * @param	cb	The callback to call in the form of function(errorReport)
 *			This is optional, without it the errorReport will be returned directly
 */
var verifyField = exports.verifyField = function (field, value, cb) {
	if(typeof cb != 'function') cb = undefined;

	// Emulate verify ignoring all other fields
	var obj = {};
	obj[field] = value;
	var rule = {};
	rule[field] = _rules[field];

	return verify(obj, rule, cb); // Pass it through to verify
};

/**
 * Given an incomplete object, check only the the rules which exist for the given fields
 * This means that in order to check for required fields, you must define it in the object, with an undefined value
 *
 * @param	obj	The incomplete object to check. If you're only checking a single field, say email, that would be:  { email: 'value' }  (though perhaps you want verifyField)
 * @param	cb	The callback to call in the form of function(errorReport)
 *			This is optional, without it the errorReport will be returned directly
 */
var verifyIncomplete = exports.verifyIncomplete = function (obj, cb) {
	if(typeof cb != 'function') cb = undefined;

	var rules = {};
	for(var key in obj){
		if(_rules[key]) rules[key] = _rules[key];
	}

	return verify(obj, rules, cb); // Pass it through to verify
};
