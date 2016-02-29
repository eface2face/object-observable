//Enable debug
process.env.DEBUG = "*";
var debug = require('debug')('test');
var test = require('tape');

var ObjectObservable = require('./index.js')();

test('Observe simple object', function (t) {

	//Only one expected
	t.plan(1);

	//Create reactive object
	var oo = new ObjectObservable({ a: 1 });
	
	//Set event
	oo.on('change',function(data) {
		debug('ObjectObservable.changed %o',data); 
		t.ok(true,"Changed");
	});
	//Change property
	oo.a = 2;
});

test('Observe nested object', function (t) {
	//Only one expected
	t.plan(1);
	//Create reactive object
	var oo = new ObjectObservable({ a: { b: 1 } });
	//Set event
	oo.on('change',function(data) {
		debug('ObjectObservable.changed %o',data); 
		t.ok(true,"Changed");
	});
	//Change property
	oo.a.b = 2;
});

test('Observe nested array', function (t) {
	//Only one expected
	t.plan(1);
	//Create reactive object
	var oo = new ObjectObservable({ a: [ 1 ] });
	//Set event
	oo.on('change',function(data) {
		debug('ObjectObservable.changed %o',data); 
		t.ok(true,"Changed");
	});
	//Change property
	oo.a.push(2);
});

test('Observe added nested object', function (t) {
	//Only one expected
	t.plan(2);
	//Create reactive object
	var oo = new ObjectObservable({ a: null });
	//Set event
	oo.on('change',function(data) {
		debug('ObjectObservable.changed %o',data); 
		t.ok(true,"Changed");
	});
	//Add nested object
	debug('Add nested object');
	oo.a = { b : 1};
	//Change it
	setTimeout (function() {
		debug('Changed nested object');
		oo.a.b = 2;
	},1);
});


test('Observe nested object delete', function (t) {
	//Only two expected
	t.plan(2);
	//Create reactive object
	var oo = new ObjectObservable({ a:  { b: 1 }});
	//Set event
	oo.on('change',function(data) {
		debug('ObjectObservable.changed %o',data); 
		t.ok(true,"Changed");
	});
	//Change property
	oo.a.b = 2;
	//Delete it
	setTimeout (function() {
		debug('Delete nested object');
		delete oo.a;
	},1);
	
});


test('Observe array delete', function (t) {
	//Only one expected
	t.plan(2);
	//Create reactive object
	var oo = new ObjectObservable({ a: [{id: 1},{id:2}] });
	//Set event
	oo.on('change',function(data) {
		debug('ObjectObservable.changed %o',data); 
		t.ok(true,"Changed");
	});
	//delete first 
	oo.a.splice(0,1);
	
	//Change it later
	setTimeout (function() {
		debug('Changed nested object');
		oo.a[0].id = 3;
	},1);
});


test('Observe array add', function (t) {
	//Only one expected
	t.plan(2);
	//Create reactive object
	var oo = new ObjectObservable({ a: [{id: 1},{id:2}] });
	//Set event
	oo.on('change',function(data) {
		debug('ObjectObservable.changed %o',data); 
		t.ok(true,"Changed");
	});
	//delete first 
	oo.a.push({id:3});
	
	//Change it later
	setTimeout (function() {
		debug('Changed nested object');
		oo.a[2].id = 4;
	},1);
});

