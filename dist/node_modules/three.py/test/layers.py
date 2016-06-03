import json

from flask import Blueprint, Markup, render_template

from flask_app import WebVRConfig, get_overlay_content

from three import *



blueprint = Blueprint(__name__, __name__)

@blueprint.route('/%s' % __name__)
def layers():
    scene = Scene()
    scene.add(Mesh(geometry=TextGeometry(text='LAYER 1',
                                         font_url='node_modules/three.js/examples/fonts/helvetiker_regular.typeface.json',
                                         size=0.14, height=0),
                   material=MeshBasicMaterial(color=0xff0000),
                   position=[-2, 0, -3],
                   layers=[1]))
    scene.add(Mesh(geometry=TextGeometry(text='LAYER 2',
                                         font_url='node_modules/three.js/examples/fonts/helvetiker_regular.typeface.json',
                                         size=0.14, height=0),
                   material=MeshBasicMaterial(color=0x0000ff),
                   position=[1.6, 0, -3],
                   layers=[2]))
    return render_template('template.html',
                           title='three.py  -  %s test' % __name__,
                           overlay_content=get_overlay_content(),
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;
var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(scene.export(), indent=2))))
