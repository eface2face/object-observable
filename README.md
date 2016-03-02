# object-observable
Observable object via ES6 Proxies

So, Object.observe (O.o from now on) is being removed from Chrome, claiming that it is usage was very low. Well, obviously, if a functionality is only implemented by one browser, it will be not be used much. Except for a few of us that create applications targeting only Chrome browser.

In that regard, O.o was a awesome functionality in terms of spliting model/views independence. But it is gone, so what to do if you were heavily using O.o intensively on your application? Panic? Yes, maybe. But fortunatelly Google gave us a nice replacement of O.o in the very same Chrome version than they deprecated it, [ES proxies](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

The main difference betwen O.o and Proxies is that while with O.o you could observe any object, with Proxies, you have to work with the object returned when you create the proxy. Why is that important? Because you could observe objects created by third party libraries, without having to make any change. 

```javascript
var foo = {};

Object.observe(foo,listener);

foo.a = 1; // <- This will trigger an event on the listener of O.o

var bar = {}

var proxy = new Proxy(bar,handler);

bar.a = 1;    // <- This will NOT trigger the handler
proxy.a = 2   // <- This will set bar.a === 2 and also triger the handler
```

There are already some available shim/polyfills of O.o based on Proxies, and we all have came to the same conclusion. Create your object so it is "observable" from the beginning:

```javascript
var bar = ObjectObservable.create();

ObjectObservable.observe(bar,listener);

bar.a = 1;    // <- This will trigger the event on the listener
```
There are already other polyfills/shims available, but due to our own needs we decided to add our own sugar:

* Support objects or arrays
* Observe changes recursivelly
* Nested objects (or arrays) are observable too
* Retrieve events individually and inmediatelly, or a set of changes at the end of current execution


## Installation

```bash
$ npm install object-observable --save
```

And then:

```javascript
var ObjectObservable = require('object-observable');
```

## API
### ObjectObservable.create(object,params)
Creates an observable object from input object
* `object` (Object|Array)[Optional] Object to create the observable from 
* `params` (Object|Array)[Optional]
..* `recursive` (Boolean: default `true`)[Optional] Allow observing changes recursivelly on nested objects
..* `clone` (Boolean: default `false`)[Optional only used if `recursive===true`] Do not change input object, but clone it instead
* returns an `observable` object

Example

```javascript
var foo = {...};
var bar = {...};

//Create empty observable object
var observable = ObjectObservable.create();

//Create recursive observable object from already created object
//Note: this will modify foo and make any nested object observable too
//      that is, ObjectObservable(foo.child)===true
var observableFoo = ObjectObservable.create(foo);

//Create recursive observable object from already created object
//Note: this will NOT modify bar
//      that is, ObjectObservable(bar.child)===false
var observableBar = ObjectObservable.create(bar,{clone:true});

```
### ObjectObservable.isObservable(observable)
Check if object is an observable object
* `observable` (Object) 
* returns `true` if object is observable, `false` otherwise

Example:
```javascript
var isObservable = ObjectObservable.isObservable(observable);
```

### ObjectObservable.observe(observable,listener)
Observe changes on an observable object and call listener with an array of changes on next iteration (via asap)
* `observable` (Object) Observable object
* `listener` (Function) Listener function 
* returns `listener` function, which can be used later for unobserve changes

Example:
```javascript
 var listener = ObjectObservable.observe(observable,function(changes){
    for (var i = 0; i < changes.length; ++i)
      console.log("Change on object: ",change[i]);
 });
```

### ObjectObservable.once(observable,listener)
Observe changes on an observable object only ONCE and call listener with an array of changes on next iteration (via asap)
* `observable` (Object) Observable object
* `listener` (Function) Listener function 
* returns `listener` function, which can be used later for unobserve changes

Example:
```javascript
 var listener = ObjectObservable.once(observable,function(changes){
    for (var i = 0; i < changes.length; ++i)
      console.log("Change on object: ",change[i]);
 });

### ObjectObservable.observeInmediate
Observe individual changes on an observable object and calls listener inmediatelly with a single change.
* `observable` (Object) Observable object
* `listener` (Function) Listener function 
* returns `listener` function, which can be used later for unobserve changes

Example:
```javascript
 var listener = ObjectObservable.observeInmediate(observable,function(change){
    console.log("Change on object: ",change);
 });
```

### ObjectObservable.unobserve(observable,listener)
Stop observing changes on observable object
* `observable` (Object) Observable object
* `listener` (Function) Listener function used in `observe`

Example:
```javascript
 var listener = ObjectObservable.observe(observable,function(changes){
    for (var i = 0; i < changes.length; ++i)
      console.log("Change on object: ",change[i]);
 });
 //.....
  ObjectObservable.unobserve(observable,listener);
```

### ObjectObservable.unobserveInmediate(observable,listener)
Stop observing inmediate changes on observable object
* `observable` (Object) Observable object
* `listener` (Function) Listener function used in `observeInmediate`

Example:
```javascript
 var listener = ObjectObservable.observeInmediate(observable,function(change){
    console.log("Change on object: ",change);
 });
  //.....
  ObjectObservable.unobserveInmediate(observable,listener);
```

## Events
Each change delivered to the event listeners has the following attributes:
* `type` (String) ['set','deleteProperty'] Type of Proxy handler invoking the change
* `path` (String) Path of the changed attribute relative to root object
* `key`  (String) Key of the attribute of the changed object
* `value` (ANY) [only if `type==='set`] New value set for the key
* `old` (ANY) [only if `type==='set`] Old value set for the key

Take into account that a single change may trigger several events, specially if modifying an array via `splice`.

## Author

Sergio Garcia Murillo [eFace2Face, inc.](https://eface2face.com)

## License

[MIT](./LICENSE) :)
