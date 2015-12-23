import threading
import nose

import needle

import os.path
import sys
POOLVRDIR = os.path.abspath(os.path.join(os.path.split(__file__)[0], os.path.pardir))
sys.path.insert(0, POOLVRDIR)
from pyserver.flask_app import app, render_template, Markup, main, json, request

from test_client import POOLVRTest, ConfiguratorTest


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")

    app.config['TESTING'] = True
    app.debug = False

    def run_tests():
        nose.runmodule()

    client_thread = threading.Thread(target=run_tests, name='client')
    client_thread.start()

    main()
