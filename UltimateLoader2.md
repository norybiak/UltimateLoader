# UltimateLoader
A tool to load objects of various types for Three.js

This release introduces an experimental version of UltimateLoader. Because this version is very new and breaks backwards compatibility, I've decided to temporarily separate UltimateLoader into two version. Version 0.3.1 is the current stable version that most everyone is using. Version 1.0.0, or temporarily named as UltimateLoader2, will change the way you handle model loading. 

The current method of loading models requires that you either use UlimateLoader.load or UlimateLoader.multiload. The single model loading method requires a single url that points to your model. Multiload accepts an array of urls. This means that after your models are done loading, you can then transform or do whatever you want with them. Okay...simple enough, but it can get easier than that. 

UltimateLoader2 (v1,0.0) aims to clean up your code by using a config. By creating a config object, you can easily define your models and insert basic transform information (position, scale, and rotation) all in one place. UtlimateLoader2 will load the models, automatically apply the transform data, and add the models to the scene for you. These actions are optional, you still have control over the models once they’re loaded. 


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