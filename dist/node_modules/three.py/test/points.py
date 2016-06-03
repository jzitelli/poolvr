import json

from flask import Blueprint, Markup, render_template, request

from flask_app import WebVRConfig, get_overlay_content

from three import *



blueprint = Blueprint(__name__, __name__)

@blueprint.route('/%s' % __name__)
def points():
    scene = Scene()
    geometry = SphereBufferGeometry(radius=3.2, widthSegments=32, heightSegments=24)
    position = [0, 1.3, -2]
    scene.add(Points(geometry=geometry,
                     material=PointsMaterial(color=0xffff00, size=0.06),
                     position=position))
    scene.add(PointLight(color=0xeeffff, intensity=1, distance=4,
                         position=[position[0], position[1] + 1, position[2] + 0.2]))
    scene.add(PointLight(color=0xffaaaa, intensity=1, distance=4,
                         position=[position[0] + 1, position[1], position[2]]))
    scene.add(Mesh(geometry=geometry,
                   material=MeshPhongMaterial(color=0x999987, shininess=70, shading=FlatShading, side=BackSide),
                   position=position,
                   scale=[1.01, 1.03, 1.01]))
    return render_template('template.html',
                           title='three.py  -  %s test' % __name__,
                           overlay_content=get_overlay_content(),
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;
var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(scene.export(), indent=2))))
