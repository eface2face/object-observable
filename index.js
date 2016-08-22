var asap = require('asap');
var EventEmitter = require('events');
// var debug = require('debug')('object-observable');

var prefix = '__OBJECT_OBSERVABLE__PREFIX__' + new Date()+'__';
var rawprefix = prefix+'_RAW_';

var ObjectObservable = {};

ObjectObservable.create = function (object,params)
{
	//IF no args
	if (!arguments.length)
		//Create empty object;
		object = {};

	//Set defaults
	var params = Object.assign(
		{},
		{
			clone: false,
			recursive: true
		},
		params
	);
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


	//Do not clone by default
	var cloned = object;
	//If we need to do it recursively
	if (params.recursive)
	{
		//Check if it is an array
		if (Array.isArray (object))
		{
			//Check if we need to clone object
			if (params.clone)
				//Create empty one
				cloned = [];
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
						value = ObjectObservable.create(value,params);
						//Set it back
						cloned[i] = value;
					}
					//Set us as listeners
					ObjectObservable.observeInmediate(value,addListener(i));
				} else if (params.clone) {
					//Set it on cloned array
					cloned[i] = value;
				}
			}
		} else {
			//Check if we need to clone object
			if (params.clone)
				//Create empty one
				cloned = {};
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
							value = ObjectObservable.create(value,params);
							//Set it back
							cloned[key] = value;
						}
						//Set us as listeners
						ObjectObservable.observeInmediate(value,addListener(key));
					} else if (params.clone) {
						//Set it on clone object
						cloned[key] = value;
					}
				}
			}
		}
	}

	//Create proxy for object
	return new Proxy(
			cloned,
			//Proxy handler object
			{
				get: function (target, key) {
					//Check if it is requesting listeners
					if (key===prefix)
						return emitter;
					//Check if ti was requesting raw
					if (key===rawprefix)
						//Return base object
						return cloned;
					//debug("%o get %s",target,key);
					//HACK: https://bugs.chromium.org/p/v8/issues/detail?id=4814
					if (target instanceof Date && typeof target[key] === 'function' && Date.prototype.hasOwnProperty(key))
					{
						//if it is a setter
						if (key.substr && key.substr(0,3)==='set')
						{
							//Return wrapped function
							return function()
							{
								//Get setted attribute
								var setted = key.substr(3,key.length).toLowerCase();
								//Store previous value
								var old = new Date(target);
								//Run setter
								target[key].apply(target,arguments);
								//Fire change
								changed({
									type: 'set',
									target: setted,
									key: setted,
									value: target,
									old: old
								},null);
							}
						} if (key=="Symbol(Symbol.toPrimitive)") {
							//Return Symbol.toPromitive hinter
							return Date.prototype[Symbol.toPrimitive].bind(target);
						} else if (key==="[Symbol.toStringTag]") {
							return 'Date';
						} else {
							//Return binded method
							return target[key].bind(target);
						}
					} else
						//Return as it is
						return target[key];
				},
				set: function (target, key, value) {
					//Get the previous value
					var old = target[key];
					//Get listener
					var listener = listeners[key];
					//Remove us from the listener just in case
					old && listener && ObjectObservable.unobserveInmediate (old,listener);

					//debug("%o set %s from %o to %o",target,key,old,value);

					//It is a not-null object?
					if (params.recursive && typeof(value)==='object' && value )
					{
						//Is it already observable?
						if( !ObjectObservable.isObservable(value))
							//Create a new proxy
							value = ObjectObservable.create(value,params);
						//Set it before setting the listener or we will get events that we don't expect
						target[key] = value;
						//Set us as listeners
						ObjectObservable.observeInmediate(value,addListener(key));
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
					//The set method should return a boolean value. Return true to indicate that assignment succeeded. If the set method returns false, and the assignment happened in strict-mode code, a TypeError will be thrown.
					return true;
				},
				deleteProperty: function (target, key) {
					//debug("%o deleteProperty %s",target,key);
					//Old value
					var old = target[key];

					//Get listener
					var listener = listeners[key];
					//Remove us from the listener just in case
					old && listener && ObjectObservable.unobserveInmediate (old,listener);

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

ObjectObservable.observe = function(object,listener)
{
	//Get emmiter
	var emitter = object[prefix];
	//Check if it is observable
	if (!emitter)
		throw new Error('Object is not observable');
	
	//Listen
	emitter.addListener('changes',listener);
	
	//reurn listener
	return listener;
};

ObjectObservable.once = function(object,listener)
{
	//Get emmiter
	var emitter = object[prefix];
	//Check if it is observable
	if (!emitter)
		throw new Error('Object is not observable');
	
	//Listen
	emitter.once('changes',listener);
	
	//return listener
	return listener;
};

ObjectObservable.unobserve = function(object,listener)
{
	//Get emmiter
	var emitter = object[prefix];
	//Check if it is observable
	if (!emitter)
		throw new Error('Object is not observable');
	
	//UnListen
	emitter.removeListener('changes',listener);
};

ObjectObservable.getRawObject = function(object)
{
	//Get raw
	var raw = object[rawprefix];
	//Check if it is observable
	if (!raw)
		throw new Error('Object is not observable');
	
	//Return raw object
	return raw;
};

ObjectObservable.observeInmediate = function(object,listener)
{
	//Get emmiter
	var emitter = object[prefix];
	//Check if it is observable
	if (!emitter)
		throw new Error('Object is not observable');
	
	//UnListen
	emitter.addListener('change',listener);
};

ObjectObservable.unobserveInmediate = function(object,listener)
{
	//Get emmiter
	var emitter = object[prefix];
	//Check if it is observable
	if (!emitter)
		throw new Error('Object is not observable');
	
	//Listen
	return emitter.removeListener('change',listener);
};

module.exports = ObjectObservable;
