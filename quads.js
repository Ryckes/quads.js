
var fs = require('fs'),
    PNG = require('pngjs').PNG,
    Quad = require('./lib/Quad').Quad,
    color = require('./lib/color'),
    PriorityQueue = require('js-priority-queue'),
    setup = require('./lib/setup'),
    PNGImage = require('./lib/PNGImage');

function paintLeaf(image, quad, shape, backgroundColor, leaf) {
    var rect = leaf.getRect(), // Rekt
    average = leaf.getAverage();

    var cornerRadius = Math.floor(Math.min(rect.width, rect.height) / 2);
    var corners = [[cornerRadius, cornerRadius],
                   [cornerRadius, rect.height - cornerRadius],
                   [rect.width - cornerRadius, rect.height - cornerRadius],
                   [rect.width - cornerRadius, cornerRadius]];

    var effectiveBackgroundColor = backgroundColor;
    if (effectiveBackgroundColor === 'random')
        effectiveBackgroundColor = color.randomColor();

    for (var row = 0; row < rect.height; row++) {
        for (var col = 0; col < rect.width; col++) {
            if (shape === setup.Shapes.RECT) {
                if (setup.drawBorders &&
                    (row == 0 || col == 0)) {
                    leaf.paint(image, row, col, effectiveBackgroundColor);
                }
                else {
                    leaf.paint(image, row, col, average);
                }
            }
            else if (shape === setup.Shapes.ROUNDED) {
                var paintBackground = true;
                // Take advantage of symmetry with top left
                // corner
                var x = col;
                if (x > rect.width / 2) x = rect.width - x;
                var y = row;
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
                    leaf.paint(image, row, col, effectiveBackgroundColor);
                }
                else {
                    leaf.paint(image, row, col, average);
                }
            }
        }
    }
}


function drawTree(image, quad, shape, backgroundColor) {
    quad.walk(paintLeaf.bind(null, image, quad, shape, backgroundColor));
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
        var image = new PNGImage(this.data, this.width);

        var quad = new Quad(new PNGImage(rgba, this.width),
                            this.width, this.height);
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
                drawTree(image, quad, setup.shape, setup.backgroundColor);
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

                    paintLeaf(image, quad,
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
