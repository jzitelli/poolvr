"""
"""
import os
import logging
import operator

from tornado.wsgi import WSGIContainer
from tornado.web import Application, FallbackHandler, StaticFileHandler
from tornado.ioloop import IOLoop

from flask_app import app, site_settings, STATIC_FOLDER, TEMPLATE_FOLDER
app_flask = app

#from gfxtablet import GFXTabletHandler
#from PointerEventHandler import PointerEventHandler
#from TouchEventHandler import TouchEventHandler


_logger = logging.getLogger(__name__)


websocket_handlers = []
if site_settings.GFXTABLET:
    websocket_handlers.append((r'/gfxtablet', GFXTabletHandler))
# if site_settings.POINTEREVENTS:
#     websocket_handlers.append((r'/pointerevents', PointerEventHandler))
handlers = websocket_handlers + [(r'.*', FallbackHandler, dict(fallback=WSGIContainer(app_flask)))]


def main():
    _logger.info("app_flask.config:\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                      for k, v in sorted(app_flask.config.items(), key=operator.itemgetter(0))]))

    app = Application(handlers,
                      debug=app_flask.debug)

    _logger.info("app.settings:\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                  for k, v in sorted(app.settings.items(), key=operator.itemgetter(0))]))

    port = app_flask.config.get('PORT', 5000)
    app.listen(port)

    _logger.info("STATIC_FOLDER   = %s" % STATIC_FOLDER)
    _logger.info("TEMPLATE_FOLDER = %s" % TEMPLATE_FOLDER)
    _logger.info("listening on port %d" % port)
    _logger.info("starting IO loop...")
    _logger.info("press CTRL-C to terminate the server")
    IOLoop.instance().start()


if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s: %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
