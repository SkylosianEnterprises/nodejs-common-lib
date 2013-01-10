exports.chain = function(){
	var _this = this;
	this.commands = [];

	this.next = function(){
		var command = _this.commands.shift(); // Pull the next item from the queue

		if(!command || typeof command != 'function'){
			return; // Stop recursing, end of queue
		}

		// Call the command off the stack, passing a callback function which calls this execute method again
		command( function(){ _this.next.call( _this.commands ); } );
		return this;
	};

	// fn should have the following signature: function(next)
	this.add = function(fn){
		this.commands.push(fn);
		return this;
	};

	// Same as chain.add() passing a timeout of length time
	this.wait = function(time){
		var handler = function(next){
			setTimeout(function(){
				next();
			}, 1000);
		};

		this.commands.push(handler);
		return this;
	};

	this.run = function(){
		this.next.call(this.commands);
		return this;
	};
};

/*
// Demo
require('util/manta_mongo_provider.js').builder(null, function(err, db) {

	if(err){
		console.log(err.message || err);
		return false;
	}

	var c = require('connections/lib/connections').mkConnections(db, true) || process.exit(1); // If we don't get a connections manager, bail

	var a = new chain()
	.add(function(next){
		console.log('First run');
		setTimeout(function(){
			c.query({to: '55'}, function(e, r){
				console.dir(r);
				console.log('First response');
				next();
			});
		}, 1000); // Add a 1 second delay first
	})
	.add(function(next){
		console.log('Second run');
		c.query({to: '25'}, function(e, r){
			console.dir(r);
			console.log('Second response');
			next();
		});
	})
	.wait(1000)
	.add(function(next){
		console.log('Third run');
		c.query({to: '5'}, function(e, r){
			console.dir(r);
			console.log('Third response');
			next();
		});
	})
	.add(function(){
		console.log('Exiting');
		setTimeout(function(){
			process.exit();
		}, 1000); // Wait one second, then exit
	})
	.run();
});
*/
