/* global THREE */

module.exports = ( function () {
    "use strict";

    var moveObject = ( function () {
        const MOVESPEED = 0.3;
        var euler = new THREE.Euler(0, 0, 0, 'YXZ');
        return function (object, dt, moveFB, moveRL, moveUD, turnRL, turnUD) {
            if (moveFB || moveRL || moveUD || turnRL || turnUD) {
                euler.setFromQuaternion(object.quaternion);
                euler.y -= (turnRL) * dt;
                euler.x -= (turnUD) * dt;
                object.quaternion.setFromEuler(euler);
                var cos = Math.cos(euler.y),
                    sin = Math.sin(euler.y);
                object.position.z -= dt * MOVESPEED * ((moveFB) * cos + (moveRL) * sin);
                object.position.x += dt * MOVESPEED * ((moveRL) * cos - (moveFB) * sin);
                object.position.y += dt * MOVESPEED * moveUD;
                object.updateMatrix();
                object.updateMatrixWorld();
            }
        };
    } )();

    function ObjectSelector() {
        this.selection;
        var selectables = [];

        this.addSelectable = function (obj) {
            selectables.push(obj);
            if (!this.selection) this.selection = obj;
        }.bind(this);

        this.cycleSelection = ( function () {
            var i = 0;
            return function (inc) {
                i = (i + inc) % selectables.length;
                if (i < 0) i += selectables.length;
                this.selection = selectables[i];
            };
        } )().bind(this);
    }

    var DEADSCENE = new THREE.Scene();
    DEADSCENE.name = 'DEADSCENE';
    var displayText = ( function () {
        var textMeshes = {};
        var quadGeom = new THREE.PlaneBufferGeometry(1, 1);
        quadGeom.translate(0.5, 0.5, 0);
        const DEFAULT_OPTIONS = {
            object: DEADSCENE,
            position: [0, 0.05, -0.05],
            quaternion: [0, 0, 0, 1],
            coordSystem: 'local',
            textSize: 21
        };
        function displayText(text, options) {
            var _options = {};
            options = options || _options;
            for (var kwarg in options) {
                _options[kwarg] = options[kwarg];
            }
            for (kwarg in DEFAULT_OPTIONS) {
                if (options[kwarg] === undefined) _options[kwarg] = DEFAULT_OPTIONS[kwarg];
            }
            options = _options;
            var uuid = options.object.uuid;
            var key = JSON.stringify({text, uuid});
            var mesh = textMeshes[key];
            if (!mesh) {
                var canvas = document.createElement('canvas');
                canvas.height = 2 * options.textSize;
                canvas.width = 256; //2*ctx.measureText(text).width;
                var ctx = canvas.getContext('2d');
                ctx.font = String(options.textSize) + "px serif";
                // ctx.fillStyle   = 'rgba(23, 23, 23, 0.3)';
                // ctx.strokeStyle = 'rgba(23, 23, 23, 0.3)';
                // ctx.fillRect(  0, 0, canvas.width, canvas.height);
                // ctx.strokeRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle   = 'rgb(255, 72, 23)';
                ctx.strokeStyle = 'rgb(240, 70, 20)';
                ctx.fillText(  text, 0, options.textSize);
                ctx.strokeText(text, 0, options.textSize);
                var aspect = canvas.width / canvas.height;
                var texture = new THREE.Texture(canvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);
                var material = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture, transparent: true});
                mesh = new THREE.Mesh(quadGeom, material);
                material.map.needsUpdate = true;
                if (options.coordSystem === 'local') {
                    options.object.add(mesh);
                    mesh.position.fromArray(options.position);
                    mesh.quaternion.fromArray(options.quaternion);
                    var worldScale = options.object.getWorldScale();
                    mesh.scale.set(aspect * 0.075 / worldScale.x, 0.075 / worldScale.y, 1 / worldScale.z);
                    mesh.updateMatrix();
                }
                textMeshes[key] = mesh;
            }
        }
        return displayText;
    } )();

    function TextLabel(options) {
        const DEFAULT_OPTIONS = {
            object: DEADSCENE,
            position: [0, 0.05, -0.05],
            quaternion: [0, 0, 0, 1],
            coordSystem: 'local',
            textSize: 21
        };
        var _options = {};
        options = options || _options;
        for (var kwarg in options) {
            _options[kwarg] = options[kwarg];
        }
        for (kwarg in DEFAULT_OPTIONS) {
            if (options[kwarg] === undefined) _options[kwarg] = DEFAULT_OPTIONS[kwarg];
        }
        options = _options;
        var canvas = document.createElement('canvas');
        canvas.height = 2 * options.textSize;
        canvas.width = 256; //2*ctx.measureText(text).width;
        var ctx = canvas.getContext('2d');
        ctx.font = String(options.textSize) + "px serif";
        ctx.fillStyle   = 'rgb(255, 72, 23)';
        ctx.strokeStyle = 'rgb(240, 70, 20)';
        var texture = new THREE.Texture(canvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);
        var aspect = canvas.width / canvas.height;
        var material = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture, transparent: true});
        var quadGeom = new THREE.PlaneBufferGeometry(1, 1);
        quadGeom.translate(0.5, 0.5, 0);
        var mesh = new THREE.Mesh(quadGeom, material);
        if (options.coordSystem === 'local') {
            options.object.add(mesh);
            mesh.position.fromArray(options.position);
            mesh.quaternion.fromArray(options.quaternion);
            var worldScale = options.object.getWorldScale();
            mesh.scale.set(aspect * 0.075 / worldScale.x, 0.075 / worldScale.y, 1 / worldScale.z);
            mesh.updateMatrix();
        }
        this.mesh = mesh;
        this.setText = function (text) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillText(  text, 0, options.textSize);
            ctx.strokeText(text, 0, options.textSize);
            material.map.needsUpdate = true;
        }.bind(this);
    }

    var URL_PARAMS = ( function () {
        var params = {};
        location.search.substr(1).split("&").forEach( function(item) {
            var k = item.split("=")[0],
                v = decodeURIComponent(item.split("=")[1]);
            if (k in params) {
                params[k].push(v);
            } else {
                params[k] = [v];
            }
        } );
        for (var k in params) {
            if (params[k].length === 1)
                params[k] = params[k][0];
            if (params[k] === 'true')
                params[k] = true;
            else if (params[k] === 'false')
                params[k] = false;
        }
        return params;
    } )();

    var combineObjects = function (a, b) {
        var c = {},
            k;
        for (k in a) {
            c[k] = a[k];
        }
        for (k in b) {
            if (!c.hasOwnProperty(k)) {
                c[k] = b[k];
            }
        }
        return c;
    };

    var makeObjectArray = function (obj, keyKey) {
        keyKey = keyKey || "key";
        return Object.keys(obj).map(function (k) {
            var item = {};
            item[keyKey] = k;
            for (var p in obj[k]) {
                item[p] = obj[k][p];
            }
            return item;
        });
    };

    // adapted from detectmobilebrowsers.com
    var isMobile = function () {
        var a = navigator.userAgent || navigator.vendor || window.opera;
        return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)));
    };

    return {
        ObjectSelector: ObjectSelector,
        moveObject: moveObject,
        displayText: displayText,
        TextLabel: TextLabel,
        URL_PARAMS: URL_PARAMS,
        combineObjects: combineObjects,
        makeObjectArray: makeObjectArray,
        isMobile: isMobile
    };

} )();
