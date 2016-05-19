import os.path
import logging
_logger = logging.getLogger(__name__)
from operator import itemgetter

from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.ioloop import IOLoop



config = {
    'DEBUG': True,
    'PORT' : 5000
}

HANDLERS = []

ROOT_DIR = os.path.abspath(os.path.join(os.path.split(__file__)[0], os.path.pardir))
GFXTABLET_DIR = os.path.join(ROOT_DIR, "node_modules", "gfxtablet")
if os.path.exists(GFXTABLET_DIR):
    import sys
    sys.path.insert(0, GFXTABLET_DIR)
    from GfxTablet import GfxTabletHandler
    HANDLERS.append((r'/gfxtablet', GfxTabletHandler))



class MainHandler(RequestHandler):
    def get(self):
        self.render("index.html")



def main():
    global HANDLERS
    HANDLERS += [(r'/(.+)', StaticFileHandler, {'path': ROOT_DIR}),
                 (r'/', MainHandler)]
    app = Application(HANDLERS,
                      debug=config.get('DEBUG', False), static_path=ROOT_DIR)

    _logger.info("app.settings:\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                  for k, v in sorted(app.settings.items(),
                                                                     key=itemgetter(0))]))

    port = config.get('PORT', 5000)

    app.listen(port)

    _logger.info("""

listening on port %d
press CTRL-c to terminate the server


             -----------
          Y  A  W  V  R  B
      *************************
  *********************************
  STARTING TORNADO APP!!!!!!!!!!!!!
  *********************************
      *************************
           Y  A  W  V  R  B
             -----------
""" % port)
    IOLoop.instance().start()



if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if config.get('DEBUG') else logging.INFO),
                        format="%(asctime)s: %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
