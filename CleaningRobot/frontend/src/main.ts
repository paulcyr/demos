namespace CleaningRobot {

    const statsUpdate = function update(values: object) {

        const statsElements = document.getElementsByClassName('stats');
        const statFields = ['duration', 'spaces-cleaned', 'completion', 'rate'];

        for (let i: number = 0; i < statsElements.length; i++) {

            statFields.forEach((statField) => {
                
                // DOM attributes are hyphenated, but the backend speaks camelCase
                const statFieldCamel: string = statField.replace(/-([a-z])/g, function (match) { return match[1].toUpperCase(); });

                if (values.hasOwnProperty(statFieldCamel)) {

                    const statElement: HTMLElement = <HTMLElement>statsElements[i];
                    const statFieldElement: HTMLElement = <HTMLElement>statElement.querySelector(`[data-stat="${statField}"]`);
                    statFieldElement.innerText = values[statFieldCamel];
                }
            });

        }
    }

    // Draws the map on an HTML canvas, using a supplied 2D array
    const mapUpdate = function mapUpdate(matrix: Array<Array<string>>) {

        const mapCanvasElements = document.getElementsByClassName('map-canvas');

        for (let i: number = 0; i < mapCanvasElements.length; i++) {

            const map: HTMLCanvasElement = <HTMLCanvasElement>mapCanvasElements[i];
            const height: number = matrix.length;

            if (height < 1) {
                return;
            }

            let canvasWidth = matrix[0].length;

            map.setAttribute('height', String(height * 16));
            map.setAttribute('width', String(canvasWidth * 16));

            const ctx = <CanvasRenderingContext2D>map.getContext('2d');
            ctx.scale(4, 4);

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < matrix[y].length; x++) {

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
    }

    export class Dashboard {

        host: string = 'localhost:3000'
        connection: WebSocket;
        stats: object = {
            spacesCleaned: 0,
            completion: 0,
            productivity: 0
        }

        // Start the WebSocket connection
        connect(): any {

            this.connection = new WebSocket('ws://' + this.host);

            // Handle messages from the backend
            this.connection.addEventListener('message', (event) => {

                let message: object;

                try {
                    message = JSON.parse(event.data);
                }
                catch (error) {
                    console.error('Failed to parse message.', { error: error, message: event.data });
                    return;
                }


                let map: Array<Array<string>> = [];

                // Convert the map from the server into a 2D array
                if (message.hasOwnProperty('map')) {
                    const rows: Array<string> = message['map'].split("\n");
                    rows.forEach((row) => {
                        if (row.length > 0) {
                            map.push(row.split(''));
                        }
                    });
                }
                else {
                    map.push[''];
                }

                // Draw the map on the next available animation frame
                window.requestAnimationFrame(() => {
                    mapUpdate(map);
                });

                if (message['state'] === 'running') {
                    statsUpdate(message['stats']);
                }
                else if (message['state'] === 'complete') {
                    // Give the map time to update before alerting.
                    window.setTimeout(() => window.alert(`Cleaning Complete.\n\nTotal time: ${message['stats']['duration']} seconds.`), 50);
                }
            });

            return this.connection
        }

        start() {
            console.log('start');
            this.connection.send('run');
        }
    }
}

window.onload = function () {
    
    const startButton = <HTMLButtonElement>document.querySelector('button[data-action="start"]');
    const dashboard = new CleaningRobot.Dashboard();
    const connection = <WebSocket>dashboard.connect();

    // Once the WebSocket connection is open, add the event listener to the Start button
    connection.onopen = function () {
        startButton.addEventListener('click', function () {
            dashboard.start();
            startButton.parentElement.removeChild(startButton);
        });
    };
}