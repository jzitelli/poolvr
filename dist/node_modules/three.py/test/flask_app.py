import logging
import json
import os.path
import sys
import imp

from flask import Flask, render_template, Markup, request

sys.path.insert(0, os.path.abspath(os.path.join(os.path.split(__file__)[0], os.path.pardir)))

from three import *

WebVRConfig = {
    "FORCE_ENABLE_VR":            False,
    "PREDICTION_TIME_S":          0.020,
    "KEYBOARD_CONTROLS_DISABLED": True,
    "ENABLE_LEAP_MOTION": True,
    "LEAP_MOTION_HOST": '192.168.1.201'
}

DEBUG           = True
PORT            = 5000
STATIC_FOLDER   = os.path.abspath(os.path.join(os.path.split(__file__)[0], os.path.pardir))
TEMPLATE_FOLDER = os.path.abspath(os.path.split(__file__)[0])

def get_test_link_table():
    return Markup(r"""
<table>
%s
</table>
""" % '\n'.join(["<tr> <td><a class='testLink' href='{1}'>{0}</a></td> </tr>".format(name, href)
                 for name, href in [(test, TEST_HREFS[test]) for test in TESTS]]))

def get_overlay_content():
    return Markup(r"""
<a class='testLink' href="/">HOME</a>
<hr>
<h2>Tests:</h2>
""") + get_test_link_table() + Markup(r"""
<hr>
<h2>Options:</h2>
<label style='color: #aaee77; padding: 1vh;'>shadow maps<input id="shadowMapCheckbox" type="checkbox"/></label>
<label style='color: #aaee77; padding: 1vh;'>desk<input id="deskCheckbox" type="checkbox"/></label>
<hr>
<button id='vrButton'>toggle VR</button>
""")



TESTS = []
TESTS_MODULES = {}
for test in ['layers',
             'heightfield',
             'cannon',
             'pool_table',
             'skybox',
             'textgeometry',
             'points',
             'points_billboards',
             'materials',
             'lights']:
    try:
        triple = imp.find_module(test, [os.path.abspath(os.path.split(__file__)[0])])
        module = imp.load_module(test, *triple)
        TESTS.append(test)
        TESTS_MODULES[test] = module
    except ImportError as err:
        _logger.error(err)
TEST_HREFS = {name: href
              for name, href in [(name, '/%s' % name) for name in TESTS]}



app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            static_url_path='',
            template_folder=TEMPLATE_FOLDER)
app.debug = DEBUG
app.testing = True

@app.route('/')
def main_page():
    scene = Scene()
    scene.add(PointLight(color=0xffffff, intensity=1, distance=100, position=[-4, 5, 20]))
    boxMesh = Mesh(geometry=BoxGeometry(width=1, height=1, depth=1),
                   material=MeshPhongMaterial(color=0xff0000, shading=FlatShading),
                   position=[1, 1.5, -3])
    scene.add(boxMesh)
    sphereMesh = Mesh(geometry=SphereBufferGeometry(radius=0.5, widthSegments=11, heightSegments=9),
                      material=MeshLambertMaterial(color=0x00ff00),
                      position=[0, 2.5, -3])
    scene.add(sphereMesh)
    textGeomMesh = Mesh(geometry=TextGeometry(text='three.py',
                                              font_url='node_modules/three.js/examples/fonts/helvetiker_regular.typeface.json',
                                              size=0.25, height=0.25/16),
                        material=MeshBasicMaterial(color=0x0000ff),
                        position=[-1, 1.5, -3])
    scene.add(textGeomMesh)
    return render_template('template.html',
                           json_config=Markup("""<script>
var WebVRConfig = %s;
var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2), json.dumps(scene.export()))),
                           overlay_content=get_overlay_content())



def main():
    _logger = logging.getLogger(__name__);
    for module in TESTS_MODULES.values():
        app.register_blueprint(getattr(module, 'blueprint'))
    _logger.debug("app.config:\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                 for k, v in sorted(app.config.items(),
                                                                    key=lambda i: i[0])]))
    _logger.info(r"""
            ------
        T H R E E . PY
   **************************
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
STARTING FLASK APP!!!!!!!!!!!!!
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  **************************
        T H R E E . PY
            ------
""")
    app.run(host='0.0.0.0')



if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    main()
