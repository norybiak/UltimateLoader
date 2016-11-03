/**
 * ULTIMATE LOADER
 * A tool to help load objects in Three.js (for Altspace)
 * 
 * @Author NorybiaK
 * version 1.2
 */

var UltimateLoader = UltimateLoader || {};

(function(main) 
{ 'use strict';

	//A list containing all of the objects loaded by file name (used for cloning)
	var listOfObjectFilesLoaded = {};

	var queueList = [];
	var next = 0;
	var lastStop;
	
	var crossOrigin = 'anonymous';
	var baseUrl = '';
	
   /** 
	* If true, the objects will load incrementally. Loading time is drastically increased.
	*
    */
	main.queue = false;

   /** 
	*	UltimateLoader.load()
	*	Load an object and then run the callback function.
	* 
	*	The object is returned via the callback.
    */
	main.load = function(objUrl, callback)
	{
		if (main.queue)
		{
			queue(objUrl, callback);
			
			//checks if the newly queued object is next
			//start the queue if it is
			start();
		}
		else
		{
			var arr = [objUrl, callback];
			
			load(arr);
		}
	}
	
   /** 
	*	UltimateLoader.multiload()
	*	Load an array of objects and run the callback function.
	*
	* 	An array of objects is returned (in order of the objects passed in) via the callback.
    */
	main.multiload = function(objUrls, callback)
	{
		var objectsLoaded = [];
		var totalLoaded = 0;
		
		var callbackFunction = function(file)
		{
			objectsLoaded[file.i] = file.object;
			totalLoaded++;
			
			if (totalLoaded == objUrls.length)
			{
				callback(objectsLoaded);
			}
		};
		
		for (var i = 0; i < objUrls.length; i++)
		{
			if (main.queue)
			{
				queue(objUrls[i], callbackFunction, i);
				
				//checks if the newly queued object is next
				//start the queue if it is
				start();
			}
			else
			{
				var arr = [objUrls[i], callbackFunction, i];
			
				load(arr);
			}
		}
		
		//checks if the newly queued object is next
		//start the queue if it is
		start();
	}
	
   /** 
	*	queue()
	*	Add object reference to the queue list.
	*
    */
	function queue(objUrl, callback)
	{
		queueList.push([objUrl, callback]);
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
		
		load(object);
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
	*
    */
	function load(arr)
	{
		var url = arr[0];
		var callback = arr[1];
		
		var file = getFileInfo(url);
		file.url = url;
		file.callback = callback;
		
		//Special case for multiload.
		if (arr[2] != null)
		{
			file.i = arr[2];
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
	*	getFileInfo()
	*	Sets the baseUrl and splits the filename into an object called info. 
	*	Info contains the name, extention, and the baseUrl.
	*
    */
	function getFileInfo(path)
	{
		var newPath = path.slice(0, path.lastIndexOf('/') + 1);
		if (newPath !== "" || newPath !== null)
		{
			baseUrl = newPath;
		}
		
		var file = path.substr(path.lastIndexOf('/') + 1);
		
		var s = file.split('.');
		var info = {name: s[0], ext: s[1], baseUrl: newPath};
		
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
		mtlLoader.setBaseUrl(file.baseUrl);
		mtlLoader.setCrossOrigin = crossOrigin;
		
		mtlLoader.load(mtl, function(materials) 
		{
			materials.preload();

			var objLoader = new THREE.OBJLoader();
			
			objLoader.setMaterials(materials);
			objLoader.setPath(file.baseUrl);
			objLoader.setCrossOrigin = crossOrigin;
			
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
	
   /** 
	*	loadImage()
	*	.png or .jpeg file found, attempt to load it.
	*	Adds texture to a plane. User may change the default plane transform via callback.
	*
    */
	function loadImage(file)
	{
		var loader = new THREE.TextureLoader();
		
		loader.load(file.url, function (texture) 
		{
			var geometry = new THREE.PlaneGeometry( 32, 20, 32 );
			var material = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
			var plane = new THREE.Mesh( geometry, material );
	
			file.object = plane;
			handleOnLoad(file);
		}, onProgress, onError);
	}
	
	function onProgress(xhr) 
	{

	}

	function onError(xhr) 
	{ 
		
	}

   /** 
	*	handleOnLoad()
	*	Add the object into the loaded array and run the callback.
	*
    */
	function handleOnLoad(file)
	{
		listOfObjectFilesLoaded[file.name] = file.object;

		if (file.i != null)
		{
			file.callback(file);
		}
		else
		{
			file.callback(file.object);
		}
		
		if (main.queue)
		{
			dequeue();
		}	
		
		console.log("UltimateLoader: Object " + file.name + " loaded!");
	}
	
})(UltimateLoader);