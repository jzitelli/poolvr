function setupMouse(parent, position, particleTexture) {
    position = position || new THREE.Vector3(0, 0, -2);
    var numParticles = 50;
    particleTexture = particleTexture || 'images/mouseParticle.png';
    var mouseParticleGroup = new SPE.Group({
        texture: {value: THREE.ImageUtils.loadTexture(particleTexture)},
        maxParticleCount: numParticles
    });
    var mouseParticleEmitter = new SPE.Emitter({
        maxAge: {value: 0.5},
        position: {value: new THREE.Vector3(),
                   spread: new THREE.Vector3()},
        velocity: {value: new THREE.Vector3(0, 0, 0),
                   spread: new THREE.Vector3(0.3, 0.3, 0.3)},
        color: {value: [new THREE.Color('blue'), new THREE.Color('red')]},
        opacity: {value: [1, 0.1]},
        size: {value: 0.0666},
        particleCount: numParticles
    });
    mouseParticleGroup.addEmitter(mouseParticleEmitter);
    var mousePointerMesh = mouseParticleGroup.mesh;
    parent.add(mousePointerMesh);
    mousePointerMesh.position.copy(position);

    mousePointerMesh.visible = false;
    if ("onpointerlockchange" in document) {
      document.addEventListener('pointerlockchange', lockChangeAlert, false);
    } else if ("onmozpointerlockchange" in document) {
      document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    } else if ("onwebkitpointerlockchange" in document) {
      document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
    }
    function lockChangeAlert() {
        if ( document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement ) {
            pyserver.log('pointer lock status is now locked');
            mousePointerMesh.visible = true;
        } else {
            pyserver.log('pointer lock status is now unlocked');
            mousePointerMesh.visible = false;
        }
    }

    var xMax = 2, xMin = -2,
        yMax = 1, yMin = -1;
    window.addEventListener("mousemove", function (evt) {
        if (!mousePointerMesh.visible) return;
        var dx = evt.movementX,
            dy = evt.movementY;
        mousePointerMesh.position.x += 0.0004*dx;
        mousePointerMesh.position.y -= 0.0004*dy;
        if (mousePointerMesh.position.x > xMax) mousePointerMesh.position.x = xMax;
        else if (mousePointerMesh.position.x < xMin) mousePointerMesh.position.x = xMin;
        if (mousePointerMesh.position.y > yMax) mousePointerMesh.position.y = yMax;
        else if (mousePointerMesh.position.y < yMin) mousePointerMesh.position.y = yMin;
    });

    var lt;
    function animateMousePointer(t) {
        var dt = 0.001*(t - lt);
        if (mousePointerMesh.visible) mouseParticleGroup.tick(dt);
        // if (mousePointerMesh && avatar.picking) {
        //     origin.set(0, 0, 0);
        //     direction.set(0, 0, 0);
        //     direction.subVectors(mousePointerMesh.localToWorld(direction), camera.localToWorld(origin)).normalize();
        //     raycaster.set(origin, direction);
        //     var intersects = raycaster.intersectObjects(app.pickables);
        //     if (intersects.length > 0) {
        //         if (app.picked != intersects[0].object) {
        //             if (app.picked) app.picked.material.color.setHex(app.picked.currentHex);
        //             app.picked = intersects[0].object;
        //             app.picked.currentHex = app.picked.material.color.getHex();
        //             app.picked.material.color.setHex(0xff4444); //0x44ff44);
        //         }
        //     } else {
        //         if (app.picked) app.picked.material.color.setHex(app.picked.currentHex);
        //         app.picked = null;
        //     }
        // }
        lt = t;
    }

    return animateMousePointer;
}
