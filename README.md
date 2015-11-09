# poolvr


## How to run locally (tested under (64 bit) Windows 7, Windows 10, Ubuntu 14, Fedora 22):

### Method A:

  1. Start a Python HTTP server in the root directory:

   - using Python 2:

    [ ... poolvr]$ python -m SimpleHTTPServer

   - using Python 3:

    [ ... poolvr]$ python -m http.server

  2. Point your browser to http://localhost:8000

### Method B (provides more features to the app):

  1. Run the Python script pyserver/flask_app.py:

    [ ... poolvr]$ python pyserver/flask_app.py

  2. Point your browser to http://127.0.0.1:5000


For method B, I recommend using the Anaconda Python Distribution, which will let you easily install all the Python dependencies.


## Acknowledgements

The following amazing open source projects have helped make poolvr possible:

  JavaScript libraries:

  - three.js
  - Cannon.js
  - Primrose
  - webvr-boilerplate

  Python packages:

  - Tornado
  - Flask
