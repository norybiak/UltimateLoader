/**
 * ULTIMATE LOADER
 * A tool to help load objects in Three.js
 * 
 * @Author NorybiaK
 * version 1.0.1
 */

var UltimateLoader = UltimateLoader || {};

(function(main) 
{ 'use strict';

	var sharedMtl = false;
	var scene = false;
	
	var crossOrigin = 'anonymous';
	
	var TRANSFORM_TYPES = ['position', 'rotation', 'scale'];

   /** 
    * int UltimateLoader.imageSize
	* Default size is 32 (arbitrary number)
	* Depending on enclosure size, this number will need to be changed.
	* 
    */
	main.imageSize = 32;
	
   /** 
	* bool UltimateLoader.loadImagesOnPlane
	* Whethor or not images should load on a plane. Default is false.
	* 
    */
	main.loadImagesOnPlane = false;
	
	main.load = function()
	{
		var strings = [];
		var objects = [];
		
		for (var i = 0; i  < arguments.length; i++)
		{
			if (typeof arguments[i] === 'string')
			{
				strings.push(arguments[i]);
			}
			else if (typeof arguments[i] === 'object')
			{
				for (var p in arguments[i])
				{
					objects.push(arguments[i]);
				}
			}
		}
		
		parseStrings(strings); //Lets check our string arguments
		var objectToProcess = parseObjects(objects); //lets check our object arguments. Note that this returns that last object that isn't an array or scene.

		return new Promise(function(resolve, reject) 
		{		
			var loader = new Loader();
			loader.load(objectToProcess, function()
			{
				if (loader.complete) 
				{
					resolve();
				}
				else 
				{
					reject(Error("It broke"));
				}
			});
		});
	}
	
	function parseStrings(strings)
	{
		if (strings.length <= 0) { return; };
		
		var parsed = [];
		
		var string = "";
		for (var i = 0; i < strings.length; i++)
		{
			string = strings[i];
			
			//Check to see if the string is a valid url and get the info
			var info = parseURL(string);

			if (info)
			{
				//If a path to an mtl is passed as a function argument, use it as a shared mtl.
				if (info.ext === 'mtl')
				{
					sharedMtl = info;
				}
			}
		}
		
		return parsed;
	}
	
	function parseObjects(objects)
	{
		var objectToProcess;
		
		var object = {};
		for (var i = 0; i < objects.length; i++)
		{
			object = objects[i];
			if (Array.isArray(object))
			{		
				continue;			
			}
			else if (object instanceof THREE.Scene)
			{
				scene = object;
			}
			else
			{
				objectToProcess = object;	
			}
		}
		
		return objectToProcess;
	}

	function Loader()
	{
		this.count = 0;
		this.complete = false;
		this.size = 0;
	}

	Loader.prototype.load = function(object, callback)
	{
		this.size = Object.size(object);
		
		for (var name in object) 
		{
			var model = object[name];
			var url = model.url;
			
			var file = parseURL(url);	
			if (!file) { console.error('UltimateLoader: ' + name + ' failed to load as it must pass a valid url'); continue; }
			
			file.model = model;
			file.callback = callbackFunction.bind(this, model, object, callback);
			
			load(file);
		}	
	}
	
	function callbackFunction(model, object, callback, object3d)
	{
		updateTransforms(model, object3d);
		scene.add(object3d);
		
		this.count++;
		if (this.count == this.size)
		{
			for (var name in object) 
			{
				object[name] = object3d;
			}
			
			this.complete = true;		
			callback();
		}
	}
	
	function updateTransforms(object, loadedModel)
	{
		for (var transformType in object)
		{
			for (var i = 0; i < TRANSFORM_TYPES.length; i++)
			{			
				if (TRANSFORM_TYPES[i] == transformType)
				{
					var params = object[transformType].split(' ');
					
					loadedModel[transformType].set(parseFloat(params[0]), parseFloat(params[1]), parseFloat(params[2]));
				}
			}	
		}
	}
	
   /** 
	*	load()
	*	Check the object file extension and use the correct loader.
	*	If the object file already exists, clone in.
	*   param - i - may be null. It's a special case for multiload.
	*
    */
	function load(file)
	{	
		switch (file.ext)
		{
			case "obj":
				loadOBJ(file);
				break;
				
			case "json":
				loadJSON(file);
				break;
				
			case "dae":
				loadCollada(file);
				break;
				
			case "gltf":
				loadglTF(file);
				break;
				
			case "glb":
				loadglTF(file);
				break;
				
			case "fbx":
				loadFBX(file);
				break;
				
			case "drc":
				loadDRACO(file);
				break;
				
			case "png":
				loadImage(file);
				break;
				
			case "jpg":
				loadImage(file);
				break;
				
			case "jpeg":
				loadImage(file);
				break;
				
			default:
				console.log("UltimateLoader: File extension -" + file.ext + "- not recognized! Object -" + file.name + "- did not load.");
				dequeue(); //Move to the next object
				break;
		}
	}
	
   /** 
	*	parseFilenameFromURL()
	*	Parses the url into usable info. This will get the base url, filename, and extension.
	*	
	*
    */
	function parseURL(url)
	{
		var base = url.slice(0, url.lastIndexOf('/') + 1);
		
		if (base === '' || base === null || base === 'undefined') { return false; } //not a valid path

		var file = url.substr(url.lastIndexOf('/') + 1);
		
		var fileInfo = file.split('.');
		var filename = fileInfo[0];
		var fileExt = fileInfo[fileInfo.length-1].toLowerCase(); //We need to make sure we grab the extension and lower the case.

		var info = {name: filename, ext: fileExt, baseUrl: base, url: url};
		
		return info;	
	}

   /** 
	*	loadOBJ()
	*	.obj file found, attempt to load the .obj and .mtl.
	*
    */
	function loadOBJ(file)
	{
		var obj = file.name + '.obj';
		var mtl = file.name + '.mtl';
		var mtlBase = file.baseUrl;
		
		//Special case where mtl is provided in specific model
		if (file.model.mtl)
		{
			var mtlFile = parseURL(file.model.mtl)
			if (mtlFile) 
			{ 
				mtl = mtlFile.name + '.mtl';
				mtlBase = mtlFile.baseUrl;
			}
		} 
		else if (sharedMtl) //Sspecial case where mtl is provided for ALL .obj files
		{
			mtl = sharedMtl.name + '.mtl';
			mtlBase = sharedMtl.baseUrl;
		}
		
		var mtlLoader = new THREE.MTLLoader();
		
		mtlLoader.setPath(mtlBase);
		mtlLoader.setTexturePath ? mtlLoader.setTexturePath(mtlBase) : mtlLoader.setBaseUrl(mtlBase);
		mtlLoader.setCrossOrigin(crossOrigin);
			
		mtlLoader.load(mtl, function(materials) 
		{
			materials.preload();

			var objLoader = new THREE.OBJLoader();
			
			objLoader.setMaterials(materials);
			objLoader.setPath(file.baseUrl);

			objLoader.load(obj, function (object)
			{
				file.object = object;
				handleOnLoad(file);
			}, onProgress, onError);
		});	
	}

   /** 
	*	loadJSON()
	*	.json file found, attempt to load it.
	*
    */
	function loadJSON(file)
	{
		var loader = new THREE.ObjectLoader();
		
		loader.load(file.url, function (object) 
		{
			file.object = object;
			handleOnLoad(file);
		}, onProgress, onError);
	}
	
   /** 
	*	loadCollada()
	*	.dae file found, attempt to load it.
	*
    */
	function loadCollada(file)
	{
		var loader = new THREE.ColladaLoader();
		
		loader.load(file.url, function (collada) 
		{
			var object = collada.scene;
			
			file.object = object;
			handleOnLoad(file);
		}, onProgress, onError);
	}
	
	
   /** 
	*	loadImage()
	*	.png or .jpeg file found, attempt to load it.
	*	Adds texture to a plane. User may change the default plane transform via callback.
	*
    */
	function loadImage(file)
	{
		var loader = new THREE.TextureLoader();
		
		loader.load(file.url, function(texture) 
		{	
			var object = texture;
			if (main.loadImagesOnPlane)
			{
				var height = (texture.image.naturalHeight / texture.image.naturalWidth) * main.imageSize;
				var geometry = new THREE.PlaneGeometry(main.imageSize, height, main.imageSize);
				var material = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
				var plane = new THREE.Mesh( geometry, material );
				
				object = plane;
				
			}

			file.object = object;
			handleOnLoad(file);
		}, onProgress, onError);
	}
	
   /** EXPERIMENTAL
	*	loadgltf()
	*	.gltf or .glb file found, attempt to load it.
	*	This one is iffy and doesn't have full proper implementaion. May not work properly.
	*
    */
	function loadglTF(file)
	{
		var loader = new THREE.GLTFLoader();
		
		loader.load(file.url, function(gltf) 
		{
			var object = gltf.scene;
			
			file.object = object;
			handleOnLoad(file);
		}, onProgress, onError);
	}

	function onProgress(xhr) 
	{

	}

	function onError(xhr) 
	{ 
		console.log("There was an error loading your object");	
	}

   /** 
	*	handleOnLoad()
	*	Add the object into the loaded array and run the callback.
	*
    */
	function handleOnLoad(file)
	{
		console.log("UltimateLoader: Object " + file.name + " loaded!");
		
		file.callback(file.object);
	}
	
	Object.size = function(obj) 
	{
		var size = 0, key;
		for (key in obj) 
		{
			if (obj.hasOwnProperty(key)) size++;
		}
		return size;
	};
})(UltimateLoader);

THREE.FileLoader = THREE.FileLoader || THREE.XHRLoader;