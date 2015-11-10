# poolvr

Play pool / billiards with your LeapMotion device in VR (or fullscreen mode), in a web browser!



## Obtaining the latest WebVR-enabled browsers:

- Mozilla Firefox supports WebVR in its nightly builds, [see MozVR for more info](http://mozvr.com)

- [WebVR-enabled builds of Chrome / Chromium](http://blog.tojicode.com/2014/07/bringing-vr-to-chrome.html)



## How to run locally (tested under (64 bit) Windows 7, Windows 10, Ubuntu 14, Fedora 22):

### Method A (serving the static file `index.html`):

1. Start a Python HTTP server in the root directory:
    - using Python 2: `python -m SimpleHTTPServer`
    - using Python 3: `python -m http.server`
2. Point your browser to `http://localhost:8000` (desktop tracking) or `http://localhost:8000?vr=1` (VR tracking)

### Method B (Flask application serving dynamically generated HTML):

This method requires some extra Python packages.  I recommend using the [Anaconda Python distribution](https://www.continuum.io/downloads), which will let you easily install the Python dependencies.

1. Run the Python script `flask_app.py`: `python flask_app.py`
2. Point your browser to `http://127.0.0.1:5000` (desktop tracking) or `http://127.0.0.1:5000?vr=1` (VR tracking)

The Flask application is configured to also serve any file within the project tree (nice for local development, but probably a bad idea to deploy to an actual web server).
For instance, you can access the static `index.html` that you would obtain with method A via `http://127.0.0.1:5000/index.html`.



## Desktop and VR tracking modes:

The default stick tracking mode (aka 'desktop') assumes that the LeapMotion sensor is stationary, facing up.

The VR stick tracking mode assumes that the sensor is [mounted to your HMD](https://developer.leapmotion.com/vr-setup).
Currently this mode is selected using a `vr` URL parameter, e.g. you would point your browser to `http://127.0.0.1:5000?vr=1`.



## TODO list:

- Cannon.js model for the pockets, not sure what the best approach is
- Run-time tracking mode toggling
- Ball labels, more balls
- Select friction, collision response physics parameters
- Hand interactions



## Acknowledgements:

The following amazing open-source projects have helped make **poolvr** possible:

JavaScript libraries:
  - [three.js](https://github.com/mrdoob/three.js)
  - [Cannon.js](https://github.com/schteppe/cannon.js)
  - [Primrose](https://github.com/capnmidnight/Primrose)
  - [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate)

Python packages:
  - [Flask](http://flask.pocoo.org/)
  - [NumPy](http://www.numpy.org)
