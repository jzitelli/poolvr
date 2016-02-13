"""Flask application for serving poolvr.
"""
import os
import logging
_logger = logging.getLogger(__name__)
import json
from copy import deepcopy
import sys

from flask import Flask, render_template, request, Markup

import pool_table

import site_settings

STATIC_FOLDER   = os.path.abspath(os.path.split(__file__)[0])
TEMPLATE_FOLDER = STATIC_FOLDER

app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            static_url_path='',
            template_folder=TEMPLATE_FOLDER)

app.config.from_object(site_settings)


WebVRConfig = {
    #### webvr-polyfill configuration
    #"FORCE_ENABLE_VR":       True,
    "K_FILTER":              0.98,
    "PREDICTION_TIME_S":     0.020,
    #"TOUCH_PANNER_DISABLED": True,
    #"YAW_ONLY":              True,
    #"MOUSE_KEYBOARD_CONTROLS_DISABLED": True
    "KEYBOARD_CONTROLS_DISABLED": True
    #### webvr-boilerplate configuration
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
        'useSkybox'          : True,
        'useTextGeomLogger'  : True,
        'L_table'            : 2.3368,
        'H_table'            : 0.74295,
        'ball_diameter'      : 2.25 * pool_table.IN2METER,
        'initialPosition'    : [0, 0.98295, 1.0042],
        'synthSpeakerVolume' : 0.25,
        'toolOptions': {
            'toolOffset'  : [0, -0.42, -0.4],
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
    filename = request.args.get('file')
    if filename:
        try:
            with open(os.path.join(WRITE_FOLDER, filename)) as f:
                config.update(json.loads(f.read()))
        except Exception as err:
            _logger.warning("could not load requested configuration:")
            _logger.warning(err);
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
    if config.get('useShadowMap'):
        config['useBasicMaterials'] = False
    return config



@app.context_processor
def js_suffix():
    if app.debug:
        return {'js_suffix': '.js'}
    else:
        return {'js_suffix': '.min.js'}



@app.route('/poolvr')
def poolvr():
    """
    Serves the poolvr app HTML.
    """
    config = get_poolvr_config()
    return render_template("index_template.html",
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;

var POOLVR = %s;

var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(POOLVR, indent=2),
                json.dumps(pool_table.pool_hall(**config).export(),
                           indent=(2 if app.debug else None)))))



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
    app.run(host='0.0.0.0', port=app.config['PORT'])



if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
