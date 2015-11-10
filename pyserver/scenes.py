"""Collection of functions which generate three.js scenes.

http://www.wpa-pool.com/web/WPA_Tournament_Table_Equipment_Specifications:

    (implemented)
    2. Table Bed Height Shall be between 29 ¼ inches [74.295 cm] and
    31 inches [78.74 cm].

    (implemented)
    5. Playing Surface The playing surface (area) must be rectangular,
    and symmetrical when the pocket configurations are included: 9
    foot - 100 (+ 1/8) x 50 (+ 1/8) inches (except cushions)/ [2.54 m
    (+ 3.175 mm) x 1.27 m (+ 3.175 mm)] 8 foot - 92 (+ 1/8) x 46 (+
    1/8) inches (except cushions)/ [2.3368 m (+ 3.175 mm) x 1.1684 m
    (+ 3.175 mm)]

    6. Rail and Cushion The rail width must be between 4 [10.16 cm]
    and 7 ½ inches [19.05 cm] including the rubber cushions. 18 sights
    (or 17 and a name plate) shall be attached flush on the rail cap
    with:

    12 ½ inches [31.75 cm] from sight to sight on a 9-foot regulation
    table 11 ½ inches [29.20 cm] from sight to sight on a 8-foot
    regulation table.

    The center of each sight should be located 3 11/16 (+ ) inches
    [93.6625 mm (+ 3.175 mm)] from the nose of the cushion. The sights
    may be round (between 7/16 [11.11 mm] and ½ inch [12.7 mm] in
    diameter) or diamond-shaped (between 1 x 7/16 [25.4 x 11.11 mm]
    and 1 ¼ x 5/8 inch [31.75 x 15.875 mm]). Any nameplates and score
    counters should be flush level with rail top. All rail bolts
    should be thus located that when properly torqued render a quiet
    and optimum rebound from any point of the cushion nose of the
    table.

    7. Height of the Cushion Rubber cushions should be triangular in
    shape with the width of the cloth-covered cushion being between 1
    7/8 [4.76 cm] and 2 inches [5.40 cm] measured from the outer edge
    of the featherstrip to the nose of the cushion. Rail height (nose-
    line to table-bed) should be 63 ½% (+1 %) or between 62 ½% and 64
    ½ % of the diameter of the ball.

    8. Cushion Rubber Table cushions should influence the speed of the
    table such that with placement of a ball on the head spot,
    shooting through the foot spot, using center ball english, with a
    level cue and firm stroke, the ball must travel a minimum of 4 to
    4 ½ lengths of the table without jumping.

    9. Pocket Openings and Measurements Only rubber facings of minimum
    1/16 [1.5875 mm] to maximum ¼ inch [6.35 mm] thick may be used at
    pocket jaws. The WPA-preferred maximum thickness for facings is
    1/8 inch [3.175 mm]. The facings on both sides of the pockets must
    be of the same thickness. Facings must be of hard re-enforced
    rubber glued with strong bond to the cushion and the rail, and
    adequately fastened to the wood rail liner to prevent shifting.
    The rubber of the facings should be somewhat harder than that of
    the cushions.

    The pocket openings for pool tables are measured between opposing
    cushion noses where the direction changes into the pocket (from
    pointed lip to pointed lip). This is called mouth.

    Corner Pocket Mouth: between 4.5 [11.43 cm] and 4.625 inches
    [11.75 cm] Side Pocket Mouth: between 5 [12.7 cm] and 5.125 inches
    [13.0175 cm] *The mouth of the side pocket is traditionally ½ inch
    [1.27 cm] wider than the mouth of the corner pocket.

    Vertical Pocket Angle (Back Draft): 12 degrees minimum to15
    degrees maximum.

    Horizontal Pocket Cut Angle: The angle must be the same on both
    sides of a pocket entrance. The cut angles of the rubber cushion
    and its wood backing (rail liner) for both sides of the corner
    pocket entrance must be 142 degrees (+1). The cut angles of the
    rubber cushion and its wood backing (rail liner) for both sides of
    the side pocket entrance must be 104 degrees (+1).

    Shelf: The shelf is measured from the center of the imaginary line
    that goes from one side of the mouth to the other - where the nose
    of the cushion changes direction - to the vertical cut of the
    slate pocket cut. Shelf includes bevel.

    Corner Pocket Shelf: between 1 [2.54 cm] and 2 ¼ inches [5.715 cm]
    Side Pocket Shelf: between 0 and .375 inches [.9525 cm]

    10. Pocket Liners The pocket liners and boots should be of long
    wearing plastic, rubber or leather. The material the liners and
    boots are made of should not permanently mark (stain) the balls or
    cues. The upper part of the inner wall must be so fashioned that
    whenever a ball hits the pocket liner wall below the rim at the
    top of the rail, the ball is directed downwards.

    11. Ball Return and Drop Pockets Both drop pockets and automatic
    ball returns can be used, but must be as noiseless as possible.
    Drop pockets must have a basket capacity of at least 6 balls.
    Automatic ball returns must be properly installed so that pocketed
    balls are not trampolined back to the table or off the table.

    When covering the cushions, the cloth must be lengthwise evenly
    and consistently well-stretched while inserting the featherstrip
    as well as thereafter. While the cloth is in a stretched condition
    lengthwise, the cloth must then be stretched in the width up to
    the moment when indentation of the nose of the rubber cushion is
    about to start and attached underneath the wooden rail with fully
    driven fasteners (staples or tacks) spaced a maximum of 3/4 inch
    [1.905 cm] on center approximately, with at least 3/8 inch [.9525
    cm] penetration into the wood. At the side pocket openings, the
    rails are to be covered with a minimum overlapping of fabric over
    the facings. When doing overlappings, great care must be taken so
    that hidden folds, if any, do not cause balls to jump off the
    table during play. No folds are allowed in the cloth over the
    facings of the corner pockets.

    15. Lights The bed and rails of the table must receive at least
    520 lux (48 footcandles) of light at every point. A screen or
    reflector configuration is advised so that the center of the table
    does not receive noticeably more lighting than the rails and the
    corners of the table. If the light fixture above the table may be
    moved aside (referee), the minimum height of the fixture should be
    no lower than 40 inches [1.016 m] above the bed of the table. If
    the light fixture above the table is non-movable, the fixture
    should be no lower than 65 inches [1.65 m] above the bed of the
    table. The intensity of any directed light on the players at the
    table should not be blinding. Blinding light starts at 5000 lux
    (465 footcandles) direct view. The rest of the venue (bleachers,
    etc.) should receive at least 50 lux (5 footcandles) of light.

    (implemented)
    16. Balls and Ball Rack All balls must be composed of cast
    phenolic resin plastic and measure 2 ¼ (+.005) inches [5.715 cm (+
    .127 mm)] in diameter and weigh 5 ½ to 6 oz [156 to 170 gms].
    Balls should be unpolished, and should also not be waxed. Balls
    should be cleaned with a towel or cloth free of dirt and dust, and
    may also be washed with soap and water. Balls contaminated with
    any slippery substance - treated with a polishing or rubbing
    compound and/or waxed - must be cleansed and dewaxed with a clean
    cloth moistened with diluted alcohol before play.

    A complete set of pool balls consists of one white cue ball and
    fifteen color-coded, numbered object balls. The object balls are
    clearly and highly visibly numbered 1 through 15. Each object ball
    has its number printed twice, opposite each other, one of the two
    numbers upside down, black on a white round background. The object
    balls numbered 1 through 8 have solid colors as follows: 1=yellow,
    2=blue, 3=red, 4=purple, 5=orange, 6=green, 7=maroon and 8=black.
    The object balls numbered 9 through 15 are white with a centered
    band of color as follows: 9=yellow, 10=blue, 11=red, 12=purple,
    13=orange, 14=green and 15=maroon. The two printed numbers 6 and 9
    are underscored.

    The wooden triangular ball rack is the recommended device to be
    used to rack the balls to ensure that the balls are properly
    aligned and in contact with each other. Both surfaces that can
    make contact with the table-cloth when moving loaded rack to and
    fro, should be very smooth in order not to incur any damage to the
    cloth underneath. Plastic racks are not recommended, they are
    flexible and tend to deform, making proper racking of balls time-
    consuming, if not impossible.

    17. Cue Sticks Cue Sticks used at WPA competitions should comply
    with the following during play at table:

    Length of Cue: 40 inches [1.016 m] minimum / No Maximum Weight of
    Cue: No minimum / 25 oz. [708.75 gm] maximum Width of Tip: No
    minimum / 14mm maximum

    The cue tip may not be of a material that can scratch or damage
    the addressed ball. The cue tip on any stick must be composed of a
    piece of specially processed leather or other fibrous or pliable
    material that extends the natural line of the shaft end of the cue
    and contacts the cue ball when the shot is executed..

    The ferrule of the cue stick, if of a metal material, may not be
    more than 1 inch [2.54 cm] in length.

"""

from copy import deepcopy
import numpy as np

from three import *

FT2METERS = 0.3048
IN2METERS = 0.0254

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

def pool_hall(cubemap=None):
    scene = Scene()

    # room:
    L_room, W_room = 7, 7
    floor = Mesh(name="floor", geometry=square,
                 material=MeshBasicMaterial(color=0xffffff,
                                            map=Texture(image=Image(url="images/parque64.png"),
                                                        repeat=[4*L_room, 4*W_room], wrap=[RepeatWrapping, RepeatWrapping])),
                 position=[0, 0, 0],
                 scale=[L_room, 1, W_room])
    scene.add(floor)
    scene.add(PointLight(color=0x775532, position=[4, 2, -2.5], intensity=0.7, distance=40))
    # TODO: lights casting shadows w/ CrapLoader
    # spotLight = SpotLight(color=0xffffff, intensity=2, distance=6, position=[0, 3*y_table, 0],
    #                       castShadow=True, shadowCameraNear=0.2, shadowCameraFar=2*y_table, shadowCameraFov=80)
    # scene.add(spotLight)
    if cubemap:
        if ShaderLib is not None:
            shader = deepcopy(ShaderLib['cube'])
            # shader['uniforms']['tCube']['value'] = ["images/skybox/%s.jpg" % pos
            #                                         for pos in ('px', 'nx', 'py', 'ny', 'pz', 'nz')]
            shader['uniforms']['tCube']['value'] = ["images/SwedishRoyalCastle/%s.jpg" % pos
                                                    for pos in ('px', 'nx', 'py', 'ny', 'pz', 'nz')]
            scene.add(Mesh(geometry=BoxGeometry(900, 900, 900),
                           material=ShaderMaterial(side=BackSide, **shader)))

    # table:
    y_table = .74295
    L_table = 2.3368
    W_table = L_table / 2
    # TODO:
    # scale=[W_table, 1, L_table], position=[0, y_table, 0],
                          # userData={'cannonData': {'mass': 0,
                          #                      'shapes': ['Box'],
                          #                      'position': [0, y_table / 2, 0],
                          #                      'scale': [W_table, y_table, L_table]}})
    feltMaterial = MeshPhongMaterial(color=0x00aa00, shininess=5)
    pool_table = Mesh(geometry=BoxGeometry(W_table, y_table, L_table),
                      material=feltMaterial, #MeshLambertMaterial(color=0x00aa00),
                      position=[0, y_table / 2, 0],
                      receiveShadow=True,
                      userData={'cannonData': {'mass': 0,
                                               'shapes': ['Box']}})
    scene.add(pool_table)

    W_bumper = 0.1016
    ball_radius = 0.05715 / 2
    H_bumper = 0.635 * 2 * ball_radius
    front_bumper = Mesh(geometry=BoxGeometry(W_table, H_bumper, W_bumper),
                        material=feltMaterial,
                        position=[0, y_table + H_bumper / 2, L_table / 2 + W_bumper / 2],
                        receiveShadow=True,
                        userData={'cannonData': {'mass': 0,
                                               'shapes': ['Box']}})
    scene.add(front_bumper)
    back_bumper = Mesh(geometry=BoxGeometry(W_table, H_bumper, W_bumper),
                        material=feltMaterial,
                        position=[0, y_table + H_bumper / 2, -(L_table / 2 + W_bumper / 2)],
                        receiveShadow=True,
                        userData={'cannonData': {'mass': 0,
                                               'shapes': ['Box']}})
    scene.add(back_bumper)
    left_bumper = Mesh(geometry=BoxGeometry(W_bumper, H_bumper, L_table),
                       material=feltMaterial,
                       position=[-(W_table / 2 + W_bumper / 2),
                                 y_table + H_bumper / 2,
                                 0],
                       receiveShadow=True,
                       userData={'cannonData': {'mass': 0,
                                                'shapes': ['Box']}})
    scene.add(left_bumper)
    right_bumper = Mesh(geometry=BoxGeometry(W_bumper, H_bumper, L_table),
                        material=feltMaterial,
                        position=[(W_table / 2 + W_bumper / 2),
                                  y_table + H_bumper / 2,
                                  0],
                        receiveShadow=True,
                        userData={'cannonData': {'mass': 0,
                                                 'shapes': ['Box']}})
    scene.add(right_bumper)

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
