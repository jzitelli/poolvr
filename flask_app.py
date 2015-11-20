"""Flask application for serving poolvr.
"""
import os
import logging
_logger = logging.getLogger(__name__)
import json
from copy import deepcopy
import sys

from flask import Flask, render_template, request, Markup, jsonify
STATIC_FOLDER = os.getcwd()
TEMPLATE_FOLDER = os.path.join(os.getcwd(), 'templates')
app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            template_folder=TEMPLATE_FOLDER,
            static_url_path='')
import site_settings
app.config.from_object(site_settings)

POOLVR_PYTHONPATH = os.environ.get('POOLVR_PYTHONPATH', os.path.join(os.getcwd(), os.path.pardir))
sys.path.append(POOLVR_PYTHONPATH)
import poolvr
from poolvr.pool_table import pool_hall
from poolvr import three


POOLVR_CONFIG = {
    'gravity'               : 9.8,
    'useBasicMaterials'     : True,
    'useLambertMaterials'   : None,
    'usePhongMaterials'     : None,
    'shadowMap'             : None,
    'pointLight'            : None,
    'backgroundColor'       : 0x000000,
    'oldBoilerplate'        : False,
    'mouseControlsEnabled'  : False,
    'gamepadControlsEnabled': True,
    'showMousePointerOnLock': False,
    'leapDisabled'          : None,
    'leapHandsDisabled'     : None
}

def get_poolvr_config(version=None):
    config = deepcopy(POOLVR_CONFIG)
    args = dict({k: v for k, v in request.args.items()
                 if k in config})
    config.update(args)
    for k, v in config.items():
        if v == 'false':
            config[k] = False
        elif v == 'true':
            config[k] = True
        elif not (v is False or v is True or v is None):
            try:
                config[k] = float(v)
            except Exception as err:
                _logger.warning('\nUNRECOGNIZED ARGUMENT: %s' % str(config.pop(k)))
    if not config['useBasicMaterials']:
        if config['useLambertMaterials'] is None:
            config['useLambertMaterials'] = True
        if config['usePhongMaterials'] is None:
            config['usePhongMaterials'] = True
    _logger.debug(json.dumps(config, indent=2))
    return config



@app.context_processor
def js_suffix():
    if app.debug:
        return {'js_suffix': '.js'}
    else:
        return {'js_suffix': '.min.js'}



@app.route('/config', methods=['GET', 'POST'])
def poolvr_config():
    """app configurator"""
    config = get_poolvr_config()
    return render_template('config.html',
                           json_config=Markup(r"""<script>
var POOLVR_CONFIG = %s;
</script>""" % json.dumps(config, indent=(2 if app.debug else None))), **config)



@app.route('/')
def poolvr():
    """Serves the app HTML (development endpoint)"""
    config = get_poolvr_config()
    return render_template('poolvr.html',
                           json_config=Markup(r"""<script>
var POOLVR_CONFIG = %s;
var JSON_SCENE = %s;
</script>""" % (json.dumps(config, indent=(2 if app.debug else None)),
                json.dumps(pool_hall(**config), indent=(2 if app.debug else None)))), **config)



@app.route('/release')
def poolvr_release():
    """Serves the app HTML (tagged releases)"""
    version = request.args.get('version', '0.1.0')
    config = get_poolvr_config(version=version)
    return render_template('poolvr.%s.html' % version,
                           json_config=Markup(r"""<script>
var POOLVR_VERSION = "%s";
var POOLVR_CONFIG = %s;
var JSON_SCENE = %s;
</script>""" % ('poolvr-%s' % version,
                json.dumps(config, indent=(2 if app.debug else None)),
                json.dumps(pool_hall(**config), indent=(2 if app.debug else None)))), **config)



@app.route('/log', methods=['POST'])
def log():
    """Post message from client to the server log
    """
    msg = request.form['msg']
    _logger.info(msg)
    response = {'status': 0}
    return jsonify(response)



def main():
    _logger.info("app.config:\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                for k, v in sorted(app.config.items(),
                                                                   key=operator.itemgetter(0))]))
    _logger.info("STARTING FLASK APP!!!!!!!!!!!!!")
    app.run(host='0.0.0.0')


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
