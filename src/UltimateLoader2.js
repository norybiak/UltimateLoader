/**
 * ULTIMATE LOADER
 * A tool to help load objects in Three.js
 * 
 * @Author NorybiaK
 * version 1.1.1
 */

var UltimateLoader = UltimateLoader || {};

(function(main) 
{ 'use strict';

	var sharedMtl = false;
	
	var scene = false;
	
	var crossOrigin = 'anonymous';
	
	var TRANSFORM_TYPES = ['position', 'rotation', 'scale'];
	
	var cached = {};
	
   /** 
    * bool UltimateLoader.autoload
	* Default is true
	* Auto load all objects
	* 
    */
	main.autoLoad = true;
		
   /** 
    * bool UltimateLoader.autoTransform
	* Default is true
	* Auto transform all objects
	* 
    */
	main.autoTransform = true;
	
	/** 
    * bool UltimateLoader.cache
	* Default is true
	* Whether UltimateLoader should cache objects
	* 
    */
	main.cache = true;

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
		console.time('Total');
		
		var toProcess = [];
		
		for (var i = 0; i < arguments.length; i++)
		{
			var arg = arguments[i];
			
			if (typeof arg === 'string')
			{
				var parsed = parseString(arg);
				
				if (parsed)
				{
					toProcess.push(parsed);
				}
			}
			else if (typeof arg === 'object')
			{
				if (Array.isArray(arg))
				{
					var parsed = [];
					
					for (var k = 0; k < arg.length; k++)
					{
						var parsed = parseString(arg[k]);				
				
						if (parsed)
						{
							toProcess.push(parsed);
						}
					}	
				}
				else if (arg instanceof THREE.Scene)
				{
					scene = arg;
				}
				else
				{
					var parsed = parseObject(arg);
					
					if (parsed.length === 0)
					{
						
					}
					
					for (var k = 0; k < parsed.length; k++)
					{
						if (parsed[k])
						{
							toProcess.push(parsed[k]);
						}
					}
				}
			}
		}
		
		return new Promise(function(resolve, reject) 
		{		
			var loader = new Loader();
			loader.load(toProcess, function(objects)
			{
				if (loader.complete) 
				{
					resolve(objects);
				}
				else 
				{
					reject();
				}
			});
		});
	}
	
	function parseString(string)
	{	
		var url = resolveURL(string);
		if (!url) { return; }
		
		var model = {};
		
		model.urlInfo = parseURL(url);
		model.shouldUpdate = false;
		
		if (model.urlInfo.ext === 'mtl')
		{
			sharedMtl = model.urlInfo;
			return;
		}
		
		return model;
	}
	
	function parseObject(object)
	{
		var parsed = [];
		
		traverse(object, function (p, config)
		{
			var url = resolveURL(config.url);
			if (!url) { return; }
		
			var model = {};
			
			model.urlInfo = parseURL(url);	
			model.object = config;
			model.shouldUpdate = true;
			model.name = p;
			model.parent = object;
			
			if (config.mtl)
			{
				var mtl = resolveURL(config.mtl);
				if (mtl) { model.mtl = parseURL(mtl); }
			}
			
			parsed.push(model);
	
		});
	
		return parsed;
		
	}
	
	function traverse(o,func) 
	{
		for (var i in o) 
		{
			func.apply(this,[i,o[i]]);  
			if (o[i] !== null && typeof(o[i])=="object") 
			{
				traverse(o[i],func);
			}
		}
	}

	function parseURL(url)
	{
		var base = url.slice(0, url.lastIndexOf('/') + 1);
	
		if (base === '' || base === null || base === 'undefined') { console.error('UltimateLoader: ' + name + ' failed to load as it must pass a valid url'); return; } //not a valid path

		var file = url.substr(url.lastIndexOf('/') + 1);
		
		var fileInfo = file.split('.');
		var filename = fileInfo[0];
		var fileExt = fileInfo[fileInfo.length-1].toLowerCase(); //We need to make sure we grab the extension and lower the case.

		var info = {name: filename, ext: fileExt, baseUrl: base, url: url};
		
		return info;	
	}
	
	function resolveURL(url) 
	{
		if(typeof url !== 'string' || url === '') return false;

		// Absolute URL
		if(/^https?:\/\//i.test(url)) return url;

		var absoluteUrl = new URL(url, location.href.substring(0, location.href.lastIndexOf('/') + 1));
		return absoluteUrl.toString();
	}
	
	function setParam(index, value, v)
	{
		switch (index) 
		{
			case 0: v.x = value; break;
			case 1: v.y = value; break;
			case 2: v.z = value; break;
			case 3: v.w = value; break;
			default: throw new Error( 'index is out of range: ' + index );
		}
	}
	
	function Loader()
	{
		this.count = 0;
		this.complete = false;
		this.size = 0;
		
		this.loadedObjects = [];
	}

	Loader.prototype.load = function(toProcess, callback)
	{
		this.size = toProcess.length;
		
		for (var i = 0; i < this.size; i++)
		{
			var model = toProcess[i];
			
			model.returnPosition = i;
			model.callback = callbackFunction.bind(this, model, callback);
			
			if (main.cache)
			{
				checkCache(model);
			}
			
			if (!model.fetchFromCache)
			{
				load(model);
			}
		}
	}
	
	function checkCache(model)
	{
		if (cached[model.urlInfo.url])
		{
			var cache = cached[model.urlInfo.url];
			
			if (cache.model.object3d)
			{
				cloneFromCache(model, cache);
			}
			else
			{
				cache.toClone.push(model);
			}		
			
			model.fetchFromCache = true;
		}
		else
		{
			cached[model.urlInfo.url] = { toClone: [], model: model };
			model.isCache = true;
		}
	}
	
	function cloneFromCache(model, cache)
	{
		model.object3d = cache.model.object3d.clone();

		model.object3d.position.set(0,0,0);
		model.object3d.rotation.set(0,0,0);
		model.object3d.quaternion.set(0,0,0,1);
		model.object3d.scale.set( 1, 1, 1 );
		
		model.object3d.traverse(function (child)
		{
			if (child instanceof THREE.Mesh)
			{
				child.material = child.material.clone();
			}
		});
		
		model.callback();
	}
	
	function callbackFunction(model, callback)
	{
		if (model.isCache)
		{
			var needsCloned = cached[model.urlInfo.url].toClone;
			
			for (var i = 0; i < needsCloned.length; i++)
			{
				cloneFromCache(needsCloned[i], cached[model.urlInfo.url]);
			}
		}
		
		if (model.shouldUpdate && main.autoTransform)
		{
			updateTransforms(model.object, model.object3d);
			model.parent[model.name] = model.object3d;
		}
		
		if (scene && main.autoLoad)
		{
			scene.add(model.object3d);
		}
		
		model.object3d.name = model.name || model.urlInfo.name;
		
		this.loadedObjects[model.returnPosition] = model.object3d;
		
		this.count++;
		if (this.count == this.size)
		{
			this.complete = true;
			
			if (this.loadedObjects.length == 1)
			{
				callback(this.loadedObjects[0]);
			}	
			else
			{
				callback(this.loadedObjects);
			}
			
			console.timeEnd('Total');
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
					var params;
					if (typeof object[transformType] === 'string')
					{
						params = object[transformType].split(' ');
						
						for (var k = 0; k < params.length; k++)
						{
							setParam(k, parseFloat(params[k]), loadedModel[transformType]);				
						}
					}
					else if (typeof object[transformType] === 'object')
					{
						var vec = new THREE.Vector3();
						
						var flag = true;
						for (var axis in object[transformType])
						{
							switch (axis)
							{
								case 'x': 	
								case 'y':
								case 'z':
									vec[axis] = object[transformType][axis];
									break;
									
								case 'w':
									var vec4 = new THREE.Vector4();
									
									vec4.copy(vec3);
									vec4.setW(object[transformType][axis])
									vec = vec4;
									break;
									
								default: 
									flag = false;
							}
						}
	
						if (flag)
						{
							loadedModel[transformType].copy(vec);		
							
						}
					}
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
	function load(model)
	{
		switch (model.urlInfo.ext)
		{
			case "obj":
				loadOBJ(model);
				break;
				
			case "json":
				loadJSON(model);
				break;
				
			case "dae":
				loadCollada(model);
				break;
				
			case "gltf":
			case "glb":
				loadglTF(model);
				break;
				
			case "png":	
			case "jpg":	
			case "jpeg":
				loadImage(model);
				break;
				
			default:
				console.log("UltimateLoader: model.urlInfo extension -" + model.urlInfo.ext + "- not recognized! Object -" + urlInfo.name + "- did not load.");
				break;
		}
	}
	
   /** 
	*	loadOBJ()
	*	.obj urlInfo found, attempt to load the .obj and .mtl.
	*
    */
	function loadOBJ(model)
	{
		var obj = model.urlInfo.name + '.obj';
		var mtl = model.urlInfo.name + '.mtl';
		var mtlBase = model.urlInfo.baseUrl;
		
		//Special case where mtl is provided in specific model
		if (model.mtl)
		{
			mtl = model.mtl.name + '.mtl';
			mtlBase = model.mtl.baseUrl;
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
			objLoader.setPath(model.urlInfo.baseUrl);
			
			objLoader.load(obj, function (object)
			{
				model.object3d = object;
				handleOnLoad(model);
			}, onProgress, onError);
		});	
	}

   /** 
	*	loadJSON()
	*	.json model.urlInfo found, attempt to load it.
	*
    */
	function loadJSON(model)
	{
		var loader = new THREE.ObjectLoader();
		
		loader.load(model.urlInfo.url, function (object) 
		{
			model.object3d = object;
			handleOnLoad(model);
		}, onProgress, onError);
	}
	
   /** 
	*	loadCollada()
	*	.dae model.urlInfo found, attempt to load it.
	*
    */
	function loadCollada(model)
	{
		var loader = new THREE.ColladaLoader();
		
		loader.load(model.urlInfo.url, function (collada) 
		{
			var object = collada.scene;
			
			model.object3d = object;
			handleOnLoad(model);
		}, onProgress, onError);
	}
	
	
   /** 
	*	loadImage()
	*	.png or .jpeg model.urlInfo found, attempt to load it.
	*	Adds texture to a plane. User may change the default plane transform via callback.
	*
    */
	function loadImage(model)
	{
		var loader = new THREE.TextureLoader();
		
		loader.load(model.urlInfo.url, function(texture) 
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

			model.object3d = object;
			handleOnLoad(model);
		}, onProgress, onError);
	}
	
   /** EXPERIMENTAL
	*	loadgltf()
	*	.gltf or .glb model.urlInfo found, attempt to load it.
	*	This one is iffy and doesn't have full proper implementaion. May not work properly.
	*
    */
	function loadglTF(model)
	{
		var loader = new THREE.GLTFLoader();
		
		loader.load(model.urlInfo.url, function(gltf) 
		{
			var object = gltf.scene;
			
			model.object3d = object;
			
			handleOnLoad(model);
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
	function handleOnLoad(model)
	{
		console.log("Object " + model.urlInfo.name + " loaded!");
		console.log('-------------------------------------------');
		
		model.callback();
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

if (window.AFRAME)
{
	AFRAME.registerComponent('ultimate-loader', 
	{
		schema: 
		{ 
			src: { type: 'string', default: '' } 
		},

		init: function () 
		{
			var self = this;
			
		},
		
		update: function ()
		{
			var self = this;
			
			UltimateLoader.load(self.data.src).then(function(object)
			{
				 self.el.setObject3D('mesh', object);
			});
		}
	});
}