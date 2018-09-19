"use strict";

const http = require('http');
const WebSocket = require('ws');
const { parse } = require('querystring');

const SPEED = 200;
const HOSTNAME = 'localhost';
const PORT = 3000;

const Map = function (asciiMap) {

    this.matrix = [];
    this.robotX;
    this.robotY;
    this.robotLastDirection;
    this.totalSpaces = 0;
    this.uncleanSpaces = 0;
    this.robotPlaced = false;

    // Converts asciiMap into an MD array representing a 2D matrix
    if ((typeof asciiMap === 'string' || asciiMap instanceof String) && asciiMap.length > 0) {

        const rows = asciiMap.split('\\n');
        const tempMatrix = [];
        let y = 0;

        rows.forEach(row => {
            const rowSpaces = row.split('');
            let x = 0;

            rowSpaces.forEach(space => {

                if (space === ' ') {
                    this.totalSpaces++;

                    if (!this.robotPlaced) {
                        this.robotX = x;
                        this.robotY = y;
                        rowSpaces[x] = 'X';

                        console.log(`Robot placed at: ${x}, ${y}`);

                        this.robotPlaced = true;
                    }
                }
                x++;
            });

            tempMatrix.push(rowSpaces);
            y++;
        });

        this.matrix = tempMatrix;
    }

    this.uncleanSpaces = this.totalSpaces - 1;

    console.log(`Uncleaned spaces: ${this.uncleanSpaces}`);

}

Object.defineProperty(Map.prototype, 'spacesCleaned', {
    get: function () {
        return this.totalSpaces - this.uncleanSpaces;
    }
});


Map.prototype.toString = function toString() {
    let mapString = '';
    this.matrix.forEach(row => {
        row.forEach(cell => {
            mapString += cell;
        });
        mapString += "\n";
    })
    return mapString;
}

Map.prototype.robotMove = function robotMove() {

    console.log(`Robot currently at: ${this.robotX}, ${this.robotY}`);

    let canMove = false;
    let newSpace;
    let newX;
    let newY;
    let direction = 0;

    if (typeof this.robotX === 'undefined' || typeof this.robotY === 'undefined') {
        console.error('Robot position undefined');
        return false;
    }

    // Mark the robot's current position as cleaned
    this.matrix[this.robotY][this.robotX] = '/';

    // Randomly select a direction to move that is not a wall.
    while (canMove === false) {

        // to avoid backtracking, bias the robot to continue its current direction
        const newDirection = Math.random() > 0.25;

        direction = newDirection ? Math.floor(Math.random() * 4) : this.robotLastDirection;
        newX = this.robotX;
        newY = this.robotY;

        switch (direction) {
            case 0:
                newY--;
                break;
            case 1:
                newX++;
                break;
            case 2:
                newY++;
                break;
            case 3:
                newX--;
                break;
        }

        newSpace = this.matrix[newY][newX];
        canMove = newSpace !== '#';
    }

    this.robotLastDirection = direction;

    // Mark new space as cleaned if not already cleaned
    if (newSpace === ' ') {
        this.matrix[newY][newX] = '/';
        this.uncleanSpaces--;
    }

    // Record the robot's new coordinates
    switch (direction) {
        case 0:
            this.robotY--;
            break;
        case 1:
            this.robotX++;
            break;
        case 2:
            this.robotY++;
            break;
        case 3:
            this.robotX--;
            break;
    }

    // Mark the robot's new position
    this.matrix[this.robotY][this.robotX] = 'X';

    console.log(`Robot moved to: ${this.robotX}, ${this.robotY}`);
    console.log(`Unclean spaces remaining: ${this.uncleanSpaces}`);

    return true;

}

let map = new Map();

// Create the backend form and handle submissions
const server = http.createServer((request, response) => {

    if (request.method === 'POST') {
        let body = '';
        request.on('data', chunk => {
            body += chunk.toString();
        });
        request.on('end', () => {
            body = parse(body);
            map = new Map(body.map);
            response.statusCode = 303;
            response.setHeader('Location', '/');
            response.end();
        });
    }
    else {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html');
        response.end(`
					<!doctype html>
					<html>
					<body>
							<h1>Enter Map</h1>
							<form action="/" method="post">
									<input name="map" /><br />
									<button>Save</button>
							</form>
							<div>
								<h1>Current Map</h1>
								<pre>` +
            map.toString() +
            `</pre>
					</body>
					</html>
			`);
    }
});

// initialize the WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {

    // Listen to messages from the client
    ws.on('message', (message) => {

        console.log(message);

        if (message === 'map') {
            ws.send(map.toString());
        }
        // Start the robot
        else if (message === 'run') {

            const startTime = new Date();

            // Move the robot every ${SPEED}ms until all spaces cleaned
            const intervalId = setInterval(() => {

                map.robotMove();

                let data = {
                    stats: {
                        spacesCleaned: map.spacesCleaned,
                        completion: Math.round((map.spacesCleaned / map.totalSpaces) * 100),
                        duration: Math.round((new Date() - startTime) / 1000),
                        rate: Math.round((map.spacesCleaned / ((new Date() - startTime) / 1000)) * 10) / 10
                    },
                    map: map.toString()
                };

                if (map.uncleanSpaces > 0) {
                    data.state = 'running';
                }
                else {
                    // Stop the loop
                    clearInterval(intervalId);
                    data.state = 'complete';
                }

                if (ws.readyState === 1) {
                    ws.send(JSON.stringify(data));
                }
            }, SPEED)
        }
    });
});

server.listen(PORT, HOSTNAME, () => {
    console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});