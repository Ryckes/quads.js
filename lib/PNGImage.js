
function PNGImage(data, totalWidth) {
    this.data = data;
    this.totalWidth = totalWidth;
}

PNGImage.prototype.paint = function(row, col, color) {
    var position = (row * this.totalWidth + col) << 2;

    for (var k = 0; k < 4; k++) {
        this.data[position + k] = color[k];
    }
};

PNGImage.prototype.get = function(row, col) {
    var position = (row * this.totalWidth + col) << 2;

    var color = [];
    for (var k = 0; k < 4; k++) {
        color[k] = this.data[position + k];
    }

    return color;
};

module.exports = PNGImage;
