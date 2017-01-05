# UltimateLoader
A tool to load objects of various types for Three.js

## Files types
Currently accepted object file types:
* .obj
* .json
* .dae
* .gltf

Currently accepted image file types (will be mapped to plane):
* .jpeg / .jpg
* .png

**IMPORTANT:** Your objects aren't guaranteed  to load correctly. Some models may not have been converted correctly or weren't setup right.

Currently accepted textures file types:
* .jpeg / .jpg
* .png

**IMPORTANT:** Your texture must be named that same as the object file and placed in the same directory.

## Using UltimateLoader

There are two methods you can use to load objects. 
* UltimateLoader.load(path, callback);
* UltimateLoader.multiload(arrayOfPaths, callback);

Each method functions the same except that multiloader will return an array of references to all the loaded objects in order of urls provided.

If you need to imcrementally add objects, you can set UltimateLoader.queue to true. This will put all objects into a queue and load them one at a time which slows the entire loading process down. It's recommended to keep it false.

### UltimateLoader.load(path, callback);
```javascript
UltimateLoader.load('path/to/model', function(object)
{
  // Do work...
  
  //Example work
  object.position.set(x, y, z);
  scene.add(object);
  
  // Do more work...
});
```



### UltimateLoader.multiload(arrayOfPaths, callback);
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
