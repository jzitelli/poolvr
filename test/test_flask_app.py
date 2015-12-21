"""See http://flask.pocoo.org/docs/0.10/testing/
"""
import unittest
import sys
import os.path
sys.path.insert(0, os.path.join(os.path.split(__file__)[0], os.path.pardir))
from pyserver.flask_app import app


class EndpointsTest(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()

    def test_poolvr(self):
        response = self.app.get('/poolvr')
        print(response)
        assert(response)
        response = self.app.get(r'/poolvr?useBasicMaterials=false')
        print(response)
        assert(response)
        response = self.app.get(r'/poolvr?useShadowMap=true')
        print(response)
        assert(response)
        response = self.app.get(r'/poolvr?pyserver=false')
        print(response)
        assert(response)

    def test_poolvr_config(self):
        response = self.app.get('/poolvr/config')
        print(response)
        assert(response)
        response = self.app.get('/poolvr/config?skybox=true')
        print(response)
        assert(response)
        response = self.app.get('/poolvr/config?useBasicMaterials=false')
        print(response)
        assert(response)
        response = self.app.get('/poolvr/config?useShadowMap=true')
        print(response)
        assert(response)

    def test_log(self):
        response = self.app.post('/log', data={'msg': 'testing 1 w23 gaemah'})
        print(response)
        assert(response)

    # def test_poolvr_version(self):
    #     response = self.app.get('/poolvr?version=0.1.0')
    #     print(response)
    #     assert(response)
    #     response = self.app.get(r'/poolvr?version=0.1.0&useBasicMaterials=false')
    #     print(response)
    #     assert(response)
    #     response = self.app.get('/poolvr?version=0.1.0&shadowMap=true')
    #     print(response)
    #     assert(response)
    #     response = self.app.get('/poolvr?version=0.1.0&pyserver=false')
    #     print(response)
    #     assert(response)


if __name__ == "__main__":
    unittest.main()
