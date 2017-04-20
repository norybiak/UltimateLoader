# UltimateLoader2

This release introduces an experimental version of UltimateLoader. Because this version is very new and breaks backwards compatibility, I've decided to temporarily separate UltimateLoader into two version. Version 0.3.1 is the current stable version that most everyone is using. Version 1.0.0, or temporarily named as UltimateLoader2, will change the way you handle model loading. 

The current method of loading models requires that you either use UltimateLoader.load or UltimateLoader.multiload. The single model loading method requires a single url that points to your model. Multiload accepts an array of urls. This means that after your models are done loading, you can then transform or do whatever you want with them. Okay...simple enough, but it can get easier than that. 

UltimateLoader2 (v1,0.0) aims to clean up your code by using a config. By creating a config object, you can easily define your models and insert basic transform information (position, scale, and rotation) all in one place. UtlimateLoader2 will load the models, automatically apply the transform data, and add the models to the scene for you. These actions are optional, you still have control over the models once they’re loaded. 

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

Okay, let's break this down a bit. Notice I have a new object called Models. 

```javascript
var Models = { };
```

Within this object are 3 properties that are objects themselves. 
```javascript
Duck: { url: 'models/Duck.glb' },
Chair: { url: 'models/chair.dae', position: '0 5 0', scale: '1 1 1', rotation: '0 0 0' },
Celeste: { url: 'models/Celeste.obj', mtl: 'models/Other.mtl', position: '0 0 5', scale: '1 1 1', rotation: '0 0 0' }
```


Duck shows that absolute bare minimum required to load a model. 
```javascript
Duck: { url: 'models/Duck.glb' }
```

You'll notice that you can load .obj files with .mtl files that are named differently than the .obj filename.

```javascript
Celeste: { url: 'models/Celeste.obj', mtl: 'models/Other.mtl', position: '0 0 5', scale: '1 1 1', rotation: '0 0 0' }
```

Okay, cool! Let's take a look at the .load function.

```javascript
UltimateLoader.load(scene, Models).then(function()
{
	console.log(Models);
});
```

No more multiload. You pass in your scene and the config object as defined above. You may also pass in a url to an mtl file that will be shared across all .obj files within the config object.

```javascript
UltimateLoader.load(scene, Models, '/models/Other.mtl').then(function()
{
	console.log(Models);
});
```

So how do you access your newly loaded models? Easy! The config object will actually be overwritten so that each property (or model name) now references the object3D. The original config data will be removed.

```javascript
var Models =
{
	Duck: { url: 'models/Duck.glb' },
	Chair: { url: 'models/chair.dae', position: '0 5 0', scale: '1 1 1', rotation: '0 0 0' },
	Celeste: { url: 'models/Celeste.obj', mtl: 'models/Other.mtl', position: '0 0 5', scale: '1 1 1', rotation: '0 0 0' }
};

UltimateLoader.load(scene, Models).then(function()
{
	Models.Duck.position.set(0,0,0);
	scene.remove(Models.Celeste);
	
	//   Models is now (note that THREE.Group is an example and that the property will be whatever the parent is of the model)
	//
	//   var Models =
	//   {
	//	   Duck: THREE.Group,
	//	   Chair: THREE.Group,
	//	   Celeste: THREE.Group
	//   };
});

```
