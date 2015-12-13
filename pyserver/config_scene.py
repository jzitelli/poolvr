"""Configuration three.js scene
"""
from copy import deepcopy
import numpy as np

from three import *
from pool_table import *


def config_scene(**config):
    L_table = config.get('L_table', 2.3)
    scene = pool_hall(**config)

    textGeom = TextGeometry(text="poolvr",
                            font='anonymous pro',
                            height=0.07, size=0.4, curveSegments=2)
    textMesh = Mesh(geometry=textGeom,
                    material=MeshBasicMaterial(color=0x6df700),
                    position=[0, 1.1, -0.5*L_table])
    scene.add(textMesh)
    textGeom = TextGeometry(text="v0.1.0",
                            font='anonymous pro',
                            height=0.04, size=0.22, curveSegments=2)
    textMesh = Mesh(geometry=textGeom,
                    material=MeshBasicMaterial(color=0xf6f700),
                    position=[0, 0.85, -0.5*L_table])
    scene.add(textMesh)

    textGeom = TextGeometry(text=json.dumps(config, indent=2),
                            font='anonymous pro',
                            size=0.16, height=0, curveSegments=2)
    textMesh = Mesh(geometry=textGeom,
                    material=MeshBasicMaterial(color=0xffff00),
                    position=[-2, 0, -3])
    scene.add(textMesh)
    
    return scene
