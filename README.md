# poolvr

Play pool / billiards with your [Leap Motion sensor](https://www.leapmotion.com) in VR (or fullscreen mode), in a web browser!

![screenshot](http://jzitelli.github.io/poolvr/images/screenshot.png)

![screenshot](http://jzitelli.github.io/poolvr/images/screenshot4b.png)


## About:

This project began as an experimental example that I introduced into my fork of [Primrose](https://github.com/capnmidnight/Primrose).  It became my entry into the [Leap Motion 3D Jam](http://itch.io/jam/leapmotion3djam) (at literally the last minute).

**poolvr** uses [three.js](https://github.com/mrdoob/three.js) to provide WebGL graphics and [Cannon.js](https://github.com/schteppe/cannon.js) to provide realtime physics.
If you use a WebVR-enabled browser, you can play in VR!  This feature uses [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate).

The three.js pool table scene and Cannon.js world is defined procedurally via a Python script.



## Obtaining the latest WebVR-enabled browsers:

- Mozilla Firefox supports WebVR in its nightly builds, [see MozVR for more info](http://mozvr.com)
- [WebVR-enabled builds of Chrome / Chromium](http://blog.tojicode.com/2014/07/bringing-vr-to-chrome.html)



## How to run locally (tested under (64 bit) Windows 7, Windows 10, Ubuntu 14, Fedora 22):

### Method A (serving the static file `index.html`):

1. Start a Python HTTP server in the root directory:
    - using Python 2: `python -m SimpleHTTPServer`
    - using Python 3: `python -m http.server`
2. Point your browser to `http://127.0.0.1:8000` (desktop tracking) or `http://127.0.0.1:8000?vr=1` (VR tracking)

### Method B (Flask application serving dynamically generated HTML):

This method requires some extra Python packages.  I recommend using the [Miniconda Python distribution](http://conda.pydata.org/miniconda.html), which will let you easily install the Python dependencies.

1. Run the Python script `flask_app.py`: `python flask_app.py`
2. Point your browser to `http://127.0.0.1:5000` (desktop tracking) or `http://127.0.0.1:5000?vr=1` (VR tracking)

The Flask application is configured to also serve any file within the project tree (nice for local development, but probably a bad idea to deploy to an actual web server).
For instance, you can access the static `index.html` that you would obtain with method A via `http://127.0.0.1:5000/index.html`.



## Desktop and VR tracking modes:

The default stick tracking mode (aka 'desktop') assumes that the Leap Motion sensor is stationary, facing up.

The VR stick tracking mode assumes that the sensor is [mounted to your HMD](https://developer.leapmotion.com/vr-setup).
Currently this mode is selected using a `vr` URL parameter, e.g. you would point your browser to `http://127.0.0.1:5000?vr=1`.



## Building **poolvr**:

If you have [Node.js](https://nodejs.org) and [Grunt](http://www.gruntjs.com) installed,
the included `Gruntfile.js` may be used to build packaged versions of **poolvr**:

1. Install grunt dependencies via Node Package Manager - from the root directory: `npm install`
2. From the root directory: `grunt`



## TODO list:

- finish the pool table
  a. ball labels
  b. initial positions
  c. rails
- sounds
  a. collisions
  b. speech synthesis
- menu / menus for options / settings:
  a. Leap Motion settings
  b. keyboard controls
  c. mouse controls
  d. gamepad controls
  e. volume controls
  f. physics parameters
- friction, collision response physics parameters
- hand interactions / auto-positioning
- improve Leap Motion tracking robustness



## Acknowledgements:

The following amazing open-source projects have helped make **poolvr** possible:

JavaScript libraries:
  - [Leap Motion JavaScript framework](https://github.com/leapmotion/leapjs)
  - [LeapJS-Plugins](https://github.com/leapmotion/leapjs-plugins)
  - [three.js](https://github.com/mrdoob/three.js)
  - [Cannon.js](https://github.com/schteppe/cannon.js)
  - [Primrose](https://github.com/capnmidnight/Primrose)
  - [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate)

Python packages:
  - [Flask](http://flask.pocoo.org/)
  - [NumPy](http://www.numpy.org)
