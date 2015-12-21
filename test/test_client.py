import unittest

from needle.cases import NeedleTestCase

import sys
import os.path
sys.path.insert(0, os.path.join(os.path.split(__file__)[0], os.path.pardir))
from pyserver.flask_app import app


class ConfiguratorTest(NeedleTestCase):
    def setUp(self):
        app.debug = True
        app.config['TESTING'] = True
        self.app = app.test_client()
    def test_screenshotEGA(self):
        self.driver.get('127.0.0.1:5000/poolvr/config')
        self.assertScreenshot('#renderer', 'configurator_screenshotEGA')
    def test_screenshotVGA(self):
        self.driver.get('127.0.0.1:5000/poolvr/config?useBasicMaterials=false')
        self.assertScreenshot('#renderer', 'configurator_screenshotVGA')
    def test_screenshotSVGA(self):
        self.driver.get('127.0.0.1:5000/poolvr/config?useShadowMap=true')
        self.assertScreenshot('#renderer', 'configurator_screenshotSVGA')


class POOLVRTest(NeedleTestCase):
    def setUp(self):
        app.debug = True
        app.config['TESTING'] = True
        self.app = app.test_client()
    def test_screenshotEGA(self):
        self.driver.get('127.0.0.1:5000/poolvr')
        self.assertScreenshot('#renderer', 'poolvr_screenshotEGA')
    def test_screenshotVGA(self):
        self.driver.get('127.0.0.1:5000/poolvr?useBasicMaterials=false')
        self.assertScreenshot('#renderer', 'poolvr_screenshotVGA')
    def test_screenshotSVGA(self):
        self.driver.get('127.0.0.1:5000/poolvr?useShadowMap=true')
        self.assertScreenshot('#renderer', 'poolvr_screenshotSVGA')


if __name__ == "__main__":
    unittest.main()
