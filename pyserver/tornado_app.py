"""
"""
import os
import logging
_logger = logging.getLogger(__name__)
from operator import itemgetter

from tornado.wsgi import WSGIContainer
from tornado.web import Application, FallbackHandler
from tornado.ioloop import IOLoop

import sys
#sys.path.append(os.getcwd())
sys.path.insert(0, os.path.join(os.path.split(__file__)[0], os.path.pardir))
import pyserver
import pyserver.flask_app as flask_app
import pyserver.site_settings as site_settings
app_flask = flask_app.app

websocket_handlers = []
handlers = websocket_handlers + [(r'.*', FallbackHandler, dict(fallback=WSGIContainer(app_flask)))]


def make_app():
    return Application(handlers, debug=app_flask.debug)


def main():
    _logger.info("app_flask.config:\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                      for k, v in sorted(app_flask.config.items(), key=itemgetter(0))]))
    app = make_app()
    _logger.info("app.settings:\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                  for k, v in sorted(app.settings.items(), key=itemgetter(0))]))
    port = app_flask.config.get('PORT', 5000)
    app.listen(port)
    _logger.info("STATIC_FOLDER   = %s" % flask_app.STATIC_FOLDER)
    _logger.info("listening on port %d" % port)
    _logger.info("press CTRL-C to terminate the server")
    _logger.info("""
                *
           ***********
    *************************
*********************************
STARTING TORNADO APP!!!!!!!!!!!!!
*********************************
    *************************
           ***********
                *
""")
    IOLoop.instance().start()


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app_flask.debug else logging.INFO),
                        format="%(asctime)s: %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
