import json

from flask import Blueprint, Markup, render_template, request
import numpy as np

from flask_app import WebVRConfig, get_overlay_content

from three import *



blueprint = Blueprint(__name__, __name__)

@blueprint.route('/%s' % __name__)
def lights():
    scene = Scene()
    pointLight = PointLight(color=0xff0000, castShadow=True,
                            position=[-3, 4, -1])
    scene.add(pointLight)
    spotLight = SpotLight(color=0x00ff00, angle=25*np.pi/180, castShadow=True,
                          position=[2, 4, 4])
    scene.add(spotLight)
    directionalLight = DirectionalLight(color=0x0000ff, castShadow=True,
                                        position=[1, 24, 0])
    scene.add(directionalLight)

    phongMaterial = MeshPhongMaterial(color=0x444444, shininess=20, shading=FlatShading)
    standardMaterial = MeshStandardMaterial(color=0xaaaaaa, shading=FlatShading)
    sphere = SphereBufferGeometry(radius=0.6, widthSegments=24, heightSegments=16)
    box = BoxBufferGeometry(width=1, height=1, depth=1)
    plane = PlaneBufferGeometry(width=8, height=8)
    scene.add(Mesh(geometry=sphere, material=phongMaterial, castShadow=True,
                   position=[1, 1, -2]))
    scene.add(Mesh(geometry=box, material=standardMaterial, castShadow=True,
                   position=[-1, 1, -2]))
    scene.add(Mesh(geometry=plane, material=standardMaterial, receiveShadow=True, rotation=[-0.5*np.pi, 0, 0],
                   position=[0, -1, 0]))
    scene.add(Mesh(geometry=plane, material=standardMaterial, receiveShadow=True,
                   position=[0, 3, -4]))
    scene.add(Mesh(geometry=plane, material=standardMaterial, receiveShadow=True, rotation=[0, 0.5*np.pi, 0],
                   position=[-4, 3, 0]))
    return render_template('template.html',
                           title='three.py  -  %s test' % __name__,
                           overlay_content=get_overlay_content(),
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;
var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(scene.export(), indent=2))))
