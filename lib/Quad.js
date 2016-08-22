
var color = require('./color');

function Quad(originalImage, width, height) {
    var rgbaAccumulated = [],
        position;
    for (var row = 0; row < height; row++) {
        rgbaAccumulated.push([]);
        for (var col = 0; col < width; col++) {
            rgbaAccumulated[row].push(originalImage.get(row, col));

            var k;
            if (col > 0)
                for (k = 0; k < 4; k++)
                    rgbaAccumulated[row][col][k] += rgbaAccumulated[row][col-1][k];
            if (row > 0)
                for (k = 0; k < 4; k++)
                    rgbaAccumulated[row][col][k] += rgbaAccumulated[row-1][col][k];
            if (col > 0 && row > 0)
                for (k = 0; k < 4; k++)
                    rgbaAccumulated[row][col][k] -= rgbaAccumulated[row-1][col-1][k];
        }
    }

    var root = new Node(originalImage, rgbaAccumulated, 0, 0, width, height);

    this.walk = function(cb) {
        root.walkLeaves(cb);
    };

    this.getWidth = function() {
        return width;
    };
}

function Node(originalImage, rgbaAccumulated, col, row, width, height) {
    var children = null,
        average = [0, 0, 0, 0],
        error = [0, 0, 0],
        position;

    var numPixels = width*height;

    // Top left, top right and bottom left are OUTSIDE the rectangle
    var topLeft = {
        col: col - 1,
        row: row - 1
    }, topRight = {
        col: col + width - 1,
        row: row - 1
    }, bottomRight = {
        col: col + width - 1,
        row: row + height - 1
    }, bottomLeft = {
        col: col - 1,
        row: row + height - 1
    };

    for (var k = 0; k < 4; k++)
        average[k] = rgbaAccumulated[bottomRight.row][bottomRight.col][k];

    if (row > 0)
        for (k = 0; k < 4; k++)
            average[k] -= rgbaAccumulated[topRight.row][topRight.col][k];

    if (col > 0)
        for (k = 0; k < 4; k++)
            average[k] -= rgbaAccumulated[bottomLeft.row][bottomLeft.col][k];

    if (col > 0 && row > 0)
        for (k = 0; k < 4; k++)
            average[k] += rgbaAccumulated[topLeft.row][topLeft.col][k];

    for (k = 0; k < 4; k++)
        average[k] = Math.min(255, Math.floor(average[k] / numPixels));

    // Compute error
    var currentRow, currentCol, currentError;
    for (var rowOffset = 0; rowOffset < height; rowOffset++) {
        for (var colOffset = 0; colOffset < width; colOffset++) {
            currentRow = row + rowOffset;
            currentCol = col + colOffset;

            currentError = color.getError(originalImage.get(currentRow, currentCol),
                                          average);

            for (k = 0; k < 3; k++) {
                error[k] += currentError[k];
            }
        }
    }

    var coefficients = [0.2989, 0.5870, 0.114]; // NTSC effective luminance
    for (k = 0; k < 3; k++)
        error[k] = Math.sqrt(error[k] / numPixels) * coefficients[k];

    function expand() {
        if (height < 2 || width < 2) return;

        children = [];
        var topRow = Math.floor(height / 2),
            leftCol = Math.floor(width / 2);

        children.push(new Node(originalImage, rgbaAccumulated, col, row, leftCol, topRow)); // NW
        children.push(new Node(originalImage, rgbaAccumulated, col + leftCol, row, width - leftCol, topRow)); // NE
        children.push(new Node(originalImage, rgbaAccumulated, col + leftCol, row + topRow, width - leftCol, height - topRow)); // SE
        children.push(new Node(originalImage, rgbaAccumulated, col, row + topRow, leftCol, height - topRow)); // SW
    }

    function isLeaf() {
        return children === null;
    }

    function getArea() {
        return width * height;
    }

    function getAverage() {
        return average;
    }

    function getError() {
        return error[0] + error[1] + error[2];
    }

    function getRect() { // Rekt
        return {
            x: col,
            y: row,
            width: width,
            height: height
        };
    }

    function walkLeaves(cb) {
        if (isLeaf())
            cb(this);
        else
            for (var i = 0; i < 4; i++)
                children[i].walkLeaves(cb);
    }

    function paint(image, innerRow, innerCol, paintColor) {
        image.paint(row + innerRow, col + innerCol, paintColor);
    }

    this.expand = expand;
    this.isLeaf = isLeaf;
    this.getArea = getArea;
    this.getAverage = getAverage;
    this.getError = getError;
    this.getRect = getRect;
    this.walkLeaves = walkLeaves;
    this.paint = paint;
}

exports.Quad = Quad;
