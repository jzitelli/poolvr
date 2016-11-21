"""
Flask application for serving poolvr.
"""
import os
import logging
_logger = logging.getLogger(__name__)
import json
import os
import shutil
import sys
import subprocess
from copy import deepcopy

from flask import Flask, render_template, request, Markup
from jinja2 import Environment, FileSystemLoader

import pool_table


completed_proc = subprocess.run(['git', 'rev-list', '--max-count=4', 'HEAD'], stdout=subprocess.PIPE, check=True, universal_newlines=True)
GIT_REVS = []
for line in completed_proc.stdout.splitlines():
    GIT_REVS.append(line)


STATIC_FOLDER   = os.path.abspath(os.path.split(__file__)[0])
TEMPLATE_FOLDER = STATIC_FOLDER

PACKAGE = json.loads(open('package.json').read())

app = Flask(__name__,
            static_folder=STATIC_FOLDER,
            static_url_path='',
            template_folder=TEMPLATE_FOLDER)

app.debug = True

env = Environment(loader=FileSystemLoader(TEMPLATE_FOLDER))
template = env.get_template('poolvr_template.html')


WebVRConfig = {
    "ENABLE_LEAP_MOTION":               False,
    "LEAP_MOTION_HOST":                 "192.168.1.200",
    "FORCE_ENABLE_VR":                  False,
    "K_FILTER":                         0.98,
    "PREDICTION_TIME_S":                0.020,
    "TOUCH_PANNER_DISABLED":            False,
    "YAW_ONLY":                         False,
    "MOUSE_KEYBOARD_CONTROLS_DISABLED": False,
    "KEYBOARD_CONTROLS_DISABLED":       True
}


POOLVR = {
    'version': PACKAGE['version'],
    'config': {
        'gravity'            : 9.8,
        'useBasicMaterials'  : True,
        'useShadowMap'       : False,
        'useSpotLight'       : True,
        'usePointLight'      : False,
        'useTextGeomLogger'  : True,
        'L_table'            : 2.3368,
        'H_table'            : 0.77,
        'ball_diameter'      : 2.25 * pool_table.INCH2METER,
        'H_ceiling'          : 8 * 12 * 0.0254,
        'synthSpeakerVolume' : 0.5,
        'toolOptions': {
            'tipShape'               : 'Cylinder',
            'numSegments'            : 8,
            'toolRadius'             : 0.01, #0.01325 / 2,
            'tipRadius'              : 0.01, #0.01325 / 2,
            'toolLength'             : 0.37,
            'tipLength'              : 0.37,
            'toolMass'               : 0.54,
            'offset'                 : [0, 0, 0.37 / 2],
            'interactionPlaneOpacity': 0.22,
            'useImplicitCylinder'    : True
        }
    }
}


def get_webvr_config():
    """
    Constructs WebVRConfig dict based on request url parameters.
    """
    config = deepcopy(WebVRConfig)
    args = dict({k: v for k, v in request.args.items()
                 if k in config})
    for k, v in args.items():
        if v == 'false':
            args[k] = False
        elif v == 'true':
            args[k] = True
        elif not (v is False or v is True or v is None):
            try:
                args[k] = float(v)
            except Exception as err:
                pass
    config.update(args)
    return config


def get_poolvr_config():
    """
    Constructs poolvr config dict based on request url parameters.
    """
    config = deepcopy(POOLVR['config'])
    args = dict({k: v for k, v in request.args.items()
                 if k in config})
    for k, v in args.items():
        if v == 'false':
            args[k] = False
        elif v == 'true':
            args[k] = True
        elif not (v is None):
            try:
                args[k] = float(v)
            except Exception as err:
                pass
    config.update(args)
    return {'config': config,
            'version': POOLVR['version']}


def render_poolvr_template(webvr_config=None, poolvr_config=None):
    if webvr_config is None:
        webvr_config = WebVRConfig
    if poolvr_config is None:
        poolvr_config = POOLVR
    return template.render(config={'DEBUG': app.debug},
                           json_config=Markup(r"""<script>
var WebVRConfig = %s;

var POOLVR = %s;

var THREEPY_SCENE = %s;
</script>""" % (json.dumps(webvr_config, indent=2),
                json.dumps(poolvr_config, indent=2),
                json.dumps(pool_table.pool_hall(**poolvr_config['config']).export()))),
                           version_content=Markup(r"""
<h3>v{2}</h3>
<table>
<tr>
<td>
<a href="https://github.com/jzitelli/poolvr/commit/{0}">current commit</a>
</td>
<td>
<a href="https://github.com/jzitelli/poolvr/commit/{1}">previous commit</a>
</td>
</tr>
</table>
""".format(GIT_REVS[0], GIT_REVS[1], poolvr_config['version'])))


@app.route('/')
def poolvr():
    """
    Serves the poolvr app HTML.
    """
    webvr_config = get_webvr_config()
    poolvr_config = get_poolvr_config()
    return render_poolvr_template(webvr_config=webvr_config, poolvr_config=poolvr_config)


DIST_OUTPUT_DIR = 'dist'

def make_dist():
    shutil.rmtree(DIST_OUTPUT_DIR, ignore_errors=True)
    shutil.copytree('build', os.path.join(DIST_OUTPUT_DIR, 'build'))
    with open(os.path.join(DIST_OUTPUT_DIR, 'poolvr.html'), 'w') as f:
        f.write(render_poolvr_template())
    # copy resources:
    shutil.copy('poolvr.css', DIST_OUTPUT_DIR)
    shutil.copy('favicon.ico', DIST_OUTPUT_DIR)
    shutil.copytree('fonts', os.path.join(DIST_OUTPUT_DIR, 'fonts'))
    shutil.copytree('images', os.path.join(DIST_OUTPUT_DIR, 'images'))
    shutil.copytree('sounds', os.path.join(DIST_OUTPUT_DIR, 'sounds'))
    # copy npm dependencies:
    shutil.copytree(os.path.join('node_modules', 'cannon', 'build'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'cannon', 'build'))
    os.makedirs(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'leapjs'))
    shutil.copy(os.path.join('node_modules', 'leapjs', 'leap-0.6.4.min.js'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'leapjs'))
    os.makedirs(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'build'))
    shutil.copy(os.path.join('node_modules', 'three', 'build', 'three.js'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'build'))
    shutil.copy(os.path.join('node_modules', 'three', 'build', 'three.min.js'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'build'))
    os.makedirs(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'examples', 'js', 'controls'))
    os.makedirs(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'examples', 'js', 'effects'))
    os.makedirs(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'examples', 'js', 'objects'))
    os.makedirs(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'examples', 'js', 'loaders'))
    shutil.copy(os.path.join('node_modules', 'three', 'examples', 'js', 'controls', 'VRControls.js'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'examples', 'js', 'controls'))
    shutil.copy(os.path.join('node_modules', 'three', 'examples', 'js', 'effects', 'VREffect.js'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'examples', 'js', 'effects'))
    shutil.copy(os.path.join('node_modules', 'three', 'examples', 'js', 'objects', 'ShadowMesh.js'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'examples', 'js', 'objects'))
    shutil.copy(os.path.join('node_modules', 'three', 'examples', 'js', 'loaders', 'OBJLoader.js'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'examples', 'js', 'loaders'))
    shutil.copytree(os.path.join('node_modules', 'three', 'examples', 'models'), os.path.join(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'examples', 'models')))
    shutil.copytree(os.path.join('node_modules', 'three', 'examples', 'textures'), os.path.join(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three', 'examples', 'textures')))
    os.makedirs(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three.py'))
    shutil.copytree(os.path.join('node_modules', 'three.py', 'js'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'three.py', 'js'))
    os.makedirs(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'stats.js', 'build'))
    shutil.copy(os.path.join('node_modules', 'stats.js', 'build', 'stats.min.js'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'stats.js', 'build'))
    os.makedirs(os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'webvr-polyfill', 'build'))
    shutil.copy(os.path.join('node_modules', 'webvr-polyfill', 'build', 'webvr-polyfill.js'), os.path.join(DIST_OUTPUT_DIR, 'node_modules', 'webvr-polyfill', 'build'))



def main():
    _logger.info("app.config =\n%s" % '\n'.join(['%s: %s' % (k, str(v))
                                                 for k, v in sorted(app.config.items(),
                                                                    key=lambda i: i[0])]))
    _logger.info("""
           ***********
           p o o l v r
    *************************
              {0}
 *******************************
 STARTING FLASK APP!!!!!!!!!!!!!
 *******************************
              {0}
    *************************
           p o o l v r
           ***********
""".format(POOLVR['version']))
    app.run(host='0.0.0.0', port=5000)




if __name__ == "__main__":
    logging.basicConfig(level=(logging.DEBUG if app.debug else logging.INFO),
                        format="%(asctime)s %(levelname)s %(name)s %(funcName)s %(lineno)d:  %(message)s")
    if len(sys.argv) == 2 and sys.argv[1] == 'dist':
        make_dist()
    else:
        main()
