/**
 * This file is a collection of object loaders for THREE.js
 * 
 *
 *
 
 */



/**
 * Loads a Wavefront .mtl file specifying materials
 *
 * @author angelxuanchang
 */

THREE.MTLLoader = function( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.MTLLoader.prototype = {

	constructor: THREE.MTLLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.XHRLoader( this.manager );
		loader.setPath( this.path );
		loader.load( url, function ( text ) {

			onLoad( scope.parse( text ) );

		}, onProgress, onError );

	},

	setPath: function ( value ) {

		this.path = value;

	},

	setBaseUrl: function( value ) {

		// TODO: Merge with setPath()? Or rename to setTexturePath?

		this.baseUrl = value;

	},

	setCrossOrigin: function ( value ) {

		this.crossOrigin = value;

	},

	setMaterialOptions: function ( value ) {

		this.materialOptions = value;

	},

	/**
	 * Parses loaded MTL file
	 * @param text - Content of MTL file
	 * @return {THREE.MTLLoader.MaterialCreator}
	 */
	parse: function ( text ) {

		var lines = text.split( "\n" );
		var info = {};
		var delimiter_pattern = /\s+/;
		var materialsInfo = {};

		for ( var i = 0; i < lines.length; i ++ ) {

			var line = lines[ i ];
			line = line.trim();

			if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

				// Blank line or comment ignore
				continue;

			}

			var pos = line.indexOf( ' ' );

			var key = ( pos >= 0 ) ? line.substring( 0, pos ) : line;
			key = key.toLowerCase();

			var value = ( pos >= 0 ) ? line.substring( pos + 1 ) : "";
			value = value.trim();

			if ( key === "newmtl" ) {

				// New material

				info = { name: value };
				materialsInfo[ value ] = info;

			} else if ( info ) {

				if ( key === "ka" || key === "kd" || key === "ks" ) {

					var ss = value.split( delimiter_pattern, 3 );
					info[ key ] = [ parseFloat( ss[ 0 ] ), parseFloat( ss[ 1 ] ), parseFloat( ss[ 2 ] ) ];

				} else {

					info[ key ] = value;

				}

			}

		}

		var materialCreator = new THREE.MTLLoader.MaterialCreator( this.baseUrl, this.materialOptions );
		materialCreator.setCrossOrigin( this.crossOrigin );
		materialCreator.setManager( this.manager );
		materialCreator.setMaterials( materialsInfo );
		return materialCreator;

	}

};

/**
 * Create a new THREE-MTLLoader.MaterialCreator
 * @param baseUrl - Url relative to which textures are loaded
 * @param options - Set of options on how to construct the materials
 *                  side: Which side to apply the material
 *                        THREE.FrontSide (default), THREE.BackSide, THREE.DoubleSide
 *                  wrap: What type of wrapping to apply for textures
 *                        THREE.RepeatWrapping (default), THREE.ClampToEdgeWrapping, THREE.MirroredRepeatWrapping
 *                  normalizeRGB: RGBs need to be normalized to 0-1 from 0-255
 *                                Default: false, assumed to be already normalized
 *                  ignoreZeroRGBs: Ignore values of RGBs (Ka,Kd,Ks) that are all 0's
 *                                  Default: false
 * @constructor
 */

THREE.MTLLoader.MaterialCreator = function( baseUrl, options ) {

	this.baseUrl = baseUrl;
	this.options = options;
	this.materialsInfo = {};
	this.materials = {};
	this.materialsArray = [];
	this.nameLookup = {};

	this.side = ( this.options && this.options.side ) ? this.options.side : THREE.FrontSide;
	this.wrap = ( this.options && this.options.wrap ) ? this.options.wrap : THREE.RepeatWrapping;

};

THREE.MTLLoader.MaterialCreator.prototype = {

	constructor: THREE.MTLLoader.MaterialCreator,

	setCrossOrigin: function ( value ) {

		this.crossOrigin = value;

	},

	setManager: function ( value ) {

		this.manager = value;

	},

	setMaterials: function( materialsInfo ) {

		this.materialsInfo = this.convert( materialsInfo );
		this.materials = {};
		this.materialsArray = [];
		this.nameLookup = {};

	},

	convert: function( materialsInfo ) {

		if ( ! this.options ) return materialsInfo;

		var converted = {};

		for ( var mn in materialsInfo ) {

			// Convert materials info into normalized form based on options

			var mat = materialsInfo[ mn ];

			var covmat = {};

			converted[ mn ] = covmat;

			for ( var prop in mat ) {

				var save = true;
				var value = mat[ prop ];
				var lprop = prop.toLowerCase();

				switch ( lprop ) {

					case 'kd':
					case 'ka':
					case 'ks':

						// Diffuse color (color under white light) using RGB values

						if ( this.options && this.options.normalizeRGB ) {

							value = [ value[ 0 ] / 255, value[ 1 ] / 255, value[ 2 ] / 255 ];

						}

						if ( this.options && this.options.ignoreZeroRGBs ) {

							if ( value[ 0 ] === 0 && value[ 1 ] === 0 && value[ 1 ] === 0 ) {

								// ignore

								save = false;

							}

						}

						break;

					default:

						break;
				}

				if ( save ) {

					covmat[ lprop ] = value;

				}

			}

		}

		return converted;

	},

	preload: function () {

		for ( var mn in this.materialsInfo ) {

			this.create( mn );

		}

	},

	getIndex: function( materialName ) {

		return this.nameLookup[ materialName ];

	},

	getAsArray: function() {

		var index = 0;

		for ( var mn in this.materialsInfo ) {

			this.materialsArray[ index ] = this.create( mn );
			this.nameLookup[ mn ] = index;
			index ++;

		}

		return this.materialsArray;

	},

	create: function ( materialName ) {

		if ( this.materials[ materialName ] === undefined ) {

			this.createMaterial_( materialName );

		}

		return this.materials[ materialName ];

	},

	createMaterial_: function ( materialName ) {

		// Create material

		var mat = this.materialsInfo[ materialName ];
		var params = {

			name: materialName,
			side: this.side

		};

		for ( var prop in mat ) {

			var value = mat[ prop ];

			if ( value === '' ) continue;

			switch ( prop.toLowerCase() ) {

				// Ns is material specular exponent

				case 'kd':

					// Diffuse color (color under white light) using RGB values

					params[ 'color' ] = new THREE.Color().fromArray( value );

					break;

				case 'ks':

					// Specular color (color when light is reflected from shiny surface) using RGB values
					params[ 'specular' ] = new THREE.Color().fromArray( value );

					break;

				case 'map_kd':

					// Diffuse texture map

					params[ 'map' ] = this.loadTexture( this.baseUrl + value );
					params[ 'map' ].wrapS = this.wrap;
					params[ 'map' ].wrapT = this.wrap;

					break;

				case 'ns':

					// The specular exponent (defines the focus of the specular highlight)
					// A high exponent results in a tight, concentrated highlight. Ns values normally range from 0 to 1000.

					params[ 'shininess' ] = parseFloat( value );

					break;

				case 'd':

					if ( value < 1 ) {

						params[ 'opacity' ] = value;
						params[ 'transparent' ] = true;

					}

					break;

				case 'Tr':

					if ( value > 0 ) {

						params[ 'opacity' ] = 1 - value;
						params[ 'transparent' ] = true;

					}

					break;

				case 'map_bump':
				case 'bump':

					// Bump texture map

					if ( params[ 'bumpMap' ] ) break; // Avoid loading twice.

					params[ 'bumpMap' ] = this.loadTexture( this.baseUrl + value );
					params[ 'bumpMap' ].wrapS = this.wrap;
					params[ 'bumpMap' ].wrapT = this.wrap;

					break;

				default:
					break;

			}

		}

		this.materials[ materialName ] = new THREE.MeshPhongMaterial( params );
		return this.materials[ materialName ];

	},


	loadTexture: function ( url, mapping, onLoad, onProgress, onError ) {

		var texture;
		var loader = THREE.Loader.Handlers.get( url );
		var manager = ( this.manager !== undefined ) ? this.manager : THREE.DefaultLoadingManager;

		if ( loader === null ) {

			loader = new THREE.TextureLoader( manager );

		}

		if ( loader.setCrossOrigin ) loader.setCrossOrigin( this.crossOrigin );
		texture = loader.load( url, onLoad, onProgress, onError );

		if ( mapping !== undefined ) texture.mapping = mapping;

		return texture;

	}

};

THREE.EventDispatcher.prototype.apply( THREE.MTLLoader.prototype );



/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.OBJLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

	this.materials = null;

};

THREE.OBJLoader.prototype = {

	constructor: THREE.OBJLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.XHRLoader( scope.manager );
		loader.setPath( this.path );
		loader.load( url, function ( text ) {

			onLoad( scope.parse( text ) );

		}, onProgress, onError );

	},

	setPath: function ( value ) {

		this.path = value;

	},

	setMaterials: function ( materials ) {

		this.materials = materials;

	},

	parse: function ( text ) {

		console.time( 'OBJLoader' );

		var objects = [];
		var object;
		var foundObjects = false;
		var vertices = [];
		var normals = [];
		var uvs = [];

		function addObject( name ) {

			var geometry = {
				vertices: [],
				normals: [],
				uvs: []
			};

			var material = {
				name: '',
				smooth: true
			};

			object = {
				name: name,
				geometry: geometry,
				material: material
			};

			objects.push( object );

		}

		function parseVertexIndex( value ) {

			var index = parseInt( value );

			return ( index >= 0 ? index - 1 : index + vertices.length / 3 ) * 3;

		}

		function parseNormalIndex( value ) {

			var index = parseInt( value );

			return ( index >= 0 ? index - 1 : index + normals.length / 3 ) * 3;

		}

		function parseUVIndex( value ) {

			var index = parseInt( value );

			return ( index >= 0 ? index - 1 : index + uvs.length / 2 ) * 2;

		}

		function addVertex( a, b, c ) {

			object.geometry.vertices.push(
				vertices[ a ], vertices[ a + 1 ], vertices[ a + 2 ],
				vertices[ b ], vertices[ b + 1 ], vertices[ b + 2 ],
				vertices[ c ], vertices[ c + 1 ], vertices[ c + 2 ]
			);

		}

		function addNormal( a, b, c ) {

			object.geometry.normals.push(
				normals[ a ], normals[ a + 1 ], normals[ a + 2 ],
				normals[ b ], normals[ b + 1 ], normals[ b + 2 ],
				normals[ c ], normals[ c + 1 ], normals[ c + 2 ]
			);

		}

		function addUV( a, b, c ) {

			object.geometry.uvs.push(
				uvs[ a ], uvs[ a + 1 ],
				uvs[ b ], uvs[ b + 1 ],
				uvs[ c ], uvs[ c + 1 ]
			);

		}

		function addFace( a, b, c, d,  ua, ub, uc, ud, na, nb, nc, nd ) {

			var ia = parseVertexIndex( a );
			var ib = parseVertexIndex( b );
			var ic = parseVertexIndex( c );
			var id;

			if ( d === undefined ) {

				addVertex( ia, ib, ic );

			} else {

				id = parseVertexIndex( d );

				addVertex( ia, ib, id );
				addVertex( ib, ic, id );

			}

			if ( ua !== undefined ) {

				ia = parseUVIndex( ua );
				ib = parseUVIndex( ub );
				ic = parseUVIndex( uc );

				if ( d === undefined ) {

					addUV( ia, ib, ic );

				} else {

					id = parseUVIndex( ud );

					addUV( ia, ib, id );
					addUV( ib, ic, id );

				}

			}

			if ( na !== undefined ) {

				ia = parseNormalIndex( na );
				ib = parseNormalIndex( nb );
				ic = parseNormalIndex( nc );

				if ( d === undefined ) {

					addNormal( ia, ib, ic );

				} else {

					id = parseNormalIndex( nd );

					addNormal( ia, ib, id );
					addNormal( ib, ic, id );

				}

			}

		}

		addObject( '' );

		// v float float float
		var vertex_pattern = /^v\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/;

		// vn float float float
		var normal_pattern = /^vn\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/;

		// vt float float
		var uv_pattern = /^vt\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/;

		// f vertex vertex vertex ...
		var face_pattern1 = /^f\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)(?:\s+(-?\d+))?/;

		// f vertex/uv vertex/uv vertex/uv ...
		var face_pattern2 = /^f\s+((-?\d+)\/(-?\d+))\s+((-?\d+)\/(-?\d+))\s+((-?\d+)\/(-?\d+))(?:\s+((-?\d+)\/(-?\d+)))?/;

		// f vertex/uv/normal vertex/uv/normal vertex/uv/normal ...
		var face_pattern3 = /^f\s+((-?\d+)\/(-?\d+)\/(-?\d+))\s+((-?\d+)\/(-?\d+)\/(-?\d+))\s+((-?\d+)\/(-?\d+)\/(-?\d+))(?:\s+((-?\d+)\/(-?\d+)\/(-?\d+)))?/;

		// f vertex//normal vertex//normal vertex//normal ...
		var face_pattern4 = /^f\s+((-?\d+)\/\/(-?\d+))\s+((-?\d+)\/\/(-?\d+))\s+((-?\d+)\/\/(-?\d+))(?:\s+((-?\d+)\/\/(-?\d+)))?/;

		var object_pattern = /^[og]\s+(.+)/;

		var smoothing_pattern = /^s\s+(\d+|on|off)/;

		//

		var lines = text.split( '\n' );

		for ( var i = 0; i < lines.length; i ++ ) {

			var line = lines[ i ];
			line = line.trim();

			var result;

			if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

				continue;

			} else if ( ( result = vertex_pattern.exec( line ) ) !== null ) {

				// ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

				vertices.push(
					parseFloat( result[ 1 ] ),
					parseFloat( result[ 2 ] ),
					parseFloat( result[ 3 ] )
				);

			} else if ( ( result = normal_pattern.exec( line ) ) !== null ) {

				// ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

				normals.push(
					parseFloat( result[ 1 ] ),
					parseFloat( result[ 2 ] ),
					parseFloat( result[ 3 ] )
				);

			} else if ( ( result = uv_pattern.exec( line ) ) !== null ) {

				// ["vt 0.1 0.2", "0.1", "0.2"]

				uvs.push(
					parseFloat( result[ 1 ] ),
					parseFloat( result[ 2 ] )
				);

			} else if ( ( result = face_pattern1.exec( line ) ) !== null ) {

				// ["f 1 2 3", "1", "2", "3", undefined]

				addFace(
					result[ 1 ], result[ 2 ], result[ 3 ], result[ 4 ]
				);

			} else if ( ( result = face_pattern2.exec( line ) ) !== null ) {

				// ["f 1/1 2/2 3/3", " 1/1", "1", "1", " 2/2", "2", "2", " 3/3", "3", "3", undefined, undefined, undefined]

				addFace(
					result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ],
					result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ]
				);

			} else if ( ( result = face_pattern3.exec( line ) ) !== null ) {

				// ["f 1/1/1 2/2/2 3/3/3", " 1/1/1", "1", "1", "1", " 2/2/2", "2", "2", "2", " 3/3/3", "3", "3", "3", undefined, undefined, undefined, undefined]

				addFace(
					result[ 2 ], result[ 6 ], result[ 10 ], result[ 14 ],
					result[ 3 ], result[ 7 ], result[ 11 ], result[ 15 ],
					result[ 4 ], result[ 8 ], result[ 12 ], result[ 16 ]
				);

			} else if ( ( result = face_pattern4.exec( line ) ) !== null ) {

				// ["f 1//1 2//2 3//3", " 1//1", "1", "1", " 2//2", "2", "2", " 3//3", "3", "3", undefined, undefined, undefined]

				addFace(
					result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ],
					undefined, undefined, undefined, undefined,
					result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ]
				);

			} else if ( ( result = object_pattern.exec( line ) ) !== null ) {

				// o object_name
				// or
				// g group_name

				var name = result[ 1 ].trim();

				if ( foundObjects === false ) {

					foundObjects = true;
					object.name = name;

				} else {

					addObject( name );

				}

			} else if ( /^usemtl /.test( line ) ) {

				// material

				object.material.name = line.substring( 7 ).trim();

			} else if ( /^mtllib /.test( line ) ) {

				// mtl file

			} else if ( ( result = smoothing_pattern.exec( line ) ) !== null ) {

				// smooth shading

				object.material.smooth = result[ 1 ] === "1" || result[ 1 ] === "on";

			} else {

				throw new Error( "Unexpected line: " + line );

			}

		}

		var container = new THREE.Group();

		for ( var i = 0, l = objects.length; i < l; i ++ ) {

			object = objects[ i ];
			var geometry = object.geometry;

			var buffergeometry = new THREE.BufferGeometry();

			buffergeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( geometry.vertices ), 3 ) );

			if ( geometry.normals.length > 0 ) {

				buffergeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( geometry.normals ), 3 ) );

			} else {

				buffergeometry.computeVertexNormals();

			}

			if ( geometry.uvs.length > 0 ) {

				buffergeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( geometry.uvs ), 2 ) );

			}

			var material;

			if ( this.materials !== null ) {

				material = this.materials.create( object.material.name );

			}

			if ( !material ) {

				material = new THREE.MeshPhongMaterial();
				material.name = object.material.name;

			}

			material.shading = object.material.smooth ? THREE.SmoothShading : THREE.FlatShading;

			var mesh = new THREE.Mesh( buffergeometry, material );
			mesh.name = object.name;

			container.add( mesh );

		}

		console.timeEnd( 'OBJLoader' );

		return container;

	}

};






/**
* @author Tim Knip / http://www.floorplanner.com/ / tim at floorplanner.com
* @author Tony Parisi / http://www.tonyparisi.com/
*/

THREE.ColladaLoader = function () {

	var COLLADA = null;
	var scene = null;
	var visualScene;
	var kinematicsModel;

	var readyCallbackFunc = null;

	var sources = {};
	var images = {};
	var animations = {};
	var controllers = {};
	var geometries = {};
	var materials = {};
	var effects = {};
	var cameras = {};
	var lights = {};

	var animData;
	var kinematics;
	var visualScenes;
	var kinematicsModels;
	var baseUrl;
	var morphs;
	var skins;

	var flip_uv = true;
	var preferredShading = THREE.SmoothShading;

	var options = {
		// Force Geometry to always be centered at the local origin of the
		// containing Mesh.
		centerGeometry: false,

		// Axis conversion is done for geometries, animations, and controllers.
		// If we ever pull cameras or lights out of the COLLADA file, they'll
		// need extra work.
		convertUpAxis: false,

		subdivideFaces: true,

		upAxis: 'Y',

		// For reflective or refractive materials we'll use this cubemap
		defaultEnvMap: null

	};

	var colladaUnit = 1.0;
	var colladaUp = 'Y';
	var upConversion = null;

	function load ( url, readyCallback, progressCallback, failCallback ) {

		var length = 0;

		if ( document.implementation && document.implementation.createDocument ) {

			var request = new XMLHttpRequest();

			request.onreadystatechange = function() {

				if ( request.readyState === 4 ) {

					if ( request.status === 0 || request.status === 200 ) {

						if ( request.response ) {

							readyCallbackFunc = readyCallback;
							parse( request.response, undefined, url );

						} else {

							if ( failCallback ) {

								failCallback();

							} else {

								console.error( "ColladaLoader: Empty or non-existing file (" + url + ")" );

							}

						}

					}

				} else if ( request.readyState === 3 ) {

					if ( progressCallback ) {

						if ( length === 0 ) {

							length = request.getResponseHeader( "Content-Length" );

						}

						progressCallback( { total: length, loaded: request.responseText.length } );

					}

				}

			};

			request.open( "GET", url, true );
			request.send( null );

		} else {

			alert( "Don't know how to parse XML!" );

		}

	}

	function parse( text, callBack, url ) {

		COLLADA = new DOMParser().parseFromString( text, 'text/xml' );
		callBack = callBack || readyCallbackFunc;

		if ( url !== undefined ) {

			var parts = url.split( '/' );
			parts.pop();
			baseUrl = ( parts.length < 1 ? '.' : parts.join( '/' ) ) + '/';

		}

		parseAsset();
		setUpConversion();
		images = parseLib( "library_images image", _Image, "image" );
		materials = parseLib( "library_materials material", Material, "material" );
		effects = parseLib( "library_effects effect", Effect, "effect" );
		geometries = parseLib( "library_geometries geometry", Geometry, "geometry" );
		cameras = parseLib( "library_cameras camera", Camera, "camera" );
		lights = parseLib( "library_lights light", Light, "light" );
		controllers = parseLib( "library_controllers controller", Controller, "controller" );
		animations = parseLib( "library_animations animation", Animation, "animation" );
		visualScenes = parseLib( "library_visual_scenes visual_scene", VisualScene, "visual_scene" );
		kinematicsModels = parseLib( "library_kinematics_models kinematics_model", KinematicsModel, "kinematics_model" );

		morphs = [];
		skins = [];

		visualScene = parseScene();
		scene = new THREE.Group();

		for ( var i = 0; i < visualScene.nodes.length; i ++ ) {

			scene.add( createSceneGraph( visualScene.nodes[ i ] ) );

		}

		// unit conversion
		scene.scale.multiplyScalar( colladaUnit );

		createAnimations();

		kinematicsModel = parseKinematicsModel();
		createKinematics();

		var result = {

			scene: scene,
			morphs: morphs,
			skins: skins,
			animations: animData,
			kinematics: kinematics,
			dae: {
				images: images,
				materials: materials,
				cameras: cameras,
				lights: lights,
				effects: effects,
				geometries: geometries,
				controllers: controllers,
				animations: animations,
				visualScenes: visualScenes,
				visualScene: visualScene,
				scene: visualScene,
				kinematicsModels: kinematicsModels,
				kinematicsModel: kinematicsModel
			}

		};

		if ( callBack ) {

			callBack( result );

		}

		return result;

	}

	function setPreferredShading ( shading ) {

		preferredShading = shading;

	}

	function parseAsset () {

		var elements = COLLADA.querySelectorAll('asset');

		var element = elements[0];

		if ( element && element.childNodes ) {

			for ( var i = 0; i < element.childNodes.length; i ++ ) {

				var child = element.childNodes[ i ];

				switch ( child.nodeName ) {

					case 'unit':

						var meter = child.getAttribute( 'meter' );

						if ( meter ) {

							colladaUnit = parseFloat( meter );

						}

						break;

					case 'up_axis':

						colladaUp = child.textContent.charAt(0);
						break;

				}

			}

		}

	}

	function parseLib ( q, classSpec, prefix ) {

		var elements = COLLADA.querySelectorAll(q);

		var lib = {};

		var i = 0;

		var elementsLength = elements.length;

		for ( var j = 0; j < elementsLength; j ++ ) {

			var element = elements[j];
			var daeElement = ( new classSpec() ).parse( element );

			if ( !daeElement.id || daeElement.id.length === 0 ) daeElement.id = prefix + ( i ++ );
			lib[ daeElement.id ] = daeElement;

		}

		return lib;

	}

	function parseScene() {

		var sceneElement = COLLADA.querySelectorAll('scene instance_visual_scene')[0];

		if ( sceneElement ) {

			var url = sceneElement.getAttribute( 'url' ).replace( /^#/, '' );
			return visualScenes[ url.length > 0 ? url : 'visual_scene0' ];

		} else {

			return null;

		}

	}

	function parseKinematicsModel() {

		var kinematicsModelElement = COLLADA.querySelectorAll('instance_kinematics_model')[0];

		if ( kinematicsModelElement ) {

			var url = kinematicsModelElement.getAttribute( 'url' ).replace(/^#/, '');
			return kinematicsModels[ url.length > 0 ? url : 'kinematics_model0' ];

		} else {

			return null;

		}

	}

	function createAnimations() {

		animData = [];

		// fill in the keys
		recurseHierarchy( scene );

	}

	function recurseHierarchy( node ) {

		var n = visualScene.getChildById( node.colladaId, true ),
			newData = null;

		if ( n && n.keys ) {

			newData = {
				fps: 60,
				hierarchy: [ {
					node: n,
					keys: n.keys,
					sids: n.sids
				} ],
				node: node,
				name: 'animation_' + node.name,
				length: 0
			};

			animData.push(newData);

			for ( var i = 0, il = n.keys.length; i < il; i ++ ) {

				newData.length = Math.max( newData.length, n.keys[i].time );

			}

		} else {

			newData = {
				hierarchy: [ {
					keys: [],
					sids: []
				} ]
			}

		}

		for ( var i = 0, il = node.children.length; i < il; i ++ ) {

			var d = recurseHierarchy( node.children[i] );

			for ( var j = 0, jl = d.hierarchy.length; j < jl; j ++ ) {

				newData.hierarchy.push( {
					keys: [],
					sids: []
				} );

			}

		}

		return newData;

	}

	function calcAnimationBounds () {

		var start = 1000000;
		var end = -start;
		var frames = 0;
		var ID;
		for ( var id in animations ) {

			var animation = animations[ id ];
			ID = ID || animation.id;
			for ( var i = 0; i < animation.sampler.length; i ++ ) {

				var sampler = animation.sampler[ i ];

				sampler.create();

				start = Math.min( start, sampler.startTime );
				end = Math.max( end, sampler.endTime );
				frames = Math.max( frames, sampler.input.length );

			}

		}

		return { start:start, end:end, frames:frames,ID:ID };

	}

	function createMorph ( geometry, ctrl ) {

		var morphCtrl = ctrl instanceof InstanceController ? controllers[ ctrl.url ] : ctrl;

		if ( !morphCtrl || !morphCtrl.morph ) {

			console.log("could not find morph controller!");
			return;

		}

		var morph = morphCtrl.morph;

		for ( var i = 0; i < morph.targets.length; i ++ ) {

			var target_id = morph.targets[ i ];
			var daeGeometry = geometries[ target_id ];

			if ( !daeGeometry.mesh ||
				 !daeGeometry.mesh.primitives ||
				 !daeGeometry.mesh.primitives.length ) {
				 continue;
			}

			var target = daeGeometry.mesh.primitives[ 0 ].geometry;

			if ( target.vertices.length === geometry.vertices.length ) {

				geometry.morphTargets.push( { name: "target_1", vertices: target.vertices } );

			}

		}

		geometry.morphTargets.push( { name: "target_Z", vertices: geometry.vertices } );

	}

	function createSkin ( geometry, ctrl, applyBindShape ) {

		var skinCtrl = controllers[ ctrl.url ];

		if ( !skinCtrl || !skinCtrl.skin ) {

			console.log( "could not find skin controller!" );
			return;

		}

		if ( !ctrl.skeleton || !ctrl.skeleton.length ) {

			console.log( "could not find the skeleton for the skin!" );
			return;

		}

		var skin = skinCtrl.skin;
		var skeleton = visualScene.getChildById( ctrl.skeleton[ 0 ] );
		var hierarchy = [];

		applyBindShape = applyBindShape !== undefined ? applyBindShape : true;

		var bones = [];
		geometry.skinWeights = [];
		geometry.skinIndices = [];

		//createBones( geometry.bones, skin, hierarchy, skeleton, null, -1 );
		//createWeights( skin, geometry.bones, geometry.skinIndices, geometry.skinWeights );

		/*
		geometry.animation = {
			name: 'take_001',
			fps: 30,
			length: 2,
			JIT: true,
			hierarchy: hierarchy
		};
		*/

		if ( applyBindShape ) {

			for ( var i = 0; i < geometry.vertices.length; i ++ ) {

				geometry.vertices[ i ].applyMatrix4( skin.bindShapeMatrix );

			}

		}

	}

	function setupSkeleton ( node, bones, frame, parent ) {

		node.world = node.world || new THREE.Matrix4();
		node.localworld = node.localworld || new THREE.Matrix4();
		node.world.copy( node.matrix );
		node.localworld.copy( node.matrix );

		if ( node.channels && node.channels.length ) {

			var channel = node.channels[ 0 ];
			var m = channel.sampler.output[ frame ];

			if ( m instanceof THREE.Matrix4 ) {

				node.world.copy( m );
				node.localworld.copy(m);
				if (frame === 0)
					node.matrix.copy(m);
			}

		}

		if ( parent ) {

			node.world.multiplyMatrices( parent, node.world );

		}

		bones.push( node );

		for ( var i = 0; i < node.nodes.length; i ++ ) {

			setupSkeleton( node.nodes[ i ], bones, frame, node.world );

		}

	}

	function setupSkinningMatrices ( bones, skin ) {

		// FIXME: this is dumb...

		for ( var i = 0; i < bones.length; i ++ ) {

			var bone = bones[ i ];
			var found = -1;

			if ( bone.type != 'JOINT' ) continue;

			for ( var j = 0; j < skin.joints.length; j ++ ) {

				if ( bone.sid === skin.joints[ j ] ) {

					found = j;
					break;

				}

			}

			if ( found >= 0 ) {

				var inv = skin.invBindMatrices[ found ];

				bone.invBindMatrix = inv;
				bone.skinningMatrix = new THREE.Matrix4();
				bone.skinningMatrix.multiplyMatrices(bone.world, inv); // (IBMi * JMi)
				bone.animatrix = new THREE.Matrix4();

				bone.animatrix.copy(bone.localworld);
				bone.weights = [];

				for ( var j = 0; j < skin.weights.length; j ++ ) {

					for (var k = 0; k < skin.weights[ j ].length; k ++ ) {

						var w = skin.weights[ j ][ k ];

						if ( w.joint === found ) {

							bone.weights.push( w );

						}

					}

				}

			} else {

				console.warn( "ColladaLoader: Could not find joint '" + bone.sid + "'." );

				bone.skinningMatrix = new THREE.Matrix4();
				bone.weights = [];

			}
		}

	}

	//Walk the Collada tree and flatten the bones into a list, extract the position, quat and scale from the matrix
	function flattenSkeleton(skeleton) {

		var list = [];
		var walk = function(parentid, node, list) {

			var bone = {};
			bone.name = node.sid;
			bone.parent = parentid;
			bone.matrix = node.matrix;
			var data = [ new THREE.Vector3(),new THREE.Quaternion(),new THREE.Vector3() ];
			bone.matrix.decompose(data[0], data[1], data[2]);

			bone.pos = [ data[0].x,data[0].y,data[0].z ];

			bone.scl = [ data[2].x,data[2].y,data[2].z ];
			bone.rotq = [ data[1].x,data[1].y,data[1].z,data[1].w ];
			list.push(bone);

			for (var i in node.nodes) {

				walk(node.sid, node.nodes[i], list);

			}

		};

		walk(-1, skeleton, list);
		return list;

	}

	//Move the vertices into the pose that is proper for the start of the animation
	function skinToBindPose(geometry,skeleton,skinController) {

		var bones = [];
		setupSkeleton( skeleton, bones, -1 );
		setupSkinningMatrices( bones, skinController.skin );
		var v = new THREE.Vector3();
		var skinned = [];

		for (var i = 0; i < geometry.vertices.length; i ++) {

			skinned.push(new THREE.Vector3());

		}

		for ( i = 0; i < bones.length; i ++ ) {

			if ( bones[ i ].type != 'JOINT' ) continue;

			for ( var j = 0; j < bones[ i ].weights.length; j ++ ) {

				var w = bones[ i ].weights[ j ];
				var vidx = w.index;
				var weight = w.weight;

				var o = geometry.vertices[vidx];
				var s = skinned[vidx];

				v.x = o.x;
				v.y = o.y;
				v.z = o.z;

				v.applyMatrix4( bones[i].skinningMatrix );

				s.x += (v.x * weight);
				s.y += (v.y * weight);
				s.z += (v.z * weight);
			}

		}

		for (var i = 0; i < geometry.vertices.length; i ++) {

			geometry.vertices[i] = skinned[i];

		}

	}

	function applySkin ( geometry, instanceCtrl, frame ) {

		var skinController = controllers[ instanceCtrl.url ];

		frame = frame !== undefined ? frame : 40;

		if ( !skinController || !skinController.skin ) {

			console.log( 'ColladaLoader: Could not find skin controller.' );
			return;

		}

		if ( !instanceCtrl.skeleton || !instanceCtrl.skeleton.length ) {

			console.log( 'ColladaLoader: Could not find the skeleton for the skin. ' );
			return;

		}

		var animationBounds = calcAnimationBounds();
		var skeleton = visualScene.getChildById( instanceCtrl.skeleton[0], true ) || visualScene.getChildBySid( instanceCtrl.skeleton[0], true );

		//flatten the skeleton into a list of bones
		var bonelist = flattenSkeleton(skeleton);
		var joints = skinController.skin.joints;

		//sort that list so that the order reflects the order in the joint list
		var sortedbones = [];
		for (var i = 0; i < joints.length; i ++) {

			for (var j = 0; j < bonelist.length; j ++) {

				if (bonelist[j].name === joints[i]) {

					sortedbones[i] = bonelist[j];

				}

			}

		}

		//hook up the parents by index instead of name
		for (var i = 0; i < sortedbones.length; i ++) {

			for (var j = 0; j < sortedbones.length; j ++) {

				if (sortedbones[i].parent === sortedbones[j].name) {

					sortedbones[i].parent = j;

				}

			}

		}


		var i, j, w, vidx, weight;
		var v = new THREE.Vector3(), o, s;

		// move vertices to bind shape
		for ( i = 0; i < geometry.vertices.length; i ++ ) {
			geometry.vertices[i].applyMatrix4( skinController.skin.bindShapeMatrix );
		}

		var skinIndices = [];
		var skinWeights = [];
		var weights = skinController.skin.weights;

		// hook up the skin weights
		// TODO - this might be a good place to choose greatest 4 weights
		for ( var i =0; i < weights.length; i ++ ) {

			var indicies = new THREE.Vector4(weights[i][0] ? weights[i][0].joint : 0,weights[i][1] ? weights[i][1].joint : 0,weights[i][2] ? weights[i][2].joint : 0,weights[i][3] ? weights[i][3].joint : 0);
			var weight = new THREE.Vector4(weights[i][0] ? weights[i][0].weight : 0,weights[i][1] ? weights[i][1].weight : 0,weights[i][2] ? weights[i][2].weight : 0,weights[i][3] ? weights[i][3].weight : 0);

			skinIndices.push(indicies);
			skinWeights.push(weight);

		}

		geometry.skinIndices = skinIndices;
		geometry.skinWeights = skinWeights;
		geometry.bones = sortedbones;
		// process animation, or simply pose the rig if no animation

		//create an animation for the animated bones
		//NOTE: this has no effect when using morphtargets
		var animationdata = { "name":animationBounds.ID,"fps":30,"length":animationBounds.frames / 30,"hierarchy":[] };

		for (var j = 0; j < sortedbones.length; j ++) {

			animationdata.hierarchy.push({ parent:sortedbones[j].parent, name:sortedbones[j].name, keys:[] });

		}

		console.log( 'ColladaLoader:', animationBounds.ID + ' has ' + sortedbones.length + ' bones.' );



		skinToBindPose(geometry, skeleton, skinController);


		for ( frame = 0; frame < animationBounds.frames; frame ++ ) {

			var bones = [];
			var skinned = [];
			// process the frame and setup the rig with a fresh
			// transform, possibly from the bone's animation channel(s)

			setupSkeleton( skeleton, bones, frame );
			setupSkinningMatrices( bones, skinController.skin );

			for (var i = 0; i < bones.length; i ++) {

				for (var j = 0; j < animationdata.hierarchy.length; j ++) {

					if (animationdata.hierarchy[j].name === bones[i].sid) {

						var key = {};
						key.time = (frame / 30);
						key.matrix = bones[i].animatrix;

						if (frame === 0)
							bones[i].matrix = key.matrix;

						var data = [ new THREE.Vector3(),new THREE.Quaternion(),new THREE.Vector3() ];
						key.matrix.decompose(data[0], data[1], data[2]);

						key.pos = [ data[0].x,data[0].y,data[0].z ];

						key.scl = [ data[2].x,data[2].y,data[2].z ];
						key.rot = data[1];

						animationdata.hierarchy[j].keys.push(key);

					}

				}

			}

			geometry.animation = animationdata;

		}

	}

	function createKinematics() {

		if ( kinematicsModel && kinematicsModel.joints.length === 0 ) {
			kinematics = undefined;
			return;
		}

		var jointMap = {};

		var _addToMap = function( jointIndex, parentVisualElement ) {

			var parentVisualElementId = parentVisualElement.getAttribute( 'id' );
			var colladaNode = visualScene.getChildById( parentVisualElementId, true );
			var joint = kinematicsModel.joints[ jointIndex ];

			scene.traverse(function( node ) {

				if ( node.colladaId == parentVisualElementId ) {

					jointMap[ jointIndex ] = {
						node: node,
						transforms: colladaNode.transforms,
						joint: joint,
						position: joint.zeroPosition
					};

				}

			});

		};

		kinematics = {

			joints: kinematicsModel && kinematicsModel.joints,

			getJointValue: function( jointIndex ) {

				var jointData = jointMap[ jointIndex ];

				if ( jointData ) {

					return jointData.position;

				} else {

					console.log( 'getJointValue: joint ' + jointIndex + ' doesn\'t exist' );

				}

			},

			setJointValue: function( jointIndex, value ) {

				var jointData = jointMap[ jointIndex ];

				if ( jointData ) {

					var joint = jointData.joint;

					if ( value > joint.limits.max || value < joint.limits.min ) {

						console.log( 'setJointValue: joint ' + jointIndex + ' value ' + value + ' outside of limits (min: ' + joint.limits.min + ', max: ' + joint.limits.max + ')' );

					} else if ( joint.static ) {

						console.log( 'setJointValue: joint ' + jointIndex + ' is static' );

					} else {

						var threejsNode = jointData.node;
						var axis = joint.axis;
						var transforms = jointData.transforms;

						var matrix = new THREE.Matrix4();

						for (i = 0; i < transforms.length; i ++ ) {

							var transform = transforms[ i ];

							// kinda ghetto joint detection
							if ( transform.sid && transform.sid.indexOf( 'joint' + jointIndex ) !== -1 ) {

								// apply actual joint value here
								switch ( joint.type ) {

									case 'revolute':

										matrix.multiply( m1.makeRotationAxis( axis, THREE.Math.degToRad(value) ) );
										break;

									case 'prismatic':

										matrix.multiply( m1.makeTranslation(axis.x * value, axis.y * value, axis.z * value ) );
										break;

									default:

										console.warn( 'setJointValue: unknown joint type: ' + joint.type );
										break;

								}

							} else {

								var m1 = new THREE.Matrix4();

								switch ( transform.type ) {

									case 'matrix':

										matrix.multiply( transform.obj );

										break;

									case 'translate':

										matrix.multiply( m1.makeTranslation( transform.obj.x, transform.obj.y, transform.obj.z ) );

										break;

									case 'rotate':

										matrix.multiply( m1.makeRotationAxis( transform.obj, transform.angle ) );

										break;

								}
							}
						}

						// apply the matrix to the threejs node
						var elementsFloat32Arr = matrix.elements;
						var elements = Array.prototype.slice.call( elementsFloat32Arr );

						var elementsRowMajor = [
							elements[ 0 ],
							elements[ 4 ],
							elements[ 8 ],
							elements[ 12 ],
							elements[ 1 ],
							elements[ 5 ],
							elements[ 9 ],
							elements[ 13 ],
							elements[ 2 ],
							elements[ 6 ],
							elements[ 10 ],
							elements[ 14 ],
							elements[ 3 ],
							elements[ 7 ],
							elements[ 11 ],
							elements[ 15 ]
						];

						threejsNode.matrix.set.apply( threejsNode.matrix, elementsRowMajor );
						threejsNode.matrix.decompose( threejsNode.position, threejsNode.quaternion, threejsNode.scale );
					}

				} else {

					console.log( 'setJointValue: joint ' + jointIndex + ' doesn\'t exist' );

				}

			}

		};

		var element = COLLADA.querySelector('scene instance_kinematics_scene');

		if ( element ) {

			for ( var i = 0; i < element.childNodes.length; i ++ ) {

				var child = element.childNodes[ i ];

				if ( child.nodeType != 1 ) continue;

				switch ( child.nodeName ) {

					case 'bind_joint_axis':

						var visualTarget = child.getAttribute( 'target' ).split( '/' ).pop();
						var axis = child.querySelector('axis param').textContent;
						var jointIndex = parseInt( axis.split( 'joint' ).pop().split( '.' )[0] );
						var visualTargetElement = COLLADA.querySelector( '[sid="' + visualTarget + '"]' );

						if ( visualTargetElement ) {
							var parentVisualElement = visualTargetElement.parentElement;
							_addToMap(jointIndex, parentVisualElement);
						}

						break;

					default:

						break;

				}

			}
		}

	}

	function createSceneGraph ( node, parent ) {

		var obj = new THREE.Object3D();
		var skinned = false;
		var skinController;
		var morphController;
		var i, j;

		// FIXME: controllers

		for ( i = 0; i < node.controllers.length; i ++ ) {

			var controller = controllers[ node.controllers[ i ].url ];

			switch ( controller.type ) {

				case 'skin':

					if ( geometries[ controller.skin.source ] ) {

						var inst_geom = new InstanceGeometry();

						inst_geom.url = controller.skin.source;
						inst_geom.instance_material = node.controllers[ i ].instance_material;

						node.geometries.push( inst_geom );
						skinned = true;
						skinController = node.controllers[ i ];

					} else if ( controllers[ controller.skin.source ] ) {

						// urgh: controller can be chained
						// handle the most basic case...

						var second = controllers[ controller.skin.source ];
						morphController = second;
					//	skinController = node.controllers[i];

						if ( second.morph && geometries[ second.morph.source ] ) {

							var inst_geom = new InstanceGeometry();

							inst_geom.url = second.morph.source;
							inst_geom.instance_material = node.controllers[ i ].instance_material;

							node.geometries.push( inst_geom );

						}

					}

					break;

				case 'morph':

					if ( geometries[ controller.morph.source ] ) {

						var inst_geom = new InstanceGeometry();

						inst_geom.url = controller.morph.source;
						inst_geom.instance_material = node.controllers[ i ].instance_material;

						node.geometries.push( inst_geom );
						morphController = node.controllers[ i ];

					}

					console.log( 'ColladaLoader: Morph-controller partially supported.' );

				default:
					break;

			}

		}

		// geometries

		var double_sided_materials = {};

		for ( i = 0; i < node.geometries.length; i ++ ) {

			var instance_geometry = node.geometries[i];
			var instance_materials = instance_geometry.instance_material;
			var geometry = geometries[ instance_geometry.url ];
			var used_materials = {};
			var used_materials_array = [];
			var num_materials = 0;
			var first_material;

			if ( geometry ) {

				if ( !geometry.mesh || !geometry.mesh.primitives )
					continue;

				if ( obj.name.length === 0 ) {

					obj.name = geometry.id;

				}

				// collect used fx for this geometry-instance

				if ( instance_materials ) {

					for ( j = 0; j < instance_materials.length; j ++ ) {

						var instance_material = instance_materials[ j ];
						var mat = materials[ instance_material.target ];
						var effect_id = mat.instance_effect.url;
						var shader = effects[ effect_id ].shader;
						var material3js = shader.material;

						if ( geometry.doubleSided ) {

							if ( !( instance_material.symbol in double_sided_materials ) ) {

								var _copied_material = material3js.clone();
								_copied_material.side = THREE.DoubleSide;
								double_sided_materials[ instance_material.symbol ] = _copied_material;

							}

							material3js = double_sided_materials[ instance_material.symbol ];

						}

						material3js.opacity = !material3js.opacity ? 1 : material3js.opacity;
						used_materials[ instance_material.symbol ] = num_materials;
						used_materials_array.push( material3js );
						first_material = material3js;
						first_material.name = mat.name === null || mat.name === '' ? mat.id : mat.name;
						num_materials ++;

					}

				}

				var mesh;
				var material = first_material || new THREE.MeshLambertMaterial( { color: 0xdddddd, side: geometry.doubleSided ? THREE.DoubleSide : THREE.FrontSide } );
				var geom = geometry.mesh.geometry3js;

				if ( num_materials > 1 ) {

					material = new THREE.MultiMaterial( used_materials_array );

				}

				if ( skinController !== undefined ) {


					applySkin( geom, skinController );

					if ( geom.morphTargets.length > 0 ) {

						material.morphTargets = true;
						material.skinning = false;

					} else {

						material.morphTargets = false;
						material.skinning = true;

					}


					mesh = new THREE.SkinnedMesh( geom, material, false );


					//mesh.skeleton = skinController.skeleton;
					//mesh.skinController = controllers[ skinController.url ];
					//mesh.skinInstanceController = skinController;
					mesh.name = 'skin_' + skins.length;



					//mesh.animationHandle.setKey(0);
					skins.push( mesh );

				} else if ( morphController !== undefined ) {

					createMorph( geom, morphController );

					material.morphTargets = true;

					mesh = new THREE.Mesh( geom, material );
					mesh.name = 'morph_' + morphs.length;

					morphs.push( mesh );

				} else {

					if ( geom.isLineStrip === true ) {

						mesh = new THREE.Line( geom );

					} else {

						mesh = new THREE.Mesh( geom, material );

					}

				}

				obj.add(mesh);

			}

		}

		for ( i = 0; i < node.cameras.length; i ++ ) {

			var instance_camera = node.cameras[i];
			var cparams = cameras[instance_camera.url];

			var cam = new THREE.PerspectiveCamera(cparams.yfov, parseFloat(cparams.aspect_ratio),
					parseFloat(cparams.znear), parseFloat(cparams.zfar));

			obj.add(cam);
		}

		for ( i = 0; i < node.lights.length; i ++ ) {

			var light = null;
			var instance_light = node.lights[i];
			var lparams = lights[instance_light.url];

			if ( lparams && lparams.technique ) {

				var color = lparams.color.getHex();
				var intensity = lparams.intensity;
				var distance = lparams.distance;
				var angle = lparams.falloff_angle;

				switch ( lparams.technique ) {

					case 'directional':

						light = new THREE.DirectionalLight( color, intensity, distance );
						light.position.set(0, 0, 1);
						break;

					case 'point':

						light = new THREE.PointLight( color, intensity, distance );
						break;

					case 'spot':

						light = new THREE.SpotLight( color, intensity, distance, angle );
						light.position.set(0, 0, 1);
						break;

					case 'ambient':

						light = new THREE.AmbientLight( color );
						break;

				}

			}

			if (light) {
				obj.add(light);
			}
		}

		obj.name = node.name || node.id || "";
		obj.colladaId = node.id || "";
		obj.layer = node.layer || "";
		obj.matrix = node.matrix;
		obj.matrix.decompose( obj.position, obj.quaternion, obj.scale );

		if ( options.centerGeometry && obj.geometry ) {

			var delta = obj.geometry.center();
			delta.multiply( obj.scale );
			delta.applyQuaternion( obj.quaternion );

			obj.position.sub( delta );

		}

		for ( i = 0; i < node.nodes.length; i ++ ) {

			obj.add( createSceneGraph( node.nodes[i], node ) );

		}

		return obj;

	}

	function getJointId( skin, id ) {

		for ( var i = 0; i < skin.joints.length; i ++ ) {

			if ( skin.joints[ i ] === id ) {

				return i;

			}

		}

	}

	function getLibraryNode( id ) {

		var nodes = COLLADA.querySelectorAll('library_nodes node');

		for ( var i = 0; i < nodes.length; i++ ) {

			var attObj = nodes[i].attributes.getNamedItem('id');

			if ( attObj && attObj.value === id ) {

				return nodes[i];

			}

		}

		return undefined;

	}

	function getChannelsForNode ( node ) {

		var channels = [];
		var startTime = 1000000;
		var endTime = -1000000;

		for ( var id in animations ) {

			var animation = animations[id];

			for ( var i = 0; i < animation.channel.length; i ++ ) {

				var channel = animation.channel[i];
				var sampler = animation.sampler[i];
				var id = channel.target.split('/')[0];

				if ( id == node.id ) {

					sampler.create();
					channel.sampler = sampler;
					startTime = Math.min(startTime, sampler.startTime);
					endTime = Math.max(endTime, sampler.endTime);
					channels.push(channel);

				}

			}

		}

		if ( channels.length ) {

			node.startTime = startTime;
			node.endTime = endTime;

		}

		return channels;

	}

	function calcFrameDuration( node ) {

		var minT = 10000000;

		for ( var i = 0; i < node.channels.length; i ++ ) {

			var sampler = node.channels[i].sampler;

			for ( var j = 0; j < sampler.input.length - 1; j ++ ) {

				var t0 = sampler.input[ j ];
				var t1 = sampler.input[ j + 1 ];
				minT = Math.min( minT, t1 - t0 );

			}
		}

		return minT;

	}

	function calcMatrixAt( node, t ) {

		var animated = {};

		var i, j;

		for ( i = 0; i < node.channels.length; i ++ ) {

			var channel = node.channels[ i ];
			animated[ channel.sid ] = channel;

		}

		var matrix = new THREE.Matrix4();

		for ( i = 0; i < node.transforms.length; i ++ ) {

			var transform = node.transforms[ i ];
			var channel = animated[ transform.sid ];

			if ( channel !== undefined ) {

				var sampler = channel.sampler;
				var value;

				for ( j = 0; j < sampler.input.length - 1; j ++ ) {

					if ( sampler.input[ j + 1 ] > t ) {

						value = sampler.output[ j ];
						//console.log(value.flatten)
						break;

					}

				}

				if ( value !== undefined ) {

					if ( value instanceof THREE.Matrix4 ) {

						matrix.multiplyMatrices( matrix, value );

					} else {

						// FIXME: handle other types

						matrix.multiplyMatrices( matrix, transform.matrix );

					}

				} else {

					matrix.multiplyMatrices( matrix, transform.matrix );

				}

			} else {

				matrix.multiplyMatrices( matrix, transform.matrix );

			}

		}

		return matrix;

	}

	function bakeAnimations ( node ) {

		if ( node.channels && node.channels.length ) {

			var keys = [],
				sids = [];

			for ( var i = 0, il = node.channels.length; i < il; i ++ ) {

				var channel = node.channels[i],
					fullSid = channel.fullSid,
					sampler = channel.sampler,
					input = sampler.input,
					transform = node.getTransformBySid( channel.sid ),
					member;

				if ( channel.arrIndices ) {

					member = [];

					for ( var j = 0, jl = channel.arrIndices.length; j < jl; j ++ ) {

						member[ j ] = getConvertedIndex( channel.arrIndices[ j ] );

					}

				} else {

					member = getConvertedMember( channel.member );

				}

				if ( transform ) {

					if ( sids.indexOf( fullSid ) === -1 ) {

						sids.push( fullSid );

					}

					for ( var j = 0, jl = input.length; j < jl; j ++ ) {

						var time = input[j],
							data = sampler.getData( transform.type, j, member ),
							key = findKey( keys, time );

						if ( !key ) {

							key = new Key( time );
							var timeNdx = findTimeNdx( keys, time );
							keys.splice( timeNdx === -1 ? keys.length : timeNdx, 0, key );

						}

						key.addTarget( fullSid, transform, member, data );

					}

				} else {

					console.log( 'Could not find transform "' + channel.sid + '" in node ' + node.id );

				}

			}

			// post process
			for ( var i = 0; i < sids.length; i ++ ) {

				var sid = sids[ i ];

				for ( var j = 0; j < keys.length; j ++ ) {

					var key = keys[ j ];

					if ( !key.hasTarget( sid ) ) {

						interpolateKeys( keys, key, j, sid );

					}

				}

			}

			node.keys = keys;
			node.sids = sids;

		}

	}

	function findKey ( keys, time) {

		var retVal = null;

		for ( var i = 0, il = keys.length; i < il && retVal === null; i ++ ) {

			var key = keys[i];

			if ( key.time === time ) {

				retVal = key;

			} else if ( key.time > time ) {

				break;

			}

		}

		return retVal;

	}

	function findTimeNdx ( keys, time) {

		var ndx = -1;

		for ( var i = 0, il = keys.length; i < il && ndx === -1; i ++ ) {

			var key = keys[i];

			if ( key.time >= time ) {

				ndx = i;

			}

		}

		return ndx;

	}

	function interpolateKeys ( keys, key, ndx, fullSid ) {

		var prevKey = getPrevKeyWith( keys, fullSid, ndx ? ndx - 1 : 0 ),
			nextKey = getNextKeyWith( keys, fullSid, ndx + 1 );

		if ( prevKey && nextKey ) {

			var scale = (key.time - prevKey.time) / (nextKey.time - prevKey.time),
				prevTarget = prevKey.getTarget( fullSid ),
				nextData = nextKey.getTarget( fullSid ).data,
				prevData = prevTarget.data,
				data;

			if ( prevTarget.type === 'matrix' ) {

				data = prevData;

			} else if ( prevData.length ) {

				data = [];

				for ( var i = 0; i < prevData.length; ++ i ) {

					data[ i ] = prevData[ i ] + ( nextData[ i ] - prevData[ i ] ) * scale;

				}

			} else {

				data = prevData + ( nextData - prevData ) * scale;

			}

			key.addTarget( fullSid, prevTarget.transform, prevTarget.member, data );

		}

	}

	// Get next key with given sid

	function getNextKeyWith( keys, fullSid, ndx ) {

		for ( ; ndx < keys.length; ndx ++ ) {

			var key = keys[ ndx ];

			if ( key.hasTarget( fullSid ) ) {

				return key;

			}

		}

		return null;

	}

	// Get previous key with given sid

	function getPrevKeyWith( keys, fullSid, ndx ) {

		ndx = ndx >= 0 ? ndx : ndx + keys.length;

		for ( ; ndx >= 0; ndx -- ) {

			var key = keys[ ndx ];

			if ( key.hasTarget( fullSid ) ) {

				return key;

			}

		}

		return null;

	}

	function _Image() {

		this.id = "";
		this.init_from = "";

	}

	_Image.prototype.parse = function(element) {

		this.id = element.getAttribute('id');

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];

			if ( child.nodeName === 'init_from' ) {

				this.init_from = child.textContent;

			}

		}

		return this;

	};

	function Controller() {

		this.id = "";
		this.name = "";
		this.type = "";
		this.skin = null;
		this.morph = null;

	}

	Controller.prototype.parse = function( element ) {

		this.id = element.getAttribute('id');
		this.name = element.getAttribute('name');
		this.type = "none";

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];

			switch ( child.nodeName ) {

				case 'skin':

					this.skin = (new Skin()).parse(child);
					this.type = child.nodeName;
					break;

				case 'morph':

					this.morph = (new Morph()).parse(child);
					this.type = child.nodeName;
					break;

				default:
					break;

			}
		}

		return this;

	};

	function Morph() {

		this.method = null;
		this.source = null;
		this.targets = null;
		this.weights = null;

	}

	Morph.prototype.parse = function( element ) {

		var sources = {};
		var inputs = [];
		var i;

		this.method = element.getAttribute( 'method' );
		this.source = element.getAttribute( 'source' ).replace( /^#/, '' );

		for ( i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'source':

					var source = ( new Source() ).parse( child );
					sources[ source.id ] = source;
					break;

				case 'targets':

					inputs = this.parseInputs( child );
					break;

				default:

					console.log( child.nodeName );
					break;

			}

		}

		for ( i = 0; i < inputs.length; i ++ ) {

			var input = inputs[ i ];
			var source = sources[ input.source ];

			switch ( input.semantic ) {

				case 'MORPH_TARGET':

					this.targets = source.read();
					break;

				case 'MORPH_WEIGHT':

					this.weights = source.read();
					break;

				default:
					break;

			}
		}

		return this;

	};

	Morph.prototype.parseInputs = function(element) {

		var inputs = [];

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[i];
			if ( child.nodeType != 1) continue;

			switch ( child.nodeName ) {

				case 'input':

					inputs.push( (new Input()).parse(child) );
					break;

				default:
					break;
			}
		}

		return inputs;

	};

	function Skin() {

		this.source = "";
		this.bindShapeMatrix = null;
		this.invBindMatrices = [];
		this.joints = [];
		this.weights = [];

	}

	Skin.prototype.parse = function( element ) {

		var sources = {};
		var joints, weights;

		this.source = element.getAttribute( 'source' ).replace( /^#/, '' );
		this.invBindMatrices = [];
		this.joints = [];
		this.weights = [];

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[i];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'bind_shape_matrix':

					var f = _floats(child.textContent);
					this.bindShapeMatrix = getConvertedMat4( f );
					break;

				case 'source':

					var src = new Source().parse(child);
					sources[ src.id ] = src;
					break;

				case 'joints':

					joints = child;
					break;

				case 'vertex_weights':

					weights = child;
					break;

				default:

					console.log( child.nodeName );
					break;

			}
		}

		this.parseJoints( joints, sources );
		this.parseWeights( weights, sources );

		return this;

	};

	Skin.prototype.parseJoints = function ( element, sources ) {

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'input':

					var input = ( new Input() ).parse( child );
					var source = sources[ input.source ];

					if ( input.semantic === 'JOINT' ) {

						this.joints = source.read();

					} else if ( input.semantic === 'INV_BIND_MATRIX' ) {

						this.invBindMatrices = source.read();

					}

					break;

				default:
					break;
			}

		}

	};

	Skin.prototype.parseWeights = function ( element, sources ) {

		var v, vcount, inputs = [];

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'input':

					inputs.push( ( new Input() ).parse( child ) );
					break;

				case 'v':

					v = _ints( child.textContent );
					break;

				case 'vcount':

					vcount = _ints( child.textContent );
					break;

				default:
					break;

			}

		}

		var index = 0;

		for ( var i = 0; i < vcount.length; i ++ ) {

			var numBones = vcount[i];
			var vertex_weights = [];

			for ( var j = 0; j < numBones; j ++ ) {

				var influence = {};

				for ( var k = 0; k < inputs.length; k ++ ) {

					var input = inputs[ k ];
					var value = v[ index + input.offset ];

					switch ( input.semantic ) {

						case 'JOINT':

							influence.joint = value;//this.joints[value];
							break;

						case 'WEIGHT':

							influence.weight = sources[ input.source ].data[ value ];
							break;

						default:
							break;

					}

				}

				vertex_weights.push( influence );
				index += inputs.length;
			}

			for ( var j = 0; j < vertex_weights.length; j ++ ) {

				vertex_weights[ j ].index = i;

			}

			this.weights.push( vertex_weights );

		}

	};

	function VisualScene () {

		this.id = "";
		this.name = "";
		this.nodes = [];
		this.scene = new THREE.Group();

	}

	VisualScene.prototype.getChildById = function( id, recursive ) {

		for ( var i = 0; i < this.nodes.length; i ++ ) {

			var node = this.nodes[ i ].getChildById( id, recursive );

			if ( node ) {

				return node;

			}

		}

		return null;

	};

	VisualScene.prototype.getChildBySid = function( sid, recursive ) {

		for ( var i = 0; i < this.nodes.length; i ++ ) {

			var node = this.nodes[ i ].getChildBySid( sid, recursive );

			if ( node ) {

				return node;

			}

		}

		return null;

	};

	VisualScene.prototype.parse = function( element ) {

		this.id = element.getAttribute( 'id' );
		this.name = element.getAttribute( 'name' );
		this.nodes = [];

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'node':

					this.nodes.push( ( new Node() ).parse( child ) );
					break;

				default:
					break;

			}

		}

		return this;

	};

	function Node() {

		this.id = "";
		this.name = "";
		this.sid = "";
		this.nodes = [];
		this.controllers = [];
		this.transforms = [];
		this.geometries = [];
		this.channels = [];
		this.matrix = new THREE.Matrix4();

	}

	Node.prototype.getChannelForTransform = function( transformSid ) {

		for ( var i = 0; i < this.channels.length; i ++ ) {

			var channel = this.channels[i];
			var parts = channel.target.split('/');
			var id = parts.shift();
			var sid = parts.shift();
			var dotSyntax = (sid.indexOf(".") >= 0);
			var arrSyntax = (sid.indexOf("(") >= 0);
			var arrIndices;
			var member;

			if ( dotSyntax ) {

				parts = sid.split(".");
				sid = parts.shift();
				member = parts.shift();

			} else if ( arrSyntax ) {

				arrIndices = sid.split("(");
				sid = arrIndices.shift();

				for ( var j = 0; j < arrIndices.length; j ++ ) {

					arrIndices[ j ] = parseInt( arrIndices[ j ].replace( /\)/, '' ) );

				}

			}

			if ( sid === transformSid ) {

				channel.info = { sid: sid, dotSyntax: dotSyntax, arrSyntax: arrSyntax, arrIndices: arrIndices };
				return channel;

			}

		}

		return null;

	};

	Node.prototype.getChildById = function ( id, recursive ) {

		if ( this.id === id ) {

			return this;

		}

		if ( recursive ) {

			for ( var i = 0; i < this.nodes.length; i ++ ) {

				var n = this.nodes[ i ].getChildById( id, recursive );

				if ( n ) {

					return n;

				}

			}

		}

		return null;

	};

	Node.prototype.getChildBySid = function ( sid, recursive ) {

		if ( this.sid === sid ) {

			return this;

		}

		if ( recursive ) {

			for ( var i = 0; i < this.nodes.length; i ++ ) {

				var n = this.nodes[ i ].getChildBySid( sid, recursive );

				if ( n ) {

					return n;

				}

			}
		}

		return null;

	};

	Node.prototype.getTransformBySid = function ( sid ) {

		for ( var i = 0; i < this.transforms.length; i ++ ) {

			if ( this.transforms[ i ].sid === sid ) return this.transforms[ i ];

		}

		return null;

	};

	Node.prototype.parse = function( element ) {

		var url;

		this.id = element.getAttribute('id');
		this.sid = element.getAttribute('sid');
		this.name = element.getAttribute('name');
		this.type = element.getAttribute('type');
		this.layer = element.getAttribute('layer');

		this.type = this.type === 'JOINT' ? this.type : 'NODE';

		this.nodes = [];
		this.transforms = [];
		this.geometries = [];
		this.cameras = [];
		this.lights = [];
		this.controllers = [];
		this.matrix = new THREE.Matrix4();

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'node':

					this.nodes.push( ( new Node() ).parse( child ) );
					break;

				case 'instance_camera':

					this.cameras.push( ( new InstanceCamera() ).parse( child ) );
					break;

				case 'instance_controller':

					this.controllers.push( ( new InstanceController() ).parse( child ) );
					break;

				case 'instance_geometry':

					this.geometries.push( ( new InstanceGeometry() ).parse( child ) );
					break;

				case 'instance_light':

					this.lights.push( ( new InstanceLight() ).parse( child ) );
					break;

				case 'instance_node':

					url = child.getAttribute( 'url' ).replace( /^#/, '' );
					var iNode = getLibraryNode( url );

					if ( iNode ) {

						this.nodes.push( ( new Node() ).parse( iNode )) ;

					}

					break;

				case 'rotate':
				case 'translate':
				case 'scale':
				case 'matrix':
				case 'lookat':
				case 'skew':

					this.transforms.push( ( new Transform() ).parse( child ) );
					break;

				case 'extra':
					break;

				default:

					console.log( child.nodeName );
					break;

			}

		}

		this.channels = getChannelsForNode( this );
		bakeAnimations( this );

		this.updateMatrix();

		return this;

	};

	Node.prototype.updateMatrix = function () {

		this.matrix.identity();

		for ( var i = 0; i < this.transforms.length; i ++ ) {

			this.transforms[ i ].apply( this.matrix );

		}

	};

	function Transform () {

		this.sid = "";
		this.type = "";
		this.data = [];
		this.obj = null;

	}

	Transform.prototype.parse = function ( element ) {

		this.sid = element.getAttribute( 'sid' );
		this.type = element.nodeName;
		this.data = _floats( element.textContent );
		this.convert();

		return this;

	};

	Transform.prototype.convert = function () {

		switch ( this.type ) {

			case 'matrix':

				this.obj = getConvertedMat4( this.data );
				break;

			case 'rotate':

				this.angle = THREE.Math.degToRad( this.data[3] );

			case 'translate':

				fixCoords( this.data, -1 );
				this.obj = new THREE.Vector3( this.data[ 0 ], this.data[ 1 ], this.data[ 2 ] );
				break;

			case 'scale':

				fixCoords( this.data, 1 );
				this.obj = new THREE.Vector3( this.data[ 0 ], this.data[ 1 ], this.data[ 2 ] );
				break;

			default:
				console.log( 'Can not convert Transform of type ' + this.type );
				break;

		}

	};

	Transform.prototype.apply = function () {

		var m1 = new THREE.Matrix4();

		return function ( matrix ) {

			switch ( this.type ) {

				case 'matrix':

					matrix.multiply( this.obj );

					break;

				case 'translate':

					matrix.multiply( m1.makeTranslation( this.obj.x, this.obj.y, this.obj.z ) );

					break;

				case 'rotate':

					matrix.multiply( m1.makeRotationAxis( this.obj, this.angle ) );

					break;

				case 'scale':

					matrix.scale( this.obj );

					break;

			}

		};

	}();

	Transform.prototype.update = function ( data, member ) {

		var members = [ 'X', 'Y', 'Z', 'ANGLE' ];

		switch ( this.type ) {

			case 'matrix':

				if ( ! member ) {

					this.obj.copy( data );

				} else if ( member.length === 1 ) {

					switch ( member[ 0 ] ) {

						case 0:

							this.obj.n11 = data[ 0 ];
							this.obj.n21 = data[ 1 ];
							this.obj.n31 = data[ 2 ];
							this.obj.n41 = data[ 3 ];

							break;

						case 1:

							this.obj.n12 = data[ 0 ];
							this.obj.n22 = data[ 1 ];
							this.obj.n32 = data[ 2 ];
							this.obj.n42 = data[ 3 ];

							break;

						case 2:

							this.obj.n13 = data[ 0 ];
							this.obj.n23 = data[ 1 ];
							this.obj.n33 = data[ 2 ];
							this.obj.n43 = data[ 3 ];

							break;

						case 3:

							this.obj.n14 = data[ 0 ];
							this.obj.n24 = data[ 1 ];
							this.obj.n34 = data[ 2 ];
							this.obj.n44 = data[ 3 ];

							break;

					}

				} else if ( member.length === 2 ) {

					var propName = 'n' + ( member[ 0 ] + 1 ) + ( member[ 1 ] + 1 );
					this.obj[ propName ] = data;

				} else {

					console.log('Incorrect addressing of matrix in transform.');

				}

				break;

			case 'translate':
			case 'scale':

				if ( Object.prototype.toString.call( member ) === '[object Array]' ) {

					member = members[ member[ 0 ] ];

				}

				switch ( member ) {

					case 'X':

						this.obj.x = data;
						break;

					case 'Y':

						this.obj.y = data;
						break;

					case 'Z':

						this.obj.z = data;
						break;

					default:

						this.obj.x = data[ 0 ];
						this.obj.y = data[ 1 ];
						this.obj.z = data[ 2 ];
						break;

				}

				break;

			case 'rotate':

				if ( Object.prototype.toString.call( member ) === '[object Array]' ) {

					member = members[ member[ 0 ] ];

				}

				switch ( member ) {

					case 'X':

						this.obj.x = data;
						break;

					case 'Y':

						this.obj.y = data;
						break;

					case 'Z':

						this.obj.z = data;
						break;

					case 'ANGLE':

						this.angle = THREE.Math.degToRad( data );
						break;

					default:

						this.obj.x = data[ 0 ];
						this.obj.y = data[ 1 ];
						this.obj.z = data[ 2 ];
						this.angle = THREE.Math.degToRad( data[ 3 ] );
						break;

				}
				break;

		}

	};

	function InstanceController() {

		this.url = "";
		this.skeleton = [];
		this.instance_material = [];

	}

	InstanceController.prototype.parse = function ( element ) {

		this.url = element.getAttribute('url').replace(/^#/, '');
		this.skeleton = [];
		this.instance_material = [];

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType !== 1 ) continue;

			switch ( child.nodeName ) {

				case 'skeleton':

					this.skeleton.push( child.textContent.replace(/^#/, '') );
					break;

				case 'bind_material':

					var instances = child.querySelectorAll('instance_material');

					for ( var j = 0; j < instances.length; j ++ ) {

						var instance = instances[j];
						this.instance_material.push( (new InstanceMaterial()).parse(instance) );

					}


					break;

				case 'extra':
					break;

				default:
					break;

			}
		}

		return this;

	};

	function InstanceMaterial () {

		this.symbol = "";
		this.target = "";

	}

	InstanceMaterial.prototype.parse = function ( element ) {

		this.symbol = element.getAttribute('symbol');
		this.target = element.getAttribute('target').replace(/^#/, '');
		return this;

	};

	function InstanceGeometry() {

		this.url = "";
		this.instance_material = [];

	}

	InstanceGeometry.prototype.parse = function ( element ) {

		this.url = element.getAttribute('url').replace(/^#/, '');
		this.instance_material = [];

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[i];
			if ( child.nodeType != 1 ) continue;

			if ( child.nodeName === 'bind_material' ) {

				var instances = child.querySelectorAll('instance_material');

				for ( var j = 0; j < instances.length; j ++ ) {

					var instance = instances[j];
					this.instance_material.push( (new InstanceMaterial()).parse(instance) );

				}

				break;

			}

		}

		return this;

	};

	function Geometry() {

		this.id = "";
		this.mesh = null;

	}

	Geometry.prototype.parse = function ( element ) {

		this.id = element.getAttribute('id');

		extractDoubleSided( this, element );

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[i];

			switch ( child.nodeName ) {

				case 'mesh':

					this.mesh = (new Mesh(this)).parse(child);
					break;

				case 'extra':

					// console.log( child );
					break;

				default:
					break;
			}
		}

		return this;

	};

	function Mesh( geometry ) {

		this.geometry = geometry.id;
		this.primitives = [];
		this.vertices = null;
		this.geometry3js = null;

	}

	Mesh.prototype.parse = function ( element ) {

		this.primitives = [];

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];

			switch ( child.nodeName ) {

				case 'source':

					_source( child );
					break;

				case 'vertices':

					this.vertices = ( new Vertices() ).parse( child );
					break;

				case 'linestrips':

					this.primitives.push( ( new LineStrips().parse( child ) ) );
					break;

				case 'triangles':

					this.primitives.push( ( new Triangles().parse( child ) ) );
					break;

				case 'polygons':

					this.primitives.push( ( new Polygons().parse( child ) ) );
					break;

				case 'polylist':

					this.primitives.push( ( new Polylist().parse( child ) ) );
					break;

				default:
					break;

			}

		}

		this.geometry3js = new THREE.Geometry();

		if ( this.vertices === null ) {

			// TODO (mrdoob): Study case when this is null (carrier.dae)

			return this;

		}

		var vertexData = sources[ this.vertices.input['POSITION'].source ].data;

		for ( var i = 0; i < vertexData.length; i += 3 ) {

			this.geometry3js.vertices.push( getConvertedVec3( vertexData, i ).clone() );

		}

		for ( var i = 0; i < this.primitives.length; i ++ ) {

			var primitive = this.primitives[ i ];
			primitive.setVertices( this.vertices );
			this.handlePrimitive( primitive, this.geometry3js );

		}

		if ( this.geometry3js.calcNormals ) {

			this.geometry3js.computeVertexNormals();
			delete this.geometry3js.calcNormals;

		}

		return this;

	};

	Mesh.prototype.handlePrimitive = function ( primitive, geom ) {

		if ( primitive instanceof LineStrips ) {

			// TODO: Handle indices. Maybe easier with BufferGeometry?

			geom.isLineStrip = true;
			return;

		}

		var j, k, pList = primitive.p, inputs = primitive.inputs;
		var input, index, idx32;
		var source, numParams;
		var vcIndex = 0, vcount = 3, maxOffset = 0;
		var texture_sets = [];

		for ( j = 0; j < inputs.length; j ++ ) {

			input = inputs[ j ];

			var offset = input.offset + 1;
			maxOffset = (maxOffset < offset) ? offset : maxOffset;

			switch ( input.semantic ) {

				case 'TEXCOORD':
					texture_sets.push( input.set );
					break;

			}

		}

		for ( var pCount = 0; pCount < pList.length; ++ pCount ) {

			var p = pList[ pCount ], i = 0;

			while ( i < p.length ) {

				var vs = [];
				var ns = [];
				var ts = null;
				var cs = [];

				if ( primitive.vcount ) {

					vcount = primitive.vcount.length ? primitive.vcount[ vcIndex ++ ] : primitive.vcount;

				} else {

					vcount = p.length / maxOffset;

				}


				for ( j = 0; j < vcount; j ++ ) {

					for ( k = 0; k < inputs.length; k ++ ) {

						input = inputs[ k ];
						source = sources[ input.source ];

						index = p[ i + ( j * maxOffset ) + input.offset ];
						numParams = source.accessor.params.length;
						idx32 = index * numParams;

						switch ( input.semantic ) {

							case 'VERTEX':

								vs.push( index );

								break;

							case 'NORMAL':

								ns.push( getConvertedVec3( source.data, idx32 ) );

								break;

							case 'TEXCOORD':

								ts = ts || { };
								if ( ts[ input.set ] === undefined ) ts[ input.set ] = [];
								// invert the V
								ts[ input.set ].push( new THREE.Vector2( source.data[ idx32 ], source.data[ idx32 + 1 ] ) );

								break;

							case 'COLOR':

								cs.push( new THREE.Color().setRGB( source.data[ idx32 ], source.data[ idx32 + 1 ], source.data[ idx32 + 2 ] ) );

								break;

							default:

								break;

						}

					}

				}

				if ( ns.length === 0 ) {

					// check the vertices inputs
					input = this.vertices.input.NORMAL;

					if ( input ) {

						source = sources[ input.source ];
						numParams = source.accessor.params.length;

						for ( var ndx = 0, len = vs.length; ndx < len; ndx ++ ) {

							ns.push( getConvertedVec3( source.data, vs[ ndx ] * numParams ) );

						}

					} else {

						geom.calcNormals = true;

					}

				}

				if ( !ts ) {

					ts = { };
					// check the vertices inputs
					input = this.vertices.input.TEXCOORD;

					if ( input ) {

						texture_sets.push( input.set );
						source = sources[ input.source ];
						numParams = source.accessor.params.length;

						for ( var ndx = 0, len = vs.length; ndx < len; ndx ++ ) {

							idx32 = vs[ ndx ] * numParams;
							if ( ts[ input.set ] === undefined ) ts[ input.set ] = [ ];
							// invert the V
							ts[ input.set ].push( new THREE.Vector2( source.data[ idx32 ], 1.0 - source.data[ idx32 + 1 ] ) );

						}

					}

				}

				if ( cs.length === 0 ) {

					// check the vertices inputs
					input = this.vertices.input.COLOR;

					if ( input ) {

						source = sources[ input.source ];
						numParams = source.accessor.params.length;

						for ( var ndx = 0, len = vs.length; ndx < len; ndx ++ ) {

							idx32 = vs[ ndx ] * numParams;
							cs.push( new THREE.Color().setRGB( source.data[ idx32 ], source.data[ idx32 + 1 ], source.data[ idx32 + 2 ] ) );

						}

					}

				}

				var face = null, faces = [], uv, uvArr;

				if ( vcount === 3 ) {

					faces.push( new THREE.Face3( vs[0], vs[1], vs[2], ns, cs.length ? cs : new THREE.Color() ) );

				} else if ( vcount === 4 ) {

					faces.push( new THREE.Face3( vs[0], vs[1], vs[3], ns.length ? [ ns[0].clone(), ns[1].clone(), ns[3].clone() ] : [], cs.length ? [ cs[0], cs[1], cs[3] ] : new THREE.Color() ) );

					faces.push( new THREE.Face3( vs[1], vs[2], vs[3], ns.length ? [ ns[1].clone(), ns[2].clone(), ns[3].clone() ] : [], cs.length ? [ cs[1], cs[2], cs[3] ] : new THREE.Color() ) );

				} else if ( vcount > 4 && options.subdivideFaces ) {

					var clr = cs.length ? cs : new THREE.Color(),
						vec1, vec2, vec3, v1, v2, norm;

					// subdivide into multiple Face3s

					for ( k = 1; k < vcount - 1; ) {

						faces.push( new THREE.Face3( vs[0], vs[k], vs[k + 1], ns.length ? [ ns[0].clone(), ns[k ++].clone(), ns[k].clone() ] : [], clr ) );

					}

				}

				if ( faces.length ) {

					for ( var ndx = 0, len = faces.length; ndx < len; ndx ++ ) {

						face = faces[ndx];
						face.daeMaterial = primitive.material;
						geom.faces.push( face );

						for ( k = 0; k < texture_sets.length; k ++ ) {

							uv = ts[ texture_sets[k] ];

							if ( vcount > 4 ) {

								// Grab the right UVs for the vertices in this face
								uvArr = [ uv[0], uv[ndx + 1], uv[ndx + 2] ];

							} else if ( vcount === 4 ) {

								if ( ndx === 0 ) {

									uvArr = [ uv[0], uv[1], uv[3] ];

								} else {

									uvArr = [ uv[1].clone(), uv[2], uv[3].clone() ];

								}

							} else {

								uvArr = [ uv[0], uv[1], uv[2] ];

							}

							if ( geom.faceVertexUvs[k] === undefined ) {

								geom.faceVertexUvs[k] = [];

							}

							geom.faceVertexUvs[k].push( uvArr );

						}

					}

				} else {

					console.log( 'dropped face with vcount ' + vcount + ' for geometry with id: ' + geom.id );

				}

				i += maxOffset * vcount;

			}

		}

	};

	function Polygons () {

		this.material = "";
		this.count = 0;
		this.inputs = [];
		this.vcount = null;
		this.p = [];
		this.geometry = new THREE.Geometry();

	}

	Polygons.prototype.setVertices = function ( vertices ) {

		for ( var i = 0; i < this.inputs.length; i ++ ) {

			if ( this.inputs[ i ].source === vertices.id ) {

				this.inputs[ i ].source = vertices.input[ 'POSITION' ].source;

			}

		}

	};

	Polygons.prototype.parse = function ( element ) {

		this.material = element.getAttribute( 'material' );
		this.count = _attr_as_int( element, 'count', 0 );

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];

			switch ( child.nodeName ) {

				case 'input':

					this.inputs.push( ( new Input() ).parse( element.childNodes[ i ] ) );
					break;

				case 'vcount':

					this.vcount = _ints( child.textContent );
					break;

				case 'p':

					this.p.push( _ints( child.textContent ) );
					break;

				case 'ph':

					console.warn( 'polygon holes not yet supported!' );
					break;

				default:
					break;

			}

		}

		return this;

	};

	function Polylist () {

		Polygons.call( this );

		this.vcount = [];

	}

	Polylist.prototype = Object.create( Polygons.prototype );
	Polylist.prototype.constructor = Polylist;

	function LineStrips() {

		Polygons.call( this );

		this.vcount = 1;

	}

	LineStrips.prototype = Object.create( Polygons.prototype );
	LineStrips.prototype.constructor = LineStrips;

	function Triangles () {

		Polygons.call( this );

		this.vcount = 3;

	}

	Triangles.prototype = Object.create( Polygons.prototype );
	Triangles.prototype.constructor = Triangles;

	function Accessor() {

		this.source = "";
		this.count = 0;
		this.stride = 0;
		this.params = [];

	}

	Accessor.prototype.parse = function ( element ) {

		this.params = [];
		this.source = element.getAttribute( 'source' );
		this.count = _attr_as_int( element, 'count', 0 );
		this.stride = _attr_as_int( element, 'stride', 0 );

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];

			if ( child.nodeName === 'param' ) {

				var param = {};
				param[ 'name' ] = child.getAttribute( 'name' );
				param[ 'type' ] = child.getAttribute( 'type' );
				this.params.push( param );

			}

		}

		return this;

	};

	function Vertices() {

		this.input = {};

	}

	Vertices.prototype.parse = function ( element ) {

		this.id = element.getAttribute('id');

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			if ( element.childNodes[i].nodeName === 'input' ) {

				var input = ( new Input() ).parse( element.childNodes[ i ] );
				this.input[ input.semantic ] = input;

			}

		}

		return this;

	};

	function Input () {

		this.semantic = "";
		this.offset = 0;
		this.source = "";
		this.set = 0;

	}

	Input.prototype.parse = function ( element ) {

		this.semantic = element.getAttribute('semantic');
		this.source = element.getAttribute('source').replace(/^#/, '');
		this.set = _attr_as_int(element, 'set', -1);
		this.offset = _attr_as_int(element, 'offset', 0);

		if ( this.semantic === 'TEXCOORD' && this.set < 0 ) {

			this.set = 0;

		}

		return this;

	};

	function Source ( id ) {

		this.id = id;
		this.type = null;

	}

	Source.prototype.parse = function ( element ) {

		this.id = element.getAttribute( 'id' );

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[i];

			switch ( child.nodeName ) {

				case 'bool_array':

					this.data = _bools( child.textContent );
					this.type = child.nodeName;
					break;

				case 'float_array':

					this.data = _floats( child.textContent );
					this.type = child.nodeName;
					break;

				case 'int_array':

					this.data = _ints( child.textContent );
					this.type = child.nodeName;
					break;

				case 'IDREF_array':
				case 'Name_array':

					this.data = _strings( child.textContent );
					this.type = child.nodeName;
					break;

				case 'technique_common':

					for ( var j = 0; j < child.childNodes.length; j ++ ) {

						if ( child.childNodes[ j ].nodeName === 'accessor' ) {

							this.accessor = ( new Accessor() ).parse( child.childNodes[ j ] );
							break;

						}
					}
					break;

				default:
					// console.log(child.nodeName);
					break;

			}

		}

		return this;

	};

	Source.prototype.read = function () {

		var result = [];

		//for (var i = 0; i < this.accessor.params.length; i++) {

		var param = this.accessor.params[ 0 ];

			//console.log(param.name + " " + param.type);

		switch ( param.type ) {

			case 'IDREF':
			case 'Name': case 'name':
			case 'float':

				return this.data;

			case 'float4x4':

				for ( var j = 0; j < this.data.length; j += 16 ) {

					var s = this.data.slice( j, j + 16 );
					var m = getConvertedMat4( s );
					result.push( m );
				}

				break;

			default:

				console.log( 'ColladaLoader: Source: Read dont know how to read ' + param.type + '.' );
				break;

		}

		//}

		return result;

	};

	function Material () {

		this.id = "";
		this.name = "";
		this.instance_effect = null;

	}

	Material.prototype.parse = function ( element ) {

		this.id = element.getAttribute( 'id' );
		this.name = element.getAttribute( 'name' );

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			if ( element.childNodes[ i ].nodeName === 'instance_effect' ) {

				this.instance_effect = ( new InstanceEffect() ).parse( element.childNodes[ i ] );
				break;

			}

		}

		return this;

	};

	function ColorOrTexture () {

		this.color = new THREE.Color();
		this.color.setRGB( Math.random(), Math.random(), Math.random() );
		this.color.a = 1.0;

		this.texture = null;
		this.texcoord = null;
		this.texOpts = null;

	}

	ColorOrTexture.prototype.isColor = function () {

		return ( this.texture === null );

	};

	ColorOrTexture.prototype.isTexture = function () {

		return ( this.texture != null );

	};

	ColorOrTexture.prototype.parse = function ( element ) {

		if (element.nodeName === 'transparent') {

			this.opaque = element.getAttribute('opaque');

		}

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'color':

					var rgba = _floats( child.textContent );
					this.color = new THREE.Color();
					this.color.setRGB( rgba[0], rgba[1], rgba[2] );
					this.color.a = rgba[3];
					break;

				case 'texture':

					this.texture = child.getAttribute('texture');
					this.texcoord = child.getAttribute('texcoord');
					// Defaults from:
					// https://collada.org/mediawiki/index.php/Maya_texture_placement_MAYA_extension
					this.texOpts = {
						offsetU: 0,
						offsetV: 0,
						repeatU: 1,
						repeatV: 1,
						wrapU: 1,
						wrapV: 1
					};
					this.parseTexture( child );
					break;

				default:
					break;

			}

		}

		return this;

	};

	ColorOrTexture.prototype.parseTexture = function ( element ) {

		if ( ! element.childNodes ) return this;

		// This should be supported by Maya, 3dsMax, and MotionBuilder

		if ( element.childNodes[1] && element.childNodes[1].nodeName === 'extra' ) {

			element = element.childNodes[1];

			if ( element.childNodes[1] && element.childNodes[1].nodeName === 'technique' ) {

				element = element.childNodes[1];

			}

		}

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];

			switch ( child.nodeName ) {

				case 'offsetU':
				case 'offsetV':
				case 'repeatU':
				case 'repeatV':

					this.texOpts[ child.nodeName ] = parseFloat( child.textContent );

					break;

				case 'wrapU':
				case 'wrapV':

					// some dae have a value of true which becomes NaN via parseInt

					if ( child.textContent.toUpperCase() === 'TRUE' ) {

						this.texOpts[ child.nodeName ] = 1;

					} else {

						this.texOpts[ child.nodeName ] = parseInt( child.textContent );

					}
					break;

				default:

					this.texOpts[ child.nodeName ] = child.textContent;

					break;

			}

		}

		return this;

	};

	function Shader ( type, effect ) {

		this.type = type;
		this.effect = effect;
		this.material = null;

	}

	Shader.prototype.parse = function ( element ) {

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'emission':
				case 'diffuse':
				case 'specular':
				case 'transparent':

					this[ child.nodeName ] = ( new ColorOrTexture() ).parse( child );
					break;

				case 'bump':

					// If 'bumptype' is 'heightfield', create a 'bump' property
					// Else if 'bumptype' is 'normalmap', create a 'normal' property
					// (Default to 'bump')
					var bumpType = child.getAttribute( 'bumptype' );
					if ( bumpType ) {
						if ( bumpType.toLowerCase() === "heightfield" ) {
							this[ 'bump' ] = ( new ColorOrTexture() ).parse( child );
						} else if ( bumpType.toLowerCase() === "normalmap" ) {
							this[ 'normal' ] = ( new ColorOrTexture() ).parse( child );
						} else {
							console.error( "Shader.prototype.parse: Invalid value for attribute 'bumptype' (" + bumpType + ") - valid bumptypes are 'HEIGHTFIELD' and 'NORMALMAP' - defaulting to 'HEIGHTFIELD'" );
							this[ 'bump' ] = ( new ColorOrTexture() ).parse( child );
						}
					} else {
						console.warn( "Shader.prototype.parse: Attribute 'bumptype' missing from bump node - defaulting to 'HEIGHTFIELD'" );
						this[ 'bump' ] = ( new ColorOrTexture() ).parse( child );
					}

					break;

				case 'shininess':
				case 'reflectivity':
				case 'index_of_refraction':
				case 'transparency':

					var f = child.querySelectorAll('float');

					if ( f.length > 0 )
						this[ child.nodeName ] = parseFloat( f[ 0 ].textContent );

					break;

				default:
					break;

			}

		}

		this.create();
		return this;

	};

	Shader.prototype.create = function() {

		var props = {};

		var transparent = false;

		if (this['transparency'] !== undefined && this['transparent'] !== undefined) {
			// convert transparent color RBG to average value
			var transparentColor = this['transparent'];
			var transparencyLevel = (this.transparent.color.r + this.transparent.color.g + this.transparent.color.b) / 3 * this.transparency;

			if (transparencyLevel > 0) {
				transparent = true;
				props[ 'transparent' ] = true;
				props[ 'opacity' ] = 1 - transparencyLevel;

			}

		}

		var keys = {
			'diffuse':'map',
			'ambient':'lightMap',
			'specular':'specularMap',
			'emission':'emissionMap',
			'bump':'bumpMap',
			'normal':'normalMap'
			};

		for ( var prop in this ) {

			switch ( prop ) {

				case 'ambient':
				case 'emission':
				case 'diffuse':
				case 'specular':
				case 'bump':
				case 'normal':

					var cot = this[ prop ];

					if ( cot instanceof ColorOrTexture ) {

						if ( cot.isTexture() ) {

							var samplerId = cot.texture;
							var surfaceId = this.effect.sampler[samplerId];

							if ( surfaceId !== undefined && surfaceId.source !== undefined ) {

								var surface = this.effect.surface[surfaceId.source];

								if ( surface !== undefined ) {

									var image = images[ surface.init_from ];

									if ( image ) {

										var url = baseUrl + image.init_from;

										var texture;
										var loader = THREE.Loader.Handlers.get( url );

										if ( loader !== null ) {

											texture = loader.load( url );

										} else {

											texture = new THREE.Texture();

											loadTextureImage( texture, url );

										}

										texture.wrapS = cot.texOpts.wrapU ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
										texture.wrapT = cot.texOpts.wrapV ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
										texture.offset.x = cot.texOpts.offsetU;
										texture.offset.y = cot.texOpts.offsetV;
										texture.repeat.x = cot.texOpts.repeatU;
										texture.repeat.y = cot.texOpts.repeatV;
										props[keys[prop]] = texture;

										// Texture with baked lighting?
										if (prop === 'emission') props['emissive'] = 0xffffff;

									}

								}

							}

						} else if ( prop === 'diffuse' || !transparent ) {

							if ( prop === 'emission' ) {

								props[ 'emissive' ] = cot.color.getHex();

							} else {

								props[ prop ] = cot.color.getHex();

							}

						}

					}

					break;

				case 'shininess':

					props[ prop ] = this[ prop ];
					break;

				case 'reflectivity':

					props[ prop ] = this[ prop ];
					if ( props[ prop ] > 0.0 ) props['envMap'] = options.defaultEnvMap;
					props['combine'] = THREE.MixOperation;	//mix regular shading with reflective component
					break;

				case 'index_of_refraction':

					props[ 'refractionRatio' ] = this[ prop ]; //TODO: "index_of_refraction" becomes "refractionRatio" in shader, but I'm not sure if the two are actually comparable
					if ( this[ prop ] !== 1.0 ) props['envMap'] = options.defaultEnvMap;
					break;

				case 'transparency':
					// gets figured out up top
					break;

				default:
					break;

			}

		}

		props[ 'shading' ] = preferredShading;
		props[ 'side' ] = this.effect.doubleSided ? THREE.DoubleSide : THREE.FrontSide;

		if ( props.diffuse !== undefined ) {

			props.color = props.diffuse;
			delete props.diffuse;

		}

		switch ( this.type ) {

			case 'constant':

				if (props.emissive != undefined) props.color = props.emissive;
				this.material = new THREE.MeshBasicMaterial( props );
				break;

			case 'phong':
			case 'blinn':

				this.material = new THREE.MeshPhongMaterial( props );
				break;

			case 'lambert':
			default:

				this.material = new THREE.MeshLambertMaterial( props );
				break;

		}

		return this.material;

	};

	function Surface ( effect ) {

		this.effect = effect;
		this.init_from = null;
		this.format = null;

	}

	Surface.prototype.parse = function ( element ) {

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'init_from':

					this.init_from = child.textContent;
					break;

				case 'format':

					this.format = child.textContent;
					break;

				default:

					console.log( "unhandled Surface prop: " + child.nodeName );
					break;

			}

		}

		return this;

	};

	function Sampler2D ( effect ) {

		this.effect = effect;
		this.source = null;
		this.wrap_s = null;
		this.wrap_t = null;
		this.minfilter = null;
		this.magfilter = null;
		this.mipfilter = null;

	}

	Sampler2D.prototype.parse = function ( element ) {

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'source':

					this.source = child.textContent;
					break;

				case 'minfilter':

					this.minfilter = child.textContent;
					break;

				case 'magfilter':

					this.magfilter = child.textContent;
					break;

				case 'mipfilter':

					this.mipfilter = child.textContent;
					break;

				case 'wrap_s':

					this.wrap_s = child.textContent;
					break;

				case 'wrap_t':

					this.wrap_t = child.textContent;
					break;

				default:

					console.log( "unhandled Sampler2D prop: " + child.nodeName );
					break;

			}

		}

		return this;

	};

	function Effect () {

		this.id = "";
		this.name = "";
		this.shader = null;
		this.surface = {};
		this.sampler = {};

	}

	Effect.prototype.create = function () {

		if ( this.shader === null ) {

			return null;

		}

	};

	Effect.prototype.parse = function ( element ) {

		this.id = element.getAttribute( 'id' );
		this.name = element.getAttribute( 'name' );

		extractDoubleSided( this, element );

		this.shader = null;

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'profile_COMMON':

					this.parseTechnique( this.parseProfileCOMMON( child ) );
					break;

				default:
					break;

			}

		}

		return this;

	};

	Effect.prototype.parseNewparam = function ( element ) {

		var sid = element.getAttribute( 'sid' );

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'surface':

					this.surface[sid] = ( new Surface( this ) ).parse( child );
					break;

				case 'sampler2D':

					this.sampler[sid] = ( new Sampler2D( this ) ).parse( child );
					break;

				case 'extra':

					break;

				default:

					console.log( child.nodeName );
					break;

			}

		}

	};

	Effect.prototype.parseProfileCOMMON = function ( element ) {

		var technique;

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];

			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'profile_COMMON':

					this.parseProfileCOMMON( child );
					break;

				case 'technique':

					technique = child;
					break;

				case 'newparam':

					this.parseNewparam( child );
					break;

				case 'image':

					var _image = ( new _Image() ).parse( child );
					images[ _image.id ] = _image;
					break;

				case 'extra':
					break;

				default:

					console.log( child.nodeName );
					break;

			}

		}

		return technique;

	};

	Effect.prototype.parseTechnique = function ( element ) {

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[i];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'constant':
				case 'lambert':
				case 'blinn':
				case 'phong':

					this.shader = ( new Shader( child.nodeName, this ) ).parse( child );
					break;
				case 'extra':
					this.parseExtra(child);
					break;
				default:
					break;

			}

		}

	};

	Effect.prototype.parseExtra = function ( element ) {

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[i];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'technique':
					this.parseExtraTechnique( child );
					break;
				default:
					break;

			}

		}

	};

	Effect.prototype.parseExtraTechnique = function ( element ) {

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[i];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'bump':
					this.shader.parse( element );
					break;
				default:
					break;

			}

		}

	};

	function InstanceEffect () {

		this.url = "";

	}

	InstanceEffect.prototype.parse = function ( element ) {

		this.url = element.getAttribute( 'url' ).replace( /^#/, '' );
		return this;

	};

	function Animation() {

		this.id = "";
		this.name = "";
		this.source = {};
		this.sampler = [];
		this.channel = [];

	}

	Animation.prototype.parse = function ( element ) {

		this.id = element.getAttribute( 'id' );
		this.name = element.getAttribute( 'name' );
		this.source = {};

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];

			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'animation':

					var anim = ( new Animation() ).parse( child );

					for ( var src in anim.source ) {

						this.source[ src ] = anim.source[ src ];

					}

					for ( var j = 0; j < anim.channel.length; j ++ ) {

						this.channel.push( anim.channel[ j ] );
						this.sampler.push( anim.sampler[ j ] );

					}

					break;

				case 'source':

					var src = ( new Source() ).parse( child );
					this.source[ src.id ] = src;
					break;

				case 'sampler':

					this.sampler.push( ( new Sampler( this ) ).parse( child ) );
					break;

				case 'channel':

					this.channel.push( ( new Channel( this ) ).parse( child ) );
					break;

				default:
					break;

			}

		}

		return this;

	};

	function Channel( animation ) {

		this.animation = animation;
		this.source = "";
		this.target = "";
		this.fullSid = null;
		this.sid = null;
		this.dotSyntax = null;
		this.arrSyntax = null;
		this.arrIndices = null;
		this.member = null;

	}

	Channel.prototype.parse = function ( element ) {

		this.source = element.getAttribute( 'source' ).replace( /^#/, '' );
		this.target = element.getAttribute( 'target' );

		var parts = this.target.split( '/' );

		var id = parts.shift();
		var sid = parts.shift();

		var dotSyntax = ( sid.indexOf(".") >= 0 );
		var arrSyntax = ( sid.indexOf("(") >= 0 );

		if ( dotSyntax ) {

			parts = sid.split(".");
			this.sid = parts.shift();
			this.member = parts.shift();

		} else if ( arrSyntax ) {

			var arrIndices = sid.split("(");
			this.sid = arrIndices.shift();

			for (var j = 0; j < arrIndices.length; j ++ ) {

				arrIndices[j] = parseInt( arrIndices[j].replace(/\)/, '') );

			}

			this.arrIndices = arrIndices;

		} else {

			this.sid = sid;

		}

		this.fullSid = sid;
		this.dotSyntax = dotSyntax;
		this.arrSyntax = arrSyntax;

		return this;

	};

	function Sampler ( animation ) {

		this.id = "";
		this.animation = animation;
		this.inputs = [];
		this.input = null;
		this.output = null;
		this.strideOut = null;
		this.interpolation = null;
		this.startTime = null;
		this.endTime = null;
		this.duration = 0;

	}

	Sampler.prototype.parse = function ( element ) {

		this.id = element.getAttribute( 'id' );
		this.inputs = [];

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'input':

					this.inputs.push( (new Input()).parse( child ) );
					break;

				default:
					break;

			}

		}

		return this;

	};

	Sampler.prototype.create = function () {

		for ( var i = 0; i < this.inputs.length; i ++ ) {

			var input = this.inputs[ i ];
			var source = this.animation.source[ input.source ];

			switch ( input.semantic ) {

				case 'INPUT':

					this.input = source.read();
					break;

				case 'OUTPUT':

					this.output = source.read();
					this.strideOut = source.accessor.stride;
					break;

				case 'INTERPOLATION':

					this.interpolation = source.read();
					break;

				case 'IN_TANGENT':

					break;

				case 'OUT_TANGENT':

					break;

				default:

					console.log(input.semantic);
					break;

			}

		}

		this.startTime = 0;
		this.endTime = 0;
		this.duration = 0;

		if ( this.input.length ) {

			this.startTime = 100000000;
			this.endTime = -100000000;

			for ( var i = 0; i < this.input.length; i ++ ) {

				this.startTime = Math.min( this.startTime, this.input[ i ] );
				this.endTime = Math.max( this.endTime, this.input[ i ] );

			}

			this.duration = this.endTime - this.startTime;

		}

	};

	Sampler.prototype.getData = function ( type, ndx, member ) {

		var data;

		if ( type === 'matrix' && this.strideOut === 16 ) {

			data = this.output[ ndx ];

		} else if ( this.strideOut > 1 ) {

			data = [];
			ndx *= this.strideOut;

			for ( var i = 0; i < this.strideOut; ++ i ) {

				data[ i ] = this.output[ ndx + i ];

			}

			if ( this.strideOut === 3 ) {

				switch ( type ) {

					case 'rotate':
					case 'translate':

						fixCoords( data, -1 );
						break;

					case 'scale':

						fixCoords( data, 1 );
						break;

				}

			} else if ( this.strideOut === 4 && type === 'matrix' ) {

				fixCoords( data, -1 );

			}

		} else {

			data = this.output[ ndx ];

			if ( member && type === 'translate' ) {
				data = getConvertedTranslation( member, data );
			}

		}

		return data;

	};

	function Key ( time ) {

		this.targets = [];
		this.time = time;

	}

	Key.prototype.addTarget = function ( fullSid, transform, member, data ) {

		this.targets.push( {
			sid: fullSid,
			member: member,
			transform: transform,
			data: data
		} );

	};

	Key.prototype.apply = function ( opt_sid ) {

		for ( var i = 0; i < this.targets.length; ++ i ) {

			var target = this.targets[ i ];

			if ( !opt_sid || target.sid === opt_sid ) {

				target.transform.update( target.data, target.member );

			}

		}

	};

	Key.prototype.getTarget = function ( fullSid ) {

		for ( var i = 0; i < this.targets.length; ++ i ) {

			if ( this.targets[ i ].sid === fullSid ) {

				return this.targets[ i ];

			}

		}

		return null;

	};

	Key.prototype.hasTarget = function ( fullSid ) {

		for ( var i = 0; i < this.targets.length; ++ i ) {

			if ( this.targets[ i ].sid === fullSid ) {

				return true;

			}

		}

		return false;

	};

	// TODO: Currently only doing linear interpolation. Should support full COLLADA spec.
	Key.prototype.interpolate = function ( nextKey, time ) {

		for ( var i = 0, l = this.targets.length; i < l; i ++ ) {

			var target = this.targets[ i ],
				nextTarget = nextKey.getTarget( target.sid ),
				data;

			if ( target.transform.type !== 'matrix' && nextTarget ) {

				var scale = ( time - this.time ) / ( nextKey.time - this.time ),
					nextData = nextTarget.data,
					prevData = target.data;

				if ( scale < 0 ) scale = 0;
				if ( scale > 1 ) scale = 1;

				if ( prevData.length ) {

					data = [];

					for ( var j = 0; j < prevData.length; ++ j ) {

						data[ j ] = prevData[ j ] + ( nextData[ j ] - prevData[ j ] ) * scale;

					}

				} else {

					data = prevData + ( nextData - prevData ) * scale;

				}

			} else {

				data = target.data;

			}

			target.transform.update( data, target.member );

		}

	};

	// Camera
	function Camera() {

		this.id = "";
		this.name = "";
		this.technique = "";

	}

	Camera.prototype.parse = function ( element ) {

		this.id = element.getAttribute( 'id' );
		this.name = element.getAttribute( 'name' );

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'optics':

					this.parseOptics( child );
					break;

				default:
					break;

			}

		}

		return this;

	};

	Camera.prototype.parseOptics = function ( element ) {

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			if ( element.childNodes[ i ].nodeName === 'technique_common' ) {

				var technique = element.childNodes[ i ];

				for ( var j = 0; j < technique.childNodes.length; j ++ ) {

					this.technique = technique.childNodes[ j ].nodeName;

					if ( this.technique === 'perspective' ) {

						var perspective = technique.childNodes[ j ];

						for ( var k = 0; k < perspective.childNodes.length; k ++ ) {

							var param = perspective.childNodes[ k ];

							switch ( param.nodeName ) {

								case 'yfov':
									this.yfov = param.textContent;
									break;
								case 'xfov':
									this.xfov = param.textContent;
									break;
								case 'znear':
									this.znear = param.textContent;
									break;
								case 'zfar':
									this.zfar = param.textContent;
									break;
								case 'aspect_ratio':
									this.aspect_ratio = param.textContent;
									break;

							}

						}

					} else if ( this.technique === 'orthographic' ) {

						var orthographic = technique.childNodes[ j ];

						for ( var k = 0; k < orthographic.childNodes.length; k ++ ) {

							var param = orthographic.childNodes[ k ];

							switch ( param.nodeName ) {

								case 'xmag':
									this.xmag = param.textContent;
									break;
								case 'ymag':
									this.ymag = param.textContent;
									break;
								case 'znear':
									this.znear = param.textContent;
									break;
								case 'zfar':
									this.zfar = param.textContent;
									break;
								case 'aspect_ratio':
									this.aspect_ratio = param.textContent;
									break;

							}

						}

					}

				}

			}

		}

		return this;

	};

	function InstanceCamera() {

		this.url = "";

	}

	InstanceCamera.prototype.parse = function ( element ) {

		this.url = element.getAttribute('url').replace(/^#/, '');

		return this;

	};

	// Light

	function Light() {

		this.id = "";
		this.name = "";
		this.technique = "";

	}

	Light.prototype.parse = function ( element ) {

		this.id = element.getAttribute( 'id' );
		this.name = element.getAttribute( 'name' );

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'technique_common':

					this.parseCommon( child );
					break;

				case 'technique':

					this.parseTechnique( child );
					break;

				default:
					break;

			}

		}

		return this;

	};

	Light.prototype.parseCommon = function ( element ) {

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			switch ( element.childNodes[ i ].nodeName ) {

				case 'directional':
				case 'point':
				case 'spot':
				case 'ambient':

					this.technique = element.childNodes[ i ].nodeName;

					var light = element.childNodes[ i ];

					for ( var j = 0; j < light.childNodes.length; j ++ ) {

						var child = light.childNodes[j];

						switch ( child.nodeName ) {

							case 'color':

								var rgba = _floats( child.textContent );
								this.color = new THREE.Color(0);
								this.color.setRGB( rgba[0], rgba[1], rgba[2] );
								this.color.a = rgba[3];
								break;

							case 'falloff_angle':

								this.falloff_angle = parseFloat( child.textContent );
								break;

							case 'quadratic_attenuation':
								var f = parseFloat( child.textContent );
								this.distance = f ? Math.sqrt( 1 / f ) : 0;
						}

					}

			}

		}

		return this;

	};

	Light.prototype.parseTechnique = function ( element ) {

		this.profile = element.getAttribute( 'profile' );

		for ( var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];

			switch ( child.nodeName ) {

				case 'intensity':

					this.intensity = parseFloat(child.textContent);
					break;

			}

		}

		return this;

	};

	function InstanceLight() {

		this.url = "";

	}

	InstanceLight.prototype.parse = function ( element ) {

		this.url = element.getAttribute('url').replace(/^#/, '');

		return this;

	};

	function KinematicsModel( ) {

		this.id = '';
		this.name = '';
		this.joints = [];
		this.links = [];

	}

	KinematicsModel.prototype.parse = function( element ) {

		this.id = element.getAttribute('id');
		this.name = element.getAttribute('name');
		this.joints = [];
		this.links = [];

		for (var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'technique_common':

					this.parseCommon(child);
					break;

				default:
					break;

			}

		}

		return this;

	};

	KinematicsModel.prototype.parseCommon = function( element ) {

		for (var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( element.childNodes[ i ].nodeName ) {

				case 'joint':
					this.joints.push( (new Joint()).parse(child) );
					break;

				case 'link':
					this.links.push( (new Link()).parse(child) );
					break;

				default:
					break;

			}

		}

		return this;

	};

	function Joint( ) {

		this.sid = '';
		this.name = '';
		this.axis = new THREE.Vector3();
		this.limits = {
			min: 0,
			max: 0
		};
		this.type = '';
		this.static = false;
		this.zeroPosition = 0.0;
		this.middlePosition = 0.0;

	}

	Joint.prototype.parse = function( element ) {

		this.sid = element.getAttribute('sid');
		this.name = element.getAttribute('name');
		this.axis = new THREE.Vector3();
		this.limits = {
			min: 0,
			max: 0
		};
		this.type = '';
		this.static = false;
		this.zeroPosition = 0.0;
		this.middlePosition = 0.0;

		var axisElement = element.querySelector('axis');
		var _axis = _floats(axisElement.textContent);
		this.axis = getConvertedVec3(_axis, 0);

		var min = element.querySelector('limits min') ? parseFloat(element.querySelector('limits min').textContent) : -360;
		var max = element.querySelector('limits max') ? parseFloat(element.querySelector('limits max').textContent) : 360;

		this.limits = {
			min: min,
			max: max
		};

		var jointTypes = [ 'prismatic', 'revolute' ];
		for (var i = 0; i < jointTypes.length; i ++ ) {

			var type = jointTypes[ i ];

			var jointElement = element.querySelector(type);

			if ( jointElement ) {

				this.type = type;

			}

		}

		// if the min is equal to or somehow greater than the max, consider the joint static
		if ( this.limits.min >= this.limits.max ) {

			this.static = true;

		}

		this.middlePosition = (this.limits.min + this.limits.max) / 2.0;
		return this;

	};

	function Link( ) {

		this.sid = '';
		this.name = '';
		this.transforms = [];
		this.attachments = [];

	}

	Link.prototype.parse = function( element ) {

		this.sid = element.getAttribute('sid');
		this.name = element.getAttribute('name');
		this.transforms = [];
		this.attachments = [];

		for (var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'attachment_full':
					this.attachments.push( (new Attachment()).parse(child) );
					break;

				case 'rotate':
				case 'translate':
				case 'matrix':

					this.transforms.push( (new Transform()).parse(child) );
					break;

				default:

					break;

			}

		}

		return this;

	};

	function Attachment( ) {

		this.joint = '';
		this.transforms = [];
		this.links = [];

	}

	Attachment.prototype.parse = function( element ) {

		this.joint = element.getAttribute('joint').split('/').pop();
		this.links = [];

		for (var i = 0; i < element.childNodes.length; i ++ ) {

			var child = element.childNodes[ i ];
			if ( child.nodeType != 1 ) continue;

			switch ( child.nodeName ) {

				case 'link':
					this.links.push( (new Link()).parse(child) );
					break;

				case 'rotate':
				case 'translate':
				case 'matrix':

					this.transforms.push( (new Transform()).parse(child) );
					break;

				default:

					break;

			}

		}

		return this;

	};

	function _source( element ) {

		var id = element.getAttribute( 'id' );

		if ( sources[ id ] != undefined ) {

			return sources[ id ];

		}

		sources[ id ] = ( new Source(id )).parse( element );
		return sources[ id ];

	}

	function _nsResolver( nsPrefix ) {

		if ( nsPrefix === "dae" ) {

			return "http://www.collada.org/2005/11/COLLADASchema";

		}

		return null;

	}

	function _bools( str ) {

		var raw = _strings( str );
		var data = [];

		for ( var i = 0, l = raw.length; i < l; i ++ ) {

			data.push( (raw[i] === 'true' || raw[i] === '1') ? true : false );

		}

		return data;

	}

	function _floats( str ) {

		var raw = _strings(str);
		var data = [];

		for ( var i = 0, l = raw.length; i < l; i ++ ) {

			data.push( parseFloat( raw[ i ] ) );

		}

		return data;

	}

	function _ints( str ) {

		var raw = _strings( str );
		var data = [];

		for ( var i = 0, l = raw.length; i < l; i ++ ) {

			data.push( parseInt( raw[ i ], 10 ) );

		}

		return data;

	}

	function _strings( str ) {

		return ( str.length > 0 ) ? _trimString( str ).split( /\s+/ ) : [];

	}

	function _trimString( str ) {

		return str.replace( /^\s+/, "" ).replace( /\s+$/, "" );

	}

	function _attr_as_float( element, name, defaultValue ) {

		if ( element.hasAttribute( name ) ) {

			return parseFloat( element.getAttribute( name ) );

		} else {

			return defaultValue;

		}

	}

	function _attr_as_int( element, name, defaultValue ) {

		if ( element.hasAttribute( name ) ) {

			return parseInt( element.getAttribute( name ), 10) ;

		} else {

			return defaultValue;

		}

	}

	function _attr_as_string( element, name, defaultValue ) {

		if ( element.hasAttribute( name ) ) {

			return element.getAttribute( name );

		} else {

			return defaultValue;

		}

	}

	function _format_float( f, num ) {

		if ( f === undefined ) {

			var s = '0.';

			while ( s.length < num + 2 ) {

				s += '0';

			}

			return s;

		}

		num = num || 2;

		var parts = f.toString().split( '.' );
		parts[ 1 ] = parts.length > 1 ? parts[ 1 ].substr( 0, num ) : "0";

		while ( parts[ 1 ].length < num ) {

			parts[ 1 ] += '0';

		}

		return parts.join( '.' );

	}

	function loadTextureImage ( texture, url ) {

		var loader = new THREE.ImageLoader();

		loader.load( url, function ( image ) {

			texture.image = image;
			texture.needsUpdate = true;

		} );

	}

	function extractDoubleSided( obj, element ) {

		obj.doubleSided = false;

		var node = element.querySelectorAll('extra double_sided')[0];

		if ( node ) {

			if ( node && parseInt( node.textContent, 10 ) === 1 ) {

				obj.doubleSided = true;

			}

		}

	}

	// Up axis conversion

	function setUpConversion() {

		if ( options.convertUpAxis !== true || colladaUp === options.upAxis ) {

			upConversion = null;

		} else {

			switch ( colladaUp ) {

				case 'X':

					upConversion = options.upAxis === 'Y' ? 'XtoY' : 'XtoZ';
					break;

				case 'Y':

					upConversion = options.upAxis === 'X' ? 'YtoX' : 'YtoZ';
					break;

				case 'Z':

					upConversion = options.upAxis === 'X' ? 'ZtoX' : 'ZtoY';
					break;

			}

		}

	}

	function fixCoords( data, sign ) {

		if ( options.convertUpAxis !== true || colladaUp === options.upAxis ) {

			return;

		}

		switch ( upConversion ) {

			case 'XtoY':

				var tmp = data[ 0 ];
				data[ 0 ] = sign * data[ 1 ];
				data[ 1 ] = tmp;
				break;

			case 'XtoZ':

				var tmp = data[ 2 ];
				data[ 2 ] = data[ 1 ];
				data[ 1 ] = data[ 0 ];
				data[ 0 ] = tmp;
				break;

			case 'YtoX':

				var tmp = data[ 0 ];
				data[ 0 ] = data[ 1 ];
				data[ 1 ] = sign * tmp;
				break;

			case 'YtoZ':

				var tmp = data[ 1 ];
				data[ 1 ] = sign * data[ 2 ];
				data[ 2 ] = tmp;
				break;

			case 'ZtoX':

				var tmp = data[ 0 ];
				data[ 0 ] = data[ 1 ];
				data[ 1 ] = data[ 2 ];
				data[ 2 ] = tmp;
				break;

			case 'ZtoY':

				var tmp = data[ 1 ];
				data[ 1 ] = data[ 2 ];
				data[ 2 ] = sign * tmp;
				break;

		}

	}

	function getConvertedTranslation( axis, data ) {

		if ( options.convertUpAxis !== true || colladaUp === options.upAxis ) {

			return data;

		}

		switch ( axis ) {
			case 'X':
				data = upConversion === 'XtoY' ? data * -1 : data;
				break;
			case 'Y':
				data = upConversion === 'YtoZ' || upConversion === 'YtoX' ? data * -1 : data;
				break;
			case 'Z':
				data = upConversion === 'ZtoY' ? data * -1 : data ;
				break;
			default:
				break;
		}

		return data;
	}

	function getConvertedVec3( data, offset ) {

		var arr = [ data[ offset ], data[ offset + 1 ], data[ offset + 2 ] ];
		fixCoords( arr, -1 );
		return new THREE.Vector3( arr[ 0 ], arr[ 1 ], arr[ 2 ] );

	}

	function getConvertedMat4( data ) {

		if ( options.convertUpAxis ) {

			// First fix rotation and scale

			// Columns first
			var arr = [ data[ 0 ], data[ 4 ], data[ 8 ] ];
			fixCoords( arr, -1 );
			data[ 0 ] = arr[ 0 ];
			data[ 4 ] = arr[ 1 ];
			data[ 8 ] = arr[ 2 ];
			arr = [ data[ 1 ], data[ 5 ], data[ 9 ] ];
			fixCoords( arr, -1 );
			data[ 1 ] = arr[ 0 ];
			data[ 5 ] = arr[ 1 ];
			data[ 9 ] = arr[ 2 ];
			arr = [ data[ 2 ], data[ 6 ], data[ 10 ] ];
			fixCoords( arr, -1 );
			data[ 2 ] = arr[ 0 ];
			data[ 6 ] = arr[ 1 ];
			data[ 10 ] = arr[ 2 ];
			// Rows second
			arr = [ data[ 0 ], data[ 1 ], data[ 2 ] ];
			fixCoords( arr, -1 );
			data[ 0 ] = arr[ 0 ];
			data[ 1 ] = arr[ 1 ];
			data[ 2 ] = arr[ 2 ];
			arr = [ data[ 4 ], data[ 5 ], data[ 6 ] ];
			fixCoords( arr, -1 );
			data[ 4 ] = arr[ 0 ];
			data[ 5 ] = arr[ 1 ];
			data[ 6 ] = arr[ 2 ];
			arr = [ data[ 8 ], data[ 9 ], data[ 10 ] ];
			fixCoords( arr, -1 );
			data[ 8 ] = arr[ 0 ];
			data[ 9 ] = arr[ 1 ];
			data[ 10 ] = arr[ 2 ];

			// Now fix translation
			arr = [ data[ 3 ], data[ 7 ], data[ 11 ] ];
			fixCoords( arr, -1 );
			data[ 3 ] = arr[ 0 ];
			data[ 7 ] = arr[ 1 ];
			data[ 11 ] = arr[ 2 ];

		}

		return new THREE.Matrix4().set(
			data[0], data[1], data[2], data[3],
			data[4], data[5], data[6], data[7],
			data[8], data[9], data[10], data[11],
			data[12], data[13], data[14], data[15]
			);

	}

	function getConvertedIndex( index ) {

		if ( index > -1 && index < 3 ) {

			var members = [ 'X', 'Y', 'Z' ],
				indices = { X: 0, Y: 1, Z: 2 };

			index = getConvertedMember( members[ index ] );
			index = indices[ index ];

		}

		return index;

	}

	function getConvertedMember( member ) {

		if ( options.convertUpAxis ) {

			switch ( member ) {

				case 'X':

					switch ( upConversion ) {

						case 'XtoY':
						case 'XtoZ':
						case 'YtoX':

							member = 'Y';
							break;

						case 'ZtoX':

							member = 'Z';
							break;

					}

					break;

				case 'Y':

					switch ( upConversion ) {

						case 'XtoY':
						case 'YtoX':
						case 'ZtoX':

							member = 'X';
							break;

						case 'XtoZ':
						case 'YtoZ':
						case 'ZtoY':

							member = 'Z';
							break;

					}

					break;

				case 'Z':

					switch ( upConversion ) {

						case 'XtoZ':

							member = 'X';
							break;

						case 'YtoZ':
						case 'ZtoX':
						case 'ZtoY':

							member = 'Y';
							break;

					}

					break;

			}

		}

		return member;

	}

	return {

		load: load,
		parse: parse,
		setPreferredShading: setPreferredShading,
		applySkin: applySkin,
		geometries : geometries,
		options: options

	};

};







// Copyright (c) 2013 Fabrice Robinet
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
// THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/*
	The Abstract Loader has two modes:
		#1: [static] load all the JSON at once [as of now]
		#2: [stream] stream and parse JSON progressively [not yet supported]

	Whatever is the mechanism used to parse the JSON (#1 or #2),
	The loader starts by resolving the paths to binaries and referenced json files (by replace the value of the path property with an absolute path if it was relative).

	In case #1: it is guaranteed to call the concrete loader implementation methods in a order that solves the dependencies between the entries.
	only the nodes requires an extra pass to set up the hirerarchy.
	In case #2: the concrete implementation will have to solve the dependencies. no order is guaranteed.

	When case #1 is used the followed dependency order is:

	scenes -> nodes -> meshes -> materials -> techniques -> shaders
					-> buffers
					-> cameras
					-> lights

	The readers starts with the leafs, i.e:
		shaders, techniques, materials, meshes, buffers, cameras, lights, nodes, scenes

	For each called handle method called the client should return true if the next handle can be call right after returning,
	or false if a callback on client side will notify the loader that the next handle method can be called.

*/
var global = window;
(function (root, factory) {
	if (typeof exports === 'object') {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like enviroments that support module.exports,
		// like Node.
		factory(module.exports);
	} else if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([], function () {
			return factory(root);
		});
	} else {
		// Browser globals
		factory(root);
	}
}(this, function (root) {
	"use strict";

	var categoriesDepsOrder = ["extensions", "buffers", "bufferViews", "images",  "videos", "samplers", "textures", "shaders", "programs", "techniques", "materials", "accessors", "meshes", "cameras", "lights", "skins", "nodes", "animations", "scenes"];

	var glTFParser = Object.create(Object.prototype, {

		_rootDescription: { value: null, writable: true },

		rootDescription: {
			set: function(value) {
				this._rootDescription = value;
			},
			get: function() {
				return this._rootDescription;
			}
		},

		baseURL: { value: null, writable: true },

		//detect absolute path following the same protocol than window.location
		_isAbsolutePath: {
			value: function(path) {
				var isAbsolutePathRegExp = new RegExp("^"+window.location.protocol, "i");

				return path.match(isAbsolutePathRegExp) ? true : false;
			}
		},

		resolvePathIfNeeded: {
			value: function(path) {
				if (this._isAbsolutePath(path)) {
					return path;
				}

				var isDataUriRegex = /^data:/;
				if (isDataUriRegex.test(path)) {
					return path;
				}
				
				return this.baseURL + path;
			}
		},

		_resolvePathsForCategories: {
			value: function(categories) {
				categories.forEach( function(category) {
					var descriptions = this.json[category];
					if (descriptions) {
						var descriptionKeys = Object.keys(descriptions);
						descriptionKeys.forEach( function(descriptionKey) {
							var description = descriptions[descriptionKey];
							description.uri = this.resolvePathIfNeeded(description.uri);
						}, this);
					}
				}, this);
			}
		},

		_json: {
			value: null,
			writable: true
		},

		json: {
			enumerable: true,
			get: function() {
				return this._json;
			},
			set: function(value) {
				if (this._json !== value) {
					this._json = value;
					this._resolvePathsForCategories(["buffers", "shaders", "images", "videos"]);
				}
			}
		},

		_path: {
			value: null,
			writable: true
		},

		getEntryDescription: {
			value: function (entryID, entryType) {
				var entries = null;

				var category = entryType;
				entries = this.rootDescription[category];
				if (!entries) {
					console.log("ERROR:CANNOT find expected category named:"+category);
					return null;
				}

				return entries ? entries[entryID] : null;
			}
		},

		_stepToNextCategory: {
			value: function() {
				this._state.categoryIndex = this.getNextCategoryIndex(this._state.categoryIndex + 1);
				if (this._state.categoryIndex !== -1) {
					this._state.categoryState.index = 0;
					return true;
				}

				return false;
			}
		},

		_stepToNextDescription: {
			enumerable: false,
			value: function() {
				var categoryState = this._state.categoryState;
				var keys = categoryState.keys;
				if (!keys) {
					console.log("INCONSISTENCY ERROR");
					return false;
				}

				categoryState.index++;
				categoryState.keys = null;
				if (categoryState.index >= keys.length) {
					return this._stepToNextCategory();
				}
				return false;
			}
		},

		hasCategory: {
			value: function(category) {
				return this.rootDescription[category] ? true : false;
			}
		},

		_handleState: {
			value: function() {

				var methodForType = {
					"buffers" : this.handleBuffer,
					"bufferViews" : this.handleBufferView,
					"shaders" : this.handleShader,
					"programs" : this.handleProgram,
					"techniques" : this.handleTechnique,
					"materials" : this.handleMaterial,
					"meshes" : this.handleMesh,
					"cameras" : this.handleCamera,
					"lights" : this.handleLight,
					"nodes" : this.handleNode,
					"scenes" : this.handleScene,
					"images" : this.handleImage,
					"animations" : this.handleAnimation,
					"accessors" : this.handleAccessor,
					"skins" : this.handleSkin,
					"samplers" : this.handleSampler,
					"textures" : this.handleTexture,
					"videos" : this.handleVideo,
					"extensions" : this.handleExtension,

				};

				var success = true;
				while (this._state.categoryIndex !== -1) {
					var category = categoriesDepsOrder[this._state.categoryIndex];
					var categoryState = this._state.categoryState;
					var keys = categoryState.keys;
					if (!keys) {
						categoryState.keys = keys = Object.keys(this.rootDescription[category]);
						if (keys) {
							if (keys.length == 0) {
								this._stepToNextDescription();
								continue;
							}
						}
					}

					var type = category;
					var entryID = keys[categoryState.index];
					var description = this.getEntryDescription(entryID, type);
					if (!description) {
						if (this.handleError) {
							this.handleError("INCONSISTENCY ERROR: no description found for entry "+entryID);
							success = false;
							break;
						}
					} else {

						if (methodForType[type]) {
							if (methodForType[type].call(this, entryID, description, this._state.userInfo) === false) {
								success = false;
								break;
							}
						}

						this._stepToNextDescription();
					}
				}

				if (this.handleLoadCompleted) {
					this.handleLoadCompleted(success);
				}

			}
		},

		_loadJSONIfNeeded: {
			enumerable: true,
			value: function(callback) {
				var self = this;
				//FIXME: handle error
				if (!this._json)  {
					var jsonPath = this._path;
					var i = jsonPath.lastIndexOf("/");
					this.baseURL = (i !== 0) ? jsonPath.substring(0, i + 1) : '';
					var jsonfile = new XMLHttpRequest();
					jsonfile.open("GET", jsonPath, true);
					jsonfile.onreadystatechange = function() {
						if (jsonfile.readyState == 4) {
							if (jsonfile.status == 200) {
								self.json = JSON.parse(jsonfile.responseText);
								if (callback) {
									callback(self.json);
								}
							}
						}
					};
					jsonfile.send(null);
			   } else {
					if (callback) {
						callback(this.json);
					}
				}
			}
		},

		/* load JSON and assign it as description to the reader */
		_buildLoader: {
			value: function(callback) {
				var self = this;
				function JSONReady(json) {
					self.rootDescription = json;
					if (callback)
						callback(this);
				}

				this._loadJSONIfNeeded(JSONReady);
			}
		},

		_state: { value: null, writable: true },

		_getEntryType: {
			value: function(entryID) {
				var rootKeys = categoriesDepsOrder;
				for (var i = 0 ;  i < rootKeys.length ; i++) {
					var rootValues = this.rootDescription[rootKeys[i]];
					if (rootValues) {
						return rootKeys[i];
					}
				}
				return null;
			}
		},

		getNextCategoryIndex: {
			value: function(currentIndex) {
				for (var i = currentIndex ; i < categoriesDepsOrder.length ; i++) {
					if (this.hasCategory(categoriesDepsOrder[i])) {
						return i;
					}
				}

				return -1;
			}
		},

		load: {
			enumerable: true,
			value: function(userInfo, options) {
				var self = this;
				this._buildLoader(function loaderReady(reader) {
					var startCategory = self.getNextCategoryIndex.call(self,0);
					if (startCategory !== -1) {
						self._state = { "userInfo" : userInfo,
										"options" : options,
										"categoryIndex" : startCategory,
										"categoryState" : { "index" : "0" } };
						self._handleState();
					}
				});
			}
		},

		initWithPath: {
			value: function(path) {
				this._path = path;
				this._json = null;
				return this;
			}
		},

		//this is meant to be global and common for all instances
		_knownURLs: { writable: true, value: {} },

		//to be invoked by subclass, so that ids can be ensured to not overlap
		loaderContext: {
			value: function() {
				if (typeof this._knownURLs[this._path] === "undefined") {
					this._knownURLs[this._path] = Object.keys(this._knownURLs).length;
				}
				return "__" + this._knownURLs[this._path];
			}
		},

		initWithJSON: {
			value: function(json, baseURL) {
				this.json = json;
				this.baseURL = baseURL;
				if (!baseURL) {
					console.log("WARNING: no base URL passed to Reader:initWithJSON");
				}
				return this;
			}
		}

	});

	if(root) {
		root.glTFParser = glTFParser;
	}

	return glTFParser;

}));
/**
 * @author Tony Parisi / http://www.tonyparisi.com/
 */


THREE.glTFLoader = function () {

	this.meshesRequested = 0;
	this.meshesLoaded = 0;
	this.pendingMeshes = [];
	this.animationsRequested = 0;
	this.animationsLoaded = 0;
	this.animations = [];
	this.shadersRequested = 0;
	this.shadersLoaded = 0;
	this.shaders = {};
	this.loadRequests = [];
	THREE.glTFShaders.removeAll();
	THREE.Loader.call( this );
}

THREE.glTFLoader.prototype = new THREE.Loader();
THREE.glTFLoader.prototype.constructor = THREE.glTFLoader;

THREE.glTFLoader.prototype.load = function( url, callback ) {

	var theLoader = this;
	// Utilities

	function RgbArraytoHex(colorArray) {
		if(!colorArray) return 0xFFFFFFFF;
		var r = Math.floor(colorArray[0] * 255),
			g = Math.floor(colorArray[1] * 255),
			b = Math.floor(colorArray[2] * 255),
			a = 255;

		var color = (a << 24) + (r << 16) + (g << 8) + b;

		return color;
	}

	function componentsPerElementForGLType(type) {
		switch(type) {
			case "SCALAR" :
				nElements = 1;
				break;
			case "VEC2" :
				nElements = 2;
				break;
			case "VEC3" :
				nElements = 3;
				break;
			case "VEC4" :
				nElements = 4;
				break;
			case "MAT2" :
				nElements = 4;
				break;
			case "MAT3" :
				nElements = 9;
				break;
			case "MAT4" :
				nElements = 16;
				break;
			default :
				debugger;
				break;
		}

		return nElements;
	}

	function replaceShaderDefinitions(shader, material) {

		// Three.js seems too dependent on attribute names so globally
		// replace those in the shader code
		var program = material.params.program;
		var shaderParams = material.params.technique.parameters;
		var shaderAttributes = material.params.technique.attributes;
		var params = {};

		for (var attribute in material.params.attributes) {
			var pname = shaderAttributes[attribute];
			var shaderParam = shaderParams[pname];
			var semantic = shaderParam.semantic;
			if (semantic) {
				params[attribute] = shaderParam;
			}
		}


		var s = shader;
		var r = "";
		for (var pname in params) {
			var param = params[pname];
			var semantic = param.semantic;

			r = eval("/" + pname + "/g");

			switch (semantic) {
				case "POSITION" :
					s = s.replace(r, 'position');
					break;
				case "NORMAL" :
					s = s.replace(r, 'normal');
					break;
				case "TEXCOORD_0" :
					s = s.replace(r, 'uv');
					break;
			   case "WEIGHT" :
					s = s.replace(r, 'skinWeight');
					break;
				case "JOINT" :
					s = s.replace(r, 'skinIndex');
					break;
				default :
					break;
			}

		}

		return s;
	}

	function replaceShaderSemantics(material) {

		var vertexShader = theLoader.shaders[material.params.vertexShader];
		if (vertexShader) {
			vertexShader = replaceShaderDefinitions(vertexShader, material);
			theLoader.shaders[material.params.vertexShader] = vertexShader;
		}

	}

	function createShaderMaterial(material) {

		// replace named attributes and uniforms with Three.js built-ins
		replaceShaderSemantics(material);

		var fragmentShader = theLoader.shaders[material.params.fragmentShader];
		if (!fragmentShader) {
			console.log("ERROR: Missing fragment shader definition:", material.params.fragmentShader);
			return new THREE.MeshPhongMaterial;
		}

		var vertexShader = theLoader.shaders[material.params.vertexShader];
		if (!vertexShader) {
			console.log("ERROR: Missing vertex shader definition:", material.params.vertexShader);
			return new THREE.MeshPhongMaterial;
		}

		// clone most uniforms but then clobber textures, we want them to
		// be reused
		var uniforms = THREE.UniformsUtils.clone(material.params.uniforms);
		for (uniform in material.params.uniforms) {
			var src = material.params.uniforms[uniform];
			var dst = uniforms[uniform];
			if (dst.type == "t") {
				dst.value = src.value;
			}
		}

		var shaderMaterial = new THREE.RawShaderMaterial( {

			fragmentShader: fragmentShader,
			vertexShader: vertexShader,
			uniforms: uniforms,
			transparent: material.params.transparent,

		} );

//        console.log("New shader material")
		return shaderMaterial;
	}


	function LoadTexture(src) {
		if(!src) { return null; }

		var isDataUriRegex = /^data:/;

		var loadImage = function(url, success, error) {
			var image = new Image();

			image.onload = function() {
				success(image);
			};

			if (typeof error !== 'undefined') {
				image.onerror = error;
			}

			image.src = url;
		};

		function loadImageFromTypedArray(uint8Array, format) {
			//>>includeStart('debug', pragmas.debug);
			if (!defined(uint8Array)) {
				throw new DeveloperError('uint8Array is required.');
			}

			if (!defined(format)) {
				throw new DeveloperError('format is required.');
			}
			//>>includeEnd('debug');

			var blob = new Blob([uint8Array], {
				type : format
			});

		};

		function decodeDataUriText(isBase64, data) {
			var result = decodeURIComponent(data);
			if (isBase64) {
				return atob(result);
			}
			return result;
		}

		function decodeDataUriArrayBuffer(isBase64, data) {
			var byteString = decodeDataUriText(isBase64, data);
			var buffer = new ArrayBuffer(byteString.length);
			var view = new Uint8Array(buffer);
			for (var i = 0; i < byteString.length; i++) {
				view[i] = byteString.charCodeAt(i);
			}
			return buffer;
		}

		function decodeDataUri(dataUriRegexResult, responseType) {
			responseType = typeof responseType !== 'undefined' ? responseType : '';
			var mimeType = dataUriRegexResult[1];
			var isBase64 = !!dataUriRegexResult[2];
			var data = dataUriRegexResult[3];

			switch (responseType) {
			case '':
			case 'text':
				return decodeDataUriText(isBase64, data);
			case 'ArrayBuffer':
				return decodeDataUriArrayBuffer(isBase64, data);
			case 'blob':
				var buffer = decodeDataUriArrayBuffer(isBase64, data);
				return new Blob([buffer], {
					type : mimeType
				});
			case 'document':
				var parser = new DOMParser();
				return parser.parseFromString(decodeDataUriText(isBase64, data), mimeType);
			case 'json':
				return JSON.parse(decodeDataUriText(isBase64, data));
			default:
				throw 'Unhandled responseType: ' + responseType;
			}
		}

		var dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;
		var dataUriRegexResult = dataUriRegex.exec(src);
		if (dataUriRegexResult !== null) {
			var texture = new THREE.Texture;
			var blob = decodeDataUri(dataUriRegexResult, 'blob');
			var blobUrl = window.URL.createObjectURL(blob);
			loadImage(blobUrl, function(img) {
				texture.image = img;
				texture.needsUpdate = true;
			});
			return texture;
		}

		return new THREE.TextureLoader().load(src);
	}

	function CreateTexture(resources, resource) {
		var texturePath = null;
		var textureParams = null;

		if (resource)
		{
			var texture = resource;
			if (texture) {
				var textureEntry = resources.getEntry(texture);
				if (textureEntry) {
					{
						var imageEntry = resources.getEntry(textureEntry.description.source);
						if (imageEntry) {
							texturePath = imageEntry.description.uri;
						}

						var samplerEntry = resources.getEntry(textureEntry.description.sampler);
						if (samplerEntry) {
							textureParams = samplerEntry.description;
						}
					}
				}
			}
		}

		var texture = LoadTexture(texturePath);
		if (texture && textureParams) {

			if (textureParams.wrapS == WebGLRenderingContext.REPEAT)
				texture.wrapS = THREE.RepeatWrapping;

			if (textureParams.wrapT == WebGLRenderingContext.REPEAT)
				texture.wrapT = THREE.RepeatWrapping;

			if (textureParams.magFilter == WebGLRenderingContext.LINEAR)
				texture.magFilter = THREE.LinearFilter;

//                  if (textureParams.minFilter == "LINEAR")
//                      texture.minFilter = THREE.LinearFilter;
		}

		return texture;
	}

	// Geometry processing

	var ClassicGeometry = function() {

		this.geometry = new THREE.BufferGeometry;
		this.totalAttributes = 0;
		this.loadedAttributes = 0;
		this.indicesLoaded = false;
		this.finished = false;

		this.onload = null;

		this.uvs = null;
		this.indexArray = null;
	};

	ClassicGeometry.prototype.constructor = ClassicGeometry;

	ClassicGeometry.prototype.buildBufferGeometry = function() {
		// Build indexed mesh
		var geometry = this.geometry;
		geometry.setIndex(new THREE.BufferAttribute( this.indexArray, 1 ) );

		var offset = {
				start: 0,
				index: 0,
				count: this.indexArray.length
			};

		geometry.groups.push( offset );

		geometry.computeBoundingSphere();
	}

	ClassicGeometry.prototype.checkFinished = function() {
		if(this.indexArray && this.loadedAttributes === this.totalAttributes) {

			this.buildBufferGeometry();

			this.finished = true;

			if(this.onload) {
				this.onload();
			}
		}
	};

	// Delegate for processing index buffers
	var IndicesDelegate = function() {};

	IndicesDelegate.prototype.handleError = function(errorCode, info) {
		// FIXME: report error
		console.log("ERROR(IndicesDelegate):"+errorCode+":"+info);
	};

	IndicesDelegate.prototype.convert = function(resource, ctx) {
		return new Uint16Array(resource, 0, ctx.indices.count);
	};

	IndicesDelegate.prototype.resourceAvailable = function(glResource, ctx) {
		var geometry = ctx.geometry;
		geometry.indexArray = glResource;
		geometry.checkFinished();
		return true;
	};

	var indicesDelegate = new IndicesDelegate();

	var IndicesContext = function(indices, geometry) {
		this.indices = indices;
		this.geometry = geometry;
	};

	// Delegate for processing vertex attribute buffers
	var VertexAttributeDelegate = function() {};

	VertexAttributeDelegate.prototype.handleError = function(errorCode, info) {
		// FIXME: report error
		console.log("ERROR(VertexAttributeDelegate):"+errorCode+":"+info);
	};

	VertexAttributeDelegate.prototype.convert = function(resource, ctx) {
		return resource;
	};


	VertexAttributeDelegate.prototype.bufferResourceAvailable = function(glResource, ctx) {
		var geom = ctx.geometry;
		var attribute = ctx.attribute;
		var semantic = ctx.semantic;
		var floatArray;
		var i, l;
		var nComponents;
		//FIXME: Float32 is assumed here, but should be checked.

		if (semantic == "POSITION") {
			// TODO: Should be easy to take strides into account here
			floatArray = new Float32Array(glResource, 0, attribute.count * componentsPerElementForGLType(attribute.type));
			geom.geometry.addAttribute( 'position', new THREE.BufferAttribute( floatArray, 3 ) );
		} else if (semantic == "NORMAL") {
			nComponents = componentsPerElementForGLType(attribute.type);
			floatArray = new Float32Array(glResource, 0, attribute.count * nComponents);
			geom.geometry.addAttribute( 'normal', new THREE.BufferAttribute( floatArray, 3 ) );
		} else if ((semantic == "TEXCOORD_0") || (semantic == "TEXCOORD" )) {

			nComponents = componentsPerElementForGLType(attribute.type);
			floatArray = new Float32Array(glResource, 0, attribute.count * nComponents);
			// N.B.: flip Y value... should we just set texture.flipY everywhere?
			for (i = 0; i < floatArray.length / 2; i++) {
				floatArray[i*2+1] = 1.0 - floatArray[i*2+1];
			}
			geom.geometry.addAttribute( 'uv', new THREE.BufferAttribute( floatArray, nComponents ) );
		}
		else if (semantic == "WEIGHT") {
			nComponents = componentsPerElementForGLType(attribute.type);
			floatArray = new Float32Array(glResource, 0, attribute.count * nComponents);
			geom.geometry.addAttribute( 'skinWeight', new THREE.BufferAttribute( floatArray, nComponents ) );
		}
		else if (semantic == "JOINT") {
			nComponents = componentsPerElementForGLType(attribute.type);
			floatArray = new Float32Array(glResource, 0, attribute.count * nComponents);
			geom.geometry.addAttribute( 'skinIndex', new THREE.BufferAttribute( floatArray, nComponents ) );
		}
	}

	VertexAttributeDelegate.prototype.resourceAvailable = function(glResource, ctx) {

		this.bufferResourceAvailable(glResource, ctx);

		var geom = ctx.geometry;
		geom.loadedAttributes++;
		geom.checkFinished();
		return true;
	};

	var vertexAttributeDelegate = new VertexAttributeDelegate();

	var VertexAttributeContext = function(attribute, semantic, geometry) {
		this.attribute = attribute;
		this.semantic = semantic;
		this.geometry = geometry;
	};

	var Mesh = function() {
		this.primitives = [];
		this.materialsPending = [];
		this.loadedGeometry = 0;
		this.onCompleteCallbacks = [];
	};

	Mesh.prototype.addPrimitive = function(geometry, material) {

		var self = this;
		geometry.onload = function() {
			self.loadedGeometry++;
			self.checkComplete();
		};

		this.primitives.push({
			geometry: geometry,
			material: material,
			mesh: null
		});
	};

	Mesh.prototype.onComplete = function(callback) {
		this.onCompleteCallbacks.push(callback);
		//this.checkComplete();
	};

	Mesh.prototype.checkComplete = function() {
		var self = this;
		if(this.onCompleteCallbacks.length && this.primitives.length == this.loadedGeometry) {
			this.onCompleteCallbacks.forEach(function(callback) {
				callback(self);
			});
			this.onCompleteCallbacks = [];
		}
	};

	Mesh.prototype.attachToNode = function(threeNode) {
		// Assumes that the geometry is complete
		var that = this;
		this.primitives.forEach(function(primitive) {
			/*if(!primitive.mesh) {
				primitive.mesh = new THREE.Mesh(primitive.geometry, primitive.material);
			}*/
			var material = primitive.material;
			var materialParams = material.params;
			if (!(material instanceof THREE.Material)) {
				material = createShaderMaterial(material);
			}

			if (!that.skin) {
				// console.log ("New mesh")
				var threeMesh = new THREE.Mesh(primitive.geometry.geometry, material);
				threeMesh.castShadow = true;
				threeNode.add(threeMesh);

				if (material instanceof THREE.ShaderMaterial) {
					var glTFShader = new THREE.glTFShader(material, materialParams, threeMesh, theLoader.rootObj);
					THREE.glTFShaders.add(glTFShader);

				}
			}
		});
	};

	// Delayed-loaded material
	var Material = function(params) {
		this.params = params;
	};

	// Delegate for processing animation parameter buffers
	var AnimationParameterDelegate = function() {};

	AnimationParameterDelegate.prototype.handleError = function(errorCode, info) {
		// FIXME: report error
		console.log("ERROR(AnimationParameterDelegate):"+errorCode+":"+info);
	};

	AnimationParameterDelegate.prototype.convert = function(resource, ctx) {
		var parameter = ctx.parameter;

		var glResource = null;
		switch (parameter.type) {
			case "SCALAR" :
			case "VEC2" :
			case "VEC3" :
			case "VEC4" :
				glResource = new Float32Array(resource, 0, parameter.count * componentsPerElementForGLType(parameter.type));
				break;
			default:
				break;
		}

		return glResource;
	};

	AnimationParameterDelegate.prototype.resourceAvailable = function(glResource, ctx) {
		var animation = ctx.animation;
		var parameter = ctx.parameter;
		parameter.data = glResource;
		animation.handleParameterLoaded(parameter);
		return true;
	};

	var animationParameterDelegate = new AnimationParameterDelegate();

	var AnimationParameterContext = function(parameter, animation) {
		this.parameter = parameter;
		this.animation = animation;
	};

	// Animations
	var Animation = function() {

		// create Three.js keyframe here
		this.totalParameters = 0;
		this.loadedParameters = 0;
		this.parameters = {};
		this.finishedLoading = false;
		this.onload = null;

	};

	Animation.prototype.constructor = Animation;

	Animation.prototype.handleParameterLoaded = function(parameter) {
		this.parameters[parameter.name] = parameter;
		this.loadedParameters++;
		this.checkFinished();
	};

	Animation.prototype.checkFinished = function() {
		if(this.loadedParameters === this.totalParameters) {
			// Build animation
			this.finishedLoading = true;

			if (this.onload) {
				this.onload();
			}
		}
	};

	// Delegate for processing inverse bind matrices buffer
	var InverseBindMatricesDelegate = function() {};

	InverseBindMatricesDelegate.prototype.handleError = function(errorCode, info) {
		// FIXME: report error
		console.log("ERROR(InverseBindMatricesDelegate):"+errorCode+":"+info);
	};

	InverseBindMatricesDelegate.prototype.convert = function(resource, ctx) {
		var parameter = ctx.parameter;

		var glResource = null;
		switch (parameter.type) {
			case "MAT4" :
				glResource = new Float32Array(resource, 0, parameter.count * componentsPerElementForGLType(parameter.type));
				break;
			default:
				break;
		}

		return glResource;
	};

	InverseBindMatricesDelegate.prototype.resourceAvailable = function(glResource, ctx) {
		var skin = ctx.skin;
		skin.inverseBindMatrices = glResource;
		return true;
	};

	var inverseBindMatricesDelegate = new InverseBindMatricesDelegate();

	var InverseBindMatricesContext = function(param, skin) {
		this.parameter = param;
		this.skin = skin;
	};

	// Delegate for processing shaders from external files
	var ShaderDelegate = function() {};

	ShaderDelegate.prototype.handleError = function(errorCode, info) {
		// FIXME: report error
		console.log("ERROR(ShaderDelegate):"+errorCode+":"+info);
	};

	ShaderDelegate.prototype.convert = function(resource, ctx) {
		return resource;
	}

	ShaderDelegate.prototype.resourceAvailable = function(data, ctx) {
		theLoader.shadersLoaded++;
		theLoader.shaders[ctx.id] = data;
		return true;
	};

	var shaderDelegate = new ShaderDelegate();

	var ShaderContext = function(id, path) {
		this.id = id;
		this.uri = path;
	};

	// Resource management

	var ResourceEntry = function(entryID, object, description) {
		this.entryID = entryID;
		this.object = object;
		this.description = description;
	};

	var Resources = function() {
		this._entries = {};
	};

	Resources.prototype.setEntry = function(entryID, object, description) {
		if (!entryID) {
			console.error("No EntryID provided, cannot store", description);
			return;
		}

		if (this._entries[entryID]) {
			console.warn("entry["+entryID+"] is being overwritten");
		}

		this._entries[entryID] = new ResourceEntry(entryID, object, description );
	};

	Resources.prototype.getEntry = function(entryID) {
		return this._entries[entryID];
	};

	Resources.prototype.clearEntries = function() {
		this._entries = {};
	};

	LoadDelegate = function() {
	}

	LoadDelegate.prototype.loadCompleted = function(callback, obj) {
		callback.call(Window, obj);
	}

	// Loader

	var ThreeGLTFLoader = Object.create(glTFParser, {

		load: {
			enumerable: true,
			value: function(userInfo, options) {
				this.resources = new Resources();
				this.cameras = [];
				this.lights = [];
				this.animations = [];
				this.joints = {};
				THREE.GLTFLoaderUtils.init();
				glTFParser.load.call(this, userInfo, options);
			}
		},

		cameras: {
			enumerable: true,
			writable: true,
			value : []
		},

		lights: {
			enumerable: true,
			writable: true,
			value : []
		},

		animations: {
			enumerable: true,
			writable: true,
			value : []
		},

		// Implement WebGLTFLoader handlers

		handleBuffer: {
			value: function(entryID, description, userInfo) {
				this.resources.setEntry(entryID, null, description);
				description.type = "ArrayBuffer";
				return true;
			}
		},

		handleBufferView: {
			value: function(entryID, description, userInfo) {
				this.resources.setEntry(entryID, null, description);

				var buffer =  this.resources.getEntry(description.buffer);
				description.type = "ArrayBufferView";

				var bufferViewEntry = this.resources.getEntry(entryID);
				bufferViewEntry.buffer = buffer;
				return true;
			}
		},

		handleShader: {
			value: function(entryID, description, userInfo) {
				this.resources.setEntry(entryID, null, description);
				var shaderRequest = {
						id : entryID,
						uri : description.uri,
				};

				var shaderContext = new ShaderContext(entryID, description.uri);

				theLoader.shadersRequested++;
				THREE.GLTFLoaderUtils.getFile(shaderRequest, shaderDelegate, shaderContext);

				return true;
			}
		},

		handleProgram: {
			value: function(entryID, description, userInfo) {
				this.resources.setEntry(entryID, null, description);
				return true;
			}
		},

		handleTechnique: {
			value: function(entryID, description, userInfo) {
				description.refCount = 0;
				this.resources.setEntry(entryID, null, description);
				return true;
			}
		},


		createShaderParams : {
			value: function(materialId, values, params, programID, technique) {
				var program = this.resources.getEntry(programID);

				params.uniforms = {};
				params.attributes = {};
				params.program = program;
				params.technique = technique;
				if (program) {
					params.fragmentShader = program.description.fragmentShader;
					params.vertexShader = program.description.vertexShader;
					for (var uniform in technique.uniforms) {
						var pname = technique.uniforms[uniform];
						var shaderParam = technique.parameters[pname];
						var ptype = shaderParam.type;
						var pcount = shaderParam.count;
						var value = values[pname];
						var utype = "";
						var uvalue;
						var ulength;

						// THIS: for (n in WebGLRenderingContext) { z = WebGLRenderingContext[n]; idx[z] = n; }
						//console.log("shader uniform param type: ", ptype, "-", theLoader.idx[ptype])


						switch (ptype) {
							case WebGLRenderingContext.FLOAT :
								utype = "f";
								uvalue = shaderParam.value;
								if (pname == "transparency") {
									var USE_A_ONE = true; // for now, hack because file format isn't telling us
									var opacity =  USE_A_ONE ? value : (1.0 - value);
									uvalue = opacity;
									params.transparent = true;
								}
								break;
							case WebGLRenderingContext.FLOAT_VEC2 :
								utype = "v2";
								uvalue = new THREE.Vector2;
								if (shaderParam && shaderParam.value) {
									var v2 = shaderParam.value;
									uvalue.fromArray(v2);
								}
								if (value) {
									uvalue.fromArray(value);
								}
								break;
							case WebGLRenderingContext.FLOAT_VEC3 :
								utype = "v3";
								uvalue = new THREE.Vector3;
								if (shaderParam && shaderParam.value) {
									var v3 = shaderParam.value;
									uvalue.fromArray(v3);
								}
								if (value) {
									uvalue.fromArray(value);
								}
								break;
							case WebGLRenderingContext.FLOAT_VEC4 :
								utype = "v4";
								uvalue = new THREE.Vector4;
								if (shaderParam && shaderParam.value) {
									var v4 = shaderParam.value;
									uvalue.fromArray(v4);
								}
								if (value) {
									uvalue.fromArray(value);
								}
								break;
							case WebGLRenderingContext.FLOAT_MAT2 :
								// what to do?
								console.log("Warning: FLOAT_MAT2");
								break;
							case WebGLRenderingContext.FLOAT_MAT3 :
								utype = "m3";
								uvalue = new THREE.Matrix3;
								if (shaderParam && shaderParam.value) {
									var m3 = shaderParam.value;
									uvalue.fromArray(m3);
								}
								if (value) {
									uvalue.fromArray(value);
								}
								break;
							case WebGLRenderingContext.FLOAT_MAT4 :
								if (pcount !== undefined) {
									utype = "m4v";
									uvalue = new Array(pcount);
									for (var mi = 0; mi < pcount; mi++) {
										uvalue[mi] = new THREE.Matrix4;
									}
									ulength = pcount;

									if (shaderParam && shaderParam.value) {
										var m4v = shaderParam.value;
										uvalue.fromArray(m4v);
									}
									if (value) {
										uvalue.fromArray(value);

									}
								}
								else {
									utype = "m4";
									uvalue = new THREE.Matrix4;

									if (shaderParam && shaderParam.value) {
										var m4 = shaderParam.value;
										uvalue.fromArray(m4);
									}
									if (value) {
										uvalue.fromArray(value);

									}
								}
								break;
							case WebGLRenderingContext.SAMPLER_2D :
								utype = "t";
								uvalue = value ? CreateTexture(this.resources, value) : null;
								break;
							default :
								throw new Error("Unknown shader uniform param type: " + ptype + " - " + theLoader.idx[ptype]);

								break;
						}


						var udecl = { type : utype, value : uvalue, length : ulength };

						params.uniforms[uniform] = udecl;
					}

					for (var attribute in technique.attributes) {
						var pname = technique.attributes[attribute];
						var param = technique.parameters[pname];
						var atype = param.type;
						var semantic = param.semantic;
						var adecl = { type : atype, semantic : semantic };

						params.attributes[attribute] = adecl;
					}

				}
			}
		},

		threeJSMaterialType : {
			value: function(materialId, material, params) {

				var extensions = material.extensions;
				var khr_material = extensions ? extensions.KHR_materials_common : null;

				var materialType = null;
				var values;

				if (khr_material) {

					switch (khr_material.technique)
					{
						case 'BLINN' :
						case 'PHONG' :
							materialType = THREE.MeshPhongMaterial;
							break;

						case 'LAMBERT' :
							materialType = THREE.MeshLambertMaterial;
							break;

						case 'CONSTANT' :
						default :
							materialType = THREE.MeshBasicMaterial;
							break;
					}

					if (khr_material.doubleSided)
					{
						params.side = THREE.DoubleSide;
					}

					if (khr_material.transparent)
					{
						params.transparent = true;
					}

					values = {};
					for (prop in khr_material.values) {
						values[prop] = khr_material.values[prop];
					}

				}
				else {
					var technique = material.technique ?
						this.resources.getEntry(material.technique) :
						null;

					values = material.values;
					var description = technique.description;

					if (++description.refCount > 1) {
						//console.log("refcount", description.refCount);
					}

					var programID = description.program;
					this.createShaderParams(materialId, values, params, programID, description);

					var loadshaders = true;

					if (loadshaders) {
						materialType = Material;
					}
				}

				if (values.diffuse && typeof(values.diffuse) == 'string') {
					params.map = CreateTexture(this.resources, values.diffuse);
				}
				if (values.reflective && typeof(values.reflective) == 'string') {
					params.envMap = CreateTexture(this.resources, values.reflective);
				}

				var shininess = values.shininesss || values.shininess; // N.B.: typo in converter!
				if (shininess)
				{
					shininess = shininess;
				}

				var diffuseColor = null;
				if (!params.map) {
					diffuseColor = values.diffuse;
				}
				var opacity = 1.0;
				if (values.hasOwnProperty("transparency"))
				{
					var USE_A_ONE = true; // for now, hack because file format isn't telling us
					opacity =  USE_A_ONE ? values.transparency : (1.0 - values.transparency);
				}

				// if (diffuseColor) diffuseColor = [0, 1, 0];

				params.color = RgbArraytoHex(diffuseColor);
				params.opacity = opacity;
				params.transparent = opacity < 1.0;
				// hack hack hack
				if (params.map && params.map.sourceFile.toLowerCase().indexOf(".png") != -1)
					params.transparent = true;

				if (!(shininess === undefined))
				{
					params.shininess = Math.max( shininess, 1e-4 );
				}

				delete params.ambient;
				if (!(values.ambient === undefined) && !(typeof(values.ambient) == 'string'))
				{
					//params.ambient = RgbArraytoHex(values.ambient);
				}

				if (!(values.emission === undefined))
				{
					params.emissive = RgbArraytoHex(values.emission);
				}

				if (!(values.specular === undefined))
				{
					params.specular = RgbArraytoHex(values.specular);
				}

				return materialType;

			}
		},

		handleMaterial: {
			value: function(entryID, description, userInfo) {
				var params = {};

				var materialType = this.threeJSMaterialType(entryID, description, params);

				var material = new materialType(params);

				this.resources.setEntry(entryID, material, description);

				return true;
			}
		},

		handleMesh: {
			value: function(entryID, description, userInfo) {
				var mesh = new Mesh();
				this.resources.setEntry(entryID, mesh, description);
				var primitivesDescription = description.primitives;
				if (!primitivesDescription) {
					//FIXME: not implemented in delegate
					console.log("MISSING_PRIMITIVES for mesh:"+ entryID);
					return false;
				}

				for (var i = 0 ; i < primitivesDescription.length ; i++) {
					var primitiveDescription = primitivesDescription[i];

					if (primitiveDescription.mode === WebGLRenderingContext.TRIANGLES) {

						var geometry = new ClassicGeometry();
						var materialEntry = this.resources.getEntry(primitiveDescription.material);

						mesh.addPrimitive(geometry, materialEntry.object);

						var allAttributes = Object.keys(primitiveDescription.attributes);

						// count them first, async issues otherwise
						allAttributes.forEach( function(semantic) {
							geometry.totalAttributes++;
						}, this);

						var indices = this.resources.getEntry(primitiveDescription.indices);
						var bufferEntry = this.resources.getEntry(indices.description.bufferView);
						var indicesObject = {
								bufferView : bufferEntry,
								byteOffset : indices.description.byteOffset,
								count : indices.description.count,
								id : indices.entryID,
								componentType : indices.description.componentType,
								type : indices.description.type
						};

						var indicesContext = new IndicesContext(indicesObject, geometry);
						var loaddata = {
							indicesObject : indicesObject,
							indicesDelegate : indicesDelegate,
							indicesContext : indicesContext
						};

						theLoader.scheduleLoad(function(data) {
							var alreadyProcessedIndices =
								THREE.GLTFLoaderUtils.getBuffer(data.indicesObject,
									data.indicesDelegate, data.indicesContext);

							if (alreadyProcessedIndices) {
								data.indicesDelegate.resourceAvailable(
									alreadyProcessedIndices, data.indicesContext);
							}

						}, loaddata);

						// Load Vertex Attributes
						allAttributes.forEach( function(semantic) {

							var attribute;
							var attributeID = primitiveDescription.attributes[semantic];
							var attributeEntry = this.resources.getEntry(attributeID);
							if (!attributeEntry) {
								//let's just use an anonymous object for the attribute
								attribute = description.attributes[attributeID];
								attribute.id = attributeID;
								this.resources.setEntry(attributeID, attribute, attribute);

								var bufferEntry = this.resources.getEntry(attribute.bufferView);
								attributeEntry = this.resources.getEntry(attributeID);

							} else {
								attribute = attributeEntry.object;
								attribute.id = attributeID;
								var bufferEntry = this.resources.getEntry(attribute.bufferView);
							}

							var attributeObject = {
									bufferView : bufferEntry,
									byteOffset : attribute.byteOffset,
									byteStride : attribute.byteStride,
									count : attribute.count,
									max : attribute.max,
									min : attribute.min,
									componentType : attribute.componentType,
									type : attribute.type,
									id : attributeID
							};

							var attribContext = new VertexAttributeContext(attributeObject, semantic, geometry);

							var loaddata = {
								attributeObject : attributeObject,
								vertexAttributeDelegate : vertexAttributeDelegate,
								attribContext : attribContext
							};

							theLoader.scheduleLoad(function(data) {
								var alreadyProcessedAttribute =
									THREE.GLTFLoaderUtils.getBuffer(data.attributeObject,
										data.vertexAttributeDelegate, data.attribContext);

								if (alreadyProcessedAttribute) {
									data.vertexAttributeDelegate.resourceAvailable(
										alreadyProcessedAttribute, data.attribContext);
								}

							}, loaddata);


						}, this);
					}
				}
				return true;
			}
		},

		handleCamera: {
			value: function(entryID, description, userInfo) {
				var camera;
				if (description.type == "perspective")
				{
					var znear = description.perspective.znear;
					var zfar = description.perspective.zfar;
					var yfov = description.perspective.yfov;
					var xfov = description.perspective.xfov;
					var aspect_ratio = description.perspective.aspect_ratio;

					if (!aspect_ratio)
						aspect_ratio = 1;

					if (xfov === undefined) {
						if (yfov)
						{
							// According to COLLADA spec...
							// aspect_ratio = xfov / yfov
							xfov = yfov * aspect_ratio;
						}
					}

					if (yfov === undefined)
					{
						if (xfov)
						{
							// According to COLLADA spec...
							// aspect_ratio = xfov / yfov
							yfov = xfov / aspect_ratio;
						}

					}

					if (xfov)
					{
						xfov = THREE.Math.radToDeg(xfov);

						camera = new THREE.PerspectiveCamera(xfov, aspect_ratio, znear, zfar);
					}
				}
				else
				{
					camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, znear, zfar );
				}

				if (camera)
				{
					this.resources.setEntry(entryID, camera, description);
				}

				return true;
			}
		},

		handleLight: {
			value: function(entryID, description, userInfo) {

				var light = null;
				var type = description.type;
				if (type && description[type])
				{
					var lparams = description[type];
					var color = RgbArraytoHex(lparams.color);

					switch (type) {
						case "directional" :
							light = new THREE.DirectionalLight(color);
							light.position.set(0, 0, 1);
						break;

						case "point" :
							light = new THREE.PointLight(color);
						break;

						case "spot " :
							light = new THREE.SpotLight(color);
							light.position.set(0, 0, 1);
						break;

						case "ambient" :
							light = new THREE.AmbientLight(color);
						break;
					}
				}

				if (light)
				{
					this.resources.setEntry(entryID, light, description);
				}

				return true;
			}
		},

		addPendingMesh: {
			value: function(mesh, threeNode) {
				theLoader.pendingMeshes.push({
					mesh: mesh,
					node: threeNode
				});
			}
		},

		handleNode: {
			value: function(entryID, description, userInfo) {

				var threeNode = null;
				if (description.jointName) {
					threeNode = new THREE.Bone();
					threeNode.jointName = description.jointName;
					this.joints[description.jointName] = entryID;
				}
				else {
					threeNode = new THREE.Object3D();
				}

				threeNode.name = description.name;
				threeNode.glTFID = entryID;
				threeNode.glTF = description;

				this.resources.setEntry(entryID, threeNode, description);

				var m = description.matrix;
				if(m) {
					threeNode.matrixAutoUpdate = false;
					threeNode.applyMatrix(new THREE.Matrix4().set(
						m[0],  m[4],  m[8],  m[12],
						m[1],  m[5],  m[9],  m[13],
						m[2],  m[6],  m[10], m[14],
						m[3],  m[7],  m[11], m[15]
					));
				}
				else {
					var t = description.translation;
					var r = description.rotation;
					var s = description.scale;

					var position = t ? new THREE.Vector3(t[0], t[1], t[2]) :
						new THREE.Vector3;

					var rotation = r ? new THREE.Quaternion(r[0], r[1], r[2], r[3]) :
						new THREE.Quaternion;
					var scale = s ? new THREE.Vector3(s[0], s[1], s[2]) :
						new THREE.Vector3(1, 1, 1);

					var matrix = new THREE.Matrix4;
					matrix.compose(position, rotation, scale);
					threeNode.matrixAutoUpdate = false;
					threeNode.applyMatrix(matrix);
				}

				var self = this;

				if (description.meshes) {
					description.meshInstances = {};
					var skinEntry;
					if (description.skin) {
						skinEntry =  this.resources.getEntry(description.skin);
					}

					description.meshes.forEach( function(meshID) {
						meshEntry = this.resources.getEntry(meshID);
						theLoader.meshesRequested++;
						meshEntry.object.onComplete(function(mesh) {
							self.addPendingMesh(mesh, threeNode);
							description.meshInstances[meshID] = meshEntry.object;
							if (skinEntry) {
								mesh.skin = skinEntry;
								description.instanceSkin = skinEntry.object;
							}

							theLoader.meshesLoaded++;
							theLoader.checkComplete();
						});
					}, this);
				}

				if (description.camera) {
					var cameraEntry = this.resources.getEntry(description.camera);
					if (cameraEntry) {
						threeNode.add(cameraEntry.object);
						this.cameras.push(cameraEntry.object);
					}
				}

				if (description.extensions && description.extensions.KHR_materials_common
						&& description.extensions.KHR_materials_common.light) {
					var lightID = description.extensions.KHR_materials_common.light;
					var lightEntry = this.resources.getEntry(lightID);
					if (lightEntry) {
						threeNode.add(lightEntry.object);
						this.lights.push(lightEntry.object);
					}
				}

				return true;
			}
		},

		handleExtension: {
			value: function(entryID, description, userInfo) {

				// console.log("Extension", entryID, description);

				switch (entryID) {
					case 'KHR_materials_common' :
						var lights = description.lights;
						for (lightID in lights) {
							var light = lights[lightID];
							this.handleLight(lightID, light);
						}
						break;
				}

				return true;
			}
		},

		buildNodeHirerachy: {
			value: function(nodeEntryId, parentThreeNode) {
				var nodeEntry = this.resources.getEntry(nodeEntryId);
				var threeNode = nodeEntry.object;
				parentThreeNode.add(threeNode);

				var children = nodeEntry.description.children;
				if (children) {
					children.forEach( function(childID) {
						this.buildNodeHirerachy(childID, threeNode);
					}, this);
				}

				return threeNode;
			}
		},

		buildSkin: {
			value: function(node) {

				var glTF = node.glTF;
				var skin = glTF.instanceSkin;
				var skeletons = glTF.skeletons;
				if (skin) {
					skeletons.forEach(function(skeleton) {
						var nodeEntry = this.resources.getEntry(skeleton);
						if (nodeEntry) {

							var rootSkeleton = nodeEntry.object;
							node.add(rootSkeleton);

							var dobones = true;

							for (meshID in glTF.meshInstances) {
								var mesh = glTF.meshInstances[meshID];
								var threeMesh = null;
								mesh.primitives.forEach(function(primitive) {

									var material = primitive.material;
									var materialParams = material.params;
									if (!(material instanceof THREE.Material)) {
										material = createShaderMaterial(material);
									}

									threeMesh = new THREE.SkinnedMesh(primitive.geometry.geometry, material, false);

									var geometry = primitive.geometry.geometry;
									var j;
/*                                    if (geometry.vertices) {
										for ( j = 0; j < geometry.vertices.length; j ++ ) {
											geometry.vertices[j].applyMatrix4( skin.bindShapeMatrix );
										}
									}
									else if (geometry.attributes.position) {
										var a = geometry.attributes.position.array;
										var v = new THREE.Vector3;
										for ( j = 0; j < a.length / 3; j++ ) {
											v.set(a[j * 3], a[j * 3 + 1], a[j * 3 + 2]);
											v.applyMatrix4( skin.bindShapeMatrix );
											a[j * 3] = v.x;
											a[j * 3 + 1] = v.y;
											a[j * 3 + 2] = v.z;
										}
									}*/

									if (threeMesh && dobones) {

										material.skinning = true;

										var jointNames = skin.jointNames;
										var joints = [];
										var bones = [];
										var boneInverses = [];
										var i, len = jointNames.length;
										for (i = 0; i < len; i++) {
											var jointName = jointNames[i];
											var nodeForJoint = this.joints[jointName];
											var joint = this.resources.getEntry(nodeForJoint).object;
											if (joint) {

												joint.skin = threeMesh;
												joints.push(joint);
												bones.push(joint);

												var m = skin.inverseBindMatrices;
												var mat = new THREE.Matrix4().set(
														m[i * 16 + 0],  m[i * 16 + 4],  m[i * 16 + 8],  m[i * 16 + 12],
														m[i * 16 + 1],  m[i * 16 + 5],  m[i * 16 + 9],  m[i * 16 + 13],
														m[i * 16 + 2],  m[i * 16 + 6],  m[i * 16 + 10], m[i * 16 + 14],
														m[i * 16 + 3],  m[i * 16 + 7],  m[i * 16 + 11], m[i * 16 + 15]
													);
												boneInverses.push(mat);

											} else {
												console.log("WARNING: jointName:"+jointName+" cannot be found in skeleton:"+skeleton);
											}
										}

										threeMesh.bind( new THREE.Skeleton( bones,
											boneInverses, false ), skin.bindShapeMatrix );

										//threeMesh.bindMode = "detached";
										//threeMesh.normalizeSkinWeights();
										//threeMesh.pose();
									}

									if (threeMesh) {
										threeMesh.castShadow = true;
										node.add(threeMesh);

										if (material instanceof THREE.ShaderMaterial) {
											materialParams.joints = joints;
											var glTFShader = new THREE.glTFShader(material, materialParams, threeMesh, theLoader.rootObj);
											THREE.glTFShaders.add(glTFShader);

										}
									}

								}, this);
							}

						}


					}, this);

				}
			}
		},

		buildSkins: {
			value: function(node) {

				if (node.glTF && node.glTF.instanceSkin)
					this.buildSkin(node);

				var children = node.children;
				if (children) {
					children.forEach( function(child) {
						this.buildSkins(child);
					}, this);
				}
			}
		},

		createMeshAnimations : {
			value : function(root) {
					this.buildSkins(root);
				}
		},

		handleScene: {
			value: function(entryID, description, userInfo) {

				if (!description.nodes) {
					console.log("ERROR: invalid file required nodes property is missing from scene");
					return false;
				}

				description.nodes.forEach( function(nodeUID) {
					this.buildNodeHirerachy(nodeUID, userInfo.rootObj);
				}, this);

				if (this.delegate) {
					this.delegate.loadCompleted(userInfo.callback, userInfo.rootObj);
				}

				theLoader.loadAllAssets();

				return true;
			}
		},

		handleImage: {
			value: function(entryID, description, userInfo) {
				this.resources.setEntry(entryID, null, description);
				return true;
			}
		},

		addNodeAnimationChannel : {
			value : function(name, channel, interp) {
				if (!this.nodeAnimationChannels)
					this.nodeAnimationChannels = {};

				if (!this.nodeAnimationChannels[name]) {
					this.nodeAnimationChannels[name] = [];
				}

				this.nodeAnimationChannels[name].push(interp);
			},
		},

		createAnimations : {
			value : function() {
				for (var name in this.nodeAnimationChannels) {
					var nodeAnimationChannels = this.nodeAnimationChannels[name];
					var i, len = nodeAnimationChannels.length;
					//console.log(" animation channels for node " + name);
					//for (i = 0; i < len; i++) {
					//  console.log(nodeAnimationChannels[i]);
					//}
					var anim = new THREE.glTFAnimation(nodeAnimationChannels);
					anim.name = "animation_" + name;
					this.animations.push(anim);
				}
			}
		},

		buildAnimation: {
			value : function(animation) {

				var interps = [];
				var i, len = animation.channels.length;
				for (i = 0; i < len; i++) {

					var channel = animation.channels[i];
					var sampler = animation.samplers[channel.sampler];
					if (sampler) {

						var input = animation.parameters[sampler.input];
						if (input && input.data) {

							var output = animation.parameters[sampler.output];
							if (output && output.data) {

								var target = channel.target;
								var node = this.resources.getEntry(target.id);
								if (node) {

									var path = target.path;

									var interp = {
											keys : input.data,
											values : output.data,
											count : input.count,
											target : node.object,
											path : path,
											type : sampler.interpolation
									};

									this.addNodeAnimationChannel(target.id, channel, interp);
									interps.push(interp);
								}
							}
						}
					}
				}
			}
		},

		handleAnimation: {
			value: function(entryID, description, userInfo) {

				var self = this;
				theLoader.animationsRequested++;
				var animation = new Animation();
				animation.name = entryID;
				animation.onload = function() {
					// self.buildAnimation(animation);
					theLoader.animationsLoaded++;
					theLoader.animations.push(animation);
					theLoader.checkComplete();
				};

				animation.channels = description.channels;
				animation.samplers = description.samplers;
				this.resources.setEntry(entryID, animation, description);
				var parameters = description.parameters;
				if (!parameters) {
					//FIXME: not implemented in delegate
					console.log("MISSING_PARAMETERS for animation:"+ entryID);
					return false;
				}

				// Load parameter buffers
				var params = Object.keys(parameters);
				params.forEach( function(param) {

					// async help
					animation.totalParameters++;

				}, this);

				var params = Object.keys(parameters);
				params.forEach( function(param) {

					var parameter = parameters[param];
					var accessor = this.resources.getEntry(parameter);
					if (!accessor)
						debugger;
					accessor = accessor.object;
					var bufferView = this.resources.getEntry(accessor.bufferView);
					var paramObject = {
							bufferView : bufferView,
							byteOffset : accessor.byteOffset,
							count : accessor.count,
							componentType : accessor.componentType,
							type : accessor.type,
							id : accessor.bufferView,
							name : param
					};

					var paramContext = new AnimationParameterContext(paramObject, animation);

					var loaddata = {
						paramObject : paramObject,
						animationParameterDelegate : animationParameterDelegate,
						paramContext : paramContext
					};

					theLoader.scheduleLoad(function(data) {

						var alreadyProcessedAttribute =
							THREE.GLTFLoaderUtils.getBuffer(data.paramObject,
								data.animationParameterDelegate, data.paramContext);

						if (alreadyProcessedAttribute) {
							data.animationParameterDelegate.resourceAvailable(
								alreadyProcessedAttribute, data.paramContext);
						}

					}, loaddata);


				}, this);

				return true;
			}
		},

		handleAccessor: {
			value: function(entryID, description, userInfo) {
				// Save attribute entry
				this.resources.setEntry(entryID, description, description);
				return true;
			}
		},

		handleSkin: {
			value: function(entryID, description, userInfo) {
				// Save skin entry

				var skin = {
				};

				var m = description.bindShapeMatrix;
				skin.bindShapeMatrix = new THREE.Matrix4().set(
						m[0],  m[4],  m[8],  m[12],
						m[1],  m[5],  m[9],  m[13],
						m[2],  m[6],  m[10], m[14],
						m[3],  m[7],  m[11], m[15]
					);

				skin.jointNames = description.jointNames;
				var inverseBindMatricesDescription = this.resources.getEntry(description.inverseBindMatrices);
				inverseBindMatricesDescription = inverseBindMatricesDescription.description;
				skin.inverseBindMatricesDescription = inverseBindMatricesDescription;
				skin.inverseBindMatricesDescription.id = description.inverseBindMatrices;

				var bufferEntry = this.resources.getEntry(inverseBindMatricesDescription.bufferView);

				var paramObject = {
						bufferView : bufferEntry,
						byteOffset : inverseBindMatricesDescription.byteOffset,
						count : inverseBindMatricesDescription.count,
						componentType : inverseBindMatricesDescription.componentType,
						type : inverseBindMatricesDescription.type,
						id : inverseBindMatricesDescription.bufferView,
						name : skin.inverseBindMatricesDescription.id
				};

				var context = new InverseBindMatricesContext(paramObject, skin);

				var loaddata = {
					paramObject : paramObject,
					inverseBindMatricesDelegate : inverseBindMatricesDelegate,
					context : context
				};

				theLoader.scheduleLoad(function(data) {

					var alreadyProcessedAttribute =
						THREE.GLTFLoaderUtils.getBuffer(data.paramObject,
							data.inverseBindMatricesDelegate, data.context);

					if (alreadyProcessedAttribute) {
						data.inverseBindMatricesDelegate.resourceAvailable(
							alreadyProcessedAttribute, data.context);
					}

				}, loaddata);



				var bufferView = this.resources.getEntry(skin.inverseBindMatricesDescription.bufferView);
				skin.inverseBindMatricesDescription.bufferView =
					bufferView.object;
				this.resources.setEntry(entryID, skin, description);
				return true;
			}
		},

		handleSampler: {
			value: function(entryID, description, userInfo) {
				// Save attribute entry
				this.resources.setEntry(entryID, description, description);
				return true;
			}
		},

		handleTexture: {
			value: function(entryID, description, userInfo) {
				// Save attribute entry
				this.resources.setEntry(entryID, null, description);
				return true;
			}
		},

		handleError: {
			value: function(msg) {

				throw new Error(msg);
				return true;
			}
		},

		_delegate: {
			value: new LoadDelegate,
			writable: true
		},

		delegate: {
			enumerable: true,
			get: function() {
				return this._delegate;
			},
			set: function(value) {
				this._delegate = value;
			}
		}
	});


	// Loader

	var Context = function(rootObj, callback) {
		this.rootObj = rootObj;
		this.callback = callback;
	};

	var rootObj = new THREE.Object3D();

	var self = this;

	var loader = Object.create(ThreeGLTFLoader);
	loader.initWithPath(url);
	loader.load(new Context(rootObj,
						function(obj) {
						}),
				null);

	this.loader = loader;
	this.callback = callback;
	this.rootObj = rootObj;
	return rootObj;
}


THREE.glTFLoader.prototype.scheduleLoad = function(loadFn, data) {

	this.loadRequests.push({fn: loadFn, data:data});
}

THREE.glTFLoader.prototype.loadAllAssets = function() {

	for (var i = 0, len = this.loadRequests.length; i < len; i++) {
		var request = this.loadRequests[i];
		request.fn(request.data);
	}
}

THREE.glTFLoader.prototype.callLoadedCallback = function() {
	var result = {
			scene : this.rootObj,
			cameras : this.loader.cameras,
			animations : this.loader.animations,
			shaders : this.loader.shaders,
	};

	this.callback(result);
}

THREE.glTFLoader.prototype.checkComplete = function() {
	if (this.meshesLoaded == this.meshesRequested
			&& this.shadersLoaded == this.shadersRequested
			&& this.animationsLoaded == this.animationsRequested)
	{
		for (var i = 0; i < this.pendingMeshes.length; i++) {
			var pending = this.pendingMeshes[i];
			pending.mesh.attachToNode(pending.node);
		}

		for (var i = 0; i < this.animationsLoaded; i++) {
			var animation = this.animations[i];
			this.loader.buildAnimation(animation);
		}

		this.loader.createAnimations();
		this.loader.createMeshAnimations(this.rootObj);
		THREE.glTFShaders.bindShaderParameters(this.rootObj);

		this.callLoadedCallback();
	}
}
/**
 * @author Tony Parisi / http://www.tonyparisi.com/
 */

THREE.GLTFLoaderUtils = Object.create(Object, {

    // errors
    MISSING_DESCRIPTION: { value: "MISSING_DESCRIPTION" },
    INVALID_PATH: { value: "INVALID_PATH" },
    INVALID_TYPE: { value: "INVALID_TYPE" },
    XMLHTTPREQUEST_STATUS_ERROR: { value: "XMLHTTPREQUEST_STATUS_ERROR" },
    NOT_FOUND: { value: "NOT_FOUND" },
    // misc constants
    ARRAY_BUFFER: { value: "ArrayBuffer" },

    _streams : { value:{}, writable: true },

    _streamsStatus: { value: {}, writable: true },
    
    _resources: { value: {}, writable: true },

    _resourcesStatus: { value: {}, writable: true },

    // initialization
    init: {
        value: function() {
	        this._streams = {};
	        this._streamsStatus = {};
            this._resources = {};
            this._resourcesStatus = {};
        }
    },

    //manage entries
    _containsResource: {
        enumerable: false,
        value: function(resourceID) {
            return this._resources[resourceID] ? true : false;
        }
    },

    _storeResource: {
        enumerable: false,
        value: function(resourceID, resource) {
            if (!resourceID) {
                console.log("ERROR: entry does not contain id, cannot store");
                return;
            }

            if (this._containsResource[resourceID]) {
                console.log("WARNING: resource:"+resourceID+" is already stored, overriding");
            }

           this._resources[resourceID] = resource;
        }
    },

    _getResource: {
        enumerable: false,
        value: function(resourceID) {
            return this._resources[resourceID];
        }
    },

    _loadStream: {
        value: function(path, type, delegate) {



            var dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;

            function decodeDataUriText(isBase64, data) {
                var result = decodeURIComponent(data);
                if (isBase64) {
                    return atob(result);
                }
                return result;
            }

            function decodeDataUriArrayBuffer(isBase64, data) {
                var byteString = decodeDataUriText(isBase64, data);
                var buffer = new ArrayBuffer(byteString.length);
                var view = new Uint8Array(buffer);
                for (var i = 0; i < byteString.length; i++) {
                    view[i] = byteString.charCodeAt(i);
                }
                return buffer;
            }

            function decodeDataUri(dataUriRegexResult, responseType) {
                responseType = typeof responseType !== 'undefined' ? responseType : '';
                var mimeType = dataUriRegexResult[1];
                var isBase64 = !!dataUriRegexResult[2];
                var data = dataUriRegexResult[3];

                switch (responseType) {
                case '':
                case 'text':
                    return decodeDataUriText(isBase64, data);
                case 'ArrayBuffer':
                    return decodeDataUriArrayBuffer(isBase64, data);
                case 'blob':
                    var buffer = decodeDataUriArrayBuffer(isBase64, data);
                    return new Blob([buffer], {
                        type : mimeType
                    });
                case 'document':
                    var parser = new DOMParser();
                    return parser.parseFromString(decodeDataUriText(isBase64, data), mimeType);
                case 'json':
                    return JSON.parse(decodeDataUriText(isBase64, data));
                default:
                    throw 'Unhandled responseType: ' + responseType;
                }
            }

            var dataUriRegexResult = dataUriRegex.exec(path);
            if (dataUriRegexResult !== null) {
                delegate.streamAvailable(path, decodeDataUri(dataUriRegexResult, type));
                return;
            }

            var self = this;

            if (!type) {
                delegate.handleError(THREE.GLTFLoaderUtils.INVALID_TYPE, null);
                return;
            }

            if (!path) {
                delegate.handleError(THREE.GLTFLoaderUtils.INVALID_PATH);
                return;
            }

            var xhr = new XMLHttpRequest();
            xhr.open('GET', path, true);
            xhr.responseType = (type === this.ARRAY_BUFFER) ? "arraybuffer" : "text";

            //if this is not specified, 1 "big blob" scenes fails to load.
            xhr.setRequestHeader("If-Modified-Since", "Sat, 01 Jan 1970 00:00:00 GMT");
            xhr.onload = function(e) {
                if ((xhr.status == 200) || (xhr.status == 206)) {

                    delegate.streamAvailable(path, xhr.response);

                } else {
                    delegate.handleError(THREE.GLTFLoaderUtils.XMLHTTPREQUEST_STATUS_ERROR, this.status);
                }
            };
            xhr.send(null);
        }
    },

    send: { value: 0, writable: true },
    requested: { value: 0, writable: true },

    _handleRequest: {
        value: function(request) {
            var resourceStatus = this._resourcesStatus[request.id];
            if (resourceStatus)
            {
            	this._resourcesStatus[request.id]++;
            }
            else
            {
            	this._resourcesStatus[request.id] = 1;
            }
            
            var streamStatus = this._streamsStatus[request.uri];
            if (streamStatus && streamStatus.status === "loading" )
            {
            	streamStatus.requests.push(request);
                return;
            }
            
            this._streamsStatus[request.uri] = { status : "loading", requests : [request] };
    		
            var self = this;
            var processResourceDelegate = {};

            processResourceDelegate.streamAvailable = function(path, res_) {
            	var streamStatus = self._streamsStatus[path];
            	var requests = streamStatus.requests;
                requests.forEach( function(req_) {
                    var subArray = res_.slice(req_.range[0], req_.range[1]);
                    var convertedResource = req_.delegate.convert(subArray, req_.ctx);
                    self._storeResource(req_.id, convertedResource);
                    req_.delegate.resourceAvailable(convertedResource, req_.ctx);
                    --self._resourcesStatus[req_.id];

                }, this);
            	
                delete self._streamsStatus[path];

            };

            processResourceDelegate.handleError = function(errorCode, info) {
                request.delegate.handleError(errorCode, info);
            }

            this._loadStream(request.uri, request.type, processResourceDelegate);
        }
    },


    _elementSizeForGLType: {
        value: function(componentType, type) {
    	
    		var nElements = 0;
    		switch(type) {    		
	            case "SCALAR" :
	                nElements = 1;
	                break;
	            case "VEC2" :
	                nElements = 2;
	                break;
	            case "VEC3" :
	                nElements = 3;
	                break;
	            case "VEC4" :
	                nElements = 4;
	                break;
	            case "MAT2" :
	                nElements = 4;
	                break;
	            case "MAT3" :
	                nElements = 9;
	                break;
	            case "MAT4" :
	                nElements = 16;
	                break;
	            default :
	            	debugger;
	            	break;
    		}
    		
            switch (componentType) {
                case WebGLRenderingContext.FLOAT :
                    return Float32Array.BYTES_PER_ELEMENT * nElements;
                case WebGLRenderingContext.UNSIGNED_BYTE :
                    return Uint8Array.BYTES_PER_ELEMENT * nElements;
                case WebGLRenderingContext.UNSIGNED_SHORT :
                    return Uint16Array.BYTES_PER_ELEMENT * nElements;
                default :
                	debugger;
                    return null;
            }
        }
    },

    _handleWrappedBufferViewResourceLoading: {
        value: function(wrappedBufferView, delegate, ctx) {
            var bufferView = wrappedBufferView.bufferView;
            var buffer = bufferView.buffer;
            var byteOffset = wrappedBufferView.byteOffset + bufferView.description.byteOffset;
            var range = [byteOffset , (this._elementSizeForGLType(wrappedBufferView.componentType, wrappedBufferView.type) * wrappedBufferView.count) + byteOffset];

            this._handleRequest({   "id" : wrappedBufferView.id,
                                    "range" : range,
                                    "type" : buffer.description.type,
                                    "uri" : buffer.description.uri,
                                    "delegate" : delegate,
                                    "ctx" : ctx }, null);
        }
    },
    
    getBuffer: {
    	
            value: function(wrappedBufferView, delegate, ctx) {

            var savedBuffer = this._getResource(wrappedBufferView.id);
            if (false) { // savedBuffer) {
                return savedBuffer;
            } else {
                this._handleWrappedBufferViewResourceLoading(wrappedBufferView, delegate, ctx);
            }

            return null;
        }
    },

    getFile: {
    	
        value: function(request, delegate, ctx) {

    		request.delegate = delegate;
    		request.ctx = ctx;

            this._handleRequest({   "id" : request.id,
                "uri" : request.uri,
                "range" : [0],
                "type" : "text",
                "delegate" : delegate,
                "ctx" : ctx }, null);
    	
            return null;
	    }
	},    
});
/**
 * @author Tony Parisi / http://www.tonyparisi.com/
 */

THREE.glTFAnimator = ( function () {

	var animators = [];

	return	{
		add : function(animator)
		{
			animators.push(animator);
		},

		remove: function(animator)
		{

			var i = animators.indexOf(animator);

			if ( i !== -1 ) {
				animators.splice( i, 1 );
			}
		},

		update : function()
		{
			for (i = 0; i < animators.length; i++)
			{
				animators[i].update();
			}
		},
	};
})();

// Construction/initialization
THREE.glTFAnimation = function(interps)
{
	this.running = false;
	this.loop = false;
	this.duration = 0;
	this.startTime = 0;
	this.interps = [];
	
	if (interps)
	{
		this.createInterpolators(interps);
	}
}

THREE.glTFAnimation.prototype.createInterpolators = function(interps)
{
	var i, len = interps.length;
	for (i = 0; i < len; i++)
	{
		var interp = new THREE.glTFInterpolator(interps[i]);
		this.interps.push(interp);
		this.duration = Math.max(this.duration, interp.duration);
	}
}

// Start/stop
THREE.glTFAnimation.prototype.play = function()
{
	if (this.running)
		return;
	
	this.startTime = Date.now();
	this.running = true;
	THREE.glTFAnimator.add(this);
}

THREE.glTFAnimation.prototype.stop = function()
{
	this.running = false;
	THREE.glTFAnimator.remove(this);
}

// Update - drive key frame evaluation
THREE.glTFAnimation.prototype.update = function()
{
	if (!this.running)
		return;
	
	var now = Date.now();
	var deltat = (now - this.startTime) / 1000;
	var t = deltat % this.duration;
	var nCycles = Math.floor(deltat / this.duration);
	
	if (nCycles >= 1 && !this.loop)
	{
		this.running = false;
		var i, len = this.interps.length;
		for (i = 0; i < len; i++)
		{
			this.interps[i].interp(this.duration);
		}
		this.stop();
		return;
	}
	else
	{
		var i, len = this.interps.length;
		for (i = 0; i < len; i++)
		{
			this.interps[i].interp(t);
		}
	}
}

//Interpolator class
//Construction/initialization
THREE.glTFInterpolator = function(param) 
{	    		
	this.keys = param.keys;
	this.values = param.values;
	this.count = param.count;
	this.type = param.type;
	this.path = param.path;
	this.isRot = false;
	
	var node = param.target;
	node.updateMatrix();
	node.matrixAutoUpdate = true;
	this.targetNode = node;
	
	switch (param.path) {
		case "translation" :
			this.target = node.position;
			this.originalValue = node.position.clone();
			break;
		case "rotation" :
			this.target = node.quaternion;
			this.originalValue = node.quaternion.clone();
			this.isRot = true;
			break;
		case "scale" :
			this.target = node.scale;
			this.originalValue = node.scale.clone();
			break;
	}
	
	this.duration = this.keys[this.count - 1];
	
	this.vec1 = new THREE.Vector3;
	this.vec2 = new THREE.Vector3;
	this.vec3 = new THREE.Vector3;
	this.quat1 = new THREE.Quaternion;
	this.quat2 = new THREE.Quaternion;
	this.quat3 = new THREE.Quaternion;
}

//Interpolation and tweening methods
THREE.glTFInterpolator.prototype.interp = function(t)
{
	var i, j;
	if (t == this.keys[0])
	{
		if (this.isRot) {
			this.quat3.set(this.values[0], this.values[1], this.values[2], this.values[3]);
		}
		else {
			this.vec3.set(this.values[0], this.values[1], this.values[2]);
		}
	}
	else if (t < this.keys[0])
	{
		if (this.isRot) {
			this.quat1.set(this.originalValue.x,
					this.originalValue.y,
					this.originalValue.z,
					this.originalValue.w);
			this.quat2.set(this.values[0],
					this.values[1],
					this.values[2],
					this.values[3]);
			THREE.Quaternion.slerp(this.quat1, this.quat2, this.quat3, t / this.keys[0]);
		}
		else {
			this.vec3.set(this.originalValue.x,
					this.originalValue.y,
					this.originalValue.z);
			this.vec2.set(this.values[0],
					this.values[1],
					this.values[2]);

			this.vec3.lerp(this.vec2, t / this.keys[0]);
		}
	}
	else if (t >= this.keys[this.count - 1])
	{
		if (this.isRot) {
			this.quat3.set(this.values[(this.count - 1) * 4], 
					this.values[(this.count - 1) * 4 + 1],
					this.values[(this.count - 1) * 4 + 2],
					this.values[(this.count - 1) * 4 + 3]);
		}
		else {
			this.vec3.set(this.values[(this.count - 1) * 3], 
					this.values[(this.count - 1) * 3 + 1],
					this.values[(this.count - 1) * 3 + 2]);
		}
	}
	else
	{
		for (i = 0; i < this.count - 1; i++)
		{
			var key1 = this.keys[i];
			var key2 = this.keys[i + 1];
	
			if (t >= key1 && t <= key2)
			{
				if (this.isRot) {
					this.quat1.set(this.values[i * 4],
							this.values[i * 4 + 1],
							this.values[i * 4 + 2],
							this.values[i * 4 + 3]);
					this.quat2.set(this.values[(i + 1) * 4],
							this.values[(i + 1) * 4 + 1],
							this.values[(i + 1) * 4 + 2],
							this.values[(i + 1) * 4 + 3]);
					THREE.Quaternion.slerp(this.quat1, this.quat2, this.quat3, (t - key1) / (key2 - key1));
				}
				else {
					this.vec3.set(this.values[i * 3],
							this.values[i * 3 + 1],
							this.values[i * 3 + 2]);
					this.vec2.set(this.values[(i + 1) * 3],
							this.values[(i + 1) * 3 + 1],
							this.values[(i + 1) * 3 + 2]);
	
					this.vec3.lerp(this.vec2, (t - key1) / (key2 - key1));
				}
			}
		}
	}
	
	if (this.target)
	{
		this.copyValue(this.target);
	}
}

THREE.glTFInterpolator.prototype.copyValue = function(target) {
	
	if (this.isRot) {
		target.copy(this.quat3);
	}
	else {
		target.copy(this.vec3);
	}		
}
/**
 * @author Tony Parisi / http://www.tonyparisi.com/
 */

THREE.glTFShaders = ( function () {

	var shaders = [];

	return	{
		add : function(shader) {
			shaders.push(shader);
		},

		remove: function(shader) {

			var i = shaders.indexOf(shader);

			if ( i !== -1 ) {
				shaders.splice( i, 1 );
			}
		},

		removeAll: function(shader) {

			// probably want to clean up the shaders, too, but not for now
			shaders = [];
		},

		bindShaderParameters: function(scene) {
			for (i = 0; i < shaders.length; i++)
			{
				shaders[i].bindParameters(scene);
			}
		},

		update : function(scene, camera) {
			for (i = 0; i < shaders.length; i++)
			{
				shaders[i].update(scene, camera);
			}
		},
	};
})();

// Construction/initialization
THREE.glTFShader = function(material, params, object, scene) {
	this.material = material;
	this.parameters = params.technique.parameters;
	this.uniforms = params.technique.uniforms;
	this.joints = params.joints;
	this.object = object;
	this.semantics = {};
	this.m4 = new THREE.Matrix4;
}


// bindParameters - connect the uniform values to their source parameters
THREE.glTFShader.prototype.bindParameters = function(scene) {

	function findObject(o, p) { 
		if (o.glTFID == param.node) {
			p.sourceObject = o;
		}
	}

	for (var uniform in this.uniforms) {
		var pname = this.uniforms[uniform];
		var param = this.parameters[pname];
		if (param.semantic) {

			var p = { 
				semantic : param.semantic,
				uniform: this.material.uniforms[uniform] 
			};

			if (param.node) {
				scene.traverse(function(o) { findObject(o, p)});
			}
			else {
				p.sourceObject = this.object;
			}			

			this.semantics[pname] = p;

		}
	}

}

// Update - update all the uniform values
THREE.glTFShader.prototype.update = function(scene, camera) {

	// update scene graph

	scene.updateMatrixWorld();

	// update camera matrices and frustum
	camera.updateMatrixWorld();
	camera.matrixWorldInverse.getInverse( camera.matrixWorld );

	for (var sname in this.semantics) {
		var semantic = this.semantics[sname];
        if (semantic) {
	        switch (semantic.semantic) {
	            case "MODELVIEW" :
	            	var m4 = semantic.uniform.value;
	            	m4.multiplyMatrices(camera.matrixWorldInverse, 
	            		semantic.sourceObject.matrixWorld);
	                break;

	            case "MODELVIEWINVERSETRANSPOSE" :
	            	var m3 = semantic.uniform.value;
	            	this.m4.multiplyMatrices(camera.matrixWorldInverse, 
	            		semantic.sourceObject.matrixWorld);
					m3.getNormalMatrix(this.m4);
	                break;

	            case "PROJECTION" :
	            	var m4 = semantic.uniform.value;
	            	m4.copy(camera.projectionMatrix);            		
	                break;

	            case "JOINTMATRIX" :
	            
	            	var m4v = semantic.uniform.value;
					for (var mi = 0; mi < m4v.length; mi++) {
						// So it goes like this:
						// SkinnedMesh world matrix is already baked into MODELVIEW;
						// ransform joints to local space,
						// then transform using joint's inverse
						m4v[mi].getInverse(semantic.sourceObject.matrixWorld).
							multiply(this.joints[mi].matrixWorld).
							multiply(this.object.skeleton.boneInverses[mi]);
					}
	            
	                //console.log("Joint:", semantic)
	                break;

	            default :
	                throw new Error("Unhandled shader semantic" + semantic);
	                break;
	        }
        }
	}
}






/*
 * @author mrdoob / http://mrdoob.com/
 */

THREE.DDSLoader = function () {

	this._parser = THREE.DDSLoader.parse;

};

THREE.DDSLoader.prototype = Object.create( THREE.CompressedTextureLoader.prototype );
THREE.DDSLoader.prototype.constructor = THREE.DDSLoader;

THREE.DDSLoader.parse = function ( buffer, loadMipmaps ) {

	var dds = { mipmaps: [], width: 0, height: 0, format: null, mipmapCount: 1 };

	// Adapted from @toji's DDS utils
	// https://github.com/toji/webgl-texture-utils/blob/master/texture-util/dds.js

	// All values and structures referenced from:
	// http://msdn.microsoft.com/en-us/library/bb943991.aspx/

	var DDS_MAGIC = 0x20534444;

	var DDSD_CAPS = 0x1,
		DDSD_HEIGHT = 0x2,
		DDSD_WIDTH = 0x4,
		DDSD_PITCH = 0x8,
		DDSD_PIXELFORMAT = 0x1000,
		DDSD_MIPMAPCOUNT = 0x20000,
		DDSD_LINEARSIZE = 0x80000,
		DDSD_DEPTH = 0x800000;

	var DDSCAPS_COMPLEX = 0x8,
		DDSCAPS_MIPMAP = 0x400000,
		DDSCAPS_TEXTURE = 0x1000;

	var DDSCAPS2_CUBEMAP = 0x200,
		DDSCAPS2_CUBEMAP_POSITIVEX = 0x400,
		DDSCAPS2_CUBEMAP_NEGATIVEX = 0x800,
		DDSCAPS2_CUBEMAP_POSITIVEY = 0x1000,
		DDSCAPS2_CUBEMAP_NEGATIVEY = 0x2000,
		DDSCAPS2_CUBEMAP_POSITIVEZ = 0x4000,
		DDSCAPS2_CUBEMAP_NEGATIVEZ = 0x8000,
		DDSCAPS2_VOLUME = 0x200000;

	var DDPF_ALPHAPIXELS = 0x1,
		DDPF_ALPHA = 0x2,
		DDPF_FOURCC = 0x4,
		DDPF_RGB = 0x40,
		DDPF_YUV = 0x200,
		DDPF_LUMINANCE = 0x20000;

	function fourCCToInt32( value ) {

		return value.charCodeAt( 0 ) +
			( value.charCodeAt( 1 ) << 8 ) +
			( value.charCodeAt( 2 ) << 16 ) +
			( value.charCodeAt( 3 ) << 24 );

	}

	function int32ToFourCC( value ) {

		return String.fromCharCode(
			value & 0xff,
			( value >> 8 ) & 0xff,
			( value >> 16 ) & 0xff,
			( value >> 24 ) & 0xff
		);

	}

	function loadARGBMip( buffer, dataOffset, width, height ) {

		var dataLength = width * height * 4;
		var srcBuffer = new Uint8Array( buffer, dataOffset, dataLength );
		var byteArray = new Uint8Array( dataLength );
		var dst = 0;
		var src = 0;
		for ( var y = 0; y < height; y ++ ) {

			for ( var x = 0; x < width; x ++ ) {

				var b = srcBuffer[ src ]; src ++;
				var g = srcBuffer[ src ]; src ++;
				var r = srcBuffer[ src ]; src ++;
				var a = srcBuffer[ src ]; src ++;
				byteArray[ dst ] = r; dst ++;	//r
				byteArray[ dst ] = g; dst ++;	//g
				byteArray[ dst ] = b; dst ++;	//b
				byteArray[ dst ] = a; dst ++;	//a

			}

		}
		return byteArray;

	}

	var FOURCC_DXT1 = fourCCToInt32( "DXT1" );
	var FOURCC_DXT3 = fourCCToInt32( "DXT3" );
	var FOURCC_DXT5 = fourCCToInt32( "DXT5" );
	var FOURCC_ETC1 = fourCCToInt32( "ETC1" );

	var headerLengthInt = 31; // The header length in 32 bit ints

	// Offsets into the header array

	var off_magic = 0;

	var off_size = 1;
	var off_flags = 2;
	var off_height = 3;
	var off_width = 4;

	var off_mipmapCount = 7;

	var off_pfFlags = 20;
	var off_pfFourCC = 21;
	var off_RGBBitCount = 22;
	var off_RBitMask = 23;
	var off_GBitMask = 24;
	var off_BBitMask = 25;
	var off_ABitMask = 26;

	var off_caps = 27;
	var off_caps2 = 28;
	var off_caps3 = 29;
	var off_caps4 = 30;

	// Parse header

	var header = new Int32Array( buffer, 0, headerLengthInt );

	if ( header[ off_magic ] !== DDS_MAGIC ) {

		console.error( 'THREE.DDSLoader.parse: Invalid magic number in DDS header.' );
		return dds;

	}

	if ( ! header[ off_pfFlags ] & DDPF_FOURCC ) {

		console.error( 'THREE.DDSLoader.parse: Unsupported format, must contain a FourCC code.' );
		return dds;

	}

	var blockBytes;

	var fourCC = header[ off_pfFourCC ];

	var isRGBAUncompressed = false;

	switch ( fourCC ) {

		case FOURCC_DXT1:

			blockBytes = 8;
			dds.format = THREE.RGB_S3TC_DXT1_Format;
			break;

		case FOURCC_DXT3:

			blockBytes = 16;
			dds.format = THREE.RGBA_S3TC_DXT3_Format;
			break;

		case FOURCC_DXT5:

			blockBytes = 16;
			dds.format = THREE.RGBA_S3TC_DXT5_Format;
			break;

		case FOURCC_ETC1:

			blockBytes = 8;
			dds.format = THREE.RGB_ETC1_Format;
			break;

		default:

			if ( header[ off_RGBBitCount ] === 32
				&& header[ off_RBitMask ] & 0xff0000
				&& header[ off_GBitMask ] & 0xff00
				&& header[ off_BBitMask ] & 0xff
				&& header[ off_ABitMask ] & 0xff000000  ) {

				isRGBAUncompressed = true;
				blockBytes = 64;
				dds.format = THREE.RGBAFormat;

			} else {

				console.error( 'THREE.DDSLoader.parse: Unsupported FourCC code ', int32ToFourCC( fourCC ) );
				return dds;

			}
	}

	dds.mipmapCount = 1;

	if ( header[ off_flags ] & DDSD_MIPMAPCOUNT && loadMipmaps !== false ) {

		dds.mipmapCount = Math.max( 1, header[ off_mipmapCount ] );

	}

	var caps2 = header[ off_caps2 ];
	dds.isCubemap = caps2 & DDSCAPS2_CUBEMAP ? true : false;
	if ( dds.isCubemap && (
		! ( caps2 & DDSCAPS2_CUBEMAP_POSITIVEX ) ||
		! ( caps2 & DDSCAPS2_CUBEMAP_NEGATIVEX ) ||
		! ( caps2 & DDSCAPS2_CUBEMAP_POSITIVEY ) ||
		! ( caps2 & DDSCAPS2_CUBEMAP_NEGATIVEY ) ||
		! ( caps2 & DDSCAPS2_CUBEMAP_POSITIVEZ ) ||
		! ( caps2 & DDSCAPS2_CUBEMAP_NEGATIVEZ )
		) ) {

		console.error( 'THREE.DDSLoader.parse: Incomplete cubemap faces' );
		return dds;

	}

	dds.width = header[ off_width ];
	dds.height = header[ off_height ];

	var dataOffset = header[ off_size ] + 4;

	// Extract mipmaps buffers

	var faces = dds.isCubemap ? 6 : 1;

	for ( var face = 0; face < faces; face ++ ) {

		var width = dds.width;
		var height = dds.height;

		for ( var i = 0; i < dds.mipmapCount; i ++ ) {

			if ( isRGBAUncompressed ) {

				var byteArray = loadARGBMip( buffer, dataOffset, width, height );
				var dataLength = byteArray.length;

			} else {

				var dataLength = Math.max( 4, width ) / 4 * Math.max( 4, height ) / 4 * blockBytes;
				var byteArray = new Uint8Array( buffer, dataOffset, dataLength );

			}

			var mipmap = { "data": byteArray, "width": width, "height": height };
			dds.mipmaps.push( mipmap );

			dataOffset += dataLength;

			width = Math.max( width >> 1, 1 );
			height = Math.max( height >> 1, 1 );

		}

	}

	return dds;

};


/*
 * @author Daosheng Mu / https://github.com/DaoshengMu/
 * @author mrdoob / http://mrdoob.com/
 * @author takahirox / https://github.com/takahirox/
 */

THREE.TGALoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.TGALoader.prototype.load = function ( url, onLoad, onProgress, onError ) {

	var scope = this;

	var texture = new THREE.Texture();

	var loader = new THREE.XHRLoader( this.manager );
	loader.setResponseType( 'arraybuffer' );

	loader.load( url, function ( buffer ) {

		texture.image = scope.parse( buffer );
		texture.needsUpdate = true;

		if ( onLoad !== undefined ) {

			onLoad( texture );

		}

	}, onProgress, onError );

	return texture;

};

// reference from vthibault, https://github.com/vthibault/roBrowser/blob/master/src/Loaders/Targa.js
THREE.TGALoader.prototype.parse = function ( buffer ) {

	// TGA Constants
	var TGA_TYPE_NO_DATA = 0,
	TGA_TYPE_INDEXED = 1,
	TGA_TYPE_RGB = 2,
	TGA_TYPE_GREY = 3,
	TGA_TYPE_RLE_INDEXED = 9,
	TGA_TYPE_RLE_RGB = 10,
	TGA_TYPE_RLE_GREY = 11,

	TGA_ORIGIN_MASK = 0x30,
	TGA_ORIGIN_SHIFT = 0x04,
	TGA_ORIGIN_BL = 0x00,
	TGA_ORIGIN_BR = 0x01,
	TGA_ORIGIN_UL = 0x02,
	TGA_ORIGIN_UR = 0x03;


	if ( buffer.length < 19 )
		console.error( 'THREE.TGALoader.parse: Not enough data to contain header.' );

	var content = new Uint8Array( buffer ),
		offset = 0,
		header = {
			id_length:       content[ offset ++ ],
			colormap_type:   content[ offset ++ ],
			image_type:      content[ offset ++ ],
			colormap_index:  content[ offset ++ ] | content[ offset ++ ] << 8,
			colormap_length: content[ offset ++ ] | content[ offset ++ ] << 8,
			colormap_size:   content[ offset ++ ],

			origin: [
				content[ offset ++ ] | content[ offset ++ ] << 8,
				content[ offset ++ ] | content[ offset ++ ] << 8
			],
			width:      content[ offset ++ ] | content[ offset ++ ] << 8,
			height:     content[ offset ++ ] | content[ offset ++ ] << 8,
			pixel_size: content[ offset ++ ],
			flags:      content[ offset ++ ]
		};

	function tgaCheckHeader( header ) {

		switch ( header.image_type ) {

			// Check indexed type
			case TGA_TYPE_INDEXED:
			case TGA_TYPE_RLE_INDEXED:
				if ( header.colormap_length > 256 || header.colormap_size !== 24 || header.colormap_type !== 1 ) {

					console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid type colormap data for indexed type' );

				}
				break;

			// Check colormap type
			case TGA_TYPE_RGB:
			case TGA_TYPE_GREY:
			case TGA_TYPE_RLE_RGB:
			case TGA_TYPE_RLE_GREY:
				if ( header.colormap_type ) {

					console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid type colormap data for colormap type' );

				}
				break;

			// What the need of a file without data ?
			case TGA_TYPE_NO_DATA:
				console.error( 'THREE.TGALoader.parse.tgaCheckHeader: No data' );

			// Invalid type ?
			default:
				console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid type " ' + header.image_type + '"' );

		}

		// Check image width and height
		if ( header.width <= 0 || header.height <= 0 ) {

			console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid image size' );

		}

		// Check image pixel size
		if ( header.pixel_size !== 8  &&
			header.pixel_size !== 16 &&
			header.pixel_size !== 24 &&
			header.pixel_size !== 32 ) {

			console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid pixel size "' + header.pixel_size + '"' );

		}

	}

	// Check tga if it is valid format
	tgaCheckHeader( header );

	if ( header.id_length + offset > buffer.length ) {

		console.error( 'THREE.TGALoader.parse: No data' );

	}

	// Skip the needn't data
	offset += header.id_length;

	// Get targa information about RLE compression and palette
	var use_rle = false,
		use_pal = false,
		use_grey = false;

	switch ( header.image_type ) {

		case TGA_TYPE_RLE_INDEXED:
			use_rle = true;
			use_pal = true;
			break;

		case TGA_TYPE_INDEXED:
			use_pal = true;
			break;

		case TGA_TYPE_RLE_RGB:
			use_rle = true;
			break;

		case TGA_TYPE_RGB:
			break;

		case TGA_TYPE_RLE_GREY:
			use_rle = true;
			use_grey = true;
			break;

		case TGA_TYPE_GREY:
			use_grey = true;
			break;

	}

	// Parse tga image buffer
	function tgaParse( use_rle, use_pal, header, offset, data ) {

		var pixel_data,
			pixel_size,
			pixel_total,
			palettes;

		pixel_size = header.pixel_size >> 3;
		pixel_total = header.width * header.height * pixel_size;

		 // Read palettes
		 if ( use_pal ) {

			 palettes = data.subarray( offset, offset += header.colormap_length * ( header.colormap_size >> 3 ) );

		 }

		 // Read RLE
		 if ( use_rle ) {

			 pixel_data = new Uint8Array( pixel_total );

			var c, count, i;
			var shift = 0;
			var pixels = new Uint8Array( pixel_size );

			while ( shift < pixel_total ) {

				c     = data[ offset ++ ];
				count = ( c & 0x7f ) + 1;

				// RLE pixels.
				if ( c & 0x80 ) {

					// Bind pixel tmp array
					for ( i = 0; i < pixel_size; ++ i ) {

						pixels[ i ] = data[ offset ++ ];

					}

					// Copy pixel array
					for ( i = 0; i < count; ++ i ) {

						pixel_data.set( pixels, shift + i * pixel_size );

					}

					shift += pixel_size * count;

				} else {

					// Raw pixels.
					count *= pixel_size;
					for ( i = 0; i < count; ++ i ) {

						pixel_data[ shift + i ] = data[ offset ++ ];

					}
					shift += count;

				}

			}

		 } else {

			// RAW Pixels
			pixel_data = data.subarray(
				 offset, offset += ( use_pal ? header.width * header.height : pixel_total )
			);

		 }

		 return {
			pixel_data: pixel_data,
			palettes: palettes
		 };

	}

	function tgaGetImageData8bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image, palettes ) {

		var colormap = palettes;
		var color, i = 0, x, y;
		var width = header.width;

		for ( y = y_start; y !== y_end; y += y_step ) {

			for ( x = x_start; x !== x_end; x += x_step, i ++ ) {

				color = image[ i ];
				imageData[ ( x + width * y ) * 4 + 3 ] = 255;
				imageData[ ( x + width * y ) * 4 + 2 ] = colormap[ ( color * 3 ) + 0 ];
				imageData[ ( x + width * y ) * 4 + 1 ] = colormap[ ( color * 3 ) + 1 ];
				imageData[ ( x + width * y ) * 4 + 0 ] = colormap[ ( color * 3 ) + 2 ];

			}

		}

		return imageData;

	}

	function tgaGetImageData16bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image ) {

		var color, i = 0, x, y;
		var width = header.width;

		for ( y = y_start; y !== y_end; y += y_step ) {

			for ( x = x_start; x !== x_end; x += x_step, i += 2 ) {

				color = image[ i + 0 ] + ( image[ i + 1 ] << 8 ); // Inversed ?
				imageData[ ( x + width * y ) * 4 + 0 ] = ( color & 0x7C00 ) >> 7;
				imageData[ ( x + width * y ) * 4 + 1 ] = ( color & 0x03E0 ) >> 2;
				imageData[ ( x + width * y ) * 4 + 2 ] = ( color & 0x001F ) >> 3;
				imageData[ ( x + width * y ) * 4 + 3 ] = ( color & 0x8000 ) ? 0 : 255;

			}

		}

		return imageData;

	}

	function tgaGetImageData24bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image ) {

		var i = 0, x, y;
		var width = header.width;

		for ( y = y_start; y !== y_end; y += y_step ) {

			for ( x = x_start; x !== x_end; x += x_step, i += 3 ) {

				imageData[ ( x + width * y ) * 4 + 3 ] = 255;
				imageData[ ( x + width * y ) * 4 + 2 ] = image[ i + 0 ];
				imageData[ ( x + width * y ) * 4 + 1 ] = image[ i + 1 ];
				imageData[ ( x + width * y ) * 4 + 0 ] = image[ i + 2 ];

			}

		}

		return imageData;

	}

	function tgaGetImageData32bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image ) {

		var i = 0, x, y;
		var width = header.width;

		for ( y = y_start; y !== y_end; y += y_step ) {

			for ( x = x_start; x !== x_end; x += x_step, i += 4 ) {

				imageData[ ( x + width * y ) * 4 + 2 ] = image[ i + 0 ];
				imageData[ ( x + width * y ) * 4 + 1 ] = image[ i + 1 ];
				imageData[ ( x + width * y ) * 4 + 0 ] = image[ i + 2 ];
				imageData[ ( x + width * y ) * 4 + 3 ] = image[ i + 3 ];

			}

		}

		return imageData;

	}

	function tgaGetImageDataGrey8bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image ) {

		var color, i = 0, x, y;
		var width = header.width;

		for ( y = y_start; y !== y_end; y += y_step ) {

			for ( x = x_start; x !== x_end; x += x_step, i ++ ) {

				color = image[ i ];
				imageData[ ( x + width * y ) * 4 + 0 ] = color;
				imageData[ ( x + width * y ) * 4 + 1 ] = color;
				imageData[ ( x + width * y ) * 4 + 2 ] = color;
				imageData[ ( x + width * y ) * 4 + 3 ] = 255;

			}

		}

		return imageData;

	}

	function tgaGetImageDataGrey16bits( imageData, y_start, y_step, y_end, x_start, x_step, x_end, image ) {

		var i = 0, x, y;
		var width = header.width;

		for ( y = y_start; y !== y_end; y += y_step ) {

			for ( x = x_start; x !== x_end; x += x_step, i += 2 ) {

				imageData[ ( x + width * y ) * 4 + 0 ] = image[ i + 0 ];
				imageData[ ( x + width * y ) * 4 + 1 ] = image[ i + 0 ];
				imageData[ ( x + width * y ) * 4 + 2 ] = image[ i + 0 ];
				imageData[ ( x + width * y ) * 4 + 3 ] = image[ i + 1 ];

			}

		}

		return imageData;

	}

	function getTgaRGBA( data, width, height, image, palette ) {

		var x_start,
			y_start,
			x_step,
			y_step,
			x_end,
			y_end;

		switch ( ( header.flags & TGA_ORIGIN_MASK ) >> TGA_ORIGIN_SHIFT ) {
			default:
			case TGA_ORIGIN_UL:
				x_start = 0;
				x_step = 1;
				x_end = width;
				y_start = 0;
				y_step = 1;
				y_end = height;
				break;

			case TGA_ORIGIN_BL:
				x_start = 0;
				x_step = 1;
				x_end = width;
				y_start = height - 1;
				y_step = - 1;
				y_end = - 1;
				break;

			case TGA_ORIGIN_UR:
				x_start = width - 1;
				x_step = - 1;
				x_end = - 1;
				y_start = 0;
				y_step = 1;
				y_end = height;
				break;

			case TGA_ORIGIN_BR:
				x_start = width - 1;
				x_step = - 1;
				x_end = - 1;
				y_start = height - 1;
				y_step = - 1;
				y_end = - 1;
				break;

		}

		if ( use_grey ) {

			switch ( header.pixel_size ) {
				case 8:
					tgaGetImageDataGrey8bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
					break;
				case 16:
					tgaGetImageDataGrey16bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
					break;
				default:
					console.error( 'THREE.TGALoader.parse.getTgaRGBA: not support this format' );
					break;
			}

		} else {

			switch ( header.pixel_size ) {
				case 8:
					tgaGetImageData8bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image, palette );
					break;

				case 16:
					tgaGetImageData16bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
					break;

				case 24:
					tgaGetImageData24bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
					break;

				case 32:
					tgaGetImageData32bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
					break;

				default:
					console.error( 'THREE.TGALoader.parse.getTgaRGBA: not support this format' );
					break;
			}

		}

		// Load image data according to specific method
		// var func = 'tgaGetImageData' + (use_grey ? 'Grey' : '') + (header.pixel_size) + 'bits';
		// func(data, y_start, y_step, y_end, x_start, x_step, x_end, width, image, palette );
		return data;

	}

	var canvas = document.createElement( 'canvas' );
	canvas.width = header.width;
	canvas.height = header.height;

	var context = canvas.getContext( '2d' );
	var imageData = context.createImageData( header.width, header.height );

	var result = tgaParse( use_rle, use_pal, header, offset, content );
	var rgbaData = getTgaRGBA( imageData.data, header.width, header.height, result.pixel_data, result.palettes );

	context.putImageData( imageData, 0, 0 );

	return canvas;

};





/**
 * @author yamahigashi https://github.com/yamahigashi
 *
 * This loader loads FBX file in *ASCII and version 7 format*.
 *
 * Support
 *  - mesh
 *  - skinning
 *  - normal / uv
 *
 *  Not Support
 *  - material
 *  - texture
 *  - morph
 */

( function() {

	THREE.FBXLoader = function ( manager ) {

		THREE.Loader.call( this );
		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
		this.textureLoader = null;
		this.textureBasePath = null;

	};

	THREE.FBXLoader.prototype = Object.create( THREE.Loader.prototype );

	THREE.FBXLoader.prototype.constructor = THREE.FBXLoader;

	THREE.FBXLoader.prototype.load = function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		 var loader = new THREE.XHRLoader( scope.manager );
		// loader.setCrossOrigin( this.crossOrigin );
		loader.load( url, function ( text ) {

			if ( ! scope.isFbxFormatASCII( text ) ) {

				console.warn( 'FBXLoader: !!! FBX Binary format not supported !!!' );

			} else if ( ! scope.isFbxVersionSupported( text ) ) {

				console.warn( 'FBXLoader: !!! FBX Version below 7 not supported !!!' );

			} else {

				scope.textureBasePath = scope.extractUrlBase( url );
				onLoad( scope.parse( text ) );

			}

		}, onProgress, onError );

	};

	THREE.FBXLoader.prototype.setCrossOrigin = function ( value ) {

		this.crossOrigin = value;

	};

	THREE.FBXLoader.prototype.isFbxFormatASCII = function ( body ) {

		CORRECT = [ 'K', 'a', 'y', 'd', 'a', 'r', 'a', '\\', 'F', 'B', 'X', '\\', 'B', 'i', 'n', 'a', 'r', 'y', '\\', '\\' ];

		var cursor = 0;
		var read = function ( offset ) {

			var result = body[ offset - 1 ];
			body = body.slice( cursor + offset );
			cursor ++;
			return result;

		};

		for ( var i = 0; i < CORRECT.length; ++ i ) {

			num = read( 1 );
			if ( num == CORRECT[ i ] ) {

				return false;

			}

		}

		return true;

	};

	THREE.FBXLoader.prototype.isFbxVersionSupported = function ( body ) {

		var versionExp = /FBXVersion: (\d+)/;
		match = body.match( versionExp );
		if ( match ) {

			var version = parseInt( match[ 1 ] );
			console.log( 'FBXLoader: FBX version ' + version );
			return version >= 7000;

		}
		return false;

	};

	THREE.FBXLoader.prototype.parse = function ( text ) {

		var scope = this;

		console.time( 'FBXLoader' );

		console.time( 'FBXLoader: TextParser' );
		var nodes = new FBXParser().parse( text );
		console.timeEnd( 'FBXLoader: TextParser' );

		console.time( 'FBXLoader: ObjectParser' );
		scope.hierarchy = ( new Bones() ).parseHierarchy( nodes );
		scope.weights	= ( new Weights() ).parse( nodes, scope.hierarchy );
		scope.animations = ( new Animation() ).parse( nodes, scope.hierarchy );
		//scope.textures = ( new Textures() ).parse( nodes, scope.hierarchy );
		console.timeEnd( 'FBXLoader: ObjectParser' );

		console.time( 'FBXLoader: GeometryParser' );
		geometries = this.parseGeometries( nodes );
		console.timeEnd( 'FBXLoader: GeometryParser' );

		var container = new THREE.Group();

		for ( var i = 0; i < geometries.length; ++ i ) {

			if ( geometries[ i ] === undefined ) {

				continue;

			}

			container.add( geometries[ i ] );

			//wireframe = new THREE.WireframeHelper( geometries[i], 0x00ff00 );
			//container.add( wireframe );

			//vnh = new THREE.VertexNormalsHelper( geometries[i], 0.6 );
			//container.add( vnh );

			//skh = new THREE.SkeletonHelper( geometries[i] );
			//container.add( skh );

			// container.add( new THREE.BoxHelper( geometries[i] ) );

		}

		console.timeEnd( 'FBXLoader' );
		return container;

	};

	THREE.FBXLoader.prototype.parseGeometries = function ( node ) {

		// has not geo, return []
		if ( ! ( 'Geometry' in node.Objects.subNodes ) ) {

			return [];

		}

		// has many
		var geoCount = 0;
		for ( var geo in node.Objects.subNodes.Geometry ) {

			if ( geo.match( /^\d+$/ ) ) {

				geoCount ++;

			}

		}

		var res = [];
		if ( geoCount > 0 ) {

			for ( geo in node.Objects.subNodes.Geometry ) {

				if ( node.Objects.subNodes.Geometry[ geo ].attrType === 'Mesh' ) {

					var meshes = this.parseGeometry( node.Objects.subNodes.Geometry[ geo ], node );
					for (var i = 0; i < meshes.length; i++)
					{
						res.push( meshes[i] );
					}
				}

			}

		} else {

			var meshes = this.parseGeometry( node.Objects.subNodes.Geometry, node );
			for (var i = 0; i < meshes.length; i++)
			{
				res.push( meshes[i] );
			}

		}

		return res;

	};

	THREE.FBXLoader.prototype.parseGeometry = function ( node, nodes ) {

		geo = ( new Geometry() ).parse( node );
		geo.addBones( this.hierarchy.hierarchy );
		console.log(geo);
		var meshes = [];

		meshes.push(this.makeGeometry(geo));
	
		
		return meshes;
	};
	
	THREE.FBXLoader.prototype.makeGeometry = function ( geo ) 
	{
	
		var geometry = new THREE.BufferGeometry();
		geometry.name = geo.name;
		
		geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( geo.vertices ), 3 ) );

		if ( geo.normals !== undefined && geo.normals.length > 0 ) {

			geometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( geo.normals ), 3 ) );

		}

		if ( geo.uvs !== undefined && geo.uvs.length > 0 ) {

			geometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( geo.uvs ), 2 ) );

		}
		

		if ( geo.colors !== undefined && geo.colors.length > 0 ) {

			geometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( geo.colors ), 3 ) );

		}

		if ( geo.indices !== undefined && geo.indices.length > 65535 ) {

			geometry.setIndex( new THREE.BufferAttribute( new Uint32Array( geo.indices ), 1 ) );

		} else if ( geo.indices !== undefined ) {

			geometry.setIndex( new THREE.BufferAttribute( new Uint16Array( geo.indices ), 1 ) );

		}
		
		geometry.verticesNeedUpdate = true;
		geometry.computeBoundingSphere();
		geometry.computeBoundingBox();

		// TODO: texture & material support
		var texture;

		
		var texs = false;
		
		if ( texs !== undefined && texs.length > 0 && texs ) {

			if ( this.textureLoader === null ) {

				this.textureLoader = new THREE.TextureLoader();

			}
			texture = this.textureLoader.load( texs );

		}

		var material;
		if ( texture !== undefined ) {

			material = new THREE.MeshBasicMaterial( { alphaMap: texture, map: texture, transparent: true, side: THREE.DoubleSide, vertexColors: THREE.VertexColors } );

			
		} else {

			material = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide , vertexColors: THREE.VertexColors} );

		}

		geometry = new THREE.Geometry().fromBufferGeometry( geometry );

		geometry.bones = geo.bones;
		geometry.skinIndices = this.weights.skinIndices;
		geometry.skinWeights = this.weights.skinWeights;

		var mesh = null;
		if ( geo.bones === undefined || geo.skins === undefined || this.animations === undefined || this.animations.length === 0 ) {

			mesh = new THREE.Mesh( geometry, material );

		} else {

			material.skinning = true;
			mesh = new THREE.SkinnedMesh( geometry, material );
			this.addAnimation( mesh, this.weights.matrices, this.animations );

		}

		return mesh;
		
	}

	THREE.FBXLoader.prototype.addAnimation = function ( mesh, matrices, animations ) {

		var animationdata = { "name": 'animationtest', "fps": 30, "length": animations.length, "hierarchy": [] };

		for ( var i = 0; i < mesh.geometry.bones.length; ++ i ) {

			var name = mesh.geometry.bones[ i ].name;
			name = name.replace( /.*:/, '' );
			animationdata.hierarchy.push( { parent: mesh.geometry.bones[ i ].parent, name: name, keys: [] } );

		}

		var hasCurve = function ( animNode, attr ) {

			if ( animNode === undefined ) {

				return false;

			}

			var attrNode;
			switch ( attr ) {

				case 'S':
					if ( animNode.S === undefined ) {

						return false;

					}
					attrNode = animNode.S;
					break;

				case 'R':
					if ( animNode.R === undefined ) {

						return false;

					}
					attrNode = animNode.R;
					break;

				case 'T':
					if ( animNode.T === undefined ) {

						return false;

					}
					attrNode = animNode.T;
					break;
			}

			if ( attrNode.curves.x === undefined ) {

				return false;

			}

			if ( attrNode.curves.y === undefined ) {

				return false;

			}

			if ( attrNode.curves.z === undefined ) {

				return false;

			}

			return true;

		};

		var hasKeyOnFrame = function ( attrNode, frame ) {

			var x = isKeyExistOnFrame( attrNode.curves.x, frame );
			var y = isKeyExistOnFrame( attrNode.curves.y, frame );
			var z = isKeyExistOnFrame( attrNode.curves.z, frame );

			return x && y && z;

		};

		var isKeyExistOnFrame = function ( curve, frame ) {

			var value = curve.values[ frame ];
			return value !== undefined;

		};


		var genKey = function ( animNode, bone ) {

			// key initialize with its bone's bind pose at first
			var key = {};
			key.time = frame / animations.fps; // TODO:
			key.pos = bone.pos;
			key.rot = bone.rotq;
			key.scl = bone.scl;

			if ( animNode === undefined ) {

				return key;

			}

			try {

				if ( hasCurve( animNode, 'T' ) && hasKeyOnFrame( animNode.T, frame ) ) {

					var pos = new THREE.Vector3(
						animNode.T.curves.x.values[ frame ],
						animNode.T.curves.y.values[ frame ],
						animNode.T.curves.z.values[ frame ] );
					key.pos = [ pos.x, pos.y, pos.z ];

				} else {

					delete key.pos;

				}

				if ( hasCurve( animNode, 'R' ) && hasKeyOnFrame( animNode.R, frame ) ) {

					var rx = degToRad( animNode.R.curves.x.values[ frame ] );
					var ry = degToRad( animNode.R.curves.y.values[ frame ] );
					var rz = degToRad( animNode.R.curves.z.values[ frame ] );
					var eul = new THREE.Vector3( rx, ry, rz );
					var rot = quatFromVec( eul.x, eul.y, eul.z );
					key.rot = [ rot.x, rot.y, rot.z, rot.w ];

				} else {

					delete key.rot;

				}

				if ( hasCurve( animNode, 'S' ) && hasKeyOnFrame( animNode.S, frame ) ) {

					var scl = new THREE.Vector3(
						animNode.S.curves.x.values[ frame ],
						animNode.S.curves.y.values[ frame ],
						animNode.S.curves.z.values[ frame ] );
					key.scl = [ scl.x, scl.y, scl.z ];

				} else {

					delete key.scl;

				}

			} catch ( e ) {

				// curve is not full plotted
				console.log( bone );
				console.log( e );

			}

			return key;

		};

		var bones = mesh.geometry.bones;
		for ( frame = 0; frame < animations.frames; frame ++ ) {


			for ( i = 0; i < bones.length; i ++ ) {

				var bone = bones[ i ];
				var animNode = animations.curves[ i ];

				for ( var j = 0; j < animationdata.hierarchy.length; j ++ ) {

					if ( animationdata.hierarchy[ j ].name === bone.name ) {

						animationdata.hierarchy[ j ].keys.push( genKey( animNode, bone ) );

					}

				}

			}

		}

		if ( mesh.geometry.animations === undefined ) {

			mesh.geometry.animations = [];

		}

		mesh.geometry.animations.push( THREE.AnimationClip.parseAnimation( animationdata, mesh.geometry.bones ) );

	};

	THREE.FBXLoader.prototype.parseMaterials = function ( node ) {

		// has not mat, return []
		if ( ! ( 'Material' in node.subNodes ) ) {

			return [];

		}

		// has many
		var matCount = 0;
		for ( var mat in node.subNodes.Materials ) {

			if ( mat.match( /^\d+$/ ) ) {

				matCount ++;

			}

		}

		var res = [];
		if ( matCount > 0 ) {

			for ( mat in node.subNodes.Material ) {

				res.push( parseMaterial( node.subNodes.Material[ mat ] ) );

			}

		} else {

			res.push( parseMaterial( node.subNodes.Material ) );

		}

		return res;

	};

	// TODO
	THREE.FBXLoader.prototype.parseMaterial = function ( node ) {

	};


	THREE.FBXLoader.prototype.loadFile = function ( url, onLoad, onProgress, onError, responseType ) {

		var loader = new THREE.FileLoader( this.manager );

		loader.setResponseType( responseType );

		var request = loader.load( url, function ( result ) {

			onLoad( result );

		}, onProgress, onError );

		return request;

	};

	THREE.FBXLoader.prototype.loadFileAsBuffer = function ( url, onload, onProgress, onError ) {

		this.loadFile( url, onLoad, onProgress, onError, 'arraybuffer' );

	};

	THREE.FBXLoader.prototype.loadFileAsText = function ( url, onLoad, onProgress, onError ) {

		this.loadFile( url, onLoad, onProgress, onError, 'text' );

	};


	/* ----------------------------------------------------------------- */

	function FBXNodes() {}

	FBXNodes.prototype.add = function ( key, val ) {

		this[ key ] = val;

	};

	FBXNodes.prototype.searchConnectionParent = function ( id ) {

		if ( this.__cache_search_connection_parent === undefined ) {

			this.__cache_search_connection_parent = [];

		}

		if ( this.__cache_search_connection_parent[ id ] !== undefined ) {

			return this.__cache_search_connection_parent[ id ];

		} else {

			this.__cache_search_connection_parent[ id ] = [];

		}

		var conns = this.Connections.properties.connections;

		var results = [];
		for ( var i = 0; i < conns.length; ++ i ) {

			if ( conns[ i ][ 0 ] == id ) {

				// 0 means scene root
				var res = conns[ i ][ 1 ] === 0 ? - 1 : conns[ i ][ 1 ];
				results.push( res );

			}

		}

		if ( results.length > 0 ) {

			this.__cache_search_connection_parent[ id ] = this.__cache_search_connection_parent[ id ].concat( results );
			return results;

		} else {

			this.__cache_search_connection_parent[ id ] = [ - 1 ];
			return [ - 1 ];

		}

	};

	FBXNodes.prototype.searchConnectionChildren = function ( id ) {

		if ( this.__cache_search_connection_children === undefined ) {

			this.__cache_search_connection_children = [];

		}

		if ( this.__cache_search_connection_children[ id ] !== undefined ) {

			return this.__cache_search_connection_children[ id ];

		} else {

			this.__cache_search_connection_children[ id ] = [];

		}

		var conns = this.Connections.properties.connections;

		var res = [];
		for ( var i = 0; i < conns.length; ++ i ) {

			if ( conns[ i ][ 1 ] == id ) {

				// 0 means scene root
				res.push( conns[ i ][ 0 ] === 0 ? - 1 : conns[ i ][ 0 ] );
				// there may more than one kid, then search to the end

			}

		}

		if ( res.length > 0 ) {

			this.__cache_search_connection_children[ id ] = this.__cache_search_connection_children[ id ].concat( res );
			return res;

		} else {

			this.__cache_search_connection_children[ id ] = [ - 1 ];
			return [ - 1 ];

		}

	};

	FBXNodes.prototype.searchConnectionType = function ( id, to ) {

		var key = id + ',' + to; // TODO: to hash
		if ( this.__cache_search_connection_type === undefined ) {

			this.__cache_search_connection_type = '';

		}

		if ( this.__cache_search_connection_type[ key ] !== undefined ) {

			return this.__cache_search_connection_type[ key ];

		} else {

			this.__cache_search_connection_type[ key ] = '';

		}

		var conns = this.Connections.properties.connections;

		for ( var i = 0; i < conns.length; ++ i ) {

			if ( conns[ i ][ 0 ] == id && conns[ i ][ 1 ] == to ) {

				// 0 means scene root
				this.__cache_search_connection_type[ key ] = conns[ i ][ 2 ];
				return conns[ i ][ 2 ];

			}

		}

		this.__cache_search_connection_type[ id ] = null;
		return null;

	};

	function FBXParser() {}

	FBXParser.prototype = {

		// constructor: FBXParser,

		// ------------ node stack manipulations ----------------------------------

		getPrevNode: function () {

			return this.nodeStack[ this.currentIndent - 2 ];

		},

		getCurrentNode: function () {

			return this.nodeStack[ this.currentIndent - 1 ];

		},

		getCurrentProp: function () {

			return this.currentProp;

		},

		pushStack: function ( node ) {

			this.nodeStack.push( node );
			this.currentIndent += 1;

		},

		popStack: function () {

			this.nodeStack.pop();
			this.currentIndent -= 1;

		},

		setCurrentProp: function ( val, name ) {

			this.currentProp = val;
			this.currentPropName = name;

		},

		// ----------parse ---------------------------------------------------
		parse: function ( text ) {

			this.currentIndent = 0;
			this.allNodes = new FBXNodes();
			this.nodeStack = [];
			this.currentProp = [];
			this.currentPropName = '';

			var split = text.split( "\n" );
			for ( var line in split ) {

				var l = split[ line ];

				// short cut
				if ( l.match( /^[\s\t]*;/ ) ) {

					continue;

				} // skip comment line
				if ( l.match( /^[\s\t]*$/ ) ) {

					continue;

				} // skip empty line

				// beginning of node
				var beginningOfNodeExp = new RegExp( "^\\t{" + this.currentIndent + "}(\\w+):(.*){", '' );
				match = l.match( beginningOfNodeExp );
				if ( match ) {

					var nodeName = match[ 1 ].trim().replace( /^"/, '' ).replace( /"$/, "" );
					var nodeAttrs = match[ 2 ].split( ',' ).map( function ( element ) {

						return element.trim().replace( /^"/, '' ).replace( /"$/, '' );

					} );

					this.parseNodeBegin( l, nodeName, nodeAttrs || null );
					continue;

				}

				// node's property
				var propExp = new RegExp( "^\\t{" + ( this.currentIndent ) + "}(\\w+):[\\s\\t\\r\\n](.*)" );
				match = l.match( propExp );
				if ( match ) {

					var propName = match[ 1 ].replace( /^"/, '' ).replace( /"$/, "" ).trim();
					var propValue = match[ 2 ].replace( /^"/, '' ).replace( /"$/, "" ).trim();

					this.parseNodeProperty( l, propName, propValue );
					continue;

				}

				// end of node
				var endOfNodeExp = new RegExp( "^\\t{" + ( this.currentIndent - 1 ) + "}}" );
				if ( l.match( endOfNodeExp ) ) {

					this.nodeEnd();
					continue;

				}

				// for special case,
				//
				//	  Vertices: *8670 {
				//		  a: 0.0356229953467846,13.9599733352661,-0.399196773.....(snip)
				// -0.0612030513584614,13.960485458374,-0.409748703241348,-0.10.....
				// 0.12490539252758,13.7450733184814,-0.454119384288788,0.09272.....
				// 0.0836158767342567,13.5432004928589,-0.435397416353226,0.028.....
				//
				// these case the lines must contiue with previous line
				if ( l.match( /^[^\s\t}]/ ) ) {

					this.parseNodePropertyContinued( l );

				}

			}

			return this.allNodes;

		},

		parseNodeBegin: function ( line, nodeName, nodeAttrs ) {

			// var nodeName = match[1];
			var node = { 'name': nodeName, properties: {}, 'subNodes': {} };
			var attrs = this.parseNodeAttr( nodeAttrs );
			var currentNode = this.getCurrentNode();

			// a top node
			if ( this.currentIndent === 0 ) {

				this.allNodes.add( nodeName, node );

			} else {

				// a subnode

				// already exists subnode, then append it
				if ( nodeName in currentNode.subNodes ) {

					var tmp = currentNode.subNodes[ nodeName ];

					// console.log( "duped entry found\nkey: " + nodeName + "\nvalue: " + propValue );
					if ( this.isFlattenNode( currentNode.subNodes[ nodeName ] ) ) {


						if ( attrs.id === '' ) {

							currentNode.subNodes[ nodeName ] = [];
							currentNode.subNodes[ nodeName ].push( tmp );

						} else {

							currentNode.subNodes[ nodeName ] = {};
							currentNode.subNodes[ nodeName ][ tmp.id ] = tmp;

						}

					}

					if ( attrs.id === '' ) {

						currentNode.subNodes[ nodeName ].push( node );

					} else {

						currentNode.subNodes[ nodeName ][ attrs.id ] = node;

					}

				} else {

					currentNode.subNodes[ nodeName ] = node;

				}

			}

			// for this		  ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
			// NodeAttribute: 1001463072, "NodeAttribute::", "LimbNode" {
			if ( nodeAttrs ) {

				node.id = attrs.id;
				node.attrName = attrs.name;
				node.attrType = attrs.type;

			}

			this.pushStack( node );

		},

		parseNodeAttr: function ( attrs ) {

			var id = attrs[ 0 ];

			if ( attrs[ 0 ] !== "" ) {

				id = parseInt( attrs[ 0 ] );

				if ( isNaN( id ) ) {

					// PolygonVertexIndex: *16380 {
					id = attrs[ 0 ];

				}

			}

			var name;
			var type;
			if ( attrs.length > 1 ) {

				name = attrs[ 1 ].replace( /^(\w+)::/, '' );
				type = attrs[ 2 ];

			}

			return { id: id, name: name || '', type: type || '' };

		},

		parseNodeProperty: function ( line, propName, propValue ) {

			var currentNode = this.getCurrentNode();
			var parentName = currentNode.name;

			// special case parent node's is like "Properties70"
			// these chilren nodes must treat with careful
			if ( parentName !== undefined ) {

				var propMatch = parentName.match( /Properties(\d)+/ );
				if ( propMatch ) {

					this.parseNodeSpecialProperty( line, propName, propValue );
					return;

				}

			}

			// special case Connections
			if ( propName == 'C' ) {

				var connProps = propValue.split( ',' ).slice( 1 );
				var from = parseInt( connProps[ 0 ] );
				var to = parseInt( connProps[ 1 ] );

				var rest = propValue.split( ',' ).slice( 3 );

				propName = 'connections';
				propValue = [ from, to ];
				propValue = propValue.concat( rest );

				if ( currentNode.properties[ propName ] === undefined ) {

					currentNode.properties[ propName ] = [];

				}

			}

			// special case Connections
			if ( propName == 'Node' ) {

				var id = parseInt( propValue );
				currentNode.properties.id = id;
				currentNode.id = id;

			}

			// already exists in properties, then append this
			if ( propName in currentNode.properties ) {

				// console.log( "duped entry found\nkey: " + propName + "\nvalue: " + propValue );
				if ( Array.isArray( currentNode.properties[ propName ] ) ) {

					currentNode.properties[ propName ].push( propValue );

				} else {

					currentNode.properties[ propName ] += propValue;

				}

			} else {

				// console.log( propName + ":  " + propValue );
				if ( Array.isArray( currentNode.properties[ propName ] ) ) {

					currentNode.properties[ propName ].push( propValue );

				} else {

					currentNode.properties[ propName ] = propValue;

				}

			}

			this.setCurrentProp( currentNode.properties, propName );

		},

		// TODO:
		parseNodePropertyContinued: function ( line ) {

			this.currentProp[ this.currentPropName ] += line;

		},

		parseNodeSpecialProperty: function ( line, propName, propValue ) {

			// split this
			// P: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1
			// into array like below
			// ["Lcl Scaling", "Lcl Scaling", "", "A", "1,1,1" ]
			var props = propValue.split( '",' ).map( function ( element ) {

				return element.trim().replace( /^\"/, '' ).replace( /\s/, '_' );

			} );

			var innerPropName = props[ 0 ];
			var innerPropType1 = props[ 1 ];
			var innerPropType2 = props[ 2 ];
			var innerPropFlag = props[ 3 ];
			var innerPropValue = props[ 4 ];

			/*
			if ( innerPropValue === undefined ) {
				innerPropValue = props[3];
			}
			*/

			// cast value in its type
			switch ( innerPropType1 ) {

				case "int":
					innerPropValue = parseInt( innerPropValue );
					break;

				case "double":
					innerPropValue = parseFloat( innerPropValue );
					break;

				case "ColorRGB":
				case "Vector3D":
					var tmp = innerPropValue.split( ',' );
					innerPropValue = new THREE.Vector3( tmp[ 0 ], tmp[ 1 ], tmp[ 2 ] );
					break;

			}

			// CAUTION: these props must append to parent's parent
			this.getPrevNode().properties[ innerPropName ] = {

				'type': innerPropType1,
				'type2': innerPropType2,
				'flag': innerPropFlag,
				'value': innerPropValue

			};

			this.setCurrentProp( this.getPrevNode().properties, innerPropName );

		},

		nodeEnd: function ( line ) {

			this.popStack();

		},

		/* ---------------------------------------------------------------- */
		/*		util													  */
		isFlattenNode: function ( node ) {

			return ( 'subNodes' in node && 'properties' in node ) ? true : false;

		}

	};

	function FBXAnalyzer() {}

	FBXAnalyzer.prototype = {

	};


	// generate skinIndices, skinWeights
	//	  @skinIndices: per vertex data, this represents the bone indexes affects that vertex
	//	  @skinWeights: per vertex data, this represents the Weight Values affects that vertex
	//	  @matrices:	per `bones` data
	function Weights() {

		this.skinIndices = [];
		this.skinWeights = [];

		this.matrices	= [];

	}


	Weights.prototype.parseCluster = function ( node, id, entry ) {

		var _p = node.searchConnectionParent( id );
		var _indices = toInt( entry.subNodes.Indexes.properties.a.split( ',' ) );
		var _weights = toFloat( entry.subNodes.Weights.properties.a.split( ',' ) );
		var _transform = toMat44( toFloat( entry.subNodes.Transform.properties.a.split( ',' ) ) );
		var _link = toMat44( toFloat( entry.subNodes.TransformLink.properties.a.split( ',' ) ) );

		return {

			'parent': _p,
			'id': parseInt( id ),
			'indices': _indices,
			'weights': _weights,
			'transform': _transform,
			'transformlink': _link,
			'linkMode': entry.properties.Mode

		};

	};

	Weights.prototype.parse = function ( node, bones ) {

		this.skinIndices = [];
		this.skinWeights = [];

		this.matrices = [];

		var deformers = node.Objects.subNodes.Deformer;

		var clusters = {};
		for ( var id in deformers ) {

			if ( deformers[ id ].attrType === 'Cluster' ) {

				if ( ! ( 'Indexes' in deformers[ id ].subNodes ) ) {

					continue;

				}

				//clusters.push( this.parseCluster( node, id, deformers[id] ) );
				var cluster = this.parseCluster( node, id, deformers[ id ] );
				var boneId = node.searchConnectionChildren( cluster.id )[ 0 ];
				clusters[ boneId ] = cluster;

			}

		}


		// this clusters is per Bone data, thus we make this into per vertex data
		var weights = [];
		var hi = bones.hierarchy;
		for ( var b = 0; b < hi.length; ++ b ) {

			var bid = hi[ b ].internalId;
			if ( clusters[ bid ] === undefined ) {

				//console.log( bid );
				this.matrices.push( new THREE.Matrix4() );
				continue;

			}

			var clst = clusters[ bid ];
			// store transform matrix per bones
			this.matrices.push( clst.transform );
			//this.matrices.push( clst.transformlink );
			for ( var v = 0; v < clst.indices.length; ++ v ) {

				if ( weights[ clst.indices[ v ] ] === undefined ) {

					weights[ clst.indices[ v ] ] = {};
					weights[ clst.indices[ v ] ].joint = [];
					weights[ clst.indices[ v ] ].weight = [];

				}

				// indices
				var affect = node.searchConnectionChildren( clst.id );

				if ( affect.length > 1 ) {

					console.warn( "FBXLoader: node " + clst.id + " have many weight kids: " + affect );

				}
				weights[ clst.indices[ v ] ].joint.push( bones.getBoneIdfromInternalId( node, affect[ 0 ] ) );

				// weight value
				weights[ clst.indices[ v ] ].weight.push( clst.weights[ v ] );

			}

		}

		// normalize the skin weights
		// TODO -  this might be a good place to choose greatest 4 weights
		for ( var i = 0; i < weights.length; i ++ ) {

			var indicies = new THREE.Vector4(
				weights[ i ].joint[ 0 ] ? weights[ i ].joint[ 0 ] : 0,
				weights[ i ].joint[ 1 ] ? weights[ i ].joint[ 1 ] : 0,
				weights[ i ].joint[ 2 ] ? weights[ i ].joint[ 2 ] : 0,
				weights[ i ].joint[ 3 ] ? weights[ i ].joint[ 3 ] : 0 );

			var weight = new THREE.Vector4(
				weights[ i ].weight[ 0 ] ? weights[ i ].weight[ 0 ] : 0,
				weights[ i ].weight[ 1 ] ? weights[ i ].weight[ 1 ] : 0,
				weights[ i ].weight[ 2 ] ? weights[ i ].weight[ 2 ] : 0,
				weights[ i ].weight[ 3 ] ? weights[ i ].weight[ 3 ] : 0 );

			this.skinIndices.push( indicies );
			this.skinWeights.push( weight );

		}

		//console.log( this );
		return this;

	};

	function Bones() {

		// returns bones hierarchy tree.
		//	  [
		//		  {
		//			  "parent": id,
		//			  "name": name,
		//			  "pos": pos,
		//			  "rotq": quat
		//		  },
		//		  ...
		//		  {},
		//		  ...
		//	  ]
		//
		/* sample response

		   "bones" : [
			{"parent":-1, "name":"Fbx01",			"pos":[-0.002,	 98.739,   1.6e-05],	 "rotq":[0, 0, 0, 1]},
			{"parent":0,  "name":"Fbx01_Pelvis",	 "pos":[0.00015963, 0,		7.33107e-08], "rotq":[0, 0, 0, 1]},
			{"parent":1,  "name":"Fbx01_Spine",	  "pos":[6.577e-06,  10.216,   0.0106811],   "rotq":[0, 0, 0, 1]},
			{"parent":2,  "name":"Fbx01_R_Thigh",	"pos":[14.6537,	-10.216,  -0.00918758], "rotq":[0, 0, 0, 1]},
			{"parent":3,  "name":"Fbx01_R_Calf",	 "pos":[-3.70047,	 -42.9681,	 -7.78158],	 "rotq":[0, 0, 0, 1]},
			{"parent":4,  "name":"Fbx01_R_Foot",	 "pos":[-2.0696,	  -46.0488,	 9.42052],	  "rotq":[0, 0, 0, 1]},
			{"parent":5,  "name":"Fbx01_R_Toe0",	 "pos":[-0.0234785,   -9.46233,	 -15.3187],	 "rotq":[0, 0, 0, 1]},
			{"parent":2,  "name":"Fbx01_L_Thigh",	"pos":[-14.6537,	 -10.216,	  -0.00918314],  "rotq":[0, 0, 0, 1]},
			{"parent":7,  "name":"Fbx01_L_Calf",	 "pos":[3.70037,	  -42.968,	  -7.78155],	 "rotq":[0, 0, 0, 1]},
			{"parent":8,  "name":"Fbx01_L_Foot",	 "pos":[2.06954,	  -46.0488,	 9.42052],	  "rotq":[0, 0, 0, 1]},
			{"parent":9,  "name":"Fbx01_L_Toe0",	 "pos":[0.0234566,	-9.46235,	 -15.3187],	 "rotq":[0, 0, 0, 1]},
			{"parent":2,  "name":"Fbx01_Spine1",	 "pos":[-2.97523e-05, 11.5892,	  -9.81027e-05], "rotq":[0, 0, 0, 1]},
			{"parent":11, "name":"Fbx01_Spine2",	 "pos":[-2.91292e-05, 11.4685,	  8.27126e-05],  "rotq":[0, 0, 0, 1]},
			{"parent":12, "name":"Fbx01_Spine3",	 "pos":[-4.48857e-05, 11.5783,	  8.35108e-05],  "rotq":[0, 0, 0, 1]},
			{"parent":13, "name":"Fbx01_Neck",	   "pos":[1.22987e-05,  11.5582,	  -0.0044775],   "rotq":[0, 0, 0, 1]},
			{"parent":14, "name":"Fbx01_Head",	   "pos":[-3.50709e-05, 6.62915,	  -0.00523254],  "rotq":[0, 0, 0, 1]},
			{"parent":15, "name":"Fbx01_R_Eye",	  "pos":[3.31681,	  12.739,	   -10.5267],	 "rotq":[0, 0, 0, 1]},
			{"parent":15, "name":"Fbx01_L_Eye",	  "pos":[-3.32038,	 12.7391,	  -10.5267],	 "rotq":[0, 0, 0, 1]},
			{"parent":15, "name":"Jaw",			  "pos":[-0.0017738,   7.43481,	  -4.08114],	 "rotq":[0, 0, 0, 1]},
			{"parent":14, "name":"Fbx01_R_Clavicle", "pos":[3.10919,	  2.46577,	  -0.0115284],   "rotq":[0, 0, 0, 1]},
			{"parent":19, "name":"Fbx01_R_UpperArm", "pos":[16.014,	   4.57764e-05,  3.10405],	  "rotq":[0, 0, 0, 1]},
			{"parent":20, "name":"Fbx01_R_Forearm",  "pos":[22.7068,	  -1.66322,	 -2.13803],	 "rotq":[0, 0, 0, 1]},
			{"parent":21, "name":"Fbx01_R_Hand",	 "pos":[25.5881,	  -0.80249,	 -6.37307],	 "rotq":[0, 0, 0, 1]},
			...
			{"parent":27, "name":"Fbx01_R_Finger32", "pos":[2.15572,	  -0.548737,	-0.539604],	"rotq":[0, 0, 0, 1]},
			{"parent":22, "name":"Fbx01_R_Finger2",  "pos":[9.79318,	  0.132553,	 -2.97845],	 "rotq":[0, 0, 0, 1]},
			{"parent":29, "name":"Fbx01_R_Finger21", "pos":[2.74037,	  0.0483093,	-0.650531],	"rotq":[0, 0, 0, 1]},
			{"parent":55, "name":"Fbx01_L_Finger02", "pos":[-1.65308,	 -1.43208,	 -1.82885],	 "rotq":[0, 0, 0, 1]}
			]
		*/
		this.hierarchy = [];

	}

	Bones.prototype.parseHierarchy = function ( node ) {

		var objects = node.Objects;
		var models = objects.subNodes.Model;

		var bones = [];
		for ( var id in models ) {

			if ( models[ id ].attrType === undefined ) {

				continue;

			}
			bones.push( models[ id ] );

		}

		this.hierarchy = [];
		for ( var i = 0; i < bones.length; ++ i ) {

			var bone = bones[ i ];

			var p = node.searchConnectionParent( bone.id )[ 0 ];
			var t = [ 0.0, 0.0, 0.0 ];
			var r = [ 0.0, 0.0, 0.0, 1.0 ];
			var s = [ 1.0, 1.0, 1.0 ];

			if ( 'Lcl_Translation' in bone.properties ) {

				t = toFloat( bone.properties.Lcl_Translation.value.split( ',' ) );

			}

			if ( 'Lcl_Rotation' in bone.properties ) {

				r = toRad( toFloat( bone.properties.Lcl_Rotation.value.split( ',' ) ) );
				var q = new THREE.Quaternion();
				q.setFromEuler( new THREE.Euler( r[ 0 ], r[ 1 ], r[ 2 ], 'ZYX' ) );
				r = [ q.x, q.y, q.z, q.w ];

			}

			if ( 'Lcl_Scaling' in bone.properties ) {

				s = toFloat( bone.properties.Lcl_Scaling.value.split( ',' ) );

			}

			// replace unsafe character
			var name = bone.attrName;
			name = name.replace( /:/, '' );
			name = name.replace( /_/, '' );
			name = name.replace( /-/, '' );
			this.hierarchy.push( { "parent": p, "name": name, "pos": t, "rotq": r, "scl": s, "internalId": bone.id } );

		}

		this.reindexParentId();

		//this.restoreBindPose( node );

		return this;

	};

	Bones.prototype.reindexParentId = function () {

		for ( var h = 0; h < this.hierarchy.length; h ++ ) {

			for ( var ii = 0; ii < this.hierarchy.length; ++ ii ) {

				if ( this.hierarchy[ h ].parent == this.hierarchy[ ii ].internalId ) {

					this.hierarchy[ h ].parent = ii;
					break;

				}

			}

		}

	};

	Bones.prototype.restoreBindPose = function ( node ) {

		var bindPoseNode = node.Objects.subNodes.Pose;
		if ( bindPoseNode === undefined ) {

			return;

		}

		var poseNode = bindPoseNode.subNodes.PoseNode;
		var localMatrices = {}; // store local matrices, modified later( initialy world space )
		var worldMatrices = {}; // store world matrices

		for ( var i = 0; i < poseNode.length; ++ i ) {

			var rawMatLcl = toMat44( poseNode[ i ].subNodes.Matrix.properties.a.split( ',' ) );
			var rawMatWrd = toMat44( poseNode[ i ].subNodes.Matrix.properties.a.split( ',' ) );

			localMatrices[ poseNode[ i ].id ] = rawMatLcl;
			worldMatrices[ poseNode[ i ].id ] = rawMatWrd;

		}

		for ( var h = 0; h < this.hierarchy.length; ++ h ) {

			var bone = this.hierarchy[ h ];
			var inId = bone.internalId;

			if ( worldMatrices[ inId ] === undefined ) {

				// has no bind pose node, possibly be mesh
				// console.log( bone );
				continue;

			}

			var t = new THREE.Vector3( 0, 0, 0 );
			var r = new THREE.Quaternion();
			var s = new THREE.Vector3( 1, 1, 1 );

			var parentId;
			var parentNodes = node.searchConnectionParent( inId );
			for ( var pn = 0; pn < parentNodes.length; ++ pn ) {

				if ( this.isBoneNode( parentNodes[ pn ] ) ) {

					parentId = parentNodes[ pn ];
					break;

				}

			}

			if ( parentId !== undefined && localMatrices[ parentId ] !== undefined ) {

				// convert world space matrix into local space
				var inv = new THREE.Matrix4();
				inv.getInverse( worldMatrices[ parentId ] );
				inv.multiply( localMatrices[ inId ] );
				localMatrices[ inId ] = inv;

			} else {
				//console.log( bone );
			}

			localMatrices[ inId ].decompose( t, r, s );
			bone.pos = [ t.x, t.y, t.z ];
			bone.rotq = [ r.x, r.y, r.z, r.w ];
			bone.scl = [ s.x, s.y, s.z ];

		}

	};

	Bones.prototype.searchRealId = function ( internalId ) {

		for ( var h = 0; h < this.hierarchy.length; h ++ ) {

			if ( internalId == this.hierarchy[ h ].internalId ) {

				return h;

			}

		}

		// console.warn( 'FBXLoader: notfound internalId in bones: ' + internalId);
		return - 1;

	};

	Bones.prototype.getByInternalId = function ( internalId ) {

		for ( var h = 0; h < this.hierarchy.length; h ++ ) {

			if ( internalId == this.hierarchy[ h ].internalId ) {

				return this.hierarchy[ h ];

			}

		}

		return null;

	};

	Bones.prototype.isBoneNode = function ( id ) {

		for ( var i = 0; i < this.hierarchy.length; ++ i ) {

			if ( id === this.hierarchy[ i ].internalId ) {

				return true;

			}

		}
		return false;

	};

	Bones.prototype.getBoneIdfromInternalId = function ( node, id ) {

		if ( node.__cache_get_boneid_from_internalid === undefined ) {

			node.__cache_get_boneid_from_internalid = [];

		}

		if ( node.__cache_get_boneid_from_internalid[ id ] !== undefined ) {

			return node.__cache_get_boneid_from_internalid[ id ];

		}

		for ( var i = 0; i < this.hierarchy.length; ++ i ) {

			if ( this.hierarchy[ i ].internalId == id ) {

				var res = i;
				node.__cache_get_boneid_from_internalid[ id ] = i;
				return i;

			}

		}

		// console.warn( 'FBXLoader: bone internalId(' + id + ') not found in bone hierarchy' );
		return - 1;

	};


	function Geometry() {

		this.node = null;
		this.name = null;
		this.id = null;

		this.vertices = [];
		this.indices = [];
		this.normals = [];
		this.uvs = [];
		this.colors = [];

		this.bones = [];
		this.skins = null;

	}

	Geometry.prototype.parse = function ( geoNode ) {

		this.node = geoNode;
		this.name = geoNode.attrName;
		this.id = geoNode.id;

		this.vertices = this.getVertices();

		if ( this.vertices === undefined ) {

			console.log( 'FBXLoader: Geometry.parse(): pass' + this.node.id );
			return;

		}

		this.indices = this.getPolygonVertexIndices();
		this.uvs = ( new UV() ).parse( this.node, this );
		this.normals = ( new Normal() ).parse( this.node, this );
		this.colors = ( new Color() ).parse(this.node, this );

		if ( this.getPolygonTopologyMax() > 3 ) {

			this.indices = this.convertPolyIndicesToTri(
								this.indices, this.getPolygonTopologyArray() );

		}

		return this;

	};


	Geometry.prototype.getVertices = function () {

		if ( this.node.__cache_vertices ) {

			return this.node.__cache_vertices;

		}

		if ( this.node.subNodes.Vertices === undefined ) {

			console.warn( 'this.node: ' + this.node.attrName + "(" + this.node.id + ") does not have Vertices" );
			this.node.__cache_vertices = undefined;
			return null;

		}

		var rawTextVert	= this.node.subNodes.Vertices.properties.a;
		var vertices = rawTextVert.split( ',' ).map( function ( element ) {

			return parseFloat( element );

		} );

		this.node.__cache_vertices = vertices;
		return this.node.__cache_vertices;

	};

	Geometry.prototype.getPolygonVertexIndices = function () {

		if ( this.node.__cache_indices && this.node.__cache_poly_topology_max ) {

			return this.node.__cache_indices;

		}

		if ( this.node.subNodes === undefined ) {

			console.error( 'this.node.subNodes undefined' );
			console.log( this.node );
			return;

		}

		if ( this.node.subNodes.PolygonVertexIndex === undefined ) {

			console.warn( 'this.node: ' + this.node.attrName + "(" + this.node.id + ") does not have PolygonVertexIndex " );
			this.node.__cache_indices = undefined;
			return;

		}

		var rawTextIndices = this.node.subNodes.PolygonVertexIndex.properties.a;
		var indices = rawTextIndices.split( ',' );

		var currentTopo = 1;
		var topologyN = null;
		var topologyArr = [];

		// The indices that make up the polygon are in order and a negative index
		// means that it’s the last index of the polygon. That index needs
		// to be made positive and then you have to subtract 1 from it!
		for ( var i = 0; i < indices.length; ++ i ) {

			var tmpI = parseInt( indices[ i ] );
			// found n
			if ( tmpI < 0 ) {

				if ( currentTopo > topologyN ) {

					topologyN = currentTopo;

				}

				indices[ i ] = tmpI ^ - 1;
				topologyArr.push( currentTopo );
				currentTopo = 1;

			} else {

				indices[ i ] = tmpI;
				currentTopo ++;

			}

		}

		if ( topologyN === null ) {

			console.warn( "FBXLoader: topology N not found: " + this.node.attrName );
			console.warn( this.node );
			topologyN = 3;

		}

		this.node.__cache_poly_topology_max = topologyN;
		this.node.__cache_poly_topology_arr = topologyArr;
		this.node.__cache_indices = indices;

		return this.node.__cache_indices;

	};

	Geometry.prototype.getPolygonTopologyMax = function () {

		if ( this.node.__cache_indices && this.node.__cache_poly_topology_max ) {

			return this.node.__cache_poly_topology_max;

		}

		this.getPolygonVertexIndices( this.node );
		return this.node.__cache_poly_topology_max;

	};

	Geometry.prototype.getPolygonTopologyArray = function () {

		if ( this.node.__cache_indices && this.node.__cache_poly_topology_max ) {

			return this.node.__cache_poly_topology_arr;

		}

		this.getPolygonVertexIndices( this.node );
		return this.node.__cache_poly_topology_arr;

	};

	// a - d
	// |   |
	// b - c
	//
	// [( a, b, c, d ) ...........
	// [( a, b, c ), (a, c, d )....
	Geometry.prototype.convertPolyIndicesToTri = function ( indices, strides ) {

		var res = [];

		var i = 0;
		var tmp = [];
		var currentPolyNum = 0;
		var currentStride = 0;

		while ( i < indices.length ) {

			currentStride = strides[ currentPolyNum ];

			// CAUTIN: NG over 6gon
			for ( var j = 0; j <= ( currentStride - 3 ); j ++ ) {

				res.push( indices[ i ] );
				res.push( indices[ i + ( currentStride - 2 - j ) ] );
				res.push( indices[ i + ( currentStride - 1 - j ) ] );

			}

			currentPolyNum ++;
			i += currentStride;

		}

		return res;

	};

	Geometry.prototype.addBones = function ( bones ) {

		this.bones = bones;

	};


	function UV() {

		this.uv = null;
		this.map = null;
		this.ref = null;
		this.node = null;
		this.index = null;

	}

	UV.prototype.getUV = function ( node ) {

		if ( this.node && this.uv && this.map && this.ref ) {

			return this.uv;

		} else {

			return this._parseText( node );

		}

	};

	UV.prototype.getMap = function ( node ) {

		if ( this.node && this.uv && this.map && this.ref ) {

			return this.map;

		} else {

			this._parseText( node );
			return this.map;

		}

	};

	UV.prototype.getRef = function ( node ) {

		if ( this.node && this.uv && this.map && this.ref ) {

			return this.ref;

		} else {

			this._parseText( node );
			return this.ref;

		}

	};

	UV.prototype.getIndex = function ( node ) {

		if ( this.node && this.uv && this.map && this.ref ) {

			return this.index;

		} else {

			this._parseText( node );
			return this.index;

		}

	};

	UV.prototype.getNode = function ( topnode ) {

		if ( this.node !== null ) {

			return this.node;

		}

		this.node = topnode.subNodes.LayerElementUV;
		return this.node;

	};

	UV.prototype._parseText = function ( node ) {

		var uvNode = this.getNode( node );
		if ( uvNode === undefined ) {

			// console.log( node.attrName + "(" + node.id + ")" + " has no LayerElementUV." );
			return [];

		}

		var count = 0;
		var x = '';
		for ( var n in uvNode ) {

			if ( n.match( /^\d+$/ ) ) {

				count ++;
				x = n;

			}

		}

		if ( count > 0 ) {

			console.warn( 'multi uv not supported' );
			uvNode = uvNode[ n ];

		}

		this.index = false;
		if (uvNode.subNodes.UVIndex)
		{
			this.index = toInt( uvNode.subNodes.UVIndex.properties.a.split( ',' ) );
		}
		
		var uvs = uvNode.subNodes.UV.properties.a;
		var uvMap = uvNode.properties.MappingInformationType;
		var uvRef = uvNode.properties.ReferenceInformationType;

		this.uv	= toFloat( uvs.split( ',' ) );

		this.map = uvMap; // TODO: normalize notation shaking... FOR BLENDER
		this.ref = uvRef;

		return this.uv;

	};

	UV.prototype.parse = function ( node, geo ) {

		this.uvNode = this.getNode( node );

		this.uv = this.getUV( node );
		var mappingType = this.getMap( node );
		var refType = this.getRef( node );
		var indices = this.getIndex( node );
		
		var strides = geo.getPolygonTopologyArray();

		// it means that there is a normal for every vertex of every polygon of the model.
		// For example, if the models has 8 vertices that make up four quads, then there
		// will be 16 normals (one normal * 4 polygons * 4 vertices of the polygon). Note
		// that generally a game engine needs the vertices to have only one normal defined.
		// So, if you find a vertex has more tha one normal, you can either ignore the normals
		// you find after the first, or calculate the mean from all of them (normal smoothing).
		//if ( mappingType == "ByPolygonVertex" ){
		switch ( mappingType ) {

			case "ByPolygonVertex":

				switch ( refType ) {

					// Direct
					// The this.uv are in order.
					case "Direct":
						this.uv = this.parseUV_ByPolygonVertex_Direct( this.uv, indices, strides, 2 );
						break;

					// IndexToDirect
					// The order of the this.uv is given by the uvsIndex property.
					case "IndexToDirect":
						this.uv = this.parseUV_ByPolygonVertex_IndexToDirect( this.uv, indices );
						break;

				}

				// convert from by polygon(vert) data into by verts data
				this.uv = mapByPolygonVertexToByVertex( this.uv, geo.getPolygonVertexIndices( node ), 2 );
				break;

			case "ByPolygon":

				switch ( refType ) {

					// Direct
					// The this.uv are in order.
					case "Direct":
						this.uv = this.parseUV_ByPolygon_Direct();
						break;

					// IndexToDirect
					// The order of the this.uv is given by the uvsIndex property.
					case "IndexToDirect":
						this.uv = this.parseUV_ByPolygon_IndexToDirect();
						break;

				}
				break;
		}

		return this.uv;

	};

	UV.prototype.parseUV_ByPolygonVertex_Direct = function ( node, indices, strides, itemSize ) {

		return parse_Data_ByPolygonVertex_Direct( node, indices, strides, itemSize );

	};

	UV.prototype.parseUV_ByPolygonVertex_IndexToDirect = function ( node, indices ) {

		return parse_Data_ByPolygonVertex_IndexToDirect( node, indices, 2 );

	};

	UV.prototype.parseUV_ByPolygon_Direct = function ( node ) {

		console.warn( "not implemented" );
		return node;

	};

	UV.prototype.parseUV_ByPolygon_IndexToDirect = function ( node ) {

		console.warn( "not implemented" );
		return node;

	};

	UV.prototype.parseUV_ByVertex_Direct = function ( node ) {

		console.warn( "not implemented" );
		return node;

	};


	function Normal() {

		this.normal = null;
		this.map	= null;
		this.ref	= null;
		this.node = null;
		this.index = null;

	}

	Normal.prototype.getNormal = function ( node ) {

		if ( this.node && this.normal && this.map && this.ref ) {

			return this.normal;

		} else {

			this._parseText( node );
			return this.normal;

		}

	};

	// mappingType: possible variant
	//	  ByPolygon
	//	  ByPolygonVertex
	//	  ByVertex (or also ByVertice, as the Blender exporter writes)
	//	  ByEdge
	//	  AllSame
	//	var mappingType = node.properties.MappingInformationType;
	Normal.prototype.getMap = function ( node ) {

		if ( this.node && this.normal && this.map && this.ref ) {

			return this.map;

		} else {

			this._parseText( node );
			return this.map;

		}

	};

	// refType: possible variants
	//	  Direct
	//	  IndexToDirect (or Index for older versions)
	// var refType	 = node.properties.ReferenceInformationType;
	Normal.prototype.getRef = function ( node ) {

		if ( this.node && this.normal && this.map && this.ref ) {

			return this.ref;

		} else {

			this._parseText( node );
			return this.ref;

		}

	};

	Normal.prototype.getNode = function ( node ) {

		if ( this.node ) {

			return this.node;

		}

		this.node = node.subNodes.LayerElementNormal;
		return this.node;

	};

	Normal.prototype._parseText = function ( node ) {

		var normalNode = this.getNode( node );

		if ( normalNode === undefined ) {

			console.warn( 'node: ' + node.attrName + "(" + node.id + ") does not have LayerElementNormal" );
			return;

		}

		var mappingType = normalNode.properties.MappingInformationType;
		var refType = normalNode.properties.ReferenceInformationType;

		var rawTextNormals = normalNode.subNodes.Normals.properties.a;
		this.normal = toFloat( rawTextNormals.split( ',' ) );

		// TODO: normalize notation shaking, vertex / vertice... blender...
		this.map	= mappingType;
		this.ref	= refType;

	};

	Normal.prototype.parse = function ( topnode, geo ) {

		var normals = this.getNormal( topnode );
		var normalNode = this.getNode( topnode );
		var mappingType = this.getMap( topnode );
		var refType = this.getRef( topnode );

		var indices = geo.getPolygonVertexIndices( topnode );
		var strides = geo.getPolygonTopologyArray( topnode );

		// it means that there is a normal for every vertex of every polygon of the model.
		// For example, if the models has 8 vertices that make up four quads, then there
		// will be 16 normals (one normal * 4 polygons * 4 vertices of the polygon). Note
		// that generally a game engine needs the vertices to have only one normal defined.
		// So, if you find a vertex has more tha one normal, you can either ignore the normals
		// you find after the first, or calculate the mean from all of them (normal smoothing).
		//if ( mappingType == "ByPolygonVertex" ){
		switch ( mappingType ) {

			case "ByPolygonVertex":

				switch ( refType ) {

					// Direct
					// The normals are in order.
					case "Direct":
						normals = this.parseNormal_ByPolygonVertex_Direct( normals, indices, strides, 3 );
						break;

					// IndexToDirect
					// The order of the normals is given by the NormalsIndex property.
					case "IndexToDirect":
						normals = this.parseNormal_ByPolygonVertex_IndexToDirect();
						break;

				}
				break;

			case "ByPolygon":

				switch ( refType ) {

					// Direct
					// The normals are in order.
					case "Direct":
						normals = this.parseNormal_ByPolygon_Direct();
						break;

					// IndexToDirect
					// The order of the normals is given by the NormalsIndex property.
					case "IndexToDirect":
						normals = this.parseNormal_ByPolygon_IndexToDirect();
						break;

				}
				break;
		}

		return normals;

	};

	Normal.prototype.parseNormal_ByPolygonVertex_Direct = function ( node, indices, strides, itemSize ) {

		return parse_Data_ByPolygonVertex_Direct( node, indices, strides, itemSize );

	};

	Normal.prototype.parseNormal_ByPolygonVertex_IndexToDirect = function ( node ) {

		console.warn( "not implemented" );
		return node;

	};

	Normal.prototype.parseNormal_ByPolygon_Direct = function ( node ) {

		console.warn( "not implemented" );
		return node;

	};

	Normal.prototype.parseNormal_ByPolygon_IndexToDirect = function ( node ) {

		console.warn( "not implemented" );
		return node;

	};

	Normal.prototype.parseNormal_ByVertex_Direct = function ( node ) {

		console.warn( "not implemented" );
		return node;

	};
	
		function Color() {

		this.color = null;
		this.map = null;
		this.ref = null;
		this.node = null;
		this.index = null;

	}

	Color.prototype.getColor = function ( node ) {

		if ( this.node && this.color && this.map && this.ref ) {

			return this.color;

		} else {

			return this._parseText( node );

		}

	};

	Color.prototype.getMap = function ( node ) {

		if ( this.node && this.color && this.map && this.ref ) {

			return this.map;

		} else {

			this._parseText( node );
			return this.map;

		}

	};

	Color.prototype.getRef = function ( node ) {

		if ( this.node && this.color && this.map && this.ref ) {

			return this.ref;

		} else {

			this._parseText( node );
			return this.ref;

		}

	};

	Color.prototype.getIndex = function ( node ) {

		if ( this.node && this.color && this.map && this.ref ) {

			return this.index;

		} else {

			this._parseText( node );
			return this.index;

		}

	};

	Color.prototype.getNode = function ( topnode ) {

		if ( this.node !== null ) {

			return this.node;

		}

		this.node = topnode.subNodes.LayerElementColor;
		return this.node;

	};

	Color.prototype._parseText = function ( node ) {

		var colorNode = this.getNode( node );
		if ( colorNode === undefined ) {

			// console.log( node.attrName + "(" + node.id + ")" + " has no LayerElementColor." );
			return [];

		}

		var count = 0;
		var x = '';
		for ( var n in colorNode ) {

			if ( n.match( /^\d+$/ ) ) {

				count ++;
				x = n;

			}

		}

		if ( count > 0 ) {

			console.warn( 'multi color not supported' );
			colorNode = colorNode[ n ];

		}
		
		this.index = false;
		if (colorNode.subNodes.ColorIndex)
		{
			this.index = toInt( colorNode.subNodes.ColorIndex.properties.a.split( ',' ) );
		}

		var colors = colorNode.subNodes.Colors.properties.a;
		var colorMap = colorNode.properties.MappingInformationType;
		var colorRef = colorNode.properties.ReferenceInformationType;
		
		this.color	= toFloat( colors.split( ',' ) );

		this.map = colorMap; // TODO: normalize notation shaking... FOR BLENDER
		this.ref = colorRef;

		return this.color;

	};

	Color.prototype.parse = function ( node, geo ) {

		this.colorNode = this.getNode( node );
	
		this.color = this.getColor( node );
		var mappingType = this.getMap( node );
		var refType = this.getRef( node );
		var indices = this.getIndex( node );
		
		var strides = geo.getPolygonTopologyArray();
		
		// it means that there is a normal for every vertex of every polygon of the model.
		// For example, if the models has 8 vertices that make up four quads, then there
		// will be 16 normals (one normal * 4 polygons * 4 vertices of the polygon). Note
		// that generally a game engine needs the vertices to have only one normal defined.
		// So, if you find a vertex has more tha one normal, you can either ignore the normals
		// you find after the first, or calculate the mean from all of them (normal smoothing).
		//if ( mappingType == "ByPolygonVertex" ){
		switch ( mappingType ) {

			case "ByPolygonVertex":

				switch ( refType ) {

					// Direct
					// The this.color are in order.
					case "Direct":
						this.color = this.parseColor_ByPolygonVertex_Direct( this.color, indices, strides, 3 );
						break;

					// IndexToDirect
					// The order of the this.color is given by the colorsIndex property.
					case "IndexToDirect":
						this.color = this.parseColor_ByPolygonVertex_IndexToDirect( this.color, indices );
						
						break;

				}

				// convert from by polygon(vert) data into by verts data
				this.color = mapByPolygonVertexToByVertex( this.color, geo.getPolygonVertexIndices( node ), 3 );
				break;

			case "ByPolygon":

				switch ( refType ) {

					// Direct
					// The this.color are in order.
					case "Direct":
						this.color = this.parseColor_ByPolygon_Direct();
						break;

					// IndexToDirect
					// The order of the this.color is given by the colorsIndex property.
					case "IndexToDirect":
						this.color = this.parseColor_ByPolygon_IndexToDirect();
						break;

				}
				break;
				
			case "ByVertice":

				switch ( refType ) {

					// Direct
					// The this.color are in order.
					case "Direct":
						this.color = this.parseColor_ByVertex_Direct(this.color, geo.getPolygonVertexIndices( node ), strides, 3);
						break;

					// IndexToDirect
					// The order of the this.color is given by the colorsIndex property.
					case "IndexToDirect":
						this.color = this.parseColor_ByVertex_Direct(this.color, geo.getPolygonVertexIndices( node ), strides, 3);
						
						break;

				}
				break;
		}

		return this.color;

	};

	Color.prototype.parseColor_ByPolygonVertex_Direct = function ( node, indices, strides, itemSize ) {

		return parse_Data_ByPolygonVertex_Direct( node, indices, strides, itemSize );

	};

	Color.prototype.parseColor_ByPolygonVertex_IndexToDirect = function ( node, indices ) {
		
		
		var res = [];
		console.log(node);
	
		for ( var i = 0; i < indices.length; ++ i ) 
		{
			var rgb = {};
			
			var r = node[ ( indices[ i ] * 4) ];
			var g = node[ ( indices[ i ] * 4) + 1 ];
			var b = node[ ( indices[ i ] * 4) + 2 ];
			var a = node[ ( indices[ i ] * 4) + 3 ];
		
			rgb.r = ((1 - a) * 1) + (a * r);
			rgb.g = ((1 - a) * 1) + (a * g);
			rgb.b = ((1 - a) * 1) + (a * b);
		
			res.push( rgb.r );
			res.push( rgb.g );
			res.push( rgb.b );
			
		}
	
		//console.log(colors);
		return res;
	};

	Color.prototype.parseColor_ByPolygon_Direct = function ( node ) {

		console.warn( "not implemented" );
		return node;

	};

	Color.prototype.parseColor_ByPolygon_IndexToDirect = function ( node ) {

		console.warn( "not implemented" );
		return node;

	};

	Color.prototype.parseColor_ByVertex_Direct = function ( node, indices, strides, itemSize ) {


		var colors = [];
		var j = 0;
		for ( var i = 0; i < node.length; i += 4 ) 
		{
			var rgb = {};
			
			var r = node[i];
			var g = node[i+1];
			var b = node[i+2];
			var a = node[i+3];
		
			rgb.r = ((1 - a) * 0) + (a * r);
			rgb.g = ((1 - a) * 0) + (a * g);
			rgb.b = ((1 - a) * 0) + (a * b);

			colors[ j ]     = rgb.r;
			colors[ j + 1]  = rgb.g;
			colors[ j + 2 ] = rgb.b;
			
			j += 3;
			
		}
		
		return colors;
	};
	
	

	function AnimationCurve() {

		this.version = null;

		this.id = null;
		this.internalId = null;
		this.times = null;
		this.values = null;

		this.attrFlag = null; // tangeant
		this.attrData = null; // slope, weight

	}

	AnimationCurve.prototype.fromNode = function ( curveNode ) {

		this.id = curveNode.id;
		this.internalId = curveNode.id;
		this.times = curveNode.subNodes.KeyTime.properties.a;
		this.values = curveNode.subNodes.KeyValueFloat.properties.a;

		this.attrFlag = curveNode.subNodes.KeyAttrFlags.properties.a;
		this.attrData = curveNode.subNodes.KeyAttrDataFloat.properties.a;

		this.times = toFloat( this.times.split(	',' ) );
		this.values = toFloat( this.values.split( ',' ) );
		this.attrData = toFloat( this.attrData.split( ',' ) );
		this.attrFlag = toInt( this.attrFlag.split( ',' ) );

		this.times = this.times.map( function ( element ) {

			return FBXTimeToSeconds( element );

		} );

		return this;

	};

	AnimationCurve.prototype.getLength = function () {

		return this.times[ this.times.length - 1 ];

	};

	function AnimationNode() {

		this.id = null;
		this.attr = null; // S, R, T
		this.attrX = false;
		this.attrY = false;
		this.attrZ = false;
		this.internalId = null;
		this.containerInternalId = null; // bone, null etc Id
		this.containerBoneId = null; // bone, null etc Id
		this.curveIdx = null; // AnimationCurve's indices
		this.curves = [];	// AnimationCurve refs

	}

	AnimationNode.prototype.fromNode = function ( allNodes, node, bones ) {

		this.id = node.id;
		this.attr = node.attrName;
		this.internalId = node.id;

		if ( this.attr.match( /S|R|T/ ) ) {

			for ( var attrKey in node.properties ) {

				if ( attrKey.match( /X/ ) ) {

					this.attrX = true;

				}
				if ( attrKey.match( /Y/ ) ) {

					this.attrY = true;

				}
				if ( attrKey.match( /Z/ ) ) {

					this.attrZ = true;

				}

			}

		} else {

			// may be deform percent nodes
			return null;

		}

		this.containerIndices = allNodes.searchConnectionParent( this.id );
		this.curveIdx	= allNodes.searchConnectionChildren( this.id );

		for ( var i = this.containerIndices.length - 1; i >= 0; -- i ) {

			var boneId = bones.searchRealId( this.containerIndices[ i ] );
			if ( boneId >= 0 ) {

				this.containerBoneId = boneId;
				this.containerId = this.containerIndices [ i ];

			}

			if ( boneId >= 0 ) {

				break;

			}

		}
		// this.containerBoneId = bones.searchRealId( this.containerIndices );

		return this;

	};

	AnimationNode.prototype.setCurve = function ( curve ) {

		this.curves.push( curve );

	};

	function Animation() {

		this.curves = {};
		this.length = 0.0;
		this.fps	= 30.0;
		this.frames = 0.0;

	}

	Animation.prototype.parse = function ( node, bones ) {

		var rawNodes = node.Objects.subNodes.AnimationCurveNode;
		var rawCurves = node.Objects.subNodes.AnimationCurve;

		// first: expand AnimationCurveNode into curve nodes
		var curveNodes = [];
		for ( var key in rawNodes ) {

			if ( key.match( /\d+/ ) ) {

				var a = ( new AnimationNode() ).fromNode( node, rawNodes[ key ], bones );
				curveNodes.push( a );

			}

		}

		// second: gen dict, mapped by internalId
		var tmp = {};
		for ( var i = 0; i < curveNodes.length; ++ i ) {

			if ( curveNodes[ i ] === null ) {

				continue;

			}

			tmp[ curveNodes[ i ].id ] = curveNodes[ i ];

		}

		// third: insert curves into the dict
		var ac = [];
		var max = 0.0;
		for ( key in rawCurves ) {

			if ( key.match( /\d+/ ) ) {

				var c = ( new AnimationCurve() ).fromNode( rawCurves[ key ] );
				ac.push( c );
				max = c.getLength() ? c.getLength() : max;

				var parentId = node.searchConnectionParent( c.id )[ 0 ];
				var axis = node.searchConnectionType( c.id, parentId );

				if ( axis.match( /X/ ) ) {

					axis = 'x';

				}
				if ( axis.match( /Y/ ) ) {

					axis = 'y';

				}
				if ( axis.match( /Z/ ) ) {

					axis = 'z';

				}

				if (tmp[ parentId ]){
					tmp[ parentId ].curves[ axis ] = c;
				}
				

			}

		}

		// forth:
		for ( var t in tmp ) {

			var id = tmp[ t ].containerBoneId;
			if ( this.curves[ id ] === undefined ) {

				this.curves[ id ] = {};

			}

			this.curves[ id ][ tmp[ t ].attr ] = tmp[ t ];

		}

		this.length = max;
		this.frames = this.length * this.fps;

		return this;

	};


	function Textures() {

		this.textures = [];
		this.perGeoMap = {};

	}

	Textures.prototype.add = function ( tex ) {

		if ( this.textures === undefined ) {

			this.textures = [];

		}

		this.textures.push( tex );

		for ( var i = 0; i < tex.parentIds.length; ++ i ) {

			if ( this.perGeoMap[ tex.parentIds[ i ] ] === undefined ) {

				this.perGeoMap[ tex.parentIds[ i ] ] = [];

			}

			this.perGeoMap[ tex.parentIds[ i ] ].push( this.textures[ this.textures.length - 1 ] );

		}

	};

	Textures.prototype.parse = function ( node, bones ) {

		var rawNodes = node.Objects.subNodes.Texture;

		var tex = ( new Texture() ).parse( rawNodes, node);
		this.add( tex );
	
		return this;

	};

	Textures.prototype.getById = function ( id ) {

		return this.perGeoMap[ id ];

	};

	function Texture() {

		this.fileName = "";
		this.name = "";
		this.id = null;
		this.parentIds = [];

	}

	Texture.prototype.parse = function ( node, nodes ) {

		this.id = node.id;
		this.name = node.attrName;

	//	this.fileName = this.parseFileName(node.properties.FileName);

		this.parentIds = this.searchParents( this.id, nodes );

		return this;

	};

	// TODO: support directory
	Texture.prototype.parseFileName = function ( fname ) {

		if ( fname === undefined ) {

			return "";

		}

		// ignore directory structure, flatten path
		var splitted = fname.split( /[\\\/]/ );
		if ( splitted.length > 0 ) {
			return splitted[ splitted.length - 1 ];
			

		} else {

			return fname;

		}

	};

	Texture.prototype.searchParents = function ( id, nodes ) {

		var p = nodes.searchConnectionParent( id );

		return p;

	};


	/* --------------------------------------------------------------------- */
	/* --------------------------------------------------------------------- */
	/* --------------------------------------------------------------------- */
	/* --------------------------------------------------------------------- */

	function loadTextureImage( texture, url ) {

		var loader = new THREE.ImageLoader();

		loader.load( url, function ( image ) {


		} );

		loader.load( url, function ( image ) {

			texture.image = image;
			texture.needUpdate = true;
			console.log( 'tex load done' );

		},

		// Function called when download progresses
			function ( xhr ) {

				console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

			},

			// Function called when download errors
			function ( xhr ) {

				console.log( 'An error happened' );

			}
		);

	}

	// LayerElementUV: 0 {
	// 	Version: 101
	//	Name: "Texture_Projection"
	//	MappingInformationType: "ByPolygonVertex"
	//	ReferenceInformationType: "IndexToDirect"
	//	UV: *1746 {
	//	UVIndex: *7068 {
	//
	//	The order of the uvs is given by the UVIndex property.
	function parse_Data_ByPolygonVertex_IndexToDirect( node, indices, itemSize ) {

		var res = [];
		
		if (indices)
		{
			for ( var i = 0; i < indices.length; ++ i ) {

			for ( var j = 0; j < itemSize; ++ j ) {

				res.push( node[ ( indices[ i ] * itemSize ) + j ] );

			}

			}
		}

		return res;

	}


	// what want:　normal per vertex, order vertice
	// i have: normal per polygon
	// i have: indice per polygon
	parse_Data_ByPolygonVertex_Direct = function ( node, indices, strides, itemSize ) {

		// *21204 > 3573
		// Geometry: 690680816, "Geometry::", "Mesh" {
		//  Vertices: *3573 {
		//  PolygonVertexIndex: *7068 {

		var tmp = [];
		var currentIndex = 0;

		// first: sort to per vertex
		for ( var i = 0; i < indices.length; ++ i ) {

			tmp[ indices[ i ] ] = [];

			// TODO: duped entry? blend or something?
			for ( var s = 0; s < itemSize; ++ s ) {

				tmp[ indices[ i ] ][ s ] = node[ currentIndex + s ];

			}

			currentIndex += itemSize;

		}

		// second: expand x,y,z into serial array
		var res = [];
		for ( var jj = 0; jj < tmp.length; ++ jj ) {

			if ( tmp[ jj ] === undefined ) {

				continue;

			}

			for ( var t = 0; t < itemSize; ++ t ) {

				if ( tmp[ jj ][ t ] === undefined ) {

					continue;

				}
				res.push( tmp[ jj ][ t ] );

			}

		}

		return res;

	};

	// convert from by polygon(vert) data into by verts data
	function mapByPolygonVertexToByVertex( data, indices, stride ) {

		var tmp = {};
		var res = [];
		var max = 0;

		for ( var i = 0; i < indices.length; ++ i ) {

			if ( indices[ i ] in tmp ) {

				continue;

			}

			tmp[ indices[ i ] ] = {};

			for ( var j = 0; j < stride; ++ j ) {

				tmp[ indices[ i ] ][ j ] = data[ i * stride + j ];

			}

			max = max < indices[ i ] ? indices[ i ] : max;

		}

		try {

			for ( i = 0; i <= max; i ++ ) {

				for ( var s = 0; s < stride; s ++ ) {

					res.push( tmp[ i ][ s ] );

				}

			}

		} catch ( e ) {
			//console.log( max );
			//console.log( tmp );
			//console.log( i );
			//console.log( e );
		}

		return res;

	}

	// AUTODESK uses broken clock. i guess
	var FBXTimeToSeconds = function ( adskTime ) {

		return adskTime / 46186158000;

	};

	degToRad = function ( degrees ) {

		return degrees * Math.PI / 180;

	};

	radToDeg = function ( radians ) {

		return radians * 180 / Math.PI;

	};

	quatFromVec = function ( x, y, z ) {

		var euler = new THREE.Euler( x, y, z, 'ZYX' );
		var quat = new THREE.Quaternion();
		quat.setFromEuler( euler );

		return quat;

	};


	// extend Array.prototype ?  ....uuuh
	toInt = function ( arr ) {

		return arr.map( function ( element ) {

			return parseInt( element );

		} );

	};

	toFloat = function ( arr ) {

		return arr.map( function ( element ) {

			return parseFloat( element );

		} );

	};

	toRad = function ( arr ) {

		return arr.map( function ( element ) {

			return degToRad( element );

		} );

	};

	toMat44 = function ( arr ) {

		var mat = new THREE.Matrix4();
		mat.set(
			arr[ 0 ], arr[ 4 ], arr[ 8 ], arr[ 12 ],
			arr[ 1 ], arr[ 5 ], arr[ 9 ], arr[ 13 ],
			arr[ 2 ], arr[ 6 ], arr[ 10 ], arr[ 14 ],
			arr[ 3 ], arr[ 7 ], arr[ 11 ], arr[ 15 ]
		);

		/*
		mat.set(
			arr[ 0], arr[ 1], arr[ 2], arr[ 3],
			arr[ 4], arr[ 5], arr[ 6], arr[ 7],
			arr[ 8], arr[ 9], arr[10], arr[11],
			arr[12], arr[13], arr[14], arr[15]
		);
		// */

		return mat;

	};

} )();