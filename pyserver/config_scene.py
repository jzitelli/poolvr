"""Configuration three.js scene
"""
from copy import deepcopy
import numpy as np

from three import *
from pool_table import *


def config_scene(L_table=2.3368,
                 **kwargs):
    scene = pool_hall(L_table=L_table, **kwargs)

    textGeom = TextGeometry(text="POOLVR", font='anonymous pro', height=0.1, size=0.4, curveSegments=2)
    textMaterial = MeshBasicMaterial(color=0x6da700)
    textMesh = Mesh(geometry=textGeom,
                    material=textMaterial,
                    position=[0, 1.1, -0.5*L_table])
    scene.add(textMesh)
    return scene
