"""Updates index.html and poolvr.html"""

import json
from jinja2 import Environment, FileSystemLoader, Markup
from poolvr import TEMPLATE_FOLDER, WebVRConfig, POOLVR, pool_table



def main():
    env = Environment(loader=FileSystemLoader(TEMPLATE_FOLDER))
    s = env.get_template('poolvr_template.html').render(config={'DEBUG': False},
   	                                                    json_config=Markup(r"""<script>
var WebVRConfig = %s;

var POOLVR = %s;

var THREEPY_SCENE = %s;
</script>""" % (json.dumps(WebVRConfig, indent=2),
                json.dumps(POOLVR, indent=2),
                json.dumps(pool_table.pool_hall(**POOLVR['config']).export()))))
    with open('poolvr.html', 'w') as f:
    	f.write(s)



if __name__ == "__main__":
	main()
