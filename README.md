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

**IMPORTANT:** Your .mtl files must be named that same as the object file and placed in the same directory.

## Config
bool `UltimateLoader.useQueue`  
If true, the objects will load incrementally. Default is false.

**WARNING:** Loading time is drastically increased if queue is used. This is for special cases when you really need to load the objects incrementally.

bool `UltimateLoader.loadImagesOnPlane`  
If true, images will be loaded onto a plane. Default is false.

int `UltimateLoader.imageSize`  
The initial size of the image when loading onto a plane. Default is 32. 

**Note**: The imageSize is used when creating a THREE.PlaneGeometry. If loadImagesOnPlane is false, imageSize is ignored. The image's aspect ratio will be maintained.

## Using UltimateLoader

There are two methods you can use to load objects. 
* UltimateLoader.load(path, callback);
* UltimateLoader.multiload(arrayOfPaths, callback);

Each method functions the same except that multiloader will return an array of references to all the loaded objects in order of urls provided.

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

var loadedObjects = [];

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

## Using UltimateLoader2

### UltimateLoader.load()
```javascript
var Models =
{
	Duck: { url: 'models/Duck.glb' },
	Chair: { url: 'models/chair.dae', position: '0 5 0', scale: '1 1 1', rotation: '0 0 0' },
	Celeste: { url: 'models/Celeste.obj', mtl: 'models/Other.mtl', position: '0 0 5', scale: '1 1 1', rotation: '0 0 0' }
};

UltimateLoader.load(scene, Models).then(function()
{
	console.log(Models);
});

```