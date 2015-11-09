"""Collection of functions which generate three.js scenes."""
from copy import deepcopy

from three import *

FT2METERS = 0.3048
IN2METERS = 0.0254

square = RectangleBufferGeometry(vertices=[[-0.5, 0, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5]],
                                 uvs=[(0,1), (0,0), (1,0), (1,1)])


def pool_hall():
    scene = Scene()
    L, W = 7, 7
    scene.add(PointLight(color=0x225522, position=[6, 2, 0.5], intensity=0.5))
    floor = Mesh(name="floor", geometry=square,
                 material=MeshBasicMaterial(color=0xffffff,
                                            map=Texture(image=Image(url="images/parque64.png"), repeat=[L, W], wrap=[RepeatWrapping, RepeatWrapping])),
                 position=[0, 0, 0],
                 scale=[L,1,W])
    scene.add(floor)
    # 8ft table:
    y_table = 0.876
    pool_table = Mesh(geometry=BoxGeometry(1.17, y_table, 2.34),
                      material=MeshPhongMaterial(color=0x00aa00, shininess=5), #MeshLambertMaterial(color=0x00aa00),
                      position=[0, y_table / 2, 0],
                      receiveShadow=True,
                      userData={'cannonData': {'mass': 0, 'shapes': ['Box']}})
    scene.add(pool_table)
    # TODO: lights casting shadows w/ CrapLoader
    # spotLight = SpotLight(color=0xffffff, intensity=2, distance=6, position=[0, 3*y_table, 0],
    #                       castShadow=True, shadowCameraNear=0.2, shadowCameraFar=2*y_table, shadowCameraFov=80)
    # scene.add(spotLight)
    radius = 0.05715 / 2
    sphere = SphereBufferGeometry(radius=radius, widthSegments=16, heightSegments=32)
    userData = {'cannonData': {'mass': 0.17, 'shapes': ['Sphere']}}
    cue_ball = Mesh(geometry=sphere,
                    material=MeshPhongMaterial(color=0xeeeeee),
                    position=[0, y_table + radius + 0.001, 0.7],
                    castShadow=True,
                    userData=userData)
    scene.add(cue_ball)
    ball01 = Mesh(geometry=sphere, material=MeshPhongMaterial(color=0xee0000),
                  position=[0, y_table + radius + 0.001, -0.7], castShadow=True, userData=userData)
    scene.add(ball01)
    ball02 = Mesh(geometry=sphere, material=MeshPhongMaterial(color=0x00ee00),
                  position=[0, y_table + radius + 0.001, 0], castShadow=True, userData=userData)
    scene.add(ball02)
    ball03 = Mesh(geometry=sphere, material=MeshPhongMaterial(color=0xddee00),
                  position=[1.17 / 3, y_table + radius + 0.001, 0], castShadow=True, userData=userData)
    scene.add(ball03)
    # if ShaderLib is not None:
    #     shader = deepcopy(ShaderLib['cube'])
    #     shader['uniforms']['tCube']['value'] = ["images/skybox/%s.jpg" % pos
    #                                             for pos in ('px', 'nx', 'py', 'ny', 'pz', 'nz')]
    #     scene.add(Mesh(geometry=BoxGeometry(900, 900, 900),
    #                    material=ShaderMaterial(side=BackSide, **shader)))
    return scene.export()
