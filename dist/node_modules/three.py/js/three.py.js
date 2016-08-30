/* global THREE */
THREE.py = ( function () {
    "use strict";

    var fonts = {};

    function parse(json, onLoad) {

        var objectLoader = new THREE.ObjectLoader();

        var manager = new THREE.LoadingManager();
        var textureLoader = new THREE.TextureLoader(manager),
            cubeTextureLoader = new THREE.CubeTextureLoader(manager),
            fontLoader = new THREE.FontLoader(manager);

        var images;

        var promise = new Promise( function (resolve, reject) {

            // parse geometries, filtering out geometries that ObjectLoader doesn't handle:
            var geometries = objectLoader.parseGeometries(json.geometries.filter( function (geom) {
                return geom.type !== "TextGeometry";
            } ));

            manager.onLoad = onLoadA;
            manager.onError = function () { reject(); };
            var waitForLoad = false;

            // set texture values for shader material uniforms:
            if (json.materials) {
                json.materials.forEach( function (mat) {
                    if (mat.type.endsWith("ShaderMaterial") && mat.uniforms) {
                        var uniforms = mat.uniforms;
                        for (var key in uniforms) {
                            var uniform = uniforms[key];
                            if (uniform.type === 't') {
                                if (Array.isArray(uniform.value) && uniform.value.length === 6) {
                                    // texture cube specified by urls
                                    uniform.value = cubeTextureLoader.load(uniform.value);
                                    waitForLoad = true;
                                } else if (typeof uniform.value === 'string') {
                                    // single texture specified by url
                                    uniform.value = textureLoader.load(uniform.value);
                                    waitForLoad = true;
                                }
                            }
                        }
                    }
                } );
            }

            // load fonts... each unique font URI is loaded once and stored in publically available object `fonts`:
            json.geometries.forEach( function (geom) {
                if (geom.type === "TextGeometry" && fonts[geom.font_url] === undefined) {
                    fonts[geom.font_url] = null;
                    fontLoader.load(geom.font_url, function (font) {
                        fonts[geom.font_url] = font;
                    });
                    waitForLoad = true;
                }
            } );

            if (waitForLoad === false) onLoadA();

            function onLoadA() {

                // construct TextGeometries now that fonts are loaded:
                json.geometries.forEach( function (geom) {
                    if (geom.type === "TextGeometry") {
                        geom.parameters.font = fonts[geom.font_url];
                        var textGeometry = new THREE.TextGeometry(geom.text, geom.parameters);
                        textGeometry.uuid = geom.uuid;
                        if (geom.name !== undefined) textGeometry.name = geom.name;
                        geometries[geom.uuid] = textGeometry;
                    }
                } );

                images = objectLoader.parseImages(json.images, function () { onLoadB(object); });
                var textures = objectLoader.parseTextures(json.textures, images);
                var materials = objectLoader.parseMaterials(json.materials, textures);

                var object = objectLoader.parseObject(json.object, geometries, materials);

                if (json.images === undefined || json.images.length === 0) {
                    onLoadB(object);
                }

                // the final callback, resolves promise:
                function onLoadB(obj) {
                    obj.traverse( function (node) {

                        if (node.userData) {
                            if (node.userData.layers) {
                                node.userData.layers.forEach( function (channel) {
                                    node.layers.set(channel);
                                } );
                            }
                        }

                        if (node instanceof THREE.Mesh) {
                            node.geometry.computeBoundingSphere();
                            node.geometry.computeBoundingBox();
                            if (node.material.shading === THREE.FlatShading) {
                                node.geometry.computeFaceNormals();
                            }
                        } else if (node instanceof THREE.DirectionalLight || node instanceof THREE.SpotLight) {
                            // set target / shadow parameters if they are specified via userData
                            if (node.userData) {
                                if (node.userData.shadowCamera) {
                                    var shadowCamera = node.userData.shadowCamera;
                                    for (var k in shadowCamera) {
                                        node.shadow.camera[k] = shadowCamera[k];
                                    }
                                    node.shadow.camera.updateProjectionMatrix();
                                }
                                if (node.userData.targetPosition) {
                                    node.target.position.fromArray(node.userData.targetPosition);
                                    node.target.updateMatrix();
                                }
                            }
                        }

                        node.updateMatrix();

                    } );

                    obj.updateMatrixWorld(true);

                    loadHeightfields(obj);

                    if (onLoad) {
                        onLoad(obj);
                    }

                    resolve(obj);
                }

            }

        } );

        function loadHeightfields(obj) {
            function getPixel(imagedata, x, y) {
                var position = (x + imagedata.width * y) * 4,
                    data = imagedata.data;
                return {
                    r: data[position],
                    g: data[position + 1],
                    b: data[position + 2],
                    a: data[position + 3]
                };
            }
            obj.traverse( function (node) {
                if (node.userData && node.userData.heightfieldImage) {
                    var uuid = node.userData.heightfieldImage;
                    var heightfieldScale = node.userData.heightfieldScale || 1;
                    var image = images[uuid];
                    if (image) {
                        var canvas = document.createElement('canvas');
                        canvas.width = image.width;
                        canvas.height = image.height;
                        var context = canvas.getContext('2d');
                        context.drawImage(image, 0, 0);
                        var imageData = context.getImageData(0, 0, image.width, image.height);
                        var attribute = node.geometry.getAttribute('position');
                        var gridX1 = node.geometry.parameters.widthSegments + 1;
                        var gridY1 = node.geometry.parameters.heightSegments + 1;
                        var i = 0;
                        for (var iy = 0; iy < gridY1; ++iy) {
                            for (var ix = 0; ix < gridX1; ++ix) {
                                var pixel = getPixel(imageData, ix, iy);
                                attribute.setZ(i++, heightfieldScale * (pixel.r + 256*pixel.g + 256*256*pixel.b) / (256 * 256 * 256));
                            }
                        }
                        attribute.needsUpdate = true;
                        node.geometry.computeFaceNormals();
                        node.geometry.computeVertexNormals();
                        node.geometry.normalsNeedUpdate = true;
                        node.geometry.computeBoundingSphere();
                        node.geometry.computeBoundingBox();
                    }
                }
            } );
        }

        return promise;

    }

    return {
        parse: parse,
        fonts: fonts
    };
} )();
