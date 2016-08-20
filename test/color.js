
var assert = require('chai').assert;
var color = require('../lib/color');

describe('color', function() {
    describe('hexToArray', function() {
        it('should return [0, 0, 0, 255] for #000000', function() {
            // Arrange
            var hex = '#000000';
            var expected = [0, 0, 0, 255];

            // Act
            // Assert
            assert.deepEqual(expected, color.hexToArray(hex));
        });

        it('should return [255, 255, 255, 255] for FFFFFF', function() {
            // Arrange
            var hex = 'FFFFFF';
            var expected = [255, 255, 255, 255];

            // Act
            // Assert
            assert.deepEqual(expected, color.hexToArray(hex));
        });
    });
});

