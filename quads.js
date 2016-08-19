
var fs = require('fs'),
    PNG = require('pngjs').PNG,
    Quad = require('./Quad.js').Quad,
    PriorityQueue = require('js-priority-queue'),
    cmdFlags = require('commander'),
    setup = {};

cmdFlags
    .version('0.2.0')
    .usage('<file> [options]')
    .option('-b, --borders', 'Enable border drawing in subnodes')
    .option('-i, --iterations <number>', 'Perform up to <number> iterations', function(i) { return parseInt(i, 10); }, 1024)
    .option('-e, --error-threshold <number>', 'Adjust the error threshold required for a new frame to be saved to a file', parseFloat, 0.5)
    .parse(process.argv);

if (!cmdFlags.args.length)
    cmdFlags.help(); // This also stops execution

setup.filename = cmdFlags.args[0];
setup.drawBorders = cmdFlags.borders;
setup.iterations = cmdFlags.iterations;
setup.errorThreshold = cmdFlags.errorThreshold;

function drawTree(data, quad) {
    quad.walk(function(leaf) {
        var rect = leaf.getRect(), // Rekt
            average = leaf.getAverage();

        var current = {},
            position;
        for (var i = 0; i < rect.width; i++) {
            for (var j = 0; j < rect.height; j++) {
                current.x = rect.x + i;
                current.y = rect.y + j;
                position = (current.y * quad.getWidth() + current.x) << 2;
                if (setup.drawBorders &&
                    (i == 0 || j == 0)) {
                    // Borders
                    for (var k = 0; k < 3; k++)
                        data[position + k] = 0;
                    data[position + 3] = 255;
                }
                else
                    for (k = 0; k < 4; k++)
                        data[position + k] = average[k];
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
                drawTree(this.data, quad);
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
            
            drawTree(this.data, quad);

            this.pack().pipe(fs.createWriteStream(getFilename(iteration)));
            this.once('end', reExpand);
        }

        reExpand = reExpand.bind(this);
        reExpand();
    });
