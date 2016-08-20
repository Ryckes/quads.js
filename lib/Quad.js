
function Quad(rgba, width, height) {
    var rgbaAccumulated = [],
        position;
    for (var row = 0; row < height; row++) {
        rgbaAccumulated.push([]);
        for (var col = 0; col < width; col++) {
            position = (row * width + col) << 2;
            
            rgbaAccumulated[row].push([]);
            for (var k = 0; k < 4; k++)
                rgbaAccumulated[row][col].push(rgba[position + k]);

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

    var root = new Node(rgba, rgbaAccumulated, 0, 0, width, height, width);

    this.walk = function(cb) {
        root.walkLeaves(cb);
    };

    this.getWidth = function() {
        return width;
    };
}

function Node(rgba, rgbaAccumulated, col, row, width, height, totalWidth) {
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
    var currentRow, currentCol;
    for (var rowOffset = 0; rowOffset < height; rowOffset++) {
        for (var colOffset = 0; colOffset < width; colOffset++) {
            currentRow = row + rowOffset;
            currentCol = col + colOffset;

            // TODO: If we can delegate this error computation to the
            // format-dependent objects, we can remove totalWidth from
            // this whole file
            position = (currentRow * totalWidth + currentCol) << 2;
            for (k = 0; k < 3; k++)
                error[k] += (rgba[position + k] - average[k])*(rgba[position + k] - average[k]);
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

        children.push(new Node(rgba, rgbaAccumulated, col, row, leftCol, topRow, totalWidth)); // NW
        children.push(new Node(rgba, rgbaAccumulated, col + leftCol, row, width - leftCol, topRow, totalWidth)); // NE
        children.push(new Node(rgba, rgbaAccumulated, col + leftCol, row + topRow, width - leftCol, height - topRow, totalWidth)); // SE
        children.push(new Node(rgba, rgbaAccumulated, col, row + topRow, leftCol, height - topRow, totalWidth)); // SW
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

    function paint(image, i, j, color) {
        image.paint(col + i, row + j, color);
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
