"""Flask application for serving poolvr.
"""
import os
import logging
_logger = logging.getLogger(__name__)
import json
from flask import Flask, render_template, request, Markup
STATIC_FOLDER = os.getcwd()
TEMPLATE_FOLDER = os.path.join(os.getcwd(), 'templates')
app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            template_folder=TEMPLATE_FOLDER,
            static_url_path='')

from pool_table import pool_hall


@app.route('/')
def poolvr():
    """Serves the app HTML (dynamically generated version)"""
    scene = request.args.get('scene', 'pool_hall')
    return render_template('poolvr.html',
                           json_config=Markup(r"""<script>
var JSON_SCENE = %s;
</script>""" % json.dumps(pool_hall(),
                          indent=(2 if app.debug else None))))


def main():
    _logger.info("press CTRL-C to terminate the server")
    app.run(host='0.0.0.0')


if __name__ == "__main__":
    app.debug = True
    logging.basicConfig(level=logging.DEBUG,
                        format="%(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
