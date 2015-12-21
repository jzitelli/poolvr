"""three.js/Cannon.js pool table definition
"""
from copy import deepcopy
import numpy as np

import sys
import os.path
sys.path.insert(0, os.path.join(os.path.split(__file__)[0], os.path.pardir, 'three.py'))
import three
from three import *


IN2METER = 0.0254
FT2METER = IN2METER / 12

square = QuadBufferGeometry(vertices=[[-0.5, 0, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5]],
                            uvs=[(0,1), (0,0), (1,0), (1,1)])

ball_colors = []
ball_colors.append(0xddddde); white  = ball_colors[-1]
ball_colors.append(0xeeee00); yellow = ball_colors[-1]
ball_colors.append(0x0000ee); blue   = ball_colors[-1]
ball_colors.append(0xee0000); red    = ball_colors[-1]
ball_colors.append(0xee00ee); purple = ball_colors[-1]
ball_colors.append(0xee7700); orange = ball_colors[-1]
ball_colors.append(0x00ee00); green  = ball_colors[-1]
ball_colors.append(0xbb2244); maroon = ball_colors[-1]
ball_colors.append(0x111111); black  = ball_colors[-1]

ball_colors = ball_colors + ball_colors[1:-1]

def pool_table(L_table=2.3368, W_table=None, H_table=0.74295,
               L_playable=None, W_playable=None,
               ball_diameter=2.25*IN2METER,
               W_cushion=2*IN2METER, H_cushion=None, W_rail=None,
               useBasicMaterials=True, useShadowMap=False, **kwargs):
    """Procedurally defined three.js pool table 'Object3D' (three.js Object format V4)

    :param L_table: length of the pool table (longer than the playable surface); default is 8ft.
    :param W_table: width the of the pool table; usually half the length.
    :param H_table: height of the playable surface; if no transformations are applied to the pool table
                    `Object3D`, the base/bottom of the pool table is at `y=0` and the playable surface is at `y=H_table`.
    :param L_playable: length of the playable area, I still don't understand exactly what it refers to
    :param W_cushion: width of the cushions
    :param H_cushion: height of the nose of the cushions; default is 63.5% of ball diameter
    :param useBasicMaterials: if True, use only three.js BasicMeshMaterials
    :param useShadowMap: by default, plane-projected geometries/meshes representing shadows are created;
                      if useShadowMap is True, they are not
    """
    if W_table is None:
        W_table = 0.5*L_table
    if L_playable is None:
        L_playable = L_table - 2*W_cushion
    if W_playable is None:
        W_playable = W_table - 2*W_cushion
    if H_cushion is None:
        H_cushion = 0.635 * ball_diameter
    if W_rail is None:
        W_rail = 1.5*W_cushion
    poolTable = Object3D(name="poolTable")
    rail_color = 0xdda400 # 0xffff00 # 0xffaa00
    if useBasicMaterials:
        surfaceMaterial = MeshBasicMaterial(color=0x00aa00)
        cushionMaterial = MeshBasicMaterial(color=0x219956) #0x02a800)
        spotMaterial = MeshBasicMaterial(color=0xaaaaaa)
        railMaterial = MeshBasicMaterial(color=rail_color)
    else:
        spotMaterial = MeshLambertMaterial(color=0xaaaaaa)
        surfaceMaterial = MeshPhongMaterial(color=0x00aa00, shininess=5, shading=FlatShading)
        cushionMaterial = MeshPhongMaterial(color=0x07aa16, shininess=5, shading=FlatShading)
        railMaterial = MeshPhongMaterial(color=0xdda400, shininess=10, shading=FlatShading)
    playableSurfaceGeom = BoxGeometry(W_playable, H_table, L_playable)
    playableSurfaceMesh = Mesh(name='playableSurfaceMesh',
                               geometry=playableSurfaceGeom,
                               material=surfaceMaterial,
                               position=[0, 0.5*H_table, 0],
                               receiveShadow=True,
                               userData={'cannonData': {'mass': 0,
                                                        'shapes': ['Box']}})
    poolTable.add(playableSurfaceMesh)
    ball_radius = ball_diameter / 2
    spotGeom = CircleBufferGeometry(name='spotGeom', radius=ball_radius, segments=5)
    headSpotMesh = Mesh(geometry=spotGeom,
                        material=spotMaterial,
                        position=[0, H_table + 0.0002, 0.25*L_table],
                        rotation=[-np.pi/2, 0, 0],
                        receiveShadow=True)
    poolTable.add(headSpotMesh)
    # centered as if it were BoxGeometry(W_playable, H_cushion, W_cushion):
    # headCushionGeom = PrismBufferGeometry(vertices=[[-0.5*W_playable,                        0,          0.5*W_cushion],
    #                                                 [-0.5*W_playable,                        H_cushion,  0.5*W_cushion],
    #                                                 [-0.5*W_playable + np.sqrt(2)*W_cushion, H_cushion, -0.5*W_cushion],
    #                                                 [ 0.5*W_playable,                        0,          0.5*W_cushion],
    #                                                 [ 0.5*W_playable,                        H_cushion,  0.5*W_cushion],
    #                                                 [ 0.5*W_playable - np.sqrt(2)*W_cushion, H_cushion, -0.5*W_cushion]][::-1])
    noseSize = 0.4 * H_cushion
    headCushionGeom = HexaBufferGeometry(vertices=[# bottom quad:
                                                   [-0.5*W_playable,                        0,                     0.5*W_cushion],
                                                   [ 0.5*W_playable,                        0,                     0.5*W_cushion],
                                                   [ 0.5*W_playable - np.sqrt(2)*W_cushion, H_cushion - noseSize, -0.5*W_cushion],
                                                   [-0.5*W_playable + np.sqrt(2)*W_cushion, H_cushion - noseSize, -0.5*W_cushion],
                                                   # top quad:
                                                   [-0.5*W_playable,                        H_cushion,  0.5*W_cushion],
                                                   [ 0.5*W_playable,                        H_cushion,  0.5*W_cushion],
                                                   [ 0.5*W_playable - np.sqrt(2)*W_cushion, H_cushion, -0.5*W_cushion],
                                                   [-0.5*W_playable + np.sqrt(2)*W_cushion, H_cushion, -0.5*W_cushion]])
    ###
    cushionShape = 'ConvexPolyhedron'
    # cushionShape = 'Box'
    headCushionMesh = Mesh(name='headCushionMesh',
                           geometry=headCushionGeom,
                           material=cushionMaterial,
                           position=[0, H_table, 0.5*L_table - 0.5*W_cushion],
                           receiveShadow=True,
                           userData={'cannonData': {'mass': 0, 'shapes': [cushionShape]}})
    poolTable.add(headCushionMesh)
    ###
    footCushionMesh = Mesh(name='footCushionMesh',
                           geometry=headCushionGeom,
                           material=cushionMaterial,
                           position=[0, H_table, -0.5*L_table + 0.5*W_cushion],
                           rotation=[0, np.pi, 0],
                           receiveShadow=True,
                           userData={'cannonData': {'mass': 0, 'shapes': [cushionShape]}})
    poolTable.add(footCushionMesh)
    ###
    leftHeadCushionMesh = Mesh(name='leftHeadCushionMesh',
                               geometry=headCushionGeom,
                               material=cushionMaterial,
                               position=[-0.5*W_table + 0.5*W_cushion, H_table, 0.25*L_table],
                               rotation=[0, -np.pi/2, 0],
                               receiveShadow=True,
                               userData={'cannonData': {'mass': 0, 'shapes': [cushionShape]}})
    poolTable.add(leftHeadCushionMesh)
    ###
    leftFootCushionMesh = Mesh(name='leftFootCushionMesh',
                               geometry=headCushionGeom,
                               material=cushionMaterial,
                               position=[-0.5*W_table + 0.5*W_cushion, H_table, -0.25*L_table],
                               rotation=[0, -np.pi/2, 0],
                               receiveShadow=True,
                               userData={'cannonData': {'mass': 0, 'shapes': [cushionShape]}})
    poolTable.add(leftFootCushionMesh)
    ##
    rightHeadCushionMesh = Mesh(name='rightHeadCushionMesh',
                                geometry=headCushionGeom,
                                material=cushionMaterial,
                                position=[0.5*W_table - 0.5*W_cushion, H_table, 0.25*L_table],
                                rotation=[0, np.pi/2, 0],
                                receiveShadow=True,
                                userData={'cannonData': {'mass': 0, 'shapes': [cushionShape]}})
    poolTable.add(rightHeadCushionMesh)
    ###
    rightFootCushionMesh = Mesh(name='rightFootCushionMesh',
                                geometry=headCushionGeom,
                                material=cushionMaterial,
                                position=[0.5*W_table - 0.5*W_cushion, H_table, -0.25*L_table],
                                rotation=[0, np.pi/2, 0],
                                receiveShadow=True,
                                userData={'cannonData': {'mass': 0, 'shapes': [cushionShape]}})
    poolTable.add(rightFootCushionMesh)

    # RAILSSSSSSSS
    headRailGeom = BoxGeometry(W_playable, H_cushion, W_rail)
    headRailMesh = Mesh(geometry=headRailGeom,
                        material=railMaterial,
                        position=[0, H_table + 0.5*H_cushion, 0.5*L_table + 0.5*W_rail],
                        receiveShadow=True,
                        userData={'cannonData': {'mass': 0, 'shapes': ['Box']}})
    poolTable.add(headRailMesh)

    footRailMesh = Mesh(geometry=headRailGeom,
                        material=railMaterial,
                        position=[0, H_table + 0.5*H_cushion, -(0.5*L_table + 0.5*W_rail)],
                        rotation=[0, np.pi, 0],
                        receiveShadow=True,
                        userData={'cannonData': {'mass': 0, 'shapes': ['Box']}})
    poolTable.add(footRailMesh)

    leftHeadRailMesh = Mesh(geometry=headRailGeom,
                            material=railMaterial,
                            position=[-(0.5*W_table + 0.5*W_rail), H_table + 0.5*H_cushion, 0.25*L_table],
                            rotation=[0, np.pi/2, 0],
                            receiveShadow=True,
                            userData={'cannonData': {'mass': 0, 'shapes': ['Box']}})
    poolTable.add(leftHeadRailMesh)

    rightHeadRailMesh = Mesh(geometry=headRailGeom,
                             material=railMaterial,
                             position=[0.5*W_table + 0.5*W_rail, H_table + 0.5*H_cushion, 0.25*L_table],
                             rotation=[0, np.pi/2, 0],
                             receiveShadow=True,
                             userData={'cannonData': {'mass': 0, 'shapes': ['Box']}})
    poolTable.add(rightHeadRailMesh)

    leftFootRailMesh = Mesh(geometry=headRailGeom,
                            material=railMaterial,
                            position=[-(0.5*W_table + 0.5*W_rail), H_table + 0.5*H_cushion, -0.25*L_table],
                            rotation=[0, np.pi/2, 0],
                            receiveShadow=True,
                            userData={'cannonData': {'mass': 0, 'shapes': ['Box']}})
    poolTable.add(leftFootRailMesh)

    rightFootRailMesh = Mesh(geometry=headRailGeom,
                             material=railMaterial,
                             position=[0.5*W_table + 0.5*W_rail, H_table + 0.5*H_cushion, -0.25*L_table],
                             rotation=[0, np.pi/2, 0],
                             receiveShadow=True,
                             userData={'cannonData': {'mass': 0, 'shapes': ['Box']}})
    poolTable.add(rightFootRailMesh)

    return poolTable


def pool_hall(useBasicMaterials=True,
              useShadowMap=False,
              pointLight=None,
              url_prefix="",
              L_table=2.3368,
              H_table=0.74295,
              ball_diameter=2.25*IN2METER,
              skybox=False,
              **kwargs):
    scene = Scene()
    L_room, W_room = 10, 10
    floorMesh = Mesh(name="floorMesh",
                     geometry=PlaneBufferGeometry(width=W_room, height=L_room),
                     material=MeshBasicMaterial(color=0xffffff,
                                                map=Texture(image=Image(url=url_prefix+"images/deck.png"),
                                                            repeat=[4*L_room, 4*W_room], wrap=[RepeatWrapping, RepeatWrapping])),
                     position=[0, 0, 0],
                     rotation=[-np.pi/2, 0, 0],
                     userData={'cannonData': {'mass': 0,
                                              'shapes': ['Plane']}})
    scene.add(floorMesh)

    if pointLight:
        light = PointLight(color=0xaa8866, position=[4, 5, 2.5], intensity=0.8, distance=40)
        scene.add(light)

    if skybox:
        scene.add(Skybox(cube_images=[url_prefix + "images/%s.png" % pos
                                      for pos in ('px', 'nx', 'py', 'ny', 'pz', 'nz')]))

    poolTable = pool_table(L_table=L_table, H_table=H_table, ball_diameter=ball_diameter,
                           useBasicMaterials=useBasicMaterials, useShadowMap=useShadowMap, pointLight=pointLight, **kwargs)
    scene.add(poolTable)

    # balls:
    num_balls = len(ball_colors)
    ball_radius = ball_diameter / 2
    sphere = SphereBufferGeometry(radius=ball_radius,
                                  widthSegments=16,
                                  heightSegments=12)
    stripeGeom = SphereBufferGeometry(radius=1.022*ball_radius,
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
                               'linearDamping': 0.23, 'angularDamping': 0.28}}

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
        if not useShadowMap:
            ballShadowMesh = Mesh(name="ballShadowMesh %d" % i,
                                  geometry=shadowGeom,
                                  material=shadowMaterial,
                                  position=[0, -ball_radius + 0.001, 0],
                                  rotation=[-0.5*np.pi - rotation[0], -rotation[1], -rotation[2]])
            ballMesh.add(ballShadowMesh)

    return scene
