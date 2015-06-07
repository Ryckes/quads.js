
var fs = require('fs'),
    PNG = require('pngjs').PNG,
    Quad = require('./Quad.js').Quad,
    PriorityQueue = require('js-priority-queue');

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
                if (false && (i == 0 || j == 0)) {
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

if (process.argv.length < 3 ||
    process.argv.length > 5) {
    console.log('Usage: ' + process.argv[0] + ' ' + process.argv[1] + ' <filename>[ <iterations>[ <error threshold>]]');
    console.log();
    console.log('Iterations defaults to 1024');
    console.log('Error threshold defaults to 0.5');
    process.exit(1);
}

fs.createReadStream(process.argv[2])
    .pipe(new PNG({
        filterType: 4
    }))
    .on('parsed', function() {

        var rgba = new Buffer(this.data); // Copy

        var quad = new Quad(rgba, this.width, this.height);
        var iterations = process.argv[3] || 1024,
            iteration = 0;

        var errorThreshold = parseFloat(process.argv[4] || 0.5);

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

            while (previousError !== null && previousError - currentError / (this.width * this.height) < errorThreshold){
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
