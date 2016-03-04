# **poolvr**

Play pool / billiards with your [Leap Motion controller](https://www.leapmotion.com) in VR, in a web browser!

![screenshot](http://jzitelli.github.io/poolvr/images/poolvr-0.1.0-02162016.png)


## About:

**poolvr** uses [three.js](http://threejs.org) to provide [WebGL](https://www.khronos.org/webgl) graphics and [Cannon.js](http://www.cannonjs.org) to provide real-time physics.  VR support is provided by the currently-in-development [WebVR API](http://webvr.info).  [WebVR Polyfill](https://github.com/borismus/webvr-polyfill) provides this functionality for those browsers / devices which don't implement native WebVR support.  The pool table is defined parametrically via a Python script and exported to three.js-friendly format using [three.py](https://github.com/jzitelli/three.py).

This project began as an experimental example that I introduced into my fork of [Primrose](http://www.primrosevr.com), which was my own starting point for [WebVR](http://webvr.info) development.
[**poolvr** became my entry](http://subvr.itch.io/poolvr) into the [Leap Motion 3D Jam](http://itch.io/jam/leapmotion3djam) (at literally the last minute).
**poolvr** is the main WebVR project that I'm working on now.
It's been improved since the 3D Jam ended!
Some amazing features are planned!

You can [try a live version of **poolvr**](http://jzitelli.github.io/poolvr/poolvr-webvr1/index.html) which is hosted on [the project's GitHub pages](https://jzitelli.github.io/poolvr).


## Acknowledgements:

The following amazing open-source projects have helped make **poolvr** possible:

JavaScript libraries:
  - [Leap Motion JavaScript API](https://github.com/leapmotion/leapjs)
  - [three.js](http://threejs.org)
  - [Cannon.js](http://www.cannonjs.org)
  - [Primrose](https://www.primrosevr.com)
  - [webvr-polyfill](https://github.com/borismus/webvr-polyfill)

Python packages:
  - [Flask](http://flask.pocoo.org/)
  - [Jinja](http://jinja.pocoo.org/)
  - [NumPy](http://www.numpy.org)

The space nebula cube map background was created with [Space 3D](http://wwwtyro.github.io/space-3d/#animationSpeed=1&fov=90&nebulae=true&pointStars=true&resolution=1024&seed=1bblx79ds&stars=true&sun=false).
