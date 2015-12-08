"""
"""
import os
import logging
_logger = logging.getLogger(__name__)
from operator import itemgetter

from tornado.wsgi import WSGIContainer
from tornado.web import Application, FallbackHandler, StaticFileHandler
from tornado.ioloop import IOLoop

from flask_app import app, site_settings, STATIC_FOLDER, three
app_flask = app

websocket_handlers = []
# if site_settings.GFXTABLET:
#     from GfxTablet import GfxTabletHandler
#     websocket_handlers.append((r'/gfxtablet', GfxTabletHandler))
# from PointerEventHandler import PointerEventHandler
# from TouchEventHandler import TouchEventHandler
# if site_settings.POINTEREVENTS:
#     websocket_handlers.append((r'/pointerevents', PointerEventHandler))
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
    _logger.info("STATIC_FOLDER   = %s" % STATIC_FOLDER)
    _logger.info("listening on port %d" % port)
    _logger.info("three.THREE_VERSION = %s" % three.THREE_VERSION)
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
