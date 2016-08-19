
var fs = require('fs'),
    PNG = require('pngjs').PNG,
    Quad = require('./Quad.js').Quad,
    PriorityQueue = require('js-priority-queue'),
    cmdFlags = require('commander'),
    setup = {};

var Shapes = {
    RECT: 1,
    ROUNDED: 2
};

cmdFlags
    .version('0.2.0')
    .usage('<file> [options]')
    .option('-b, --borders', 'Enable border drawing in subnodes')
    .option('-i, --iterations <number>', 'Perform up to <number> iterations', function(i) { return parseInt(i, 10); }, 1024)
    .option('-e, --error-threshold <number>', 'Adjust the error threshold required for a new frame to be saved to a file', parseFloat, 0.5)
    .option('-s, --shape <type>', 'Choose the shape of the nodes of the quad tree: "rect" (default) or "rounded".', 'rect')
    .parse(process.argv);

if (!cmdFlags.args.length)
    cmdFlags.help(); // This also stops execution

setup.filename = cmdFlags.args[0];
setup.drawBorders = cmdFlags.borders;
setup.iterations = cmdFlags.iterations;
setup.errorThreshold = cmdFlags.errorThreshold;

if (cmdFlags.shape === 'rect') { setup.shape = Shapes.RECT; }
else if (cmdFlags.shape === 'rounded') { setup.shape = Shapes.ROUNDED; }
else { cmdFlags.help(); process.exit(1); }

function drawTree(data, quad, shape) {
    quad.walk(function(leaf) {
        var rect = leaf.getRect(), // Rekt
            average = leaf.getAverage();

        var current = {},
            position;

        var cornerRadius = Math.floor(Math.min(rect.width, rect.height) / 2);
        var corners = [[cornerRadius, cornerRadius],
                       [cornerRadius, rect.height - cornerRadius],
                       [rect.width - cornerRadius, rect.height - cornerRadius],
                       [rect.width - cornerRadius, cornerRadius]];
        for (var i = 0; i < rect.width; i++) {
            for (var j = 0; j < rect.height; j++) {
                current.x = rect.x + i;
                current.y = rect.y + j;
                position = (current.y * quad.getWidth() + current.x) << 2; // = *4

                if (shape === Shapes.RECT) {
                    if (setup.drawBorders &&
                        (i == 0 || j == 0)) {
                        // Borders
                        for (var k = 0; k < 3; k++)

                            data[position + k] = 0;
                        data[position + 3] = 255;
                    }
                    else {
                        for (k = 0; k < 4; k++) {
                            data[position + k] = average[k];
                        }
                    }
                }
                else if (shape === Shapes.ROUNDED) {
                    var paintBlack = true;
                    // Take advantage of symmetry with top left
                    // corner
                    var x = i;
                    if (x > rect.width / 2) x = rect.width - x;
                    var y = j;
                    if (y > rect.height / 2) y = rect.height - y;

                    if (x > cornerRadius || y > cornerRadius) {
                        paintBlack = false;
                    }
                    else {
                        var xdist = x - cornerRadius;
                        var ydist = y - cornerRadius;
                        var sqrDist = xdist * xdist + ydist * ydist;

                        if (sqrDist <= cornerRadius * cornerRadius) {
                            paintBlack = false;
                        }
                    }

                    if (paintBlack) {
                        // Black
                        for (k = 0; k < 3; k++)
                            data[position + k] = 0;
                        data[position + 3] = 255;
                    }
                    else {
                        for (k = 0; k < 4; k++)
                            data[position + k] = average[k];
                    }
                }
            }
        }
    });
}

function score(a) {
    return a.getError()*Math.sqrt(Math.sqrt(a.getArea()));
}

function getFilename(iteration) {
    var str = '' + iteration;
    
    while (str.length < 6)
        str = '0' + str;
    
    return 'frames/' + str + '.png';
}

fs.createReadStream(setup.filename)
    .pipe(new PNG({
        filterType: 4
    }))
    .on('parsed', function() {

        var rgba = new Buffer(this.data); // Copy

        var quad = new Quad(rgba, this.width, this.height);
        var iterations = setup.iterations,
            iteration = 0;

        var errorThreshold = setup.errorThreshold;

        var queue = new PriorityQueue({ comparator: function(a, b) {
            return score(b) - score(a);
        }});

        var currentError,
            previousError = null;
        quad.walk(function(leaf) {
            queue.queue(leaf);
            currentError = leaf.getError() * leaf.getArea();
        });

        function reExpand() {
            if (iteration >= iterations) {
                drawTree(this.data, quad, setup.shape);
                this.pack().pipe(fs.createWriteStream('output.png'));
                return;
            }

            while (previousError !== null &&
                   previousError - currentError / (this.width * this.height) < errorThreshold) {
                if (queue.length === 0) break;
                if (iteration >= iterations) {
                    reExpand(); // output.png
                    return;
                }
                
                var leaf = queue.dequeue();
                currentError -= leaf.getError() * leaf.getArea();

                leaf.expand();
                leaf.walkLeaves(function(leaf) {
                    queue.queue(leaf);
                    currentError += leaf.getError() * leaf.getArea();
                });
                iteration++;
            }
            console.log('Iteration #' + iteration);

            previousError = currentError / (this.width * this.height);
            
            drawTree(this.data, quad, setup.shape);

            this.pack().pipe(fs.createWriteStream(getFilename(iteration)));
            this.once('end', reExpand);
        }

        reExpand = reExpand.bind(this);
        reExpand();
    });
