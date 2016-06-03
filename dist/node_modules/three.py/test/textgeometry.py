import json

from flask import Blueprint, render_template, Markup

from flask_app import WebVRConfig, get_overlay_content

from three import *



blueprint = Blueprint(__name__, __name__)

@blueprint.route('/%s' % __name__)
def textgeometry():
    scene = Scene()
    scene.add(DirectionalLight(color=0xffffff, intensity=1, position=(-2,1,1)))
    scene.add(Mesh(geometry=TextGeometry(text='textgeometry',
                                         font_url="node_modules/three.js/examples/fonts/helvetiker_regular.typeface.json",
                                         size=0.3, height=0.02),
                   material=MeshLambertMaterial(color=0xff00ff),
                   position=[0, 0, -2]))
    return render_template('template.html',
                           overlay_content=get_overlay_content(),
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;
var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(scene.export(), indent=2))))
