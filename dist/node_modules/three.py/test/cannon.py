import json

from flask import Blueprint, Markup, render_template, request

from flask_app import WebVRConfig, get_overlay_content

from three import *



blueprint = Blueprint(__name__, __name__)

@blueprint.route('/%s' % __name__)
def cannon():
    scene = Scene()
    scene.add(DirectionalLight(color=0xffffff, castShadow=True,
                               userData={'shadowCamera': {'left': -7, 'right': 7, 'top': 7, 'bottom': -7}},
                               position=[4, 20, 3]))
    scene.add(Mesh(geometry=SphereBufferGeometry(radius=0.25),
                   material=MeshPhongMaterial(color=0xff0000, shading=FlatShading),
                   cannonData={'mass': 1, 'shapes': ['Sphere']},
                   castShadow=True,
                   position=[0, 4, -2]))
    scene.add(Mesh(geometry=BoxBufferGeometry(width=1, height=1, depth=1),
                   material=MeshPhongMaterial(color=0x00ff00, shading=FlatShading),
                   cannonData={'mass': 1, 'shapes': ['Box']},
                   castShadow=True,
                   position=[-2, 4, -3]))
    scene.add(Mesh(geometry=CylinderGeometry(radiusTop=0.5, radiusBottom=0.5, height=1, radialSegments=8),
                   material=MeshPhongMaterial(color=0x0000ff, shading=FlatShading),
                   castShadow=True,
                   cannonData={'mass': 1, 'shapes': ['Cylinder']},
                   position=[2, 8, -4]))
    scene.add(Mesh(geometry=PlaneBufferGeometry(width=8, height=8),
                   material=MeshLambertMaterial(color=0x5555ff),
                   position=[0, -1, -4],
                   rotation=[-0.5*np.pi, 0, 0],
                   receiveShadow=True,
                   cannonData={'mass': 0, 'shapes': ['Plane']}))
    return render_template('template.html',
                           title='three.py  -  %s test' % __name__,
                           overlay_content=get_overlay_content(),
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;
var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(scene.export(), indent=2))))
