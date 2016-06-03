from scipy import ndimage
from . import *


class HeightfieldMesh(Mesh):
    def __init__(self, heightfieldImage=None, heightfieldScale=1, width=None, height=None, **kwargs):
        image = ndimage.imread(heightfieldImage.url)
        if width is None:
            width = image.shape[0]
        if height is None:
            height = image.shape[1]
        geometry = PlaneBufferGeometry(widthSegments=image.shape[0]-1, heightSegments=image.shape[1]-1,
                                       width=width, height=height)
        Mesh.__init__(self, geometry=geometry, **kwargs)
        if not hasattr(self, 'userData'):
            self.userData = {}
        self.userData['heightfieldImage'] = str(heightfieldImage.uuid)
        self.userData['heightfieldScale'] = heightfieldScale
        self.heightfieldImage = heightfieldImage
    def find_images(self, images=None):
        images = Mesh.find_images(self, images=images)
        images[self.heightfieldImage.uuid] = self.heightfieldImage
        return images
    def json(self):
        d = Mesh.json(self)
        d['type'] = 'Mesh'
        d.pop('heightfieldImage')
        return d
