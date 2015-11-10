# poolvr

Play pool / billiards in VR with your LeapMotion device, in a web browser!



## How to run locally (tested under (64 bit) Windows 7, Windows 10, Ubuntu 14, Fedora 22):

### Method A (serving the static file `index.html`):

  1. Start a Python HTTP server in the root directory:
    - using Python 2:
      `[ ... poolvr]$ python -m SimpleHTTPServer`
    - using Python 3:
      `[ ... poolvr]$ python -m http.server`
  2. Point your browser to http://localhost:8000


### Method B (serving dynamically generated HTML):

This method requires several Python packages.  I recommend using the [Anaconda Python distribution](https://www.continuum.io/downloads), which will let you easily install all the dependencies.

  1. Run the Python script `pyserver/flask_app.py`:
     `[ ... poolvr]$ python pyserver/flask_app.py`
  2. Point your browser to http://127.0.0.1:5000



## Acknowledgements:

The following amazing open source projects have helped make **poolvr** possible:

  JavaScript libraries:
  - three.js
  - Cannon.js
  - Primrose
  - webvr-boilerplate
  Python packages:
  - Tornado
  - Flask
