from . import *

class TextGeometryError(Exception):
    pass

class TextGeometry(Three):
    def __init__(self, name=None, text=None, font_url=None, **parameters):
        if font_url is None:
            raise TextGeometryError('font_url must be specified')
        Three.__init__(self, name)
        self.text = text
        self.font_url = font_url
        self.parameters = parameters
    def json(self):
        d = Three.json(self)
        d['text'] = self.text
        d['font_url'] = self.font_url
        d['parameters'] = self.parameters
        return d
