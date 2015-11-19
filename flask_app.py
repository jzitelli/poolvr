"""Flask application for serving poolvr.
"""
import os
import logging
_logger = logging.getLogger(__name__)
import json
import operator

from flask import Flask, render_template, request, Markup, jsonify
STATIC_FOLDER = os.getcwd()
TEMPLATE_FOLDER = os.path.join(os.getcwd(), 'templates')
app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            template_folder=TEMPLATE_FOLDER,
            static_url_path='')
import site_settings
app.config.from_object(site_settings)


from . import pool_table


# TODO: centralize poolvr args definitions, dynamically generated option portal page
def get_poolvr_args(max=None):
    args = dict()
    args['useBasicMaterials']   = request.args.get('useBasicMaterials', 'true')
    args['useLambertMaterials'] = request.args.get('useLambertMaterials')
    args['usePhongMaterials']   = request.args.get('usePhongMaterials')
    args['shadowMap']           = request.args.get('shadowMap', 'false')
    args['oldBoilerplate']      = request.args.get('oldBoilerplate')
    for k, v in args.items():
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
    if not args['useBasicMaterials']:
        if args['useLambertMaterials'] is None:
            args['useLambertMaterials'] = True
        if args['usePhongMaterials'] is None:
            args['usePhongMaterials'] = True
    return args



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
</script>""" % json.dumps(pool_table.pool_hall(**args),
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
