THREE.py.CANNONize = function (obj, world) {
    "use strict";
    obj.updateMatrixWorld();
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
        if (node.body) {
            return node.body;
        }
        if (node instanceof THREE.Mesh) {
            var params = {mass: cannonData.mass,
                          position: node.getWorldPosition(),
                          quaternion: node.getWorldQuaternion()};
            if (cannonData.linearDamping !== undefined) {
                params.linearDamping = cannonData.linearDamping;
            }
            if (cannonData.angularDamping !== undefined) {
                params.angularDamping = cannonData.angularDamping;
            }
            body = new CANNON.Body(params);
            body.mesh = node;
            cannonData.shapes.forEach( function(e) {
                var shape,
                    quaternion,
                    position;
                var array, face, i;
                switch (e) {
                    case 'Plane':
                        shape = new CANNON.Plane();
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
                            for (i = 0; i < array.length; i += 3) {
                                points.push(new CANNON.Vec3(array[i], array[i+1], array[i+2]));
                            }
                            array = node.geometry.index.array;
                            for (i = 0; i < array.length; i += 3) {
                                face = [array[i], array[i+1], array[i+2]];
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
                        quaternion = new CANNON.Quaternion();
                        quaternion.setFromEuler(-Math.PI/2, 0, 0, 'XYZ');
                        break;
                    case 'Heightfield':
                        array = node.geometry.getAttribute('position').array;
                        if (node.geometry.type !== 'PlaneBufferGeometry') {
                            alert('uh oh!');
                        }
                        var gridX1 = node.geometry.parameters.widthSegments + 1;
                        var gridY1 = node.geometry.parameters.heightSegments + 1;
                        var dx = node.geometry.parameters.width / node.geometry.parameters.widthSegments;
                        var data = [];
                        for (var ix = 0; ix < gridX1; ++ix) {
                            data.push(new Float32Array(gridY1));
                            for (var iy = 0; iy < gridY1; ++iy) {
                                data[ix][iy] = array[3 * (gridX1 * (gridY1 - iy - 1) + ix) + 2];
                            }
                        }
                        shape = new CANNON.Heightfield(data, {
                            elementSize: dx
                        });
                        // center to match THREE.PlaneBufferGeometry:
                        position = new CANNON.Vec3();
                        position.x = -node.geometry.parameters.width / 2;
                        position.y = -node.geometry.parameters.height / 2;
                        break;
                    case 'Trimesh':
                        var vertices;
                        var indices;
                        if (node.geometry instanceof THREE.BufferGeometry) {
                            vertices = node.geometry.getAttribute('position').array;
                            indices = node.geometry.index.array;
                        } else {
                            vertices = [];
                            for (i = 0; i < node.geometry.vertices.length; i++) {
                                var vert = node.geometry.vertices[i];
                                vertices.push(vert.x, vert.y, vert.z);
                            }
                            indices = [];
                            for (i = 0; i < node.geometry.faces.length; i++) {
                                face = node.geometry.faces[i];
                                indices.push(face.a, face.b, face.c);
                            }
                        }
                        shape = new CANNON.Trimesh(vertices, indices);
                        break;
                    case 'Ellipsoid':
                        // TODO
                        console.warn('TODO');
                        break;
                    default:
                        console.error("unknown shape type: " + e);
                        break;
                }
                body.addShape(shape, position, quaternion);
            });
            node.body = body;
            return body;
        } else if (node instanceof THREE.Object3D) {
            var bodies = [];
            node.children.forEach(function (c) { bodies.push(makeCANNON(c, cannonData)); });
            return bodies;
        } else {
            console.error("makeCANNON error");
        }
    }
};
