var CleaningRobot;
(function (CleaningRobot) {
    var statsUpdate = function update(values) {
        var statsElements = document.getElementsByClassName('stats');
        var statFields = ['duration', 'spaces-cleaned', 'completion', 'rate'];
        var _loop_1 = function (i) {
            statFields.forEach(function (statField) {
                // DOM attributes are hyphenated, but the backend speaks camelCase
                var statFieldCamel = statField.replace(/-([a-z])/g, function (match) { return match[1].toUpperCase(); });
                if (values.hasOwnProperty(statFieldCamel)) {
                    var statElement = statsElements[i];
                    var statFieldElement = statElement.querySelector("[data-stat=\"" + statField + "\"]");
                    statFieldElement.innerText = values[statFieldCamel];
                }
            });
        };
        for (var i = 0; i < statsElements.length; i++) {
            _loop_1(i);
        }
    };
    // Draws the map on an HTML canvas, using a supplied 2D array
    var mapUpdate = function mapUpdate(matrix) {
        var mapCanvasElements = document.getElementsByClassName('map-canvas');
        for (var i = 0; i < mapCanvasElements.length; i++) {
            var map = mapCanvasElements[i];
            var height = matrix.length;
            if (height < 1) {
                return;
            }
            var canvasWidth = matrix[0].length;
            map.setAttribute('height', String(height * 16));
            map.setAttribute('width', String(canvasWidth * 16));
            var ctx = map.getContext('2d');
            ctx.scale(4, 4);
            for (var y = 0; y < height; y++) {
                for (var x = 0; x < matrix[y].length; x++) {
                    ctx.beginPath();
                    // Use the right colours for the square type
                    switch (matrix[y][x]) {
                        case '#':
                            ctx.fillStyle = 'black';
                            break;
                        case '/':
                            ctx.fillStyle = '#9CE8B4';
                            break;
                        default:
                            ctx.fillStyle = 'white';
                            break;
                    }
                    ctx.strokeStyle = matrix[y][x] === '#' ? 'black' : '#ddd';
                    ctx.rect(x * 4, y * 4, 4, 4);
                    ctx.stroke();
                    ctx.fill();
                    // If the robot is in the square, draw the robot
                    if (matrix[y][x] === 'X') {
                        ctx.beginPath();
                        ctx.fillStyle = 'blue';
                        ctx.arc(x * 4 + 2, y * 4 + 2, 2, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            }
        }
    };
    var Dashboard = /** @class */ (function () {
        function Dashboard() {
            this.host = 'localhost:3000';
            this.stats = {
                spacesCleaned: 0,
                completion: 0,
                productivity: 0
            };
        }
        // Start the WebSocket connection
        Dashboard.prototype.connect = function () {
            this.connection = new WebSocket('ws://' + this.host);
            // Handle messages from the backend
            this.connection.addEventListener('message', function (event) {
                var message;
                try {
                    message = JSON.parse(event.data);
                }
                catch (error) {
                    console.error('Failed to parse message.', { error: error, message: event.data });
                    return;
                }
                var map = [];
                // Convert the map from the server into a 2D array
                if (message.hasOwnProperty('map')) {
                    var rows = message['map'].split("\n");
                    rows.forEach(function (row) {
                        if (row.length > 0) {
                            map.push(row.split(''));
                        }
                    });
                }
                else {
                    map.push[''];
                }
                // Draw the map on the next available animation frame
                window.requestAnimationFrame(function () {
                    mapUpdate(map);
                });
                if (message['state'] === 'running') {
                    statsUpdate(message['stats']);
                }
                else if (message['state'] === 'complete') {
                    // Give the map time to update before alerting.
                    window.setTimeout(function () { return window.alert("Cleaning Complete.\n\nTotal time: " + message['stats']['duration'] + " seconds."); }, 50);
                }
            });
            return this.connection;
        };
        Dashboard.prototype.start = function () {
            console.log('start');
            this.connection.send('run');
        };
        return Dashboard;
    }());
    CleaningRobot.Dashboard = Dashboard;
})(CleaningRobot || (CleaningRobot = {}));
window.onload = function () {
    var startButton = document.querySelector('button[data-action="start"]');
    var dashboard = new CleaningRobot.Dashboard();
    var connection = dashboard.connect();
    // Once the WebSocket connection is open, add the event listener to the Start button
    connection.onopen = function () {
        startButton.addEventListener('click', function () {
            dashboard.start();
            startButton.parentElement.removeChild(startButton);
        });
    };
};
