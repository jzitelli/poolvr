var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    url = require('url');

const PORT = 8000;
const TEST_URL = "http://localhost:" + PORT + "/test/index.html";

function handleRequest(request, response) {
    var pathname = url.parse(request.url).pathname;
    if (pathname.endsWith('test')) pathname += '/index.html';
    var filename = pathname.slice(1);

    if (pathname.endsWith('.html')) {
        response.writeHead(200, {'Content-Type': 'text/html'});
    } else {
        response.writeHead(200, {'Content-Type': 'text/plain'});
    }

    var readStream = fs.createReadStream(filename);
    readStream.on('end', function () {
        response.end();
    });
    readStream.on('error', function () {
        console.error('error reading from ' + filename);
        response.writeHead(404);
        response.end();
    });
    readStream.pipe(response);
}

var server = http.createServer(handleRequest);

server.listen(PORT, function () {
    console.log("server listening on: http://localhost:%s", PORT);
});

exports.TEST_URL = TEST_URL;
