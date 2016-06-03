import json

from flask import Blueprint, Markup, render_template, request

from flask_app import WebVRConfig, get_overlay_content

from three import *



blueprint = Blueprint(__name__, __name__)

@blueprint.route('/%s' % __name__)
def materials():
    lambertMaterial = MeshLambertMaterial(color=0xaa4455)
    phongMaterial = MeshPhongMaterial(color=0x44aa55, shininess=20, shading=FlatShading)
    standardMaterial = MeshStandardMaterial(color=0x5544aa, shading=FlatShading, side=BackSide)

    sphere = SphereBufferGeometry(radius=0.6, widthSegments=24, heightSegments=16)
    box = BoxBufferGeometry(width=8, height=8, depth=8)

    scene = Scene()
    scene.add(Mesh(geometry=sphere, material=lambertMaterial, position=[-1, 0, -2]))
    scene.add(Mesh(geometry=sphere, material=phongMaterial, position=[1, 0, -2]))
    scene.add(Mesh(geometry=box, material=standardMaterial))
    scene.add(PointLight(color=0xeeffef, intensity=0.5, distance=8,
                         position=[-0.5, 3, 1]))
    scene.add(PointLight(color=0xfffeef, intensity=0.5, distance=8,
                         position=[0.4, 2, 1.8]))

    return render_template('template.html',
                           title='three.py  -  %s test' % __name__,
                           overlay_content=get_overlay_content(),
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;
var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(scene.export(), indent=2))))
