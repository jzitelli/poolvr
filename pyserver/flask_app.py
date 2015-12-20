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
app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            static_url_path='')
import site_settings
app.config.from_object(site_settings)

sys.path.append(os.getcwd())
import pyserver.pool_table as pool_table
import pyserver.config_scene as config_scene


WRITE_FOLDER = os.path.join(os.getcwd(), 'saves')

POOLVR = {
    'config': {
        'pyserver'              : True,
        'gravity'               : 9.8,
        'useBasicMaterials'     : True,
        'shadowMap'             : None,
        'pointLight'            : None,
        'L_table'               : 2.3368,
        'H_table'               : 0.74295,
        'ball_diameter'         : 2.25 * pool_table.IN2METER,
        'toolOffset'            : [0, -0.42, -0.4],
        'toolRotation'          : 0,
        'cubeMap'               : True,
        'tipShape'              : 'Cylinder'
    },
    'version': '0.1.0dev'
}


def get_poolvr_config():
    config = deepcopy(POOLVR['config'])
    # try:
    #     with open(os.path.join(WRITE_FOLDER, request.args.get('config', 'config.json'))) as f:
    #         config.update(json.loads(f.read()))
    # except Exception as err:
    #     _logger.warning(err);
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


@app.context_processor
def js_suffix():
    if app.debug:
        return {'js_suffix': '.js'}
    else:
        return {'js_suffix': '.min.js'}


@app.route('/poolvr')
def poolvr_app():
    """Serves the poolvr HTML app"""
    config = get_poolvr_config()
    config['initialPosition'] = [0, 0.98295, 1.0042]
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
                json.dumps(pool_table.pool_hall(**config).export(),
                           indent=(2 if app.debug else None)))), **config)


@app.route('/poolvr/config', methods=['GET', 'POST'])
def poolvr_config():
    """app configurator"""
    config = get_poolvr_config()
    config['initialPosition'] = [0, 0.9, 0.9]
    version = request.args.get('version', POOLVR['version'])
    configScene = config_scene.config_scene(url_prefix='../',
                                            **config)
    poolvr_config = json.dumps({'config' : config,
                                'version': version},
                               indent=2)
    return render_template('config.html',
                           json_config=Markup(r"""<script>
var POOLVR = %s;
var JSON_SCENE = %s;
</script>""" % (poolvr_config,
                json.dumps(configScene.export(), indent=2))))


@app.route('/log', methods=['POST'])
def log():
    """Post message from client to the server log
    """
    msg = request.form['msg']
    _logger.info(msg)
    response = {'status': 0}
    return jsonify(response)


if not os.path.exists(WRITE_FOLDER):
    raise Exception('write is disabled, you need to create the write folder %s' % WRITE_FOLDER)
@app.route("/write", methods=['POST'])
def write():
    filename = os.path.join(WRITE_FOLDER, os.path.split(request.args['file'])[1])
    try:
        if request.json is not None:
            with open(filename, 'w') as f:
                f.write(json.dumps(request.json,
                                   indent=2, sort_keys=True))
        else:
            with open(filename, 'w') as f:
                f.write(request.form['text'])
        response = {'filename': filename}
        _logger.info('wrote %s' % filename)
    except Exception as err:
        response = {'error': str(err)}
    return jsonify(response)


@app.route("/poolvr/config/save", methods=['POST'])
def save_config():
    filename = os.path.join(WRITE_FOLDER, os.path.split(request.args['file'])[1])
    try:
        with open(filename, 'w') as f:
            f.write(json.dumps(request.json,
                               indent=2, sort_keys=True))
        response = {'filename': filename}
        _logger.info('wrote %s' % filename)
    except Exception as err:
        response = {'error': str(err)}
    return jsonify(response)


def main():
    _logger.info("app.config =\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                for k, v in sorted(app.config.items(),
                                                                   key=lambda i: i[0])]))
    _logger.info("""
          ***********
   *************************
*******************************
STARTING FLASK APP!!!!!!!!!!!!!
*******************************
   *************************
          ***********
""")
    app.run(host='0.0.0.0')


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
