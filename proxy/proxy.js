const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const myConsole = new console.Console(fs.createWriteStream(path.join(__dirname, 'log.txt')));

function getFile(queryUrl, callback) {
    if (queryUrl.startsWith('https')) {
        https.get(queryUrl, callback);
    } else {
        http.get(queryUrl, callback);
    }
}

function getFileFollowingRedirects(queryUrl, callback, maxRedirects = 5) {
    getFile(queryUrl, (response) => {
        if (response.headers.location && maxRedirects > 0) {
            response.resume();
            getFileFollowingRedirects(response.headers.location, callback, maxRedirects - 1);
        } else {
            callback(response);
        }
    });
}

function downloadFile(queryUrl, response, res)  {
    res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-disposition': 'attachment; filename=' + queryUrl.split('/').pop()
    });
    response.pipe(res);
}

const server = http.createServer((req, res) => {
    const query = url.parse(req.url, true).query;
    const queryUrl = query['url'];
    if (queryUrl) {
        myConsole.log("Downloading " + queryUrl + "\n");
        try {
            getFileFollowingRedirects(queryUrl, (response) => {
                downloadFile(queryUrl, response, res);
            });
        } catch (err) {
            myConsole.error(err);
            res.writeHead(400, {'Content-Type': 'text/plain'});
            res.end(String(err));
        }
    } else {
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end("No url parameter provided.");
    }
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    myConsole.log("Proxy listening on port " + PORT + "\n");
});
