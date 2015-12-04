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
            #template_folder=TEMPLATE_FOLDER,
            static_url_path='')
import site_settings
app.config.from_object(site_settings)


import pool_table
import three


POOLVR = {
    'config': {
        'pyserver'              : True,
        'gravity'               : 9.8,
        'useBasicMaterials'     : True,
        'useLambertMaterials'   : None,
        'usePhongMaterials'     : None,
        'shadowMap'             : None,
        'pointLight'            : None,
        'H_table'               : 0.74295
    },
    'version': '0.1.0dev'
}


def get_poolvr_config():
    config = deepcopy(POOLVR['config'])
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
    return config



@app.context_processor
def js_suffix():
    if app.debug:
        return {'js_suffix': '.js'}
    else:
        return {'js_suffix': '.min.js'}



@app.route('/poolvr/config', methods=['GET', 'POST'])
def poolvr_config():
    """app configurator"""
    configScene = three.Scene().export()
    config = get_poolvr_config()
    return render_template('config.html',
                           json_config=Markup(r"""<script>
var JSON_SCENE = %s
</script>""" % configScene),
                           poolvr_config=json.dumps(config, indent=2))
# try:
#     model_dir = os.path.join(os.getcwd(), 'models')
#     with open(os.path.join(model_dir, 'ConfigUtilDeskScene.json')) as f:
#         configScene = json.loads(f.read())
#     def replace_urls(node):
#         for k, v in node.items():
#             if isinstance(v, str) and v[-4:] == '.png':
#                 node[k] = os.path.join('models', v)
#             elif isinstance(v, dict):
#                 replace_urls(v)
#     replace_urls(configScene)
# except Exception as err:
#     _logger.warning(err)
#     configScene = three.Scene().export()



@app.route('/poolvr')
def poolvr_app():
    """Serves the poolvr HTML app"""
    config = get_poolvr_config()
    version = request.args.get('version')
    if version is not None:
        template = 'poolvr-%s.html' % version
    else:
        template = 'poolvr.html'
        version = POOLVR['version']
    return render_template(template,
                           json_config=Markup(r"""<script>
var POOLVR = %s;

var JSON_SCENE = %s;
</script>""" % (json.dumps({'config' : config,
                            'version': version},
                           indent=2),
                json.dumps(pool_table.pool_hall(**config),
                           indent=(2 if app.debug else None)))), **config)



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
                                                                   key=lambda i: i[0])]))
    _logger.info("STARTING FLASK APP!!!!!!!!!!!!!")
    app.run(host='0.0.0.0')


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
