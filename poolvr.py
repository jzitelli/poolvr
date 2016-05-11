"""
Flask application for serving poolvr.
"""
import os
import logging
_logger = logging.getLogger(__name__)
import json
from copy import deepcopy

import subprocess

completed_proc = subprocess.run(['git', 'rev-list', '--max-count=4', 'HEAD'], stdout=subprocess.PIPE, check=True, universal_newlines=True)
GIT_REVS = []
for line in completed_proc.stdout.splitlines():
    GIT_REVS.append(line)

from flask import Flask, render_template, request, Markup

import pool_table

STATIC_FOLDER   = os.path.abspath(os.path.split(__file__)[0])
TEMPLATE_FOLDER = STATIC_FOLDER

app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            static_url_path='',
            template_folder=TEMPLATE_FOLDER)

app.debug = True


WebVRConfig = {
    "ENABLE_LEAP_MOTION": False,
    "LEAP_MOTION_HOST": "127.0.0.1",
    "FORCE_ENABLE_VR":       False,
    "K_FILTER":              0.98,
    "PREDICTION_TIME_S":     0.020,
    "TOUCH_PANNER_DISABLED": False,
    "YAW_ONLY":              False,
    "MOUSE_KEYBOARD_CONTROLS_DISABLED": False,
    "KEYBOARD_CONTROLS_DISABLED": True
}


POOLVR = {
    'config': {
        'gravity'            : 9.8,
        'useBasicMaterials'  : True,
        'useShadowMap'       : False,
        'useSpotLight'       : True,
        'usePointLight'      : False,
        'useTextGeomLogger'  : True,
        'L_table'            : 2.3368,
        'H_table'            : 0.74295,
        'ball_diameter'      : 2.25 * pool_table.INCH2METER,
        'H_ceiling'          : 8 * 12 * 0.0254,
        'synthSpeakerVolume' : 0.4,
        'toolOptions': {
            'host'      : '127.0.0.1',
            'tipShape'  : 'Cylinder',
            'toolRadius': 0.012,
            'tipRadius' : 0.012,
            'toolLength': 0.37,
            'interactionPlaneOpacity': 0.22
        }
    }
}


def get_poolvr_config():
    """
    Constructs poolvr config dict based on request url parameters.
    """
    config = deepcopy(POOLVR['config'])
    args = dict({k: v for k, v in request.args.items()
                 if k in config})
    for k, v in args.items():
        if v == 'false':
            args[k] = False
        elif v == 'true':
            args[k] = True
        elif not (v is False or v is True or v is None):
            try:
                args[k] = float(v)
            except Exception as err:
                pass
    config.update(args)
    return config

def get_webvr_config():
    """
    Constructs WebVRConfig dict based on request url parameters.
    """
    config = deepcopy(WebVRConfig)
    args = dict({k: v for k, v in request.args.items()
                 if k in config})
    for k, v in args.items():
        if v == 'false':
            args[k] = False
        elif v == 'true':
            args[k] = True
        elif not (v is False or v is True or v is None):
            try:
                args[k] = float(v)
            except Exception as err:
                pass
    config.update(args)
    return config



@app.route('/')
def poolvr():
    """
    Serves the poolvr app HTML.
    """
    poolvr_config = get_poolvr_config()
    webvr_config = get_webvr_config()
    return render_template("poolvr_template.html",
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;

var POOLVR = %s;

var THREEPY_SCENE = %s;
</script>""" % (json.dumps(webvr_config, indent=2),
                json.dumps({'config': poolvr_config}, indent=2),
                json.dumps(pool_table.pool_hall(**poolvr_config).export()))),
                           version_id='v0.1.1',
                           extra_overlay_content=Markup(r"""
<h2>Version info:</h2>
<a style="color: #feb;" href="https://github.com/jzitelli/poolvr/commit/{0}">current commit</a>
<br>
<a style="color: #feb;" href="https://github.com/jzitelli/poolvr/commit/{1}">last commit</a>
""".format(GIT_REVS[0], GIT_REVS[1])))



def main():
    _logger.info("app.config =\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                 for k, v in sorted(app.config.items(),
                                                                    key=lambda i: i[0])]))
    _logger.info("""
           ***********
           p o o l v r
    *************************
             v0.1.1
 *******************************
 STARTING FLASK APP!!!!!!!!!!!!!
 *******************************
             v0.1.1
    *************************
           p o o l v r
           ***********
""")
    app.run(host='0.0.0.0', port=5000)



if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
