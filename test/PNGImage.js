
var assert = require('chai').assert;
var PNGImage = require('../lib/PNGImage');

describe('PNGImage', function() {
    var image,
        width = 20,
        height = 20;

    beforeEach(function() {
        // Create a full white image
        var data = [];
        for (var col = 0; col < width; col++) {
            for (var row = 0; row < height; row++) {
                for (var k = 0; k < 4; k++) {
                    data.push(255);
                }
            }
        }

        image = new PNGImage(data, width);
    });

    describe('get', function() {
        it('should return the correct color for all four corners',
           function() {
               // Arrange
               var expected = [255, 255, 255, 255];

               // Act
               // Assert
               assert.deepEqual(expected, image.get(0, 0));
               assert.deepEqual(expected, image.get(width - 1, 0));
               assert.deepEqual(expected, image.get(width - 1, height - 1));
               assert.deepEqual(expected, image.get(0, height - 1));
        });
    });
});
