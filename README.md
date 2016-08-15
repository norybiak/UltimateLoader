# UltimateLoader
A tool to load objects of various types for Three.js in AltspaceVR


## Using UltimateLoader

There are two methods you can use to load objects. 
1. UltimateLoader.load(path, callback)
2. UltimateLoader.multiload(path, callback)

Each method functions the same, except that multiloader will return an array of referemces to all the loaded objects in order.


Currently accepted object file types:
1. .obj
2. .json
3. .dae
4. .gltf

IMPORTANT: Your objects aren't guaranteed  to load correctly. Some models may not have been converted correctly or weren't setup right.

Currently accepted textures file types:
1. .jpg
2. .png

IMPORTANT: Your texture must be named that same as the object file and placed in the same directory.


How to use each method:

```javacsript
UltimateLoader.load('path/to/model', function(object)
{
  // Do work....
  
  //Example work
  object.position.set(x, y, z);
  scene.add(object);
  
  // Do more work....
});
```

```javascript
var objectUrls =
[
	'/model/object.dae',
	'/model/object.obj',
	...
];

var loadedObject = [];

UltimateLoader.multiload(objectUrls, function(objects)
{

  for (var i = 0; i < objects.length; i++)
  {
  	objects[i].position.set(0,-450,0);
  	objects[i].scale.set(5,5,5);
  
  	scene.add(objects[i]);
  	
  	loadedObjects[i] = objects[i];
  }
  
});
```
