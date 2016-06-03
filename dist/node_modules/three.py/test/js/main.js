function onLoad() {
    "use strict";
    var testLinks = document.getElementsByClassName('testLink');

    var deskCheckbox = document.getElementById('deskCheckbox');
    deskCheckbox.addEventListener('change', function () {
        var append = "?model=test/models/vrDesk.json";
        var checked = deskCheckbox.checked;
        for (var i = 0; i < testLinks.length; i++) {
            var testLink = testLinks[i];
            if (checked) testLink.href = testLink.href + append;
            else testLink.href = testLink.href.slice(0, -append.length);
        }
    }, false);

    var shadowMapEnabled = (localStorage.getItem('shadowMapEnabled') === 'true');
    var shadowMapCheckbox = document.getElementById('shadowMapCheckbox');
    if (shadowMapEnabled) {
        shadowMapCheckbox.checked = true;
    }
    shadowMapCheckbox.addEventListener('change', function () {
        localStorage.setItem('shadowMapEnabled', shadowMapCheckbox.checked);
        if (window.confirm('This change requires a page reload to take effect - reload now?')) {
            document.location.reload();
        }
    }, false);

    var vrButton = document.getElementById('vrButton');
    vrButton.addEventListener('click', function () {
        app.toggleVR();
        vrButton.blur();
    });

    var world = new CANNON.World();
    world.gravity.set( 0, -9.8, 0 );
    world.broadphase = new CANNON.SAPBroadphase( world );
    world.defaultContactMaterial.contactEquationStiffness   = 1e7;
    world.defaultContactMaterial.frictionEquationStiffness  = 1e7;
    world.defaultContactMaterial.contactEquationRelaxation  = 3;
    world.defaultContactMaterial.frictionEquationRelaxation = 3;
    world.solver.iterations = 10;

    var avatar = new THREE.Object3D();
    avatar.position.y = 3.5*12*0.0254

    var app;

    var animate = function () {
        var lt = 0;

        function animate(t) {
            var dt = 0.001 * (t - lt);
            app.render();
            world.step(Math.min(dt, 1/60), dt, 20);
            for (var i = 0; i < world.bodies.length; i++) {
                var body = world.bodies[i];
                body.mesh.position.copy(body.interpolatedPosition);
                body.mesh.quaternion.copy(body.interpolatedQuaternion);
            }
            lt = t;
            requestAnimationFrame(animate);
        }

        return animate;
    };

    if (window.THREEPY_SCENE) {

        THREE.py.parse(window.THREEPY_SCENE).then( function (scene) {

            onSceneReady(scene);

        } );

    } else {

        onSceneReady(new THREE.Scene());

    }

    function onSceneReady(scene) {
        scene.add(avatar);

        if (YAWVRB.Utils.URL_PARAMS.model) {
            var url = YAWVRB.Utils.URL_PARAMS.model;
            var objectLoader = new THREE.ObjectLoader();
            objectLoader.load(url, function (object) {
                object.scale.set(0.01, 0.01, 0.01);
                object.position.z -= 1.41;
                object.position.y = avatar.position.y - 0.73;
                scene.add(object);
            }, undefined, function (error) {
                console.error(url + ' could not be loaded: ' + JSON.stringify(error, undefined, 2));
            });
        }

        app = new YAWVRB.App(scene, undefined, {
            canvas: document.getElementById('webgl-canvas'),
            antialias: !YAWVRB.Utils.isMobile()
        });

        if (shadowMapCheckbox.checked) {
            app.renderer.shadowMap.enabled = true;
        }

        app.camera.layers.enable(1);
        app.camera.layers.enable(2);

        avatar.add(app.camera);

        THREE.py.CANNONize(scene, world);

        requestAnimationFrame(animate());
    }

}
