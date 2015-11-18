"""Flask application for serving poolvr.
"""
import os
import logging
_logger = logging.getLogger(__name__)
import json

from flask import Flask, render_template, request, Markup, jsonify
STATIC_FOLDER = os.getcwd()
TEMPLATE_FOLDER = os.path.join(os.getcwd(), 'templates')
app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            template_folder=TEMPLATE_FOLDER,
            static_url_path='')
import site_settings
app.config.from_object(site_settings)


from pool_table import pool_hall


@app.route('/')
def poolvr():
    """Serves the app HTML (dynamically generated version)"""
    basicMaterials = request.args.get('basicMaterials', True)
    if basicMaterials == 'false':
        basicMaterials = False
    return render_template('poolvr.html',
                           json_config=Markup(r"""<script>
var JSON_SCENE = %s;
</script>""" % json.dumps(pool_hall(basicMaterials=basicMaterials),
                          indent=(2 if app.debug else None))))


@app.route('/log', methods=['POST'])
def log():
    msg = request.form['msg']
    _logger.info(msg)
    response = {'status': 0}
    return jsonify(response)


@app.route('/release')
def poolvr_release():
    """Serves the app HTML (dynamically generated version)"""
    basicMaterials = request.args.get('basicMaterials', True)
    if basicMaterials == 'false':
        basicMaterials = False
    version = request.args.get('version', '0.1.0')
    return render_template('poolvr.%s.html' % version,
                           json_config=Markup(r"""<script>
var JSON_SCENE = %s;
</script>""" % json.dumps(pool_hall(basicMaterials=basicMaterials),
                          indent=(2 if app.debug else None))))


def main():
    _logger.info("app.config:\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                for k, v in sorted(app.config.items(), key=lambda i: i[0])]))
    _logger.info("press CTRL-C to terminate the server")
    app.run(host='0.0.0.0')


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
