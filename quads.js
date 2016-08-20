
var fs = require('fs'),
    PNG = require('pngjs').PNG,
    Quad = require('./lib/Quad').Quad,
    color = require('./lib/color'),
    PriorityQueue = require('js-priority-queue'),
    setup = require('./lib/setup');

function paintLeaf(data, quad, shape, backgroundColor, leaf) {
    var rect = leaf.getRect(), // Rekt
    average = leaf.getAverage();

    var current = {};

    var cornerRadius = Math.floor(Math.min(rect.width, rect.height) / 2);
    var corners = [[cornerRadius, cornerRadius],
                   [cornerRadius, rect.height - cornerRadius],
                   [rect.width - cornerRadius, rect.height - cornerRadius],
                   [rect.width - cornerRadius, cornerRadius]];

    var effectiveBackgroundColor = backgroundColor;
    if (effectiveBackgroundColor === 'random')
        effectiveBackgroundColor = color.randomColor();

    for (var i = 0; i < rect.width; i++) {
        for (var j = 0; j < rect.height; j++) {
            current.x = rect.x + i;
            current.y = rect.y + j;

            if (shape === setup.Shapes.RECT) {
                if (setup.drawBorders &&
                    (i == 0 || j == 0)) {
                    // Borders
                    leaf.paint(data, i, j, effectiveBackgroundColor);
                }
                else {
                    leaf.paint(data, i, j, average);
                }
            }
            else if (shape === setup.Shapes.ROUNDED) {
                var paintBackground = true;
                // Take advantage of symmetry with top left
                // corner
                var x = i;
                if (x > rect.width / 2) x = rect.width - x;
                var y = j;
                if (y > rect.height / 2) y = rect.height - y;

                if (x > cornerRadius || y > cornerRadius) {
                    paintBackground = false;
                }
                else {
                    var xdist = x - cornerRadius;
                    var ydist = y - cornerRadius;
                    var sqrDist = xdist * xdist + ydist * ydist;

                    if (sqrDist <= cornerRadius * cornerRadius) {
                        paintBackground = false;
                    }
                }

                if (paintBackground) {
                    leaf.paint(data, i, j, effectiveBackgroundColor);
                }
                else {
                    leaf.paint(data, i, j, average);
                }
            }
        }
    }
}


function drawTree(data, quad, shape, backgroundColor) {
    quad.walk(paintLeaf.bind(null, data, quad, shape, backgroundColor));
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


// Beginning of the program
setup.parseFlags();

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
                this.pack().pipe(fs.createWriteStream('output.png'));
                return;
            }

            var redrawList = [];

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
                    redrawList.push(leaf);
                    currentError += leaf.getError() * leaf.getArea();
                });
                iteration++;
            }
            console.log('Iteration #' + iteration);

            if (previousError === null) {
                drawTree(this.data, quad, setup.shape, setup.backgroundColor);
            }
            else {
                // Redraw only the necessary parts
                for (var i = 0; i < redrawList.length; i++) {
                    var node = redrawList[i];
                    if (!node.isLeaf()) {
                        // Already expanded, its leaves will come
                        // later
                        continue;
                    }

                    paintLeaf(this.data, quad,
                              setup.shape, setup.backgroundColor,
                              node);
                }
            }

            previousError = currentError / (this.width * this.height);

            this.pack().pipe(fs.createWriteStream(getFilename(iteration)));
            this.once('end', reExpand);
        }

        reExpand = reExpand.bind(this);
        reExpand();
    });
