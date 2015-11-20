"""Flask application for serving poolvr.
"""
import os
import logging
_logger = logging.getLogger(__name__)
import json
import operator
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

POOLVR_PYTHONPATH = os.environ.get('POOLVR_PYTHONPATH', os.path.pardir)
sys.path.append(POOLVR_PYTHONPATH)
import poolvr
from poolvr.pool_table import pool_hall

POOLVR_CONFIG = {
    'gravity'               : 9.8,
    'leapDisabled'          : False,
    'leapHandsDisabled'     : False,
    'mouseControlsEnabled'  : False,
    'gamepadControlsEnabled': True,
    'useBasicMaterials'     : True,
    'useLambertMaterials'   : False,
    'usePhongMaterials'     : False,
    'shadowMap'             : False,
    'oldBoilerplate'        : False
}

def get_poolvr_config():
    config = deepcopy(POOLVR_CONFIG)
    config.update({k: v
                   for k, v in request.args.items()
                   if k in POOLVR_CONFIG})
    for k, v in list(config.items()):
        if v == 'false':
            config[k] = False
        elif v == 'true':
            config[k] = True
        elif v is not None:
            try:
                config[k] = float(v)
            except Exception as err:
                _logger.warning(err)
                _logger.warning(str(config.pop(k)))
    if not config['useBasicMaterials']:
        if config['useLambertMaterials'] is None:
            config['useLambertMaterials'] = True
        if config['usePhongMaterials'] is None:
            config['usePhongMaterials'] = True
    _logger.debug(config)
    return config



@app.route('/config', methods=['GET', 'POST'])
def poolvr_config():
    """Serves the app configuration data / menu HTML"""
    config = get_poolvr_config()
    return render_template('config.html',
                           json_config=Markup(r"""<script>
var JSON_SCENE = %s;
var POOLVR_CONFIG = %s;
</script>""" % (json.dumps(pool_hall(**config),
                           indent=(2 if app.debug else None)),
                json.dumps(config,
                           indent=(2 if app.debug else None)))), **config)



@app.route('/')
def poolvr():
    """Serves the app HTML"""
    config = get_poolvr_config()
    return render_template('poolvr.html',
                           json_config=Markup(r"""<script>
var JSON_SCENE = %s;
var POOLVR_CONFIG = %s;
</script>""" % (json.dumps(pool_hall(**config),
                           indent=(2 if app.debug else None)),
                json.dumps(config))), **config)



@app.route('/log', methods=['POST'])
def log():
    """Post message from client to the server log
    """
    msg = request.form['msg']
    _logger.info(msg)
    response = {'status': 0}
    return jsonify(response)



@app.route('/release')
def poolvr_release():
    """Serves the app HTML (tagged releases)"""
    config = get_poolvr_config()
    _logger.info('\n****** POOLVR REQUEST ******')
    _logger.info('\n'.join(['%s: %s' % (k, v)
                            for k, v in sorted(config.items(), key=operator.itemgetter(0))]))
    version = request.args.get('version', '0.1.0')
    return render_template('poolvr.%s.html' % version,
                           json_config=Markup(r"""<script>
var JSON_SCENE = %s;
</script>""" % json.dumps(pool_hall(**config),
                          indent=(2 if app.debug else None))), **config)



def main():
    _logger.info("app.config:\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                for k, v in sorted(app.config.items(),
                                                                   key=operator.itemgetter(0))]))
    _logger.info("press CTRL-C to terminate the server")
    app.run(host='0.0.0.0')


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
