
function PNGImage(data, totalWidth) {
    this.data = data;
    this.totalWidth = totalWidth;
}

PNGImage.prototype.paint = function(i, j, color) {
    var position = (j * this.totalWidth + i) << 2;

    for (var k = 0; k < 4; k++) {
        this.data[position + k] = color[k];
    }
};

module.exports = PNGImage;
