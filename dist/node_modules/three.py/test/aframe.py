import json

from flask import Blueprint, Markup, render_template, request

from flask_app import WebVRConfig, get_overlay_content

from three import *



blueprint = Blueprint(__name__, __name__)

@blueprint.route('/%s' % __name__)
def aframe():
    return render_template('template.html',
                           title='three.py  -  %s test' % __name__,
                           overlay_content=get_overlay_content(),
                           other_scripts=Markup(r"""
<script src="node_modules/aframe/dist/aframe.js"></script>
"""),
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;
</script>""" % json.dumps(WebVRConfig, indent=2)))
