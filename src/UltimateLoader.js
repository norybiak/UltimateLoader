/**
 * ULTIMATE LOADER
 * A tool to help load objects in Three.js
 * 
 * @Author NorybiaK
 * version 0.1.7
 */

var UltimateLoader = UltimateLoader || {};

(function(main) 
{ 'use strict';

	// Queue related variables.
	var queueList = [];
	var next = 0;
	var lastStop;
	
	var crossOrigin = 'anonymous';

   /** 
	* bool UltimateLoader.useQueue
	* If true, the objects will load incrementally. Loading time is drastically increased. Default (recommendation) is false.
	*
    */
	main.useQueue = false;
	
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

   /** 
	*	UltimateLoader.load()
	*	Load an object and then run the callback function.
	* 
	*	The object is returned via the callback.
    */
	main.load = function(url, callback)
	{
		if (main.useQueue)
		{
			queue(url, callback);

			//checks if the newly queued object is next
			//start the queue if it is
			start();
		}
		else
		{
			load(url, callback);
		}
	}
	
   /** 
	*	UltimateLoader.multiload()
	*	Load an array of objects and run the callback function.
	*
	* 	An array of objects is returned (in order of the objects passed in) via the callback.
    */
	main.multiload = function(urls, callback)
	{
		var objectsLoaded = [];
		var totalLoaded = 0;
		
		var callbackFunction = function(file)
		{
			objectsLoaded[file.i] = file.object;
			totalLoaded++;
			
			if (totalLoaded == urls.length)
			{
				callback(objectsLoaded);
			}
		};
		
		for (var i = 0; i < urls.length; i++)
		{
			if (main.useQueue)
			{
				queue(urls[i], callbackFunction, i);
				
				//checks if the newly queued object is next
				//start the queue if it is
				start();
			}
			else
			{
				load(urls[i], callbackFunction, i);
			}
		}
	}
	
   /** 
	*	queue()
	*	Add object reference to the queue list.
	*
    */
	function queue(url, callback, i)
	{
		queueList.push([url, callback, i]);
	}

   /** 
	*	dequeue()
	*	Load the next object in the queue.
	*
    */
	function dequeue()
	{
		//Nothing to get! Empty queueList
		if (next > queueList.length-1) 
		{ 
			queueList = [];
			next = 0;
			return;
		}
	
		var object = queueList[next];
		next++;
		
		load(object[0], object[1], object[2]);
	}
	
   /** 
	*	start()
	*	Helper function to determine if we need to dequeue.
	*
    */
	function start()
	{
		if (next == 0)
		{
			dequeue();
		}
	}
	
   /** 
	*	load()
	*	Check the object file extension and use the correct loader.
	*	If the object file already exists, clone in.
	*   param - i - may be null. It's a special case for multiload.
	*
    */
	function load(url, callback, i)
	{
		var file = parseFilenameFromURL(url);
		file.url = url;
		file.callback = callback;
		
		//Special case for multiload.
		if (i != null)
		{
			file.i = i;
		}
		
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
				
			case "fbx":
				loadFBX(file);
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
	function parseFilenameFromURL(url)
	{
		var base = url.slice(0, url.lastIndexOf('/') + 1);
	
		var file = url.substr(url.lastIndexOf('/') + 1);
		
		var fileInfo = file.split('.');
		var filename = fileInfo[0];
		var fileExt = fileInfo[fileInfo.length-1].toLowerCase(); //We need to make sure we grab the extension and lower the case.

		var info = {name: filename, ext: fileExt, baseUrl: base};
		
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
		
		var mtlLoader = new THREE.MTLLoader();
		
		mtlLoader.setPath(file.baseUrl);
		mtlLoader.setTexturePath ? mtlLoader.setTexturePath(file.baseUrl) : mtlLoader.setBaseUrl(file.baseUrl);
		mtlLoader.setCrossOrigin(crossOrigin);
		
		mtlLoader.load(mtl, function(materials) 
		{
			materials.preload();

			var objLoader = new THREE.OBJLoader();
			
			objLoader.setMaterials(materials);
			objLoader.setPath(file.baseUrl);

			objLoader.load(obj, function (object)
			{
				object.traverse(function(child) 
				{
                  if (child instanceof THREE.Mesh) 
				  {
                      child.material.side = THREE.DoubleSide;
                  }
				});

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
	*	.gltf file found, attempt to load it.
	*	This one is iffy and doesn't have full proper implementaion. May not work properly.
	*
    */
	function loadglTF(file)
	{
		var loader = new THREE.glTFLoader();
		
		loader.load(file.url, function(gltf) 
		{
			var object = gltf.scene;
			
			file.object = object;
			handleOnLoad(file);
		}, onProgress, onError);
		
	}
	
   /** EXPERIMENTAL
	*	loadFBX()
	*	.fbx file found, attempt to load it.
	*	This is experimental. The FBX loader is ASCII v7+ only. 
	*
    */
	function loadFBX(file)
	{
		var loader = new THREE.FBXLoader();
		
		loader.load(file.url, function(object) 
		{
			file.object = object;
			handleOnLoad(file);
		}, onProgress, onError() );
		
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
		if (file.i != null)
		{
			file.callback(file);
		}
		else
		{
			file.callback(file.object);
		}
		
		if (main.useQueue)
		{
			dequeue();
		}	
		
		console.log("UltimateLoader: Object " + file.name + " loaded!");
	}
	
})(UltimateLoader);