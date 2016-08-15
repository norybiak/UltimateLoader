/**
 * ULTIMATE LOADER
 * A tool to help load objects in Three.js (for Altspace)
 * 
 * @Author NorybiaK
 */

var UltimateLoader = UltimateLoader || {};

(function(main) 
{ 'use strict';


	var queueList = [];
	var next = 0;
	var lastStop;
	
	var isCurrentlyLoading = false;
	
	var crossOrigin = 'anonymous';
	var baseUrl = '';
	
	var nextCallback;
	
	main.load = function(objUrl, callback)
	{
		queue(objUrl, callback);
		
		//checks if the newly queued object is next
		//start the queue if it is
		start();
	}
	
	main.multiload = function(objUrls, callback)
	{
		var objectsLoaded = [];
		var totalLoaded = 0;
		
		for (var i = 0; i < objUrls.length; i++)
		{
			queue(objUrls[i], function(object)
			{
				objectsLoaded.push(object);
				totalLoaded++;
				
				if (totalLoaded >= objUrls.length)
				{
					callback(objectsLoaded);
				}
			});
		}
		
		//checks if the newly queued object is next
		//start the queue if it is
		start();
	}
	
	function queue(objUrl, callback)
	{
		queueList.push([objUrl, callback]);
	}

	function dequeue()
	{
		//Nothing to get! Stop the queue and keep track of the last length of the list where we stopped
		if (next > queueList.length-1) { lastStop = queueList.length; return; }
		
		var object = queueList[next];
		next++;
		
		load(object);
	}
	
	function start()
	{
		if (next == lastStop || next == 0)
		{
			dequeue();
		}
	}
	
	function load(object)
	{
		var url = object[0];
		var callback = object[1];
		
		var file = getFileInfo(url);
		file.url = url;
		
		isCurrentlyLoading = true;
	
		nextCallback = callback;
		
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
				break
				
			default:
				console.log("UltimateLoader: File extension -" + file.ext + "- not recognized! Object -" + file.name + "- did not load.");
				dequeue(); //Move to the next object
				break;
		}
	}
	
	function getFileInfo(path)
	{
		var newPath = path.slice(0, path.lastIndexOf('/') + 1);
		if (newPath !== "" || newPath !== null)
		{
			baseUrl = newPath;
		}
		
		var file = path.substr(path.lastIndexOf('/') + 1);
		
		var s = file.split('.');
		var info = {name: s[0], ext: s[1]};
		
		return info;	
	}

	function loadOBJ(file)
	{
		var obj = file.name + '.obj';
		var mtl = file.name + '.mtl';
		
		var mtlLoader = new THREE.MTLLoader();
		
		mtlLoader.setPath(baseUrl);
		mtlLoader.setBaseUrl(baseUrl);
		mtlLoader.setCrossOrigin = crossOrigin;
		
		mtlLoader.load(mtl, function(materials) 
		{
			materials.preload();

			var objLoader = new THREE.OBJLoader();
			
			objLoader.setMaterials(materials);
			objLoader.setPath(baseUrl);
			objLoader.setCrossOrigin = crossOrigin;
			
			objLoader.load(obj, function (object)
			{
				console.log("UltimateLoader: Object " + file.name + " loaded!");
				handleOnLoad(object);
			}, onProgress, onError);
		});	
	}

	function loadJSON(file)
	{
		var loader = new THREE.ObjectLoader();
		
		loader.load(file.url, function (object) 
		{
			console.log("UltimateLoader: Object " + file.name + " loaded!");
			handleOnLoad(object);
		}, onProgress, onError);
	}

	function loadCollada(file)
	{
		var loader = new THREE.ColladaLoader();
		
		loader.load(file.url, function (collada) 
		{
			var object = collada.scene;
			
			console.log("UltimateLoader: Object " + file.name + " loaded!");
			handleOnLoad(object);
		}, onProgress, onError);
	}

	function loadglTF(file)
	{
		var loader = new THREE.glTFLoader();
		
		loader.load(file.url, function(gltf) 
		{
			var object = gltf.scene;
			
			console.log("UltimateLoader: Object " + file.name + " loaded!");
			handleOnLoad(object)
		}, onProgress, onError);
		
	}
	
	function onProgress(xhr) 
	{

	}

	function onError(xhr) 
	{ 
		
	};

	function handleOnLoad(object)
	{
		nextCallback(object);

		dequeue();
	}
	
})(UltimateLoader);