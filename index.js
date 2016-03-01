var setImmediate = require('core-js/library/fn/set-immediate');
var EventEmitter = require('events');
var debug = require('debug')('object-observable');

var prefix = '__OBJECT_OBSERVABLE__PREFIX__' + new Date()+'__';

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
				timer = setImmediate(function(){
					//Trigger changes
					emitter.emit('change',changes);
					//Clear timer
					timer = null;
					//Clear changes
					changes = [];
				});
		};

		//Listener for child objects
		var listener = function(changes){
			//for each change
			for (var i=0;i<changes.length;i++)
				//Fire it again
				changed(changes[i].type,changes[i].target,changes[i].key,changes[i].value,changes[i].old);
		};
		
		
		//Check if it is an array
		if (Array.isArray (object))
		{
			//Convert each 
			for (var i=0; i<object.length;++i)
			{
				//Get value
				var value = object[key];
				//Is it observable??
				if (typeof(value)==='object' && value && !ObjectObservable.isObservable(value))
				{
					//Create a new proxy
					value = new ObjectObservable(value);
					//Set it back
					object[key] = value;
					//Set us as listeners
					value.addListener('change',listener);
				}
			}
		} else {
			//Append each property
			for (var key in object)
			{
				//If it is a property
				if (object.hasOwnProperty (key))
				{
					//Get value
					var value = object[key];
					//Is it observable
					if (typeof(value)==='object' && value && !ObjectObservable.isObservable(value))
					{
						//Create a new proxy
						value = new ObjectObservable(value);
						//Set it back
						object[key] = value;
						//Set us as listeners
						value.addListener('change',listener);
					}
				}
			}
		}
		
		//Create proxy for object
		return new Proxy(
				object,
				//Proxy handler object
				{
					get: function (target, key) {
						//Check if it is requesting listeners
						if (key==='addListener' || key==='on')
							return emitter.addListener.bind(emitter);
						else if (key==='removeListener')
							return emitter.removeListener.bind(emitter);
						
						//debug("%o get %s",target,key);
						return target[key] || undefined;
					},
					set: function (target, key, value) {
						//Old value
						var old = undefined;

						//Check if we are replacing a key
						if (key in target) {
							//Get the previous value
							old = target[key];
							//Remove us from the listener just in case
							old && old.removeListener && old.removeListener(listener);
						}

						//debug("%o set %s from %o to %o",target,key,old,value);

						//Is it observable?
						if (typeof(value)==='object' && value &&!ObjectObservable.isObservable(value))
						{
							//Create a new proxy
							value = new ObjectObservable(value);
							//Set us alisteners
							value.addListener('change',listener);
						}
						//Set it
						target[key] = value;
						//Fire change
						changed("set",target,key,value,old);
						//return new value
						return value;
					},
					deleteProperty: function (target, key) {
						//debug("%o deleteProperty %s",target,key);
						//Old value
						var old = undefined;

						if (Array.isArray (target))
							old = target.splice(key,1);
						else
							old = delete(target[key]);

						//Is it an object??
						if (old && ObjectObservable.isObservable(old))
							//Remove us from the listener just in case
							old && old.removeListener && old.removeListener(listener);
						//Changed
						changed("deleteProperty",target,key,old);
						//OK
						return old;
					},
					enumerate: function (target) {
						//debug("%o enumerate",target);
						return Object.keys(target);
					},
					ownKeys: function (target) {
						//debug("%o ownKeys",target);
						return Object.keys(target);
					},
					has: function (target, key) {
						//debug("%o has %s",target,key);
						return prefix===key || key in target;
					},
					defineProperty: function (target, key, desc) {
						//debug("%o defineProperty %s with desc %o",target,key,desc);
						return Object.defineProperty (target,key, desc);
					},
					getOwnPropertyDescriptor: function (target, key) {
						//debug("%o getOwnPropertyDescriptor %s",target,key);
						return Object.getOwnPropertyDescriptor (target,key);
					}
				}
			);
	}
	
	ObjectObservable.isObservable = function(object)
	{
		return typeof(object)==='object' && object &&  prefix in object;
	};

	return ObjectObservable;
};
