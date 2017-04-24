# UltimateLoader2

This release introduces an experimental version of UltimateLoader that increases usability and performance.

UltimateLoader2 aims to clean up your code by using a config. By creating a config object, you can easily define your models and insert basic transform information (position, scale, and rotation) all in one place. UtlimateLoader2 will load the models, automatically apply the transform data, and add the models to the scene for you. These actions are optional, you still have control over the models once they’re loaded. 

#### Key Changes:
- Caching
- A single promise that accepts multiple paramaters
- Transform properties applied automatically
- Add to scene automatically
- Shared .mtl
- Easy referencing

## Basic Usage

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

## UltimateLoader global config options

#### UltimateLoader.autoLoad
Default: true  
If a scene is passed in load() and this is set to true, the models will automatically load into the scene.

#### UltimateLoader.autoTransform
Default: true  
If you specify transform properties, they'll be applied automatically.

#### UtltimateLoader.cache
Default: true  
UltimateLoader will cache each unique model you load making subsiquent loads very quick.

#### UltimateLoader.loadImagesOnPlane
Default: false  
If set to true, standalone images will load onto a plane.

#### UltimateLoader.imageSize
Default: 32  
The size of standalone images when loaded onto a plan (dependant on loadImagesOnPlane)

## Methods of passing data to UltimateLoader.load()

There are multiple ways you can use the load() function.

### As a config object 
This method gives you more options when loading. Additionally, you'll be able to access the loaded object by referencing the model name.
```javascript
var Models =
{
	Duck: { url: 'models/Duck.glb' },
	Chair: { url: 'models/chair.dae', position: '0 5 0', scale: '1 1 1', rotation: '0 0 0' },
	Celeste: { url: 'models/Celeste.obj', mtl: 'models/Other.mtl', position: '0 0 5', scale: '1 1 1', rotation: '0 0 0' }
};

UltimateLoader.load(Models).then(function(models)
{
	Models.Duck.position.set(0, 10, 0);
});
```

### As an array
```javascript
var array = 
[
	'models/Duck.glb',
	'models/chair.dae',
	'models/avatar_head.obj',
];

UltimateLoader.load(array).then(function(models)
{
});
```

### As a string
```javascript
var src = 'models/avatar_head.obj';
UltimateLoader.load(src).then(function(models)
{
});
```

### Combo
You can mix the config types in one call
```javascript
UltimateLoader.load(src, array, Models).then(function(models)
{
});
```

### Special parameters

#### inline mtl
UltimateLoader allows you to pass a url to an .mtl file that will then be used across all .obj files. 
```javascript
UltimateLoader.load('http://example.com/mat.mtl', src, array, Models).then(function(models)
{
});
```
#### scene
Pass in your scene so that UltimateLoader can automatically add your models to the scene.
```javascript
UltimateLoader.load(scene, Models).then(function(models)
{
});
```

This is an easy way to ensure that all .obj files share a single .mtl. If an mtl property is present in a config object, that will be used instead.

## Creating and using a config object for load()

As shown in the examples above, there are a few config properties available that helps you manage the loading process.

### Valid properties
#### url (required) 
url: 'string'
#### mtl (optional if using .obj) 
mtl: 'string'
#### position (optional)
position: {x: 0, y: 0, z: 0 } OR position: '0 0 0'
#### scale (optional)
scale: {x: 1, y: 1, z: 1 } OR scale: '1 1 1'
#### rotation (optional)
rotation: {x: 0, y: 0, z: 0 } OR rotation: '0 0 0'

## Accessing your loaded models
A loader is only useful when you can access your models!

### Config object
As implied in previous examples, you can access your loaded model by referencing the config object after the entire load is complete.
```javascript
var Models =
{
	Duck: { url: 'models/Duck.glb' },
	Chair: { url: 'models/chair.dae', position: '0 5 0', scale: '1 1 1', rotation: '0 0 0' },
	Celeste: { url: 'models/Celeste.obj', mtl: 'models/Other.mtl', position: '0 0 5', scale: '1 1 1', rotation: '0 0 0' }
};

UltimateLoader.load(scene, Models).then(function(models)
{
	Models.Duck.position.set(0,0,0);
	scene.remove(Models.Celeste);
});
```

###  Returned array
Each load() call will return an array of all loaded objects in order of how they were passed into the function.

```javascript
var Models =
{
	Duck: { url: 'models/Duck.glb' },
};

var array = 
[
	'models/chair.dae'
]

UltimateLoader.load(scene, 'models/Celeste.obj', array, Models).then(function(models)
{
	for (var i = 0; i < models.length; i++)
	{
		console.log(models[i]);
	}
	
	// Output will be:
	// Celeste, chair, Duck
});
```

###  Single loaded model
If a single model was loaded, the returned object will be readily accessible by itself.

```javascript
UltimateLoader.load(scene, 'models/Celeste.obj', array, Models).then(function(model)
{	
	console.log(model);
	
	// Output will be:
	// Celeste
});
```
