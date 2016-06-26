import json
import os
import shutil
from jinja2 import Environment, FileSystemLoader, Markup

from poolvr import TEMPLATE_FOLDER, WebVRConfig, POOLVR, pool_table, GIT_REVS


OUTPUT_DIR = 'dist'


def main():
    shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    shutil.copytree('build', os.path.join(OUTPUT_DIR, 'build'))
    env = Environment(loader=FileSystemLoader(TEMPLATE_FOLDER))
    template = env.get_template('poolvr_template.html')
    s = template.render(config={'DEBUG': False},
                        json_config=Markup(r"""<script>
var WebVRConfig = %s;

var POOLVR = %s;

var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(POOLVR, indent=2),
                json.dumps(pool_table.pool_hall(**POOLVR['config']).export()))),
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
""".format(GIT_REVS[0], GIT_REVS[1], POOLVR['version'])))
    with open(os.path.join(OUTPUT_DIR, 'poolvr.html'), 'w') as f:
        f.write(s)
    # copy resources:
    shutil.copy('poolvr.css', OUTPUT_DIR)
    shutil.copy('favicon.ico', OUTPUT_DIR)
    shutil.copytree('fonts', os.path.join(OUTPUT_DIR, 'fonts'))
    shutil.copytree('images', os.path.join(OUTPUT_DIR, 'images'))
    shutil.copytree('sounds', os.path.join(OUTPUT_DIR, 'sounds'))
    # copy npm dependencies:
    shutil.copytree(os.path.join('node_modules', 'cannon', 'build'), os.path.join(OUTPUT_DIR, 'node_modules', 'cannon', 'build'))
    os.makedirs(os.path.join(OUTPUT_DIR, 'node_modules', 'leapjs'))
    shutil.copy(os.path.join('node_modules', 'leapjs', 'leap-0.6.4.min.js'), os.path.join(OUTPUT_DIR, 'node_modules', 'leapjs'))
    os.makedirs(os.path.join(OUTPUT_DIR, 'node_modules', 'three.js', 'build'))
    os.makedirs(os.path.join(OUTPUT_DIR, 'node_modules', 'three.js', 'examples'))
    shutil.copy(os.path.join('node_modules', 'three.js', 'build', 'three.min.js'), os.path.join(OUTPUT_DIR, 'node_modules', 'three.js', 'build'))
    shutil.copytree(os.path.join('node_modules', 'three.js', 'examples', 'js'), os.path.join(os.path.join(OUTPUT_DIR, 'node_modules', 'three.js', 'examples', 'js')))
    os.makedirs(os.path.join(OUTPUT_DIR, 'node_modules', 'three.py'))
    shutil.copytree(os.path.join('node_modules', 'three.py', 'js'), os.path.join(OUTPUT_DIR, 'node_modules', 'three.py', 'js'))
    os.makedirs(os.path.join(OUTPUT_DIR, 'node_modules', 'webvr-polyfill', 'build'))
    shutil.copy(os.path.join('node_modules', 'webvr-polyfill', 'build', 'webvr-polyfill.js'), os.path.join(OUTPUT_DIR, 'node_modules', 'webvr-polyfill', 'build'))
    os.makedirs(os.path.join(OUTPUT_DIR, 'node_modules', 'yawvrb', 'build'))
    shutil.copy(os.path.join('node_modules', 'yawvrb', 'build', 'yawvrb.js'), os.path.join(OUTPUT_DIR, 'node_modules', 'yawvrb', 'build'))

if __name__ == "__main__":
	main()
