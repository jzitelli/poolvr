"""
Flask application for serving poolvr.
"""
import os
import logging
_logger = logging.getLogger(__name__)
import json
from copy import deepcopy

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
    #### webvr-polyfill configuration
    "ENABLE_LEAP_MOTION": True,
    "LEAP_MOTION_HOST": "127.0.0.1",
    #"FORCE_ENABLE_VR":       True,
    #"K_FILTER":              0.98,
    "PREDICTION_TIME_S":     0.010,
    #"TOUCH_PANNER_DISABLED": True,
    #"YAW_ONLY":              True,
    #"MOUSE_KEYBOARD_CONTROLS_DISABLED": True
    "KEYBOARD_CONTROLS_DISABLED": True
    #"FORCE_DISTORTION":      True,
    #"PREVENT_DISTORTION":    True,
    #"SHOW_EYE_CENTERS":      True,
    #"NO_DPDB_FETCH":         True
}


POOLVR = {
    'config': {
        'gravity'            : 9.8,
        'useBasicMaterials'  : True,
        'useShadowMap'       : False,
        'usePointLight'      : False,
        'useTextGeomLogger'  : True,
        'L_table'            : 2.3368,
        'H_table'            : 0.74295,
        'ball_diameter'      : 2.25 * pool_table.IN2METER,
        'synthSpeakerVolume' : 0.4,
        'toolOptions': {
            'toolOffset'  : [0, -0.42, -0.48],
            'toolRotation': 0,
            'tipShape'    : 'Cylinder'
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
    # TODO: better way
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
    return render_template("index_template.html",
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;

var POOLVR = %s;

var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps({'config': poolvr_config}, indent=2),
                json.dumps(pool_table.pool_hall(**poolvr_config).export()))))



def main():
    _logger.info("app.config =\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                 for k, v in sorted(app.config.items(),
                                                                    key=lambda i: i[0])]))
    _logger.info("""
          ***********
          p o o l v r
   *************************
*******************************
STARTING FLASK APP!!!!!!!!!!!!!
*******************************
   *************************
          p o o l v r
          ***********
""")
    app.run(host='0.0.0.0', port=5000)



if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
