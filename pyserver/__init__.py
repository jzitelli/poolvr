import os
import sys
import logging
_logger = logging.getLogger(__name__)
sys.path.append(os.path.join(os.path.split(__file__)[0], os.path.pardir, 'three.py'))
print(sys.path)
# sys.path.insert(0, os.path.join(os.getcwd(), 'three.py'))
import three


from . import pool_table
from . import config_scene
#from . import flask_app
