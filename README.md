# **poolvr**

Play pool / billiards with your [Leap Motion controller](https://www.leapmotion.com) in VR (or fullscreen mode), in a web browser!

![screenshot](http://jzitelli.github.io/poolvr/images/screenshot6.png)




## About:

**poolvr** uses [three.js](http://threejs.org) to provide WebGL graphics and [Cannon.js](http://www.cannonjs.org) to provide real-time physics.
If you use a WebVR-enabled browser, you can play in VR!  This feature uses [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate).
The three.js pool table scene and Cannon.js world is defined procedurally via a Python script.


This project began as an experimental example that I introduced into
my fork of [Primrose](http://www.primroseeditor.com), which was my own starting point for WebVR development.
[**poolvr** became my entry](http://subvr.itch.io/poolvr) into the [Leap Motion 3D Jam](http://itch.io/jam/leapmotion3djam) (at literally the last minute).
**poolvr** is the main WebVR project that I'm working on now.
It's been improved since the [Leap Motion 3D Jam](http://itch.io/jam/leapmotion3djam) ended!  Some amazing features are planned!




## Obtaining the latest WebVR-enabled browsers:

- Mozilla Firefox supports WebVR in its nightly builds, [see MozVR for more info](http://mozvr.com)
- [WebVR-enabled builds of Chrome / Chromium](http://blog.tojicode.com/2014/07/bringing-vr-to-chrome.html)




## Desktop and VR tracking modes:

The default stick tracking mode (aka 'desktop') assumes that the Leap Motion sensor is stationary, facing up.

The VR stick tracking mode assumes that the sensor is [mounted to your HMD](https://developer.leapmotion.com/vr-setup).
Currently this mode is selected using a `vrLeap` URL parameter, e.g. you would point your browser to `http://127.0.0.1:5000?vrLeap=true`.

**I highly recommend using desktop tracking at the moment - in my experience it provides much better tool tracking in the context of cue stick in/out motions.**




## How to run locally (tested under (64 bit) Windows 7, Windows 10, Ubuntu 14, Fedora 22):

### Method A (serving the static file `index.html`):

1. Start a Python HTTP server in the root directory:
    - using Python 2: `python -m SimpleHTTPServer`
    - using Python 3: `python -m http.server`
2. Point your browser to `http://127.0.0.1:8000`


### Method B (Tornado/Flask application serving dynamically generated HTML):

This method requires some extra Python packages, but offers more functionality.  I recommend using the [Miniconda Python distribution](http://conda.pydata.org/miniconda.html), which will let you easily install the Python dependencies.

1. Run the Python script `pyserver/tornado_app.py`: ```bash
python pyserver/tornado_app.py```
2. Point your browser to `http://127.0.0.1:5000`

The Tornado server is configured to also serve any file within the project tree (nice for local development, but probably a bad idea to deploy to an actual web server).
For instance, you can access the static `index.html` that you would obtain with method A via `http://127.0.0.1:5000/index.html`.


Currently, you can configure the graphics and other aspects of **poolvr** via URL parameters.  Some of the recognized URL parameters are:

- `useBasicMaterials`: defaults to `true`, which configures bare-bones, low-expectation setting "EGA" graphics for max performance and compatibility
- `shadowMap`: defaults to `false`, shadows will be rendered as projected meshes.  If `true`, shadows are rendered via three.js shadow maps.




## Building **poolvr**:

If you have [Node.js](https://nodejs.org) and [Grunt](http://www.gruntjs.com) installed,
the included `Gruntfile.js` may be used to build packaged versions of **poolvr**:

1. From the root directory, install grunt dependencies via Node Package Manager: `npm install`
2. From the root directory: `grunt`




## Acknowledgements:

The following amazing open-source projects have helped make **poolvr** possible:

JavaScript libraries:
  - [Leap Motion JavaScript framework](https://github.com/leapmotion/leapjs)
  - [LeapJS-Plugins](https://github.com/leapmotion/leapjs-plugins)
  - [three.js](http://threejs.org)
  - [Cannon.js](http://www.cannonjs.org)
  - [Primrose](https://www.primroseeditor.com)
  - [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate)
  - [Shader Particle Engine](https://github.com/squarefeet/ShaderParticleEngine)

Python packages:
  - [Tornado](http://www.tornadoweb.org)
  - [Flask](http://flask.pocoo.org/)
  - [NumPy](http://www.numpy.org)




## TODO list:

- add 8-ball / other pool/billiards game logic
- auto-positioning system
- Leap Motion hand interactions (e.g. point at the ball you want to pocket next)
- ball labels
- improve and add more sounds
- menu / menus
- tweak friction, collision response physics parameters
- improve Leap Motion tracking robustness
- multi-user
