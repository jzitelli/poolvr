"""See http://flask.pocoo.org/docs/0.10/testing/
"""
import unittest
from flask_app import app as flask_app


class EndpointsTest(unittest.TestCase):
    def setUp(self):
        flask_app.config['TESTING'] = True
        self.app = flask_app.test_client()

    def test_poolvr(self):
        response = self.app.get('/poolvr')
        print(response)
        assert(response)
        response = self.app.get(r'/poolvr?useBasicMaterials=false')
        print(response)
        assert(response)
        response = self.app.get('/poolvr?shadowMap=true')
        print(response)
        assert(response)
        response = self.app.get('/poolvr?pyserver=false')
        print(response)
        assert(response)

    def test_poolvr_config(self):
        response = self.app.get('/poolvr/config')
        print(response)
        assert(response)
        response = self.app.get('/poolvr/config?cubeMap=true')
        print(response)
        assert(response)
        response = self.app.get('/poolvr/config?useBasicMaterials=false')
        print(response)
        assert(response)
        response = self.app.get('/poolvr/config?shadowMap=true')
        print(response)
        assert(response)

    def test_log(self):
        response = self.app.post('/log', data={'msg': 'testing 1 w23 gaemah'})
        print(response)
        assert(response)

    def test_poolvr_version(self):
        response = self.app.get('/poolvr?version=0.1.0')
        print(response)
        assert(response)
        response = self.app.get(r'/poolvr?version=0.1.0&useBasicMaterials=false')
        print(response)
        assert(response)
        response = self.app.get('/poolvr?version=0.1.0&shadowMap=true')
        print(response)
        assert(response)
        response = self.app.get('/poolvr?version=0.1.0&pyserver=false')
        print(response)
        assert(response)


if __name__ == "__main__":
    unittest.main()
