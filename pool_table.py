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
               W_cushion=2*IN2METER,
               H_cushion=None,
               W_rail=None, basicMaterials=False):
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

    if basicMaterials:
        feltMaterial = MeshBasicMaterial(color=0x00aa00)
        cushionMaterial = feltMaterial
        spotMaterial = MeshBasicMaterial(color=0xaaaaaa)
        railMaterial = MeshBasicMaterial(color=0xffff00)
    else:
        feltMaterial = MeshPhongMaterial(color=0x00aa00, shininess=5, shading=FlatShading)
        #feltMaterial = MeshLambertMaterial(color=0x00aa00, shading=FlatShading)
        cushionMaterial = MeshPhongMaterial(color=0x00aa00, shininess=5, shading=FlatShading)
        spotMaterial = MeshLambertMaterial(color=0xaaaaaa)
        railMaterial = MeshPhongMaterial(color=0xffaa00, shininess=10, shading=FlatShading)

    playableSurfaceGeom = BoxGeometry(W_playable, H_table, L_playable)
    playableSurfaceMesh = Mesh(name='playableSurfaceMesh',
                               geometry=playableSurfaceGeom,
                               material=feltMaterial,
                               position=[0, 0.5*H_table, 0],
                               receiveShadow=True,
                               userData={'cannonData': {'mass': 0,
                                                        'shapes': ['Box']}})
    poolTable.add(playableSurfaceMesh)

    ball_radius = ball_diameter / 2

    spotGeom = CircleBufferGeometry(name='spotGeom', radius=ball_radius)
    headSpotMesh = Mesh(geometry=spotGeom,
                        material=spotMaterial,
                        position=[0, H_table + 0.0002, 0.25*L_table],
                        rotation=[-np.pi/2, 0, 0],
                        receiveShadow=True)
    poolTable.add(headSpotMesh)

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

    headRailGeom = BoxGeometry(W_playable, H_cushion, W_rail)
    headRailMesh = Mesh(geometry=headRailGeom,
                        material=railMaterial,
                        position=[0, H_table + 0.5*H_cushion, 0.5*L_table + W_cushion],
                        receiveShadow=True,
                        userData={'cannonData': {'mass': 0, 'shapes': ['Box']}})
    poolTable.add(headRailMesh)

    return poolTable


def pool_hall(basicMaterials=False,
              url_prefix=""):
    scene = Scene()
    # room:
    L_room, W_room = 10, 10
    floor = Mesh(name="floor", geometry=square,
                 material=MeshBasicMaterial(color=0xffffff,
                                            map=Texture(image=Image(url=url_prefix+"images/deck.png"),
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
    poolTable = pool_table(H_table=H_table, ball_diameter=ball_diameter, basicMaterials=basicMaterials)
    scene.add(poolTable)

    # balls:
    num_balls = len(ball_colors)
    ball_radius = ball_diameter / 2

    sphere = SphereBufferGeometry(radius=ball_radius,
                                  widthSegments=16,
                                  heightSegments=12)
    stripeGeom = SphereBufferGeometry(radius=1.02*ball_radius,
                                      widthSegments=16,
                                      heightSegments=6,
                                      thetaStart=np.pi/3,
                                      thetaLength=np.pi/3)
    shadowGeom = CircleBufferGeometry(name='shadowGeom',
                                      radius=ball_radius,
                                      segments=16)

    if basicMaterials:
        ball_materials = [MeshBasicMaterial(color=color) for color in ball_colors]
    else:
        ball_materials = [MeshPhongMaterial(color=color, shading=SmoothShading) for color in ball_colors]
    shadowMaterial = MeshBasicMaterial(color=0x002200)

    ballData = {'cannonData': {'mass': 0.17, 'shapes': ['Sphere']}}

    y_position = H_table + ball_radius + 0.0001 # epsilon distance which the ball will fall from initial position

    z_positions = 0.8 * np.linspace(-L_table / 2, L_table / 2, num_balls - 1)
    x_positions = 0.5 * z_positions
    x_positions = [0] + list(x_positions)
    z_positions = [L_table / 4] + list(z_positions)

    # tri_vertices = np.array([( 0,               -0.2*L_table + 4*ball_radius),
    #                          (-4*2*ball_radius, -0.2*L_table + 4*ball_radius - 4*3*ball_radius),
    #                          ( 4*2*ball_radius, -0.2*L_table + 4*ball_radius - 4*3*ball_radius)])

    # x_positions =  list(np.linspace(tri_vertices[0][0], tri_vertices[1][0], 5))
    # x_positions += list(np.linspace(tri_vertices[1][0], tri_vertices[2][0], 5)[1:])
    # x_positions += list(np.linspace(tri_vertices[2][0], tri_vertices[0][0], 5)[1:-1])
    # x_positions += [0, -4*ball_radius, 4*ball_radius]

    # z_positions =  list(np.linspace(tri_vertices[0][1], tri_vertices[1][1], 5))
    # z_positions += list(np.linspace(tri_vertices[1][1], tri_vertices[2][1], 5)[1:])
    # z_positions += list(np.linspace(tri_vertices[2][1], tri_vertices[0][1], 5)[1:-1])
    # z_positions += [-0.2*L_table + 4*ball_radius - 4*1*ball_radius,
    #                 -0.2*L_table + 4*ball_radius - 4*2*ball_radius,
    #                 -0.2*L_table + 4*ball_radius - 4*2*ball_radius]

    # x_positions = 0.6 * np.array([0] + list(x_positions))
    # z_positions = [L_table / 4] + list(0.6 * np.array(z_positions))

    for i, material in enumerate(ball_materials[:9] + 7*[ball_materials[0]]):
        rotation = [0, 0, 0] #np.random.uniform()]
        ballMesh = Mesh(name="ballMesh %d" % i,
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

        ballShadowMesh = Mesh(name="ballShadowMesh %d" % i,
                              geometry=shadowGeom,
                              material=shadowMaterial,
                              position=[0, -ball_radius + 0.001, 0],
                              rotation=[-0.5*np.pi - rotation[0], -rotation[1], -rotation[2]])
        ballMesh.add(ballShadowMesh)


    return scene.export()
