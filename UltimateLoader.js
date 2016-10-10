/**
 * ULTIMATE LOADER
 * A tool to help load objects in Three.js (for Altspace)
 * 
 * @Author NorybiaK
 * version 1.1
 */

var UltimateLoader = UltimateLoader || {};

(function(main) 
{ 'use strict';

	//A list containing all of the objects loaded by file name (used for cloning)
	var listOfObjectFilesLoaded = {};

	var queueList = [];
	var next = 0;
	var lastStop;
	
	var isCurrentlyLoading = false;
	
	var crossOrigin = 'anonymous';
	var baseUrl = '';
	
	var nextCallback;
	
	var useQueue = false;

	main.load = function(objUrl, callback)
	{
		if (useQueue)
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
	
	main.multiload = function(objUrls, callback)
	{
		var objectsLoaded = [];
		var totalLoaded = 0;
		
		var callbackFunction = function(object)
		{
			objectsLoaded.push(object);
			totalLoaded++;
			
			if (totalLoaded >= objUrls.length)
			{
				callback(objectsLoaded);
			}
		};
		
		for (var i = 0; i < objUrls.length; i++)
		{
			if (useQueue)
			{
				queue(objUrls[i], callbackFunction);
			}
			else
			{
				var arr = [objUrls[i], callbackFunction];
			
				load(arr);
			}
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
	
	function start()
	{
		if (next == 0)
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
		file.callback = callback;
		
		isCurrentlyLoading = true;
	
		nextCallback = callback;
	
		var name = file.name;
		if (listOfObjectFilesLoaded[name])
		{
			file.callback(loaded.clone());
			console.log("Ultimate Loader: Object is already loaded ... cloning!");
		}
		else
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
					break
					
				case "png":
					loadImage(file);
					break
					
				case "jpg":
					loadImage(file);
					break
					
				case "jpeg":
					loadImage(file);
					break
					
				default:
					console.log("UltimateLoader: File extension -" + file.ext + "- not recognized! Object -" + file.name + "- did not load.");
					dequeue(); //Move to the next object
					break;
			}
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
		var info = {name: s[0], ext: s[1], baseUrl: newPath};
		
		return info;	
	}

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
				console.log("UltimateLoader: Object " + file.name + " loaded!");
				handleOnLoad(object, file);
			}, onProgress, onError);
		});	
	}

	function loadJSON(file)
	{
		var loader = new THREE.ObjectLoader();
		
		loader.load(file.url, function (object) 
		{
			console.log("UltimateLoader: Object " + file.name + " loaded!");
			handleOnLoad(object, file);
		}, onProgress, onError);
	}

	function loadCollada(file)
	{
		var loader = new THREE.ColladaLoader();
		
		loader.load(file.url, function (collada) 
		{
			var object = collada.scene;
			
			console.log("UltimateLoader: Object " + file.name + " loaded!");
			handleOnLoad(object, file);
		}, onProgress, onError);
	}

	function loadglTF(file)
	{
		var loader = new THREE.glTFLoader();
		
		loader.load(file.url, function(gltf) 
		{
			var object = gltf.scene;
			
			console.log("UltimateLoader: Object " + file.name + " loaded!");
			handleOnLoad(object, file)
		}, onProgress, onError);
		
	}
	
	function loadImage(file)
	{
		var loader = new THREE.TextureLoader();
		
		loader.load(file.url, function (texture) 
		{
			var geometry = new THREE.PlaneGeometry( 32, 20, 32 );
			var material = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
			var plane = new THREE.Mesh( geometry, material );
	
			console.log("UltimateLoader: Object " + file.name + " loaded!");
			handleOnLoad(plane, file)
		}, onProgress, onError);
	}
	
	function onProgress(xhr) 
	{

	}

	function onError(xhr) 
	{ 
		
	}

	function handleOnLoad(object, file)
	{
		listOfObjectFilesLoaded[file.name] = object;

		file.callback(object);
		
		if (useQueue)
		{
			dequeue();
		}	
	}
	
})(UltimateLoader);