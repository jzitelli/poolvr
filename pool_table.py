"""three.js/Cannon.js pool table definition
"""

from copy import deepcopy
import numpy as np

from three import *

IN2METER = 0.0254
FT2METER = IN2METER / 12

square = QuadBufferGeometry(vertices=[[-0.5, 0, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5]],
                            uvs=[(0,1), (0,0), (1,0), (1,1)])

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


def pool_table(L_table=2.3368, W_table=None, H_table=0.74295,
               L_playable=None, W_playable=None,
               ball_diameter=2.25*IN2METER,
               W_cushion=2*IN2METER,
               H_cushion=None,
               W_rail=None):
    if W_table is None:
        W_table = 0.5*L_table
    if L_playable is None:
        L_playable = L_table - 2*W_cushion
    if W_playable is None:
        W_playable = W_table - 2*W_cushion
    if H_cushion is None:
        H_cushion = 0.635 * ball_diameter
    if W_rail is None:
        W_rail = 2*W_cushion

    poolTable = Object3D(name="poolTable")

    feltMaterial = MeshPhongMaterial(color=0x00aa00, shininess=5, shading=FlatShading)

    playableSurfaceGeom = BoxGeometry(W_playable, H_table, L_playable)
    playableSurfaceMesh = Mesh(geometry=playableSurfaceGeom,
                               material=feltMaterial,
                               position=[0, 0.5*H_table, 0],
                               receiveShadow=True,
                               userData={'cannonData': {'mass': 0,
                                                        'shapes': ['Box']}})
    poolTable.add(playableSurfaceMesh)

    ball_radius = ball_diameter / 2

    spotMaterial = MeshLambertMaterial(color=0xaaaaaa)

    spotGeom = CircleBufferGeometry(name='spotGeom', radius=ball_radius)
    headSpotMesh = Mesh(geometry=spotGeom,
                        material=spotMaterial,
                        position=[0, H_table + 0.0002, 0.25*L_table],
                        rotation=[-np.pi/2, 0, 0],
                        receiveShadow=True)
    poolTable.add(headSpotMesh)

    cushionMaterial = MeshPhongMaterial(color=0x00aa00, shininess=5, shading=FlatShading)

    # centered as if it were BoxGeometry(W_playable, H_cushion, W_cushion):
    headCushionGeom = PrismBufferGeometry(vertices=[[-0.5*W_playable,                        0,          0.5*W_cushion],
                                                    [-0.5*W_playable,                        H_cushion,  0.5*W_cushion],
                                                    [-0.5*W_playable + np.sqrt(2)*W_cushion, H_cushion, -0.5*W_cushion],
                                                    [ 0.5*W_playable,                        0,          0.5*W_cushion],
                                                    [ 0.5*W_playable,                        H_cushion,  0.5*W_cushion],
                                                    [ 0.5*W_playable - np.sqrt(2)*W_cushion, H_cushion, -0.5*W_cushion]])
    ###
    headCushionMesh = Mesh(geometry=headCushionGeom,
                           material=cushionMaterial,
                           position=[0, H_table, 0.5*L_table - 0.5*W_cushion],
                           receiveShadow=True,
                           userData={'cannonData': {'mass': 0, 'shapes': ['ConvexPolyhedron']}})
    poolTable.add(headCushionMesh)
    ###
    footCushionMesh = Mesh(geometry=headCushionGeom,
                           material=cushionMaterial,
                           position=[0, H_table, -0.5*L_table + 0.5*W_cushion],
                           rotation=[0, np.pi, 0],
                           receiveShadow=True,
                           userData={'cannonData': {'mass': 0, 'shapes': ['ConvexPolyhedron']}})
    poolTable.add(footCushionMesh)
    ###
    leftHeadCushionGeom = Mesh(geometry=headCushionGeom,
                               material=cushionMaterial,
                               position=[-0.5*W_table + 0.5*W_cushion, H_table, 0.25*L_table],
                               rotation=[0, -np.pi/2, 0],
                               receiveShadow=True,
                               userData={'cannonData': {'mass': 0, 'shapes': ['ConvexPolyhedron']}})
    poolTable.add(leftHeadCushionGeom)
    ###
    leftFootCushionGeom = Mesh(geometry=headCushionGeom,
                               material=cushionMaterial,
                               position=[-0.5*W_table + 0.5*W_cushion, H_table, -0.25*L_table],
                               rotation=[0, -np.pi/2, 0],
                               receiveShadow=True,
                               userData={'cannonData': {'mass': 0, 'shapes': ['ConvexPolyhedron']}})
    poolTable.add(leftFootCushionGeom)
    ##
    rightHeadCushionGeom = Mesh(geometry=headCushionGeom,
                                material=cushionMaterial,
                                position=[0.5*W_table - 0.5*W_cushion, H_table, 0.25*L_table],
                                rotation=[0, np.pi/2, 0],
                                receiveShadow=True,
                                userData={'cannonData': {'mass': 0, 'shapes': ['ConvexPolyhedron']}})
    poolTable.add(rightHeadCushionGeom)
    ###
    rightFootCushionGeom = Mesh(geometry=headCushionGeom,
                                material=cushionMaterial,
                                position=[0.5*W_table - 0.5*W_cushion, H_table, -0.25*L_table],
                                rotation=[0, np.pi/2, 0],
                                receiveShadow=True,
                                userData={'cannonData': {'mass': 0, 'shapes': ['ConvexPolyhedron']}})
    poolTable.add(rightFootCushionGeom)

    railMaterial = MeshBasicMaterial(color=0xffff00)

    headRailGeom = BoxGeometry(W_playable, H_cushion, W_rail)
    headRailMesh = Mesh(geometry=headRailGeom,
                        material=railMaterial,
                        position=[0, H_table + 0.5*H_cushion, 0.5*L_table + W_cushion],
                        receiveShadow=True,
                        userData={'cannonData': {'mass': 0, 'shapes': ['Box']}})
    poolTable.add(headRailMesh)

    return poolTable


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

    # pointLight = PointLight(color=0xaa8866, position=[4, 5, 2.5], intensity=0.8, distance=40)
    # scene.add(pointLight)

    ball_diameter = 2.25 * IN2METER
    L_table = 2.3368
    W_table = L_table / 2
    H_table = 0.74295
    poolTable = pool_table(H_table=H_table, ball_diameter=ball_diameter)
    scene.add(poolTable)

    # balls:
    ball_radius = ball_diameter / 2
    sphere = SphereBufferGeometry(radius=ball_radius, widthSegments=16, heightSegments=12)
    ballData = {'cannonData': {'mass': 0.17, 'shapes': ['Sphere']}}
    num_balls = len(ball_colors)
    y_position = H_table + ball_radius + 0.001 # epsilon distance which the ball will fall from initial position
    z_positions = 0.8 * np.linspace(-L_table / 2, L_table / 2, num_balls - 1)
    x_positions = 0.5 * z_positions
    z_positions = [L_table / 4] + list(z_positions)
    x_positions = [0] + list(x_positions)
    for i, color in enumerate(ball_colors):
        ballMesh = Mesh(name="ball %d" % i,
                        geometry=sphere,
                        material=MeshPhongMaterial(color=color, shading=SmoothShading),
                        position=[x_positions[i], y_position, z_positions[i]],
                        castShadow=True,
                        userData=ballData)
        scene.add(ballMesh)

    return scene.export()
