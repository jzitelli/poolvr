from copy import deepcopy
from . import *

class Object3D(Three):
    def __init__(self, name=None, position=(0,0,0), rotation=(0,0,0), scale=(1,1,1),
                 visible=None, castShadow=None, receiveShadow=None,
                 userData=None, layers=None, cannonData=None, **kwargs):
        Three.__init__(self, name)
        self.position = np.array(position, dtype=np.float64)
        self.rotation = np.array(rotation, dtype=np.float64)
        self.scale    = np.array(scale,    dtype=np.float64)
        self.children = []
        self.visible = visible
        self.castShadow = castShadow
        self.receiveShadow = receiveShadow
        if userData is None:
            userData = {}
        else:
            userData = deepcopy(userData)
        if layers is not None:
            userData['layers'] = list(layers)
        if cannonData is not None:
            userData['cannonData'] = cannonData
        if userData:
            self.userData = userData
    def add(self, *objs):
        self.children += objs
    def find_geometries(self, geometries=None):
        if geometries is None:
            geometries = {}
        if hasattr(self, 'geometry'):
            geometries[self.geometry.uuid] = self.geometry
        for c in self.children:
            c.find_geometries(geometries)
        return geometries
    def find_materials(self, materials=None):
        if materials is None:
            materials = {}
        if hasattr(self, 'material'):
            materials[self.material.uuid] = self.material
        for c in self.children:
            c.find_materials(materials)
        return materials
    def find_textures(self):
        textures = {}
        materials = self.find_materials()
        for mat in materials.values():
            if hasattr(mat, 'map'):
                textures[mat.map.uuid] = mat.map
            if hasattr(mat, 'bumpMap'):
                textures[mat.bumpMap.uuid] = mat.bumpMap
        return textures
    def find_images(self, images=None):
        if images is None:
            images = {}
            textures = self.find_textures()
            for tex in textures.values():
                if hasattr(tex, 'image'):
                    images[tex.image.uuid] = tex.image
        for c in self.children:
            c.find_images(images=images)
        return images
    def json(self):
        d = Three.json(self)
        d['position'] = list(self.position.ravel())
        d['rotation'] = list(self.rotation.ravel())
        d['scale'] = list(self.scale.ravel())
        d['children'] = [c.json() for c in self.children]
        d.update({k: v for k, v in self.__dict__.items()
                  if v is not None and k not in d})
        return d
    def export(self, geometries=None, materials=None, textures=None, images=None,
               url_prefix=""):
        if geometries is None:
            geometries = self.find_geometries()
        if materials is None:
            materials = self.find_materials()
        if textures is None:
            textures = self.find_textures()
        if images is None:
            images = self.find_images()
        d = {'object': self.json(),
             "geometries": [g.json() for g in geometries.values()],
             "materials": [m.json() for m in materials.values()],
             "textures": [t.json() for t in textures.values()],
             "images": [i.json() for i in images.values()]}
        for imagejson in d['images']:
            imagejson['url'] = url_prefix + imagejson['url']
        d['metadata'] = {'version': 4.4,
                         'type': 'Object',
                         'generator': 'three.py'}
        return d


class Scene(Object3D):
    def __init__(self, **kwargs):
        Object3D.__init__(self, **kwargs)


class Mesh(Object3D):
    def __init__(self, geometry=None, material=None, **kwargs):
        Object3D.__init__(self, **kwargs)
        self.geometry = geometry
        self.material = material
    def json(self):
        d = Object3D.json(self)
        try:
            d.update({"material": unicode(self.material.uuid),
                      "geometry": unicode(self.geometry.uuid)})
        except NameError:
            d.update({"material": str(self.material.uuid),
                      "geometry": str(self.geometry.uuid)})
        return d


class Points(Object3D):
    def __init__(self, geometry=None, material=None, **kwargs):
        Object3D.__init__(self, **kwargs)
        self.geometry = geometry
        self.material = material
    def json(self):
        d = Object3D.json(self)
        try:
            d.update({"material": unicode(self.material.uuid),
                      "geometry": unicode(self.geometry.uuid)})
        except NameError:
            d.update({"material": str(self.material.uuid),
                      "geometry": str(self.geometry.uuid)})
        return d
