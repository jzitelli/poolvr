"""three.js pool table scene definition
"""

from copy import deepcopy
import numpy as np

from three import *

INCH2METER = 0.0254

def pool_hall():
    square = RectangleBufferGeometry(vertices=[[-0.5, 0, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5]],
                                     uvs=[(0,1), (0,0), (1,0), (1,1)])

    white  = 0xeeeeee
    yellow = 0xeeee00
    blue   = 0x0000ee
    red    = 0xee0000
    purple = 0xee00ee,
    orange = 0xee7700
    green  = 0x00ee00
    maroon = 0xee0077
    black  = 0x111111

    scene = Scene()

    # room:
    L_room, W_room = 10, 10
    floor = Mesh(name="floor", geometry=square,
                 material=MeshBasicMaterial(color=0xffffff,
                                            map=Texture(image=Image(url="images/deck.png"),
                                                        repeat=[4*L_room, 4*W_room], wrap=[RepeatWrapping, RepeatWrapping])),
                 position=[0, 0, 0],
                 scale=[L_room, 1, W_room],
                 userData={'cannonData': {'mass': 0,
                                          'shapes': ['Plane']}})
    scene.add(floor)
    scene.add(PointLight(color=0x775532, position=[4, 2, -2.5], intensity=0.7, distance=40))

    # 8 ft. table:
    L_table = 2.3368
    W_table = L_table / 2
    y_table = .74295 # 0.835

    feltMaterial = MeshPhongMaterial(color=0x00aa00, shininess=5)
    pool_table = Mesh(geometry=BoxGeometry(W_table, y_table, L_table),
                      material=feltMaterial, #MeshLambertMaterial(color=0x00aa00),
                      position=[0, y_table / 2, 0],
                      receiveShadow=True,
                      userData={'cannonData': {'mass': 0,
                                               'shapes': ['Box']}})
    scene.add(pool_table)

    W_cushion = 0.051
    ball_radius = 0.05715 / 2
    H_bumper = 0.635 * 2 * ball_radius
    head_rail = Mesh(geometry=BoxGeometry(W_table, H_bumper, W_cushion),
                     material=feltMaterial,
                     position=[0, y_table + H_bumper / 2, L_table / 2 + W_cushion / 2],
                     receiveShadow=True,
                     userData={'cannonData': {'mass': 0,
                                              'shapes': ['Box']}})
    scene.add(head_rail)
    foot_rail = Mesh(geometry=BoxGeometry(W_table, H_bumper, W_cushion),
                        material=feltMaterial,
                        position=[0, y_table + H_bumper / 2, -(L_table / 2 + W_cushion / 2)],
                        receiveShadow=True,
                        userData={'cannonData': {'mass': 0,
                                               'shapes': ['Box']}})
    scene.add(foot_rail)
    left_rail = Mesh(geometry=BoxGeometry(W_cushion, H_bumper, L_table),
                       material=feltMaterial,
                       position=[-(W_table / 2 + W_cushion / 2),
                                 y_table + H_bumper / 2,
                                 0],
                       receiveShadow=True,
                       userData={'cannonData': {'mass': 0,
                                                'shapes': ['Box']}})
    scene.add(left_rail)
    right_rail = Mesh(geometry=BoxGeometry(W_cushion, H_bumper, L_table),
                        material=feltMaterial,
                        position=[(W_table / 2 + W_cushion / 2),
                                  y_table + H_bumper / 2,
                                  0],
                        receiveShadow=True,
                        userData={'cannonData': {'mass': 0,
                                                 'shapes': ['Box']}})
    scene.add(right_rail)

    # pockets (shitty hacked in)
    pocket_radius = 3 * ball_radius
    pocket_height = 3 * pocket_radius
    pocketPhysicsGeom = CylinderGeometry(radiusTop=pocket_radius,
                                         radiusBottom=pocket_radius,
                                         height=pocket_height,
                                         radialSegments=16,
                                         openEnded=True)
    pocketGeom = CylinderGeometry(radiusTop=pocket_radius,
                                  radiusBottom=pocket_radius,
                                  height=0.02,
                                  radialSegments=16)
    y_physics = y_table - pocket_height / 2
    y_mesh = y_table - 0.009
    pocketPhysicsMesh = Mesh(name='pocketPhysicsMesh',
                             geometry=pocketPhysicsGeom,
                             material=MeshBasicMaterial(color=0xffff00),
                             position=[0, y_physics, 0],
                             userData={'visible': False, 'cannonData': {'mass': 0, 'shapes': ['Trimesh']}})
    pocketMesh = Mesh(geometry=pocketGeom,
                      material=MeshBasicMaterial(color=0x000000),
                      position=[0, y_mesh, 0])
    # left center:
    pocketPhysicsMesh.position[0], pocketMesh.position[0] = 2 * [-W_table / 2]
    pocketPhysicsMesh.position[2], pocketMesh.position[2] = 2 * [0]
    scene.add(deepcopy(pocketPhysicsMesh))
    scene.add(deepcopy(pocketMesh))
    # right center:
    pocketPhysicsMesh.position[0], pocketMesh.position[0] = 2 * [W_table / 2]
    pocketPhysicsMesh.position[2], pocketMesh.position[2] = 2 * [0]
    scene.add(deepcopy(pocketPhysicsMesh))
    scene.add(deepcopy(pocketMesh))
    # front center:
    pocketPhysicsMesh.position[0], pocketMesh.position[0] = 2 * [0]
    pocketPhysicsMesh.position[2], pocketMesh.position[2] = 2 * [L_table / 2]
    scene.add(deepcopy(pocketPhysicsMesh))
    scene.add(deepcopy(pocketMesh))
    # back center:
    pocketPhysicsMesh.position[0], pocketMesh.position[0] = 2 * [0]
    pocketPhysicsMesh.position[2], pocketMesh.position[2] = 2 * [-L_table / 2]
    scene.add(deepcopy(pocketPhysicsMesh))
    scene.add(deepcopy(pocketMesh))
    # back left:
    pocketPhysicsMesh.position[0], pocketMesh.position[0] = 2 * [-W_table / 2]
    pocketPhysicsMesh.position[2], pocketMesh.position[2] = 2 * [-L_table / 2]
    scene.add(deepcopy(pocketPhysicsMesh))
    scene.add(deepcopy(pocketMesh))
    # back right:
    pocketPhysicsMesh.position[0], pocketMesh.position[0] = 2 * [W_table / 2]
    pocketPhysicsMesh.position[2], pocketMesh.position[2] = 2 * [-L_table / 2]
    scene.add(deepcopy(pocketPhysicsMesh))
    scene.add(deepcopy(pocketMesh))
    # front left:
    pocketPhysicsMesh.position[0], pocketMesh.position[0] = 2 * [-W_table / 2]
    pocketPhysicsMesh.position[2], pocketMesh.position[2] = 2 * [L_table / 2]
    scene.add(deepcopy(pocketPhysicsMesh))
    scene.add(deepcopy(pocketMesh))
    # front right:
    pocketPhysicsMesh.position[0], pocketMesh.position[0] = 2 * [W_table / 2]
    pocketPhysicsMesh.position[2], pocketMesh.position[2] = 2 * [L_table / 2]
    scene.add(deepcopy(pocketPhysicsMesh))
    scene.add(deepcopy(pocketMesh))

    # balls:
    radius = ball_radius
    sphere = SphereBufferGeometry(radius=radius, widthSegments=8, heightSegments=16)
    ballData = {'cannonData': {'mass': 0.17, 'shapes': ['Sphere']}}
    y_position = y_table + radius + 0.001 # epsilon distance which the ball will fall from initial position

    colors = [white, yellow, blue, red, purple, orange, green, maroon, black]
    num_balls = len(colors)
    z_positions = 0.8 * np.linspace(-L_table / 2, L_table / 2, num_balls)
    x_positions = 0.5 * z_positions
    for i, color in enumerate(colors):
        ball = Mesh(geometry=sphere,
                    material=MeshPhongMaterial(color=color),
                    position=[x_positions[i], y_position, z_positions[i]],
                    castShadow=True,
                    userData=ballData)
        scene.add(ball)

    return scene.export()
