import os.path
import json

from . import *

SHADERLIB_PATH = os.path.abspath(os.path.split(__file__)[0])

try:
    with open(os.path.join(SHADERLIB_PATH, 'ShaderLib.json')) as f:
        ShaderLib = json.loads(f.read())
except Exception as err:
    ShaderLib = None

try:
    with open(os.path.join(SHADERLIB_PATH, 'UniformsLib.json')) as f:
        UniformsLib = json.loads(f.read())
except Exception as err:
    UniformsLib = None

try:
    with open(os.path.join(SHADERLIB_PATH, 'ShaderChunk.json')) as f:
        ShaderChunk = json.loads(f.read())
except Exception as err:
    ShaderChunk = None
