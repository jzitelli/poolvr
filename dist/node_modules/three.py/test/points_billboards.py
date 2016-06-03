import json

from flask import Blueprint, Markup, render_template, request

from flask_app import WebVRConfig, get_overlay_content

from three import *



blueprint = Blueprint(__name__, __name__)

@blueprint.route('/%s' % __name__)
def points():
    ballImage = Image(url='node_modules/three.js/examples/textures/sprites/ball.png')
    otherImage = Image(url='node_modules/three.js/examples/textures/sprite0.png')
    scene = Scene()
    position = [0, 1.3, -2]
    geometry = SphereBufferGeometry(radius=3.2, widthSegments=32, heightSegments=24)
    material = PointsMaterial(color=0xffff00, size=0.6, sizeAttenuation=True,
                              map=Texture(image=ballImage),
                              transparent=True, alphaTest=0.25)
    points = Points(geometry=geometry, material=material, position=position)
    scene.add(points);

    scene.add(Mesh(geometry=geometry,
                   material=MeshPhongMaterial(color=0x999987, specular=0xffffff, shininess=70, shading=FlatShading, side=BackSide),
                   position=position,
                   scale=[1.06, 1.06, 1.06]))
    scene.add(PointLight(color=0xeeffff, intensity=1, distance=3.5,
                         position=[position[0], position[1] + 1, position[2] + 0.2]))
    scene.add(PointLight(color=0xffaaaa, intensity=1, distance=3.5,
                         position=[position[0] + 1, position[1], position[2]]))

    geometry = SphereBufferGeometry(radius=2.2, widthSegments=27, heightSegments=19)
    material = PointsMaterial(color=0xddffbb, size=0.22, sizeAttenuation=True,
                              map=Texture(image=otherImage),
                              transparent=True, alphaTest=0.25)
    points = Points(geometry=geometry, material=material, position=position)
    scene.add(points);

    return render_template('template.html',
                           title='three.py  -  %s test' % __name__,
                           overlay_content=get_overlay_content(),
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;
var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(scene.export(), indent=2))))
