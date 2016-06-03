from . import *

class Light(Object3D):
    def __init__(self, color=0xffffff, intensity=None, distance=None, shadowCameraNear=None, shadowCameraFar=None, shadowCameraFov=None, **kwargs):
        Object3D.__init__(self, **kwargs)
        self.color = color
        self.intensity = intensity
        self.distance = distance
        self.shadowCameraNear = shadowCameraNear
        self.shadowCameraFar = shadowCameraFar
        self.shadowCameraFov = shadowCameraFov


class AmbientLight(Light):
    pass


class PointLight(Light):
    pass


class DirectionalLight(Light):
    # TODO: specifying direction
    def __init__(self, target=None, **kwargs):
        Light.__init__(self, **kwargs)
        self.target = target


class SpotLight(Light):
    # TODO: set target (ObjectLoader does not support)
    def __init__(self, angle=None, exponent=None, decay=None, target=None, **kwargs):
        Light.__init__(self, **kwargs)
        self.angle = angle
        self.exponent = exponent
        self.decay = decay
        self.target = target
