import json
from jinja2 import Environment, FileSystemLoader, Markup

from poolvr import TEMPLATE_FOLDER, WebVRConfig, POOLVR, pool_table, GIT_REVS


OUTPUT = 'dist/poolvr.html'


def main():
    env = Environment(loader=FileSystemLoader(TEMPLATE_FOLDER))
    template = env.get_template('poolvr_template.html')
    # POOLVR['config']['toolOptions']['port'] = 6438 # for hosting on gh-pages (https)
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
    with open(OUTPUT, 'w') as f:
    	f.write(s)



if __name__ == "__main__":
	main()
