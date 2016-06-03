import json

from flask import Blueprint, Markup, render_template

from flask_app import WebVRConfig, get_overlay_content

from three import *



blueprint = Blueprint(__name__, __name__)

@blueprint.route('/%s' % __name__)
def skybox():
    scene = Scene()
    cube_images = ['node_modules/three.js/examples/textures/cube/SwedishRoyalCastle/%s.jpg' % side
                   for side in ('px', 'nx', 'py', 'ny', 'pz', 'nz')]
    scene.add(Skybox(cube_images=cube_images))
    return render_template('template.html',
                           overlay_content=get_overlay_content(),
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;
var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(scene.export(), indent=2))))
