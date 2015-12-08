"""Configuration three.js scene
"""
from copy import deepcopy
import numpy as np

from three import *
from pool_table import *


def config_scene(useBasicMaterials=True,
                 shadowMap=False,
                 pointLight=None,
                 url_prefix="",
                 L_table=2.3368,
                 H_table=0.74295,
                 ball_diameter=2.25*IN2METER,
                 **kwargs):
    scene = Scene()
    L_room, W_room = 10, 10
    floorMesh = Mesh(name="floorMesh", geometry=square,
                     material=MeshBasicMaterial(color=0xffffff,
                                                map=Texture(image=Image(url=url_prefix+"images/deck.png"),
                                                            repeat=[4*L_room, 4*W_room], wrap=[RepeatWrapping, RepeatWrapping])),
                     position=[0, 0, 0],
                     scale=[L_room, 1, W_room],
                     userData={'cannonData': {'mass': 0,
                                              'shapes': ['Plane']}})
    scene.add(floorMesh)

    if pointLight:
        light = PointLight(color=0xaa8866, position=[4, 5, 2.5], intensity=0.8, distance=40)
        scene.add(light)

    poolTable = pool_table(L_table=L_table, H_table=H_table, ball_diameter=ball_diameter,
                           useBasicMaterials=useBasicMaterials, shadowMap=shadowMap, pointLight=pointLight, **kwargs)
    scene.add(poolTable)

    # balls:
    num_balls = len(ball_colors)
    ball_radius = ball_diameter / 2
    sphere = SphereBufferGeometry(radius=ball_radius,
                                  widthSegments=16,
                                  heightSegments=12)
    stripeGeom = SphereBufferGeometry(radius=1.023*ball_radius,
                                      widthSegments=16,
                                      heightSegments=8,
                                      thetaStart=np.pi/3,
                                      thetaLength=np.pi/3)
    shadowGeom = CircleBufferGeometry(name='shadowGeom',
                                      radius=ball_radius,
                                      segments=16)
    shadowMaterial = MeshBasicMaterial(color=0x002200)

    if useBasicMaterials:
        ball_materials = [MeshBasicMaterial(color=color) for color in ball_colors]
    else:
        ball_materials = [MeshPhongMaterial(color=color, shading=SmoothShading) for color in ball_colors]

    ballData = {'cannonData': {'mass': 0.17, 'shapes': ['Sphere'],
                               'linearDamping': 0.2, 'angularDamping': 0.25}}

    y_position = H_table + ball_radius + 0.0001 # epsilon distance which the ball will fall from initial position

    # diagonal line:
    # z_positions = 0.8 * np.linspace(-L_table / 2, L_table / 2, num_balls - 1)
    # x_positions = 0.5 * z_positions
    # x_positions = [0] + list(x_positions)
    # z_positions = [L_table / 4] + list(z_positions)

    # triangle racked:
    d = 0.05*ball_radius # separation between racked balls
    side_length = 4 * (ball_diameter + d)
    x_positions = np.concatenate([np.linspace(0,                        0.5 * side_length,                         5),
                                  np.linspace(-0.5*(ball_diameter + d), 0.5 * side_length - (ball_diameter + d),   4),
                                  np.linspace(-(ball_diameter + d),     0.5 * side_length - 2*(ball_diameter + d), 3),
                                  np.linspace(-1.5*(ball_diameter + d), 0.5 * side_length - 3*(ball_diameter + d), 2),
                                  np.array([  -2*(ball_diameter + d)])])
    z_positions = np.concatenate([np.linspace(0,                                    np.sqrt(3)/2 * side_length, 5),
                                  np.linspace(0.5*np.sqrt(3) * (ball_diameter + d), np.sqrt(3)/2 * side_length, 4),
                                  np.linspace(np.sqrt(3) * (ball_diameter + d),     np.sqrt(3)/2 * side_length, 3),
                                  np.linspace(1.5*np.sqrt(3) * (ball_diameter + d), np.sqrt(3)/2 * side_length, 2),
                                  np.array([  np.sqrt(3)/2 * side_length])])
    z_positions *= -1
    z_positions -= L_table / 8

    # cue ball at head spot:
    x_positions = [0] + list(x_positions)
    z_positions = [L_table / 4] + list(z_positions)

    for i, material in enumerate(ball_materials[:9] + 7*[ball_materials[0]]):
        rotation = [0, 0, 0]
        ballMesh = Mesh(name="ball %d" % i,
                        geometry=sphere,
                        position=[x_positions[i], y_position, z_positions[i]],
                        rotation=rotation,
                        material=material,
                        userData=ballData,
                        castShadow=True)
        scene.add(ballMesh)
        if i > 8:
            stripeMesh = Mesh(name="ballStripeMesh %d" % i,
                              material=ball_materials[i-8],
                              geometry=stripeGeom)
            ballMesh.add(stripeMesh)
        if not shadowMap:
            ballShadowMesh = Mesh(name="ballShadowMesh %d" % i,
                                  geometry=shadowGeom,
                                  material=shadowMaterial,
                                  position=[0, -ball_radius + 0.001, 0],
                                  rotation=[-0.5*np.pi - rotation[0], -rotation[1], -rotation[2]])
            ballMesh.add(ballShadowMesh)

    textGeom = TextGeometry(text="POOLVR", font='anonymous pro', height=0, size=0.4, curveSegments=2)
    textMaterial = MeshBasicMaterial(color=0xff0000)
    textMesh = Mesh(geometry=textGeom,
                    material=textMaterial,
                    position=[0, 1.1, -0.5*L_table - 1])
    scene.add(textMesh)

    return scene
