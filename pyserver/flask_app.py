"""Flask based server for poolvr.

This server is more minimal than tornado_app.py (which piggybacks on the functionality of this module).

Run the script from the poolvr root directory, i.e. ::

    [ ... poolvr]$ python pyserver/flask_app.py

"""

import os
import sys
import logging
import subprocess
import json
import socket
try:
    from StringIO import StringIO
except ImportError:
    from io import StringIO

from flask import Flask, render_template, render_template_string, request, jsonify, Markup
import default_settings

STATIC_FOLDER = os.getcwd()
TEMPLATE_FOLDER = os.path.join(os.getcwd(), 'pyserver', 'templates')
app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            template_folder=TEMPLATE_FOLDER,
            static_url_path='')
app.config.from_object(default_settings)

import scenes


_logger = logging.getLogger(__name__)


index_path = os.path.join(STATIC_FOLDER, 'index.html')
index_html = "couldn't load %s" % index_path
with open(index_path) as f:
    index_html = f.read()


@app.route('/')
def index():
    """Serves the app HTML (static version)"""
    return render_template_string(index_html)


@app.context_processor
def js_suffix():
    if app.debug:
        return {'js_suffix': '.js'}
    else:
        return {'js_suffix': '.min.js'}


@app.route('/poolvr')
def poolvr():
    """Serves the app HTML (dynamically generated version)"""
    if (app.debug or app.testing) and app.config.get('ALWAYS_GRUNT'):
        subprocess.call("grunt quick", shell=True)
    scene = request.args.get('scene', 'pool_hall')
    return render_template('poolvr.html',
        json_config=Markup(r"""<script>
var JSON_CONFIG = %s;
var JSON_SCENE = %s;
</script>""" % (json.dumps({k: v for k, v in app.config.items()
                            if k in ['DEBUG', 'TESTING', 'WEBSOCKETS']}),
                json.dumps(getattr(scenes, scene)(),
                           indent=(2 if app.debug else None)))))


@app.route('/pyexec', methods=['POST'])
def pyexec():
    """Handles Python execution requests.  The JSON formatted response can have the following properties:
        'return_value' - by convention, if any value is assigned to a local variable called 'return_value' when the
                         execution finishes successfully, it will be copied/serialized here
        'stdout'       - output to stdout which was performed during execution
        'error'        - if an error occured during execution, the string representation of the raised Python exception
    """
    src = request.form['src']
    # see http://stackoverflow.com/q/5136611/1911963 :
    stdout_bak = sys.stdout
    sys.stdout = StringIO()
    execlocals = locals()
    execlocals.pop("stdout_bak")
    execlocals.pop('return_value', None)
    error = None
    _logger.debug(src)
    try:
        exec(src, globals(), execlocals)
    except Exception as err:
        error = str(err)
        _logger.error("an exception occurred while attempting to execute Python code:\n%s" % error)
    finally:
        stdout = sys.stdout.getvalue()
        sys.stdout.close()
        sys.stdout = stdout_bak
    response = {'stdout': stdout}
    if 'return_value' in execlocals:
        response['return_value'] = execlocals['return_value']
    if error is not None:
        response['error'] = error
    return jsonify(response)


@app.route("/read")
def read():
    """Handles requests to read file contents"""
    filename = os.path.join(STATIC_FOLDER, request.args['file'])
    response = {}
    try:
        with open(filename, 'r') as f:
            response['text'] = f.read()
    except Exception as err:
        response['error'] = str(err)
    return jsonify(response)


def main():
    app.config['WEBSOCKETS'] = []
    _logger.info("server's local IP:  %s" % socket.gethostbyname(socket.gethostname()))
    _logger.info("flask_app.config:\n%s\n" % str(app.config))
    _logger.info("STATIC_FOLDER = %s" % STATIC_FOLDER)
    _logger.info("TEMPLATE_FOLDER = %s" % TEMPLATE_FOLDER)
    if app.debug:
        port = 5000
    else:
        port = 80
    _logger.info("listening on port %d" % port)
    _logger.info("press CTRL-C to terminate the server")
    app.run(host='0.0.0.0')


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else None),
                        format="%(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
