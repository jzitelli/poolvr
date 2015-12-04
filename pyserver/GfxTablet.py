"""Receives Android tablet input data transmitted via UDP
by the GfxTablet Android app and pushes it to WebSocket client.

GfxTablet: https://github.com/rfc2822/GfxTablet
"""

import logging
import socket
from tornado.websocket import WebSocketHandler
from tornado.ioloop import IOLoop
from tornado.web import Application

_logger = logging.getLogger(__name__)


class GfxTabletHandler(WebSocketHandler):
    TYPE_MOTION = 0
    TYPE_BUTTON = 1
    udpsock = socket.socket(type=socket.SOCK_DGRAM)
    udpsock.bind(('0.0.0.0', 40118))
    udpsock.setblocking(False)
    # see http://www.bbarrows.com/blog/2013/01/27/udptornado/
    def initialize(self):
        self._buf = bytearray(20*10)
        # TODO: maybe not robust on all platforms (see http://stackoverflow.com/questions/166506/finding-local-ip-addresses-using-pythons-stdlib)
        _logger.info("in GfxTablet settings, set the recipient host to %s (this server's local IP address)" % socket.gethostbyname(socket.gethostname()))
    def open(self):
        _logger.debug("WebSocket opened")
        self.set_nodelay(True) # maybe better to not do this?
        ioloop = IOLoop.current()
        ioloop.add_handler(self.udpsock.fileno(), self.handle_input, ioloop.READ)
    def on_message(self, message):
        _logger.debug(message)
    def on_close(self):
        _logger.debug("WebSocket closed")
        ioloop = IOLoop.current()
        ioloop.remove_handler(self.udpsock.fileno())
    def handle_input(self, fd, events):
        # TODO: android app sends width, height, use it
        buf = self._buf
        nbytes = self.udpsock.recv_into(buf)
        event_type = buf[11]
        x = (256 * buf[12] + buf[12 + 1]) / 2.0**15
        y = (256 * buf[14] + buf[14 + 1]) / 2.0**15
        p = (256 * buf[16] + buf[16 + 1]) / 2.0**15
        if event_type == GfxTabletHandler.TYPE_MOTION:
            self.write_message({'x': x, 'y': y, 'p': p})
        elif event_type == GfxTabletHandler.TYPE_BUTTON:
            button = buf[18]
            button_down = buf[19]
            self.write_message({'x': x, 'y': y, 'p': p,
                'button': button, 'button_down': button_down})


if __name__ == "__main__":
    # run standalone websocket server
    logging.basicConfig(level=logging.DEBUG)
    app = Application([(r'/gfxtablet', GfxTabletHandler)])
    port = 5001
    app.listen(port)
    _logger.debug("listening for WebSocket connection on port %d" % port)
    IOLoop.instance().start()
