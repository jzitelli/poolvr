# **poolvr**

Play pool / billiards with your [Leap Motion controller](https://www.leapmotion.com) in VR (or fullscreen mode), in a web browser!

![screenshot](http://jzitelli.github.io/poolvr/images/poolvr-0.1.0.png)




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




<!--
## Desktop and VR tracking modes:

The default stick tracking mode (aka 'desktop') assumes that the Leap Motion sensor is stationary, facing up.

The VR stick tracking mode assumes that the sensor is [mounted to your HMD](https://developer.leapmotion.com/vr-setup).
Currently this mode is selected using a `vrLeap` URL parameter, e.g. you would point your browser to `http://127.0.0.1:5000?vrLeap=true`.

**I highly recommend using desktop tracking at the moment - in my experience it provides much better tool tracking in the context of cue stick in/out motions.**
-->




## Configuration:

You can configure the graphics and other aspects of **poolvr** via URL parameters.  Some of the recognized URL parameters are:

- `useBasicMaterials`: defaults to `true`, which configures bare-bones, low-expectation setting "EGA" graphics for max performance and compatibility
- `useShadowMap`: defaults to `false`, shadows will be rendered as projected meshes.  If `true`, shadows are rendered via three.js shadow maps.
- `host`: network address of the Leap Motion WebSocket server




## How to host locally (tested under Windows 7, Windows 10, Ubuntu 14.04, Fedora 22):

1. Clone this repository
2. Install JavaScript dependencies via Node Package Manager: `npm install`
3. Set up a Python environment with the required packages.  I recommend using the [Miniconda Python distribution](http://conda.pydata.org/miniconda.html), which will let you easily install the Python dependencies (using the `conda` Python package manager): ```
conda install tornado
conda install flask
conda install numpy```
4. Start the Tornado server via: `python pyserver/tornado_app.py`

If all goes well, you should be able to access **poolvr** at `http://127.0.0.1:5000/poolvr`.

The Tornado server is configured to also serve any file within the project tree (nice for local development, but probably a bad idea to deploy to an actual web server).




## Acknowledgements:

The following amazing open-source projects have helped make **poolvr** possible:

JavaScript libraries:
  - [Leap Motion JavaScript framework](https://github.com/leapmotion/leapjs)
  - [LeapJS-Plugins](https://github.com/leapmotion/leapjs-plugins)
  - [three.js](http://threejs.org)
  - [Cannon.js](http://www.cannonjs.org)
  - [Primrose](https://www.primrosevr.com)
  - [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate)
  - [Shader Particle Engine](https://github.com/squarefeet/ShaderParticleEngine)

Python packages:
  - [Tornado](http://www.tornadoweb.org)
  - [Flask](http://flask.pocoo.org/)
  - [NumPy](http://www.numpy.org)


The space nebula cube map background was created with [Space 3D](http://wwwtyro.github.io/space-3d/#animationSpeed=1&fov=90&nebulae=true&pointStars=true&resolution=1024&seed=1bblx79ds&stars=true&sun=false).
