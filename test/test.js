//Enable debug
// process.env.DEBUG = "*";
var debug = require('debug')('test');
var test = require('tape');

var ObjectObservable = require('../');
global.ObjectObservable = ObjectObservable;

test('Observe simple object', function (t) {

	t.plan(5);

	//Create reactive object
	var oo = ObjectObservable.create({ a: 1 });

	//Set event
	oo.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		//Changes from oo.a = 2;
		t.equal(data.length,1);
		t.equal(data[0].path,'a');
		t.equal(data[0].key,'a');
		t.equal(data[0].value,2);
	});
	//Change property
	oo.a = 2;
});

test('Observe nested object', function (t) {
	t.plan(5);
	//Create reactive object
	var oo = ObjectObservable.create({ a: { b: 1 } });
	//Set event
	oo.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		//Changes from oo.a.b = 2;
		t.equal(data.length,1);
		t.equal(data[0].path,'a.b');
		t.equal(data[0].key,'b');
		t.equal(data[0].value,2);
	});
	//Change property
	oo.a.b = 2;
});

test('Observe nested array', function (t) {
	t.plan(8);
	//Create reactive object
	var oo = ObjectObservable.create({ a: [ 1 ] });
	//Set event
	oo.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		//Add element
		t.equal(data.length,2);
		t.equal(data[0].path,'a.1');
		t.equal(data[0].key,'1');
		t.equal(data[0].value,2);
		//Increase length of array
		t.equal(data[1].path,'a.length');
		t.equal(data[1].key,'length');
		t.equal(data[1].value,2);
	});
	//Change property
	oo.a.push(2);
});

test('Observe added nested object', function (t) {
	var i = 0;

	t.plan(10);
	//Create reactive object
	var oo = ObjectObservable.create({ a: null });
	//Set event
	oo.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		if (i==0)
		{
			//Changes from oo.a = { b : 1};
			t.equal(data.length,1);
			t.equal(data[0].path,'a');
			t.equal(data[0].key,'a');
			t.equal(data[0].value.b,1);
		} else if (i==1) {
			//Changes from oo.a.b = 2;
			t.equal(data.length,1);
			t.equal(data[0].path,'a.b');
			t.equal(data[0].key,'b');
			t.equal(data[0].value,2);
		} else {
			t.fail('no more changes expected');
		}
		i++;
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
	var i = 0;
	//expected
	t.plan(10);
	//Create reactive object
	var oo = ObjectObservable.create({ a:  { b: 1 }});
	//Set event
	oo.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		if (i==0)
		{
			//Changes from oo.a.b = 2;
			t.equal(data.length,1);
			t.equal(data[0].path,'a.b');
			t.equal(data[0].key,'b');
			t.equal(data[0].value,2);
		} else if (i==1) {
			//Changes from delete oo.a;
			t.equal(data.length,1);
			t.equal(data[0].path,'a');
			t.equal(data[0].key,'a');
			t.equal(data[0].type,'deleteProperty');
		} else {
			t.fail('no more changes expected');
		}
		i++;
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
	var i = 0;
	//expected
	t.plan(11);
	//Create reactive object
	var oo = ObjectObservable.create({ a: [{id: 1},{id:2}] });
	//Set event
	oo.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		if (i==0)
		{
			t.equal(data.length,3);
			//Changes from delete oo.a.0;
			//It seems that chrome moves element to the begining of the array and then removes last one
			t.equal(data[1].type,'deleteProperty');
			//Recduce length
			t.equal(data[2].path,'a.length');
			t.equal(data[2].key,'length');
			t.equal(data[2].value,1);
		} else if (i==1) {
			//Changes oo.a[0].id = 3;
			t.equal(data.length,1);
			t.equal(data[0].path,'a.0.id');
			t.equal(data[0].key,'id');
			t.equal(data[0].value,3);
		} else {
			t.fail('no more changes expected');
		}
		i++;
	});
	//delete first
	oo.a.splice(0,1);

	//Change it later
	setTimeout (function() {
		debug('Changed nested object');
		oo.a[0].id = 3;
	},100);
});


test('Observe array add', function (t) {
	var i = 0;
	//expected
	t.plan(13);
	//Create reactive object
	var oo = ObjectObservable.create({ a: [{id: 1},{id:2}] });
	//Set event
	oo.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		if (i==0)
		{
			t.equal(data.length,2);
			//Changes add {id:3}
			t.equal(data[0].path,'a.2');
			t.equal(data[0].key,'2');
			t.equal(data[0].value.id,3);
			//Inc length
			t.equal(data[1].path,'a.length');
			t.equal(data[1].key,'length');
			t.equal(data[1].value,3);
		} else if (i==1) {
			t.equal(data.length,1);
			//Changes oo.a[2].id = 4;
			t.equal(data[0].path,'a.2.id');
			t.equal(data[0].key,'id');
			t.equal(data[0].value,4);
		} else {
			t.fail('no more changes expected');
		}
		i++;
	});
	//delete first
	oo.a.push({id:3});

	//Change it later
	setTimeout (function() {
		debug('Changed nested object');
		oo.a[2].id = 4;
	},100);
});


test('JSON preservation check', function (t) {
	//Only one expected
	t.plan(1);
	//Original
	var o = { a: [{id: 1},{id:2}] };
	//Create reactive object
	var oo = ObjectObservable.create(o);
	//Check results
	t.ok(JSON.stringify(o)===JSON.stringify(oo),'JSON serialization is the same');
});


test('Nested observed objects', function (t) {
	var i = 0;
	var j = 0;
	//Expected
	t.plan(22);
	//Create reactive object
	var oo = ObjectObservable.create({});
	//Create reactive object
	var oo2 = ObjectObservable.create({});
	//Set event
	oo.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		if (i==0)
		{
			t.equal(data.length,2);
			//Changes oo.oo2 = oo2;
			t.equal(data[0].path,'oo2');
			t.equal(data[0].key,'oo2');
			//Changes oo.oo2.a = 2;
			t.equal(data[1].path,'oo2.a');
			t.equal(data[1].key,'a');
			t.equal(data[1].value,2);
		} else if (i==1) {
			//Changes from delete property
			t.equal(data.length,1);
			t.equal(data[0].path,'oo2');
			t.equal(data[0].key,'oo2');
			t.equal(data[0].type,'deleteProperty');
		} else {
			t.fail('no more changes expected');
		}
		i++;
	});
	//Set event
	oo2.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		if (j==0)
		{
			t.equal(data.length,1);
			//Changes oo2.a = 2;
			t.equal(data[0].path,'a');
			t.equal(data[0].key,'a');
			t.equal(data[0].value,2);
		} else if (j==1) {
			t.equal(data.length,1);
			//Changes oo2.a = 3;
			t.equal(data[0].path,'a');
			t.equal(data[0].key,'a');
			t.equal(data[0].value,3);
		} else {
			t.fail('no more changes expected');
		}
		j++;
	});
	//Set it
	oo.oo2 = oo2;
	//Now change boths
	oo.oo2.a = 2;

	//Change it later
	setTimeout (function() {
		debug('Deleting nested object and changing it again');
		delete(oo.oo2);
		//Now change only nested object
		oo2.a = 3;
	},100);
});

test('Nested observed objects (II)', function (t) {
	var i = 0;
	var j = 0;
	//Expected
	t.plan(26);
	//Create reactive object
	var oo2 = ObjectObservable.create({});
	//Create reactive object
	var oo = ObjectObservable.create({oo2:oo2});
	//Set event
	oo.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		if (i==0)
		{
			t.equal(data.length,2);
			//Changes oo2.b = 3;
			t.equal(data[0].path,'oo2.b');
			t.equal(data[0].key,'b');
			t.equal(data[0].value,3);
			//Changes oo.oo2.a = 2;
			t.equal(data[1].path,'oo2.a');
			t.equal(data[1].key,'a');
			t.equal(data[1].value,2);
		} else if (i==1) {
			//Changes from delete property
			t.equal(data.length,1);
			t.equal(data[0].path,'oo2');
			t.equal(data[0].key,'oo2');
			t.equal(data[0].type,'deleteProperty');
		} else {
			t.fail('no more changes expected');
		}
		i++;
	});
	//Set event
	oo2.on('changes',function(data) {
		debug('ObjectObservable.changed %o',data);
		t.ok(true,"Changed");
		if (j==0)
		{
			t.equal(data.length,2);
			//Changes oo2.b = 3;
			t.equal(data[0].path,'b');
			t.equal(data[0].key,'b');
			t.equal(data[0].value,3);
			//Changes oo.oo2.a = 2;
			t.equal(data[1].path,'a');
			t.equal(data[1].key,'a');
			t.equal(data[1].value,2);
		} else if (j==1) {
			t.equal(data.length,1);
			//Changes oo2.a = 3;
			t.equal(data[0].path,'a');
			t.equal(data[0].key,'a');
			t.equal(data[0].value,3);
		} else {
			t.fail('no more changes expected');
		}
		j++;
	});
	//Now change both
	oo2.b = 3;
	oo.oo2.a = 2;

	//Change it later
	setTimeout (function() {
		debug('Deleting nested object and changing it again');
		delete(oo.oo2);
		//Now change only nested object
		oo2.a = 3;
	},100);
});
