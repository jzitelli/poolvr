"""See http://flask.pocoo.org/docs/0.10/testing/
"""
import unittest

from needle.cases import NeedleTestCase

from flask_app import app as flask_app


class StartConfiguratorTest(NeedleTestCase):
    def setUp(self):
        flask_app.debug = True
        flask_app.config['TESTING'] = True
        self.app = flask_app.test_client()
    def test_screenshotEGA(self):
        self.driver.get('127.0.0.1:5000/poolvr/config')
        self.assertScreenshot('#renderer', 'configurator_screenshotEGA')
    def test_screenshotVGA(self):
        self.driver.get('127.0.0.1:5000/poolvr/config?useBasicMaterials=false')
        self.assertScreenshot('#renderer', 'configurator_screenshotVGA')
    def test_screenshotSVGA(self):
        self.driver.get('127.0.0.1:5000/poolvr/config?useBasicMaterials=false&shadowMap=true')
        self.assertScreenshot('#renderer', 'configurator_screenshotSVGA')


class StartPOOLVRTest(NeedleTestCase):
    def setUp(self):
        flask_app.debug = True
        flask_app.config['TESTING'] = True
        self.app = flask_app.test_client()
    def test_screenshotEGA(self):
        self.driver.get('127.0.0.1:5000/poolvr')
        self.assertScreenshot('#renderer', 'poolvr_screenshotEGA')
    def test_screenshotVGA(self):
        self.driver.get('127.0.0.1:5000/poolvr?useBasicMaterials=false')
        self.assertScreenshot('#renderer', 'poolvr_screenshotVGA')
    def test_screenshotSVGA(self):
        self.driver.get('127.0.0.1:5000/poolvr?useBasicMaterials=false&shadowMap=true')
        self.assertScreenshot('#renderer', 'poolvr_screenshotSVGA')


if __name__ == "__main__":
    unittest.main()
