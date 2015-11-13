"""three.js pool table scene definition
"""

from copy import deepcopy
import numpy as np

from three import *

INCH2METER = 0.0254

square = QuadBufferGeometry(vertices=[[-0.5, 0, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5]],
                            uvs=[(0,1), (0,0), (1,0), (1,1)])

# ball colors:
ball_colors = []
white  = 0xeeeeee; ball_colors.append(white)
yellow = 0xeeee00; ball_colors.append(yellow)
blue   = 0x0000ee; ball_colors.append(blue)
red    = 0xee0000; ball_colors.append(red)
purple = 0xee00ee; ball_colors.append(purple)
green  = 0x00ee00; ball_colors.append(green)
orange = 0xee7700; ball_colors.append(orange)
maroon = 0xee0077; ball_colors.append(maroon)
black  = 0x111111; ball_colors.append(black)

def pool_hall():
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

    feltMaterial = MeshPhongMaterial(color=0x00aa00, shininess=5)  #MeshLambertMaterial(color=0x00aa00),
    pool_table = Mesh(geometry=BoxGeometry(W_table, y_table, L_table),
                      material=feltMaterial,
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
    pocketGeom = CylinderGeometry(radiusTop=pocket_radius,
                                  radiusBottom=pocket_radius,
                                  height=0.001,
                                  radialSegments=16)
    y_mesh = y_table
    pocketMesh = Mesh(geometry=pocketGeom,
                      material=MeshBasicMaterial(color=0x000000),
                      position=[0, y_mesh, 0])
    # left center:
    pocketMesh.position[0] = -W_table / 2
    pocketMesh.position[2] = 0
    scene.add(deepcopy(pocketMesh))
    # right center:
    pocketMesh.position[0] = W_table / 2
    pocketMesh.position[2] = 0
    scene.add(deepcopy(pocketMesh))
    # back left:
    pocketMesh.position[0] = -W_table / 2
    pocketMesh.position[2] = -L_table / 2
    scene.add(deepcopy(pocketMesh))
    # back right:
    pocketMesh.position[0] = W_table / 2
    pocketMesh.position[2] = -L_table / 2
    scene.add(deepcopy(pocketMesh))
    # front left:
    pocketMesh.position[0] = -W_table / 2
    pocketMesh.position[2] = L_table / 2
    scene.add(deepcopy(pocketMesh))
    # front right:
    pocketMesh.position[0] = W_table / 2
    pocketMesh.position[2] = L_table / 2
    scene.add(deepcopy(pocketMesh))

    # balls:
    radius = ball_radius
    sphere = SphereBufferGeometry(radius=radius, widthSegments=8, heightSegments=16)
    ballData = {'cannonData': {'mass': 0.17, 'shapes': ['Sphere']}}
    y_position = y_table + radius + 0.001 # epsilon distance which the ball will fall from initial position

    num_balls = len(ball_colors)
    z_positions = 0.8 * np.linspace(-L_table / 2, L_table / 2, num_balls - 1)
    x_positions = 0.5 * z_positions
    z_positions = [L_table / 4] + list(z_positions)
    x_positions = [0] + list(x_positions)
    for i, color in enumerate(ball_colors):
        ballMesh = Mesh(name="ball %d" % i,
                        geometry=sphere,
                        material=MeshPhongMaterial(color=color),
                        position=[x_positions[i], y_position, z_positions[i]],
                        castShadow=True,
                        userData=ballData)
        scene.add(ballMesh)

    return scene.export()
