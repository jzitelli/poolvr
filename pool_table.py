"""
three.js/Cannon.js pool table definition
"""
from copy import deepcopy

import numpy as np

from three import *


INCH2METER = 0.0254
FT2METER = INCH2METER / 12


def pool_table(L_table=2.3368, W_table=None, H_table=0.77,
               L_playable=None, W_playable=None,
               ball_diameter=2.25*INCH2METER,
               W_cushion=2*INCH2METER, H_cushion=None, W_rail=None,
               **kwargs):
    """
    Creates parameterized three.js pool table

    :param L_table: length of the pool table (longer than the playable surface); default is 8ft.
    :param W_table: width the of the pool table; usually half the length.
    :param H_table: height of the playable surface; if no transformations are applied to the pool table
                    `Object3D`, the base/bottom of the pool table is at `y=0` and the playable surface is at `y=H_table`.
    :param L_playable: length of the playable area, I still don't understand exactly what it refers to
    :param W_cushion: width of the cushions
    :param H_cushion: height of the nose of the cushions; default is 63.5% of ball diameter
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
    H_rail = 1.25 * H_cushion

    poolTable = Object3D(name="poolTable")

    headSpotMaterial = MeshPhongMaterial(name="headSpotMaterial", color=0x777777, shading=FlatShading)
    surfaceMaterial = MeshPhongMaterial(name="surfaceMaterial", color=0x00aa00, shininess=5, shading=FlatShading)
    cushionMaterial = MeshPhongMaterial(name="cushionMaterial", color=0x028844, shininess=5, shading=FlatShading)
    railMaterial = MeshPhongMaterial(name="railMaterial", color=0xdda400, shininess=10, shading=FlatShading)

    thickness = INCH2METER
    playableSurfaceGeom = BoxBufferGeometry(W_playable, thickness, L_playable)
    playableSurfaceMesh = Mesh(name='playableSurfaceMesh',
                               geometry=playableSurfaceGeom,
                               material=surfaceMaterial,
                               position=[0, H_table - 0.5*thickness, 0],
                               receiveShadow=True,
                               userData={'cannonData': {'mass': 0,
                                                        'shapes': ['Box']}})
    poolTable.add(playableSurfaceMesh)

    ball_radius = ball_diameter / 2
    spotGeom = CircleBufferGeometry(name='spotGeom', radius=0.7*ball_radius, segments=5)
    headSpotMesh = Mesh(geometry=spotGeom,
                        material=headSpotMaterial,
                        position=[0, H_table + 0.0002, 0.25*L_table],
                        rotation=[-np.pi/2, 0, np.pi/10],
                        receiveShadow=True)
    poolTable.add(headSpotMesh)

    H_nose = 0.5 * H_cushion
    W_nose = 0.05 * W_cushion

    sqrt2 = np.sqrt(2)

    # headCushionGeom = HexaBufferGeometry(vertices=np.array([
    #     # bottom quad:
    #     [[-0.5*W_playable + 0.4*W_cushion,       0,                   0.5*W_cushion],
    #      [ 0.5*W_playable - 0.4*W_cushion,       0,                   0.5*W_cushion],
    #      [ 0.5*W_playable - 1.2*sqrt2*W_cushion, H_cushion - H_nose, -0.5*W_cushion + W_nose],
    #      [-0.5*W_playable + 1.2*sqrt2*W_cushion, H_cushion - H_nose, -0.5*W_cushion + W_nose]],
    #     # top quad:
    #     [[-0.5*W_playable + 0.4*W_cushion,       H_rail,     0.5*W_cushion],
    #      [ 0.5*W_playable - 0.4*W_cushion,       H_rail,     0.5*W_cushion],
    #      [ 0.5*W_playable - 1.2*sqrt2*W_cushion, H_cushion, -0.5*W_cushion],
    #      [-0.5*W_playable + 1.2*sqrt2*W_cushion, H_cushion, -0.5*W_cushion]]]))

    headCushionGeom = HexaBufferGeometry(name="headCushionGeom",
                                         vertices=np.array([
        # bottom quad:
        [[-0.5*W_playable + 0.4*W_cushion,       0.0,           0.5*W_cushion],
         [ 0.5*W_playable - 0.4*W_cushion,       0.0,           0.5*W_cushion],
         [ 0.5*W_playable - 1.2*sqrt2*W_cushion, 0.0, -0.5*W_cushion + W_nose],
         [-0.5*W_playable + 1.2*sqrt2*W_cushion, 0.0, -0.5*W_cushion + W_nose]],
        # top quad:
        [[-0.5*W_playable + 0.4*W_cushion,       H_rail,     0.5*W_cushion],
         [ 0.5*W_playable - 0.4*W_cushion,       H_rail,     0.5*W_cushion],
         [ 0.5*W_playable - 1.2*sqrt2*W_cushion, H_cushion, -0.5*W_cushion],
         [-0.5*W_playable + 1.2*sqrt2*W_cushion, H_cushion, -0.5*W_cushion]]]))

    rightHeadCushionGeom = HexaBufferGeometry(name="rightHeadCushionGeom",
                                              vertices=headCushionGeom.vertices.copy())
    rightHeadCushionGeom.vertices[0, 2, 0] = 0.5*W_playable - 0.6*sqrt2*W_cushion
    rightHeadCushionGeom.vertices[1, 2, 0] = rightHeadCushionGeom.vertices[0, 2, 0]

    leftHeadCushionGeom = HexaBufferGeometry(name="leftHeadCushionGeom",
                                             vertices=headCushionGeom.vertices.copy())
    leftHeadCushionGeom.vertices[0, 3, 0] = -0.5*W_playable + 0.6*sqrt2*W_cushion
    leftHeadCushionGeom.vertices[1, 3, 0] = leftHeadCushionGeom.vertices[0, 3, 0]

    cushionData = {'cannonData': {'mass': 0, 'shapes': ['ConvexPolyhedron'], 'faces': HexaBufferGeometry.faces}}
    headCushionMesh = Mesh(name='headCushionMesh',
                           geometry=headCushionGeom,
                           material=cushionMaterial,
                           position=[0, H_table, 0.5*L_table - 0.5*W_cushion],
                           receiveShadow=True,
                           userData=cushionData)
    poolTable.add(headCushionMesh)
    footCushionMesh = Mesh(name='footCushionMesh',
                           geometry=headCushionGeom,
                           material=cushionMaterial,
                           position=[0, H_table, -0.5*L_table + 0.5*W_cushion],
                           rotation=[0, np.pi, 0],
                           receiveShadow=True,
                           userData=cushionData)
    poolTable.add(footCushionMesh)
    leftHeadCushionMesh = Mesh(name='leftHeadCushionMesh',
                               geometry=leftHeadCushionGeom,
                               material=cushionMaterial,
                               position=[-0.5*W_table + 0.5*W_cushion, H_table, 0.25*L_table],
                               rotation=[0, -np.pi/2, 0],
                               receiveShadow=True,
                               userData=cushionData)
    poolTable.add(leftHeadCushionMesh)
    leftFootCushionMesh = Mesh(name='leftFootCushionMesh',
                               geometry=rightHeadCushionGeom,
                               material=cushionMaterial,
                               position=[-0.5*W_table + 0.5*W_cushion, H_table, -0.25*L_table],
                               rotation=[0, -np.pi/2, 0],
                               receiveShadow=True,
                               userData=cushionData)
    poolTable.add(leftFootCushionMesh)
    rightHeadCushionMesh = Mesh(name='rightHeadCushionMesh',
                                geometry=rightHeadCushionGeom,
                                material=cushionMaterial,
                                position=[0.5*W_table - 0.5*W_cushion, H_table, 0.25*L_table],
                                rotation=[0, np.pi/2, 0],
                                receiveShadow=True,
                                userData=cushionData)
    poolTable.add(rightHeadCushionMesh)
    rightFootCushionMesh = Mesh(name='rightFootCushionMesh',
                                geometry=leftHeadCushionGeom,
                                material=cushionMaterial,
                                position=[0.5*W_table - 0.5*W_cushion, H_table, -0.25*L_table],
                                rotation=[0, np.pi/2, 0],
                                receiveShadow=True,
                                userData=cushionData)
    poolTable.add(rightFootCushionMesh)

    headRailGeom = BoxBufferGeometry(W_playable - 2*0.4*W_cushion, H_rail, W_rail)
    railData = {'cannonData': {'mass': 0, 'shapes': ['Box']}}
    headRailMesh = Mesh(name='headRailMesh',
                        geometry=headRailGeom,
                        material=railMaterial,
                        position=[0, H_table + 0.5*H_rail, 0.5*L_table + 0.5*W_rail],
                        receiveShadow=True,
                        userData=railData)
    poolTable.add(headRailMesh)
    footRailMesh = Mesh(name='footRailMesh',
                        geometry=headRailGeom,
                        material=railMaterial,
                        position=[0, H_table + 0.5*H_rail, -(0.5*L_table + 0.5*W_rail)],
                        rotation=[0, np.pi, 0],
                        receiveShadow=True,
                        userData=railData)
    poolTable.add(footRailMesh)
    leftHeadRailMesh = Mesh(name='leftHeadRailMesh',
                            geometry=headRailGeom,
                            material=railMaterial,
                            position=[-(0.5*W_table + 0.5*W_rail), H_table + 0.5*H_rail, 0.25*L_table],
                            rotation=[0, np.pi/2, 0],
                            receiveShadow=True,
                            userData=railData)
    poolTable.add(leftHeadRailMesh)
    rightHeadRailMesh = Mesh(name='rightHeadRailMesh',
                             geometry=headRailGeom,
                             material=railMaterial,
                             position=[0.5*W_table + 0.5*W_rail, H_table + 0.5*H_rail, 0.25*L_table],
                             rotation=[0, np.pi/2, 0],
                             receiveShadow=True,
                             userData=railData)
    poolTable.add(rightHeadRailMesh)
    leftFootRailMesh = Mesh(name='leftFootRailMesh',
                            geometry=headRailGeom,
                            material=railMaterial,
                            position=[-(0.5*W_table + 0.5*W_rail), H_table + 0.5*H_rail, -0.25*L_table],
                            rotation=[0, np.pi/2, 0],
                            receiveShadow=True,
                            userData=railData)
    poolTable.add(leftFootRailMesh)
    rightFootRailMesh = Mesh(name='rightFootRailMesh',
                             geometry=headRailGeom,
                             material=railMaterial,
                             position=[0.5*W_table + 0.5*W_rail, H_table + 0.5*H_rail, -0.25*L_table],
                             rotation=[0, np.pi/2, 0],
                             receiveShadow=True,
                             userData=railData)
    poolTable.add(rightFootRailMesh)

    return poolTable



def pool_hall(L_table=2.3368,
              H_table=0.74295,
              ball_diameter=2.25*INCH2METER,
              L_room=6,
              W_room=6,
              url_prefix="",
              **kwargs):
    """
    Defines a three.js scene containing a pool table.
    """
    scene = Scene()

    poolTable = pool_table(L_table=L_table, H_table=H_table, ball_diameter=ball_diameter, **kwargs)
    scene.add(poolTable)

    # floorMaterial = MeshPhongMaterial(name='floorMaterial',
    #                                   color=0xffffff,
    #                                   map=Texture(image=Image(url=url_prefix+"node_modules/three/examples/textures/hardwood2_diffuse.jpg"),
    #                                               repeat=[L_room, W_room], wrap=[RepeatWrapping, RepeatWrapping]),
    #                                   bumpMap=Texture(image=Image(url=url_prefix+"node_modules/three/examples/textures/hardwood2_bump.jpg"),
    #                                                   repeat=[L_room, W_room], wrap=[RepeatWrapping, RepeatWrapping]), bumpScale=0.06)

    floorMaterial = MeshBasicMaterial(name='floorMaterial',
                                      color=0x002200)

    floorMesh = Mesh(name="floorMesh",
                     geometry=PlaneBufferGeometry(width=W_room, height=L_room),
                     material=floorMaterial,
                     position=[0, 0, 0],
                     rotation=[-np.pi/2, 0, 0],
                     userData={'cannonData': {'mass': 0,
                                              'shapes': ['Plane']}})

    scene.add(floorMesh)

    return scene
