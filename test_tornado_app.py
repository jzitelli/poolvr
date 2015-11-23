import unittest

import tornado.testing
from tornado.testing import AsyncTestCase, AsyncHTTPClient, AsyncHTTPTestCase
from tornado_app import app


# This test uses coroutine style.
class MyTestCase(AsyncTestCase):
    @tornado.testing.gen_test
    def test_http_fetch(self):
        client = AsyncHTTPClient(self.io_loop)
        response = yield client.fetch("http://www.tornadoweb.org")
        # Test contents of response
        self.assertIn("FriendFeed", response.body)


# This test uses argument passing between self.stop and self.wait.
class MyTestCase2(AsyncTestCase):
    def test_http_fetch(self):
        client = AsyncHTTPClient(self.io_loop)
        client.fetch("http://www.tornadoweb.org/", self.stop)
        response = self.wait()
        # Test contents of response
        self.assertIn("FriendFeed", response.body)


# This test uses an explicit callback-based style.
class MyTestCase3(AsyncTestCase):
    def test_http_fetch(self):
        client = AsyncHTTPClient(self.io_loop)
        client.fetch("http://www.tornadoweb.org/", self.handle_fetch)
        self.wait()

    def handle_fetch(self, response):
        # Test contents of response (failures and exceptions here
        # will cause self.wait() to throw an exception and end the
        # test).
        # Exceptions thrown here are magically propagated to
        # self.wait() in test_http_fetch() via stack_context.
        self.assertIn("FriendFeed", response.body)
        self.stop()


if __name__ == "__main__":
    unittest.main()
