from . import *

class Geometry(Three):
    def __init__(self, name=None, vertices=None, colors=None, faces=None):
        Three.__init__(self, name)
        self.vertices = vertices
        self.colors = colors
        self.faces = faces
    def json(self):
        d = Three.json(self)
        d.update({k: v for k, v in self.__dict__.items() if k not in d and v is not None})
        return d


class BoxGeometry(Geometry):
    def __init__(self, width=1, height=1, depth=1, widthSegments=1, heightSegments=1, depthSegments=1, **kwargs):
        Three.__init__(self, **kwargs)
        self.width = width
        self.height = height
        self.depth = depth
        self.widthSegments = widthSegments
        self.heightSegments = heightSegments
        self.depthSegments = depthSegments


class CylinderGeometry(Geometry):
    def __init__(self, radiusTop=20, radiusBottom=20, height=100,
                 radialSegments=8, heightSegments=1,
                 openEnded=False, thetaStart=None, thetaLength=None, **kwargs):
        Three.__init__(self)
        self.radiusTop = radiusTop
        self.radiusBottom = radiusBottom
        self.height = height
        self.radialSegments = radialSegments
        self.heightSegments = heightSegments
        self.openEnded = openEnded
        self.thetaStart = thetaStart
        self.thetaLength = thetaLength


class DodecahedronGeometry(Geometry):
    def __init__(self, radius=1, detail=0, **kwargs):
        Geometry.__init__(self)
        self.radius = radius
        self.detail = detail


class TorusGeometry(Three):
    def __init__(self, name=None, radius=100, tube=40, radialSegments=8, tubularSegments=6, arc=2*np.pi):
        Three.__init__(self, name)
        self.radius = radius
        self.tube = tube
        self.radialSegments = radialSegments
        self.tubularSegments = tubularSegments
        self.arc = arc


class OctahedronGeometry(Three):
    def __init__(self, name=None, radius=1, detail=0):
        Three.__init__(self, name)
        self.radius = radius
        self.detail = detail


class PolyhedronGeometry(Three):
    def __init__(self, name=None, vertices=None, faces=None, radius=None, detail=0):
        Three.__init__(self, name)
        self.vertices = vertices
        self.faces = faces
        self.radius = radius
        self.detail = detail
