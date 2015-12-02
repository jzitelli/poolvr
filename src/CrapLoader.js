var CrapLoader = ( function () {
    "use strict";
    var manager = new THREE.LoadingManager();
    var isLoaded_ = true;
    manager.onLoad = function () {
        isLoaded_ = true;
    };
    var objectLoader = new THREE.ObjectLoader(manager),
        imageLoader = new THREE.ImageLoader(manager),
        textureLoader = new THREE.TextureLoader(manager),
        cubeTextureLoader = new THREE.CubeTextureLoader(manager);

    function isLoaded() {
        return isLoaded_;
    }

    function parse(json, texturePath) {
        if (texturePath) {
            objectLoader.setTexturePath(texturePath);
        }
        // TODO: convert all to BufferGeometry?
        function onLoad(obj) {
            obj.traverse( function (node) {
                if (node instanceof THREE.Mesh) {
                    node.geometry.computeBoundingSphere();
                    node.geometry.computeBoundingBox();
                    if (node.userData && node.userData.visible === false) {
                        node.visible = false;
                    }
                    if (!(node.geometry instanceof THREE.SphereBufferGeometry)) {
                        // makes seams appear on spherebuffergeometries due to doubled vertices at phi=0=2*pi
                        node.geometry.computeVertexNormals();
                    }
                    if (node.material.shading === THREE.FlatShading)
                        node.geometry.computeFaceNormals();
                }
            } );
        }
        if (json.materials) {
            json.materials.forEach( function (mat) {
                if (mat.type.endsWith("ShaderMaterial") && mat.uniforms) {
                    var uniforms = mat.uniforms;
                    for (var key in uniforms) {
                        var uniform = uniforms[key];
                        if (uniform.type === 't') {
                            if (Array.isArray(uniform.value) && uniform.value.length == 6) {
                                isLoaded_ = false;
                                // texture cube specified by urls
                                uniform.value = cubeTextureLoader.load(uniform.value);
                            } else
                            if (typeof uniform.value === 'string') {
                                isLoaded_ = false;
                                // single texture specified by url
                                uniform.value = textureLoader.load(uniform.value);
                            }
                        }
                    }
                }
            } );
        }

        // filter out geometries that ObjectLoader doesn't handle:
        var geometries = objectLoader.parseGeometries(json.geometries.filter(function (geom) {
            return geom.type != "TextGeometry";
        }));
        // construct and insert geometries that ObjectLoader doesn't handle
        json.geometries.forEach( function (geom) {
            if (geom.type == "TextGeometry") {
                var geometry = new THREE.TextGeometry(geom.text, geom.parameters);
                geometry.uuid = geom.uuid;
                if (geom.name !== undefined) geometry.name = geom.name;
                geometries[geom.uuid] = geometry;
            }
        } );
        var images = objectLoader.parseImages(json.images, function () {
            onLoad(object);
        });
        var textures = objectLoader.parseTextures(json.textures, images);
        var materials = objectLoader.parseMaterials(json.materials, textures);
        var object = objectLoader.parseObject(json.object, geometries, materials);
        if (json.images === undefined || json.images.length === 0) {
            onLoad(object);
        }
        return object;
    }

    var position = new THREE.Vector3();
    function CANNONize(obj, world) {
        obj.traverse(function(node) {
            if (node.userData && node.userData.cannonData) {
                var body = makeCANNON(node, node.userData.cannonData);
                if (world) {
                    if (body instanceof CANNON.Body) {
                        world.addBody(body);
                    } else {
                        // assumed to be array
                        body.forEach(function (b) { world.addBody(b); });
                    }
                }
            }
        });

        function makeCANNON(node, cannonData) {
            var body;
            var bodies;
            if (node.body) {
                return node.body;
            }
            if (node instanceof THREE.Mesh) {
                position.copy(node.position);
                var params = {mass: cannonData.mass,
                              position: node.localToWorld(position),
                              quaternion: node.quaternion};
                if (cannonData.linearDamping !== undefined) {
                    params.linearDamping = cannonData.linearDamping;
                }
                if (cannonData.angularDamping !== undefined) {
                    params.angularDamping = cannonData.angularDamping;
                }
                body = new CANNON.Body(params);
                body.mesh = node;
                cannonData.shapes.forEach(function(e) {
                    var shape,
                        position,
                        quaternion,
                        array;
                    switch (e) {
                        case 'Plane':
                            shape = new CANNON.Plane();
                            quaternion = new CANNON.Quaternion();
                            quaternion.setFromEuler(-Math.PI / 2, 0, 0, 'XYZ');
                            break;
                        case 'Box':
                            var halfExtents = new CANNON.Vec3();
                            node.geometry.computeBoundingBox();
                            halfExtents.x = node.scale.x * (node.geometry.boundingBox.max.x - node.geometry.boundingBox.min.x) / 2;
                            halfExtents.y = node.scale.y * (node.geometry.boundingBox.max.y - node.geometry.boundingBox.min.y) / 2;
                            halfExtents.z = node.scale.z * (node.geometry.boundingBox.max.z - node.geometry.boundingBox.min.z) / 2;
                            shape = new CANNON.Box(halfExtents);
                            break;
                        case 'Sphere':
                            node.geometry.computeBoundingSphere();
                            shape = new CANNON.Sphere(node.geometry.boundingSphere.radius);
                            break;
                        case 'ConvexPolyhedron':
                            var points = [];
                            var faces = [];
                            if (node.geometry instanceof THREE.BufferGeometry) {
                                array = node.geometry.getAttribute('position').array;
                                for (var i = 0; i < array.length; i += 3) {
                                    points.push(new CANNON.Vec3(array[i], array[i+1], array[i+2]));
                                }
                                array = node.geometry.index.array;
                                for (i = 0; i < array.length; i += 3) {
                                    var face = [array[i], array[i+1], array[i+2]];
                                    faces.push(face);
                                }
                            } else if (node.geometry instanceof THREE.Geometry) {
                                // TODO
                            }
                            shape = new CANNON.ConvexPolyhedron(points, faces);
                            break;
                        case 'Cylinder':
                            shape = new CANNON.Cylinder(node.geometry.parameters.radiusTop,
                                node.geometry.parameters.radiusBottom,
                                node.geometry.parameters.height,
                                node.geometry.parameters.radialSegments);
                            break;
                        // case 'Trimesh':
                        //     var vertices;
                        //     var indices;
                        //     if (node.geometry instanceof THREE.BufferGeometry) {
                        //         vertices = node.geometry.getAttribute('position').array;
                        //         indices = node.geometry.getAttribute('index').array;
                        //     } else {
                        //         vertices = [];
                        //         for (var iv = 0; iv < node.geometry.vertices.length; iv++) {
                        //             var vert = node.geometry.vertices[iv];
                        //             vertices.push(vert.x, vert.y, vert.z);
                        //         }
                        //         indices = [];
                        //         for (var iface = 0; iface < node.geometry.faces.length; iface++) {
                        //             var face = node.geometry.faces[iface];
                        //             indices.push(face.a, face.b, face.c);
                        //         }
                        //     }
                        //     shape = new CANNON.Trimesh(vertices, indices);
                        //     break;
                        default:
                            console.log("unknown shape type: " + e);
                            break;
                    }
                    body.addShape(shape, position, quaternion);
                });
                node.body = body;
                return body;
            } else if (node instanceof THREE.Object3D) {
                bodies = [];
                node.children.forEach(function (c) { bodies.push(makeCANNON(c, cannonData)); });
                return bodies;
            } else {
                console.log("makeCANNON error");
            }
        }
    }

    return {
        parse: parse,
        CANNONize: CANNONize,
        isLoaded: isLoaded
    };

} )();
