from . import *

class Object3D(Three):
    def __init__(self, name=None, position=(0,0,0), rotation=(0,0,0), scale=(1,1,1), visible=None, castShadow=None, receiveShadow=None, userData=None, **kwargs):
        # TODO: use kwargs, don't convert to ndarray?
        Three.__init__(self, name)
        self.position = np.array(position, dtype=np.float64)
        self.rotation = np.array(rotation, dtype=np.float64)
        self.scale = np.array(scale, dtype=np.float64)
        self.children = []
        if visible is not None:
            self.visible = visible
        if castShadow is not None:
            self.castShadow = castShadow
        if receiveShadow is not None:
            self.receiveShadow = receiveShadow
        if userData is not None:
            self.userData = userData
    def add(self, *objs):
        self.children += objs
    def find_geometries(self, geometries=None):
        if geometries is None:
            geometries = {}
        for c in self.children:
            if hasattr(c, 'geometry'):
                geometries[c.geometry.uuid] = c.geometry
            c.find_geometries(geometries)
        return geometries
    def find_materials(self, materials=None):
        if materials is None:
            materials = {}
        for c in self.children:
            if hasattr(c, 'material'):
                materials[c.material.uuid] = c.material
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
    def find_images(self):
        images = {}
        textures = self.find_textures()
        for tex in textures.values():
            if hasattr(tex, 'image'):
                images[tex.image.uuid] = tex.image
        return images
    def json(self):
        d = Three.json(self)
        # TODO: fix
        d['position'] = list(self.position.ravel())
        d['rotation'] = list(self.rotation.ravel())
        d['scale'] = list(self.scale.ravel())
        d['children'] = [c.json() for c in self.children]
        d.update({k: v for k, v in self.__dict__.items()
                  if v is not None and k not in d})
        return d
    def export(self, geometries=None, materials=None, textures=None, images=None):
        if geometries is None:
            geometries = self.find_geometries()
        if materials is None:
            materials = self.find_materials()
        if textures is None:
            textures = self.find_textures()
        if images is None:
            images = self.find_images()
        return {'object': self.json(),
                "geometries": [g.json() for g in geometries.values()],
                "materials": [m.json() for m in materials.values()],
                "textures": [t.json() for t in textures.values()],
                "images": [i.json() for i in images.values()]}


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


class PerspectiveCamera(Object3D):
    def __init__(self, fov=50, aspect=1, near=0.1, far=1000, **kwargs):
        Object3D.__init__(self, name=name, **kwargs)
        self.fov = fov
        self.aspect = aspect
        self.near = near
        self.far = far
