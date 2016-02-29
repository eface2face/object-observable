var setImmediate = require('core-js/library/fn/set-immediate');
var EventEmitter = require('events');
var debug = require('debug')('object-observable');

module.exports = function() {
	
	function ObjectObservable(object)
	{
		// called without `new`
		if (!(this instanceof ObjectObservable))
			return new ObjectObservable(object);
		
		//Create emitter
		var emitter = new EventEmitter();
		
		var changes = [];
		var timer = null;

		//Trigger changes
		var changed = function(type,target,key,value,old) {

			//Add change
			changes.push({
				type: type,
				target: target,
				key: key,
				value: value,
				old: old
			});
			//If first change
			if (!timer)
				//Set timer at end of this execution
				timer = setInmediate(function(){
					//Trigger changes
					emitter.emit('change',changes);
					//Clear timer
					timer = null;
					//Clear changes
					changes = [];
				});
		};

		//Listener for child objects
		var listener = function(data){
			//Fire it again
			changed(data.type,data.target,data.key,data.value,data.old);
		};

		//Create proxy for object
		return new Proxy(
			//Copy object properties onto emitter
			Object.assign(emitter,object),
			//Proxy handler object
			{
				get: function (target, key) {
					debug("%o get %s",target,key);
					return target[key] || undefined;
				},
				set: function (target, key, value) {
					//Old value
					var old = undefined;
					var res = value;

					//Check if we are replacing a key
					if (key in target) {
						//Get the previous value
						old = target[key];
						//Remove us from the listener just in case
						old && old.removeListener && old.removeListener(listener);
					}

					debug("%o set %s from %o to %o",target,key,old,value);

					//Is it an object??
					if (typeof(value)==="object")
					{
						//Is it an emitter already??
						if (!res.listeners)
							//Create a new proxy
							res = new ObjectObservable(value);
						//Set us alisteners
						res.addListener('change',listener);
					}
					//Set it
					target[key] = res;
					//Fire change
					changed("set",target,key,res,old);
					//return new value
					return res;
				},
				deleteProperty: function (target, key) {
					debug("%o deleteProperty %s to %o",target,key);
					//Old value
					var old = undefined;

					if (Array.isArray (target))
						old = target.splice(key,1);
					else
						old = target.delete(key);

					//Is it an object??
					if (old && typeof(old)==="object")
						//Remove us from the listener just in case
						old && old.removeListener && old.removeListener(listener);
					//Changed
					changed("deleteProperty",target,key,old);
					//OK
					return old;
				},
				enumerate: function (target) {
					debug("%o enumerate",target);
					return target.keys ();
				},
				ownKeys: function (target) {
					debug("%o ownKeys",target);
					return target.keys ();
				},
				has: function (target, key) {
					debug("%o has %s",target,key);
					return key in target || target.hasItem (key);
				},
				defineProperty: function (target, key, desc) {
					debug("%o defineProperty %s with desc %o",target,key,desc);
					return Object.defineProperty (target,key, desc);
				},
				getOwnPropertyDescriptor: function (target, key) {
					debug("%o getOwnPropertyDescriptor %s",target,key);
					return target.getOwnPropertyDescriptor (key);
				}
			});
	}

	return ObjectObservable;
};
