import ctypes
import numpy as np
import matplotlib.pyplot as plt

import Leap

if __name__ == "__main__":
    plt.ion()
    controller = Leap.Controller()
    controller.set_policy(Leap.Controller.POLICY_BACKGROUND_FRAMES)
    controller.set_policy(Leap.Controller.POLICY_IMAGES)
    image0 = controller.images[0]
    image1 = controller.images[1]
    while (not image0.is_valid) or (not image1.is_valid):
            image0 = controller.images[0]
            image1 = controller.images[1]

    L = np.ctypeslib.as_array((ctypes.c_ubyte * image0.width * image0.height).from_address(int(image0.data_pointer)))
    R = np.ctypeslib.as_array((ctypes.c_ubyte * image1.width * image1.height).from_address(int(image1.data_pointer)))

    plt.figure()
    plt.imshow(L)
    plt.show()

    plt.figure()
    plt.imshow(R)
    plt.show()
