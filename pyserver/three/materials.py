from . import *

class Material(Three):
    def __init__(self, name=None, **kwargs):
        Three.__init__(self, name)
        self.__dict__.update(kwargs)
    def json(self):
        d = Three.json(self)
        for k in ['map', 'alphaMap', 'bumpMap', 'normalMap', 'displacementMap', 'specularMap', 'envMap', 'lightMap', 'aoMap']:
            if k in self.__dict__:
                try:
                    d[k] = unicode(self.__dict__[k].uuid)
                except NameError:
                    d[k] = str(self.__dict__[k].uuid)
        d.update({k: v for k, v in self.__dict__.items() if k not in d})
        return d


class MeshBasicMaterial(Material):
    pass


class MeshLambertMaterial(Material):
    pass


class MeshPhongMaterial(Material):
    pass


class ShaderMaterial(Material):
    def __init__(self, vertexShader=None, fragmentShader=None, uniforms=None, **kwargs):
        Material.__init__(self, **kwargs)
        self.vertexShader = vertexShader
        self.fragmentShader = fragmentShader
        self.uniforms = uniforms


class RawShaderMaterial(ShaderMaterial):
    pass


class Texture(Three):
    def __init__(self, name=None, minFilter=LinearMipMapLinearFilter, magFilter=LinearFilter, mapping=UVMapping, anisotropy=1, image=None, wrap=None, repeat=None):
        Three.__init__(self, name)
        self.minFilter = minFilter
        self.magFilter = magFilter
        self.mapping = mapping
        self.anisotropy = anisotropy
        self.image = image
        self.repeat = repeat
        self.wrap = wrap
    def json(self):
        d = Three.json(self)
        if self.image:
            try:
                d['image'] = unicode(self.image.uuid)
            except NameError:
                d['image'] = str(self.image.uuid)
        d.update({k: v for k, v in self.__dict__.items() if v is not None and k not in d})
        return d


class Image(Three):
    def __init__(self, name=None, url=None):
        Three.__init__(self, name)
        self.url = url
    def json(self):
        d = Three.json(self)
        if self.url:
            d['url'] = self.url
        return d
