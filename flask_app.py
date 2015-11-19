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

ARGS = {'useBasicMaterials'  :   True,
        'useLambertMaterials':   None,
        'usePhongMaterials'  :   None,
        'shadowMap'          :   None,
        'oldBoilerplate'     :   None}
def get_poolvr_args(max=None):
    args = deepcopy(ARGS)
    args.update(deepcopy(request.args))
    for k, v in list(args.items()):
        if v == 'false':
            args[k] = False
        elif v == 'true':
            args[k] = True
        elif v is not None:
            try:
                args[k] = float(v)
            except Exception as err:
                _logger.warning(err)
                _logger.warning(str(args.pop(k)))
    # if not args['useBasicMaterials']:
    #     if args['useLambertMaterials'] is None:
    #         args['useLambertMaterials'] = True
    #     if args['usePhongMaterials'] is None:
    #         args['usePhongMaterials'] = True
    _logger.debug(args)
    return args



@app.route('/config')
def poolvr_config():
    """Serves the app configuration menu HTML"""
    args = get_poolvr_args()
    _logger.info('\n****** POOLVR ARGS ******')
    _logger.info('\n'.join(['%s: %s' % (k, v)
                            for k, v in sorted(args.items(), key=operator.itemgetter(0))]))
    return render_template('config.html',
                           json_config=Markup(r"""<script>
var JSON_SCENE = %s;
</script>""" % json.dumps(pool_hall(**args),
                          indent=(2 if app.debug else None))),
                           poolvr_config=Markup(r"""<code>
POOLVR.config = %s;
</code>""" % json.dumps(args, indent=2)), **args)



@app.route('/')
def poolvr():
    """Serves the app HTML"""
    args = get_poolvr_args()
    _logger.info('\n****** POOLVR REQUEST ******')
    _logger.info('\n'.join(['%s: %s' % (k, v)
                            for k, v in sorted(args.items(), key=operator.itemgetter(0))]))
    return render_template('poolvr.html',
                           json_config=Markup(r"""<script>
var JSON_SCENE = %s;
</script>""" % json.dumps(pool_hall(**args),
                          indent=(2 if app.debug else None))), **args)



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
    args = get_poolvr_args()
    _logger.info('\n****** POOLVR REQUEST ******')
    _logger.info('\n'.join(['%s: %s' % (k, v)
                            for k, v in sorted(args.items(), key=operator.itemgetter(0))]))
    version = request.args.get('version', '0.1.0')
    return render_template('poolvr.%s.html' % version,
                           json_config=Markup(r"""<script>
var JSON_SCENE = %s;
</script>""" % json.dumps(pool_hall(**args),
                          indent=(2 if app.debug else None))), **args)



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
