var asap = require('asap');
var EventEmitter = require('events');
// var debug = require('debug')('object-observable');

var prefix = '__OBJECT_OBSERVABLE__PREFIX__' + new Date()+'__';

var ObjectObservable = {};

ObjectObservable.create = function (object)
{
	//Create emitter
	var emitter = new EventEmitter();
	var changes = [];
	var timer = false;
	var listeners = new WeakMap();

	//Trigger changes
	var changed = function(change,prefix) {
		//Duplicate
		var c = Object.assign({},change);
		//Add prefix
		if (prefix)
			//Append it
			c.path = change.path ? prefix + "." + change.path : prefix;
		//Add change
		changes.push(c);
		//Emit inmediate change
		emitter.emit('change',c);
		//If first change
		if (!timer)
		{
			//Set timer at end of this execution
			asap(function(){
				//Trigger changes
				emitter.emit('changes',changes);
				//Clear timer
				timer = false;
				//Clear changes
				changes = [];
			});
			//We have scheduled it already
			timer = true;
		}
	};

	//Create listener for key
	function addListener(key) {
		//Create listener for specific key
		var l =  function(change){
			//Fire it again
			changed(change,key);
		};
		//Add to map
		listeners[key] = l;
		//Return listener callback
		return l;
	}


	//Check if it is an array
	if (Array.isArray (object))
	{
		//Convert each
		for (var i=0; i<object.length;++i)
		{
			//Get value
			var value = object[i];
			//It is a not-null object?
			if (typeof(value)==='object' && value )
			{
				//Is it already observable?
				if( !ObjectObservable.isObservable(value))
				{
					//Create a new proxy
					value = ObjectObservable.create(value);
					//Set it back
					object[i] = value;
				}
				//Set us as listeners
				value.addListener('change',addListener(i));
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
				//It is a not-null object?
				if (typeof(value)==='object' && value )
				{
					//Is it already observable?
					if( !ObjectObservable.isObservable(value))
					{
						//Create a new proxy
						value = ObjectObservable.create(value);
						//Set it back
						object[key] = value;
					}
					//Set us as listeners
					value.addListener('change',addListener(key));
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
					return target[key];
				},
				set: function (target, key, value) {
					//Old value
					var old = undefined;

					//Check if we are replacing a key
					if (key in target) {
						//Get the previous value
						old = target[key];
						//Get listener
						var listener = listeners[key];
						//Remove us from the listener just in case
						old && listener && old.removeListener && old.removeListener('change',listener);
					}

					//debug("%o set %s from %o to %o",target,key,old,value);

					//It is a not-null object?
					if (typeof(value)==='object' && value )
					{
						//Is it already observable?
						if( !ObjectObservable.isObservable(value))
							//Create a new proxy
							value = ObjectObservable.create(value);
						//Set it before setting the listener or we will get events that we don't expect
						target[key] = value;
						//Set us as listeners
						value.addListener('change',addListener(key));
					} else {
						//Set it
						target[key] = value;
					}

					//Fire change
					changed({
						type: 'set',
						target: target,
						key: key,
						value: value,
						old: old
					},key);
					//return new value
					return value;
				},
				deleteProperty: function (target, key) {
					//debug("%o deleteProperty %s",target,key);
					//Old value
					var old = target[key];

					//Is it an object??
					if (old && ObjectObservable.isObservable(old))
					{
						//Get listener
						var listener = listeners[key];
						//Remove us from the listener just in case
						old && listener && old.removeListener && old.removeListener('change',listener);
					}

					if (Array.isArray (target))
						old = target.splice(key,1);
					else
						old = delete(target[key]);

					//Changed
					changed({
						type: 'deleteProperty',
						target: target,
						key: key,
					},key);
					//OK
					return old;
				},
				has: function (target, key) {
					//debug("%o has %s",target,key);
					return prefix===key || key in target;
				}
			}
		);
};

ObjectObservable.isObservable = function(object)
{
	return typeof(object)==='object' && object &&  prefix in object;
};

module.exports = ObjectObservable;
