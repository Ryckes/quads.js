
module.exports = {
    hexToArray: function(hexcolor) {
        if (hexcolor[0] === '#')
            hexcolor = hexcolor.slice(1);

        return [parseInt(hexcolor.substr(0, 2), 16),
                parseInt(hexcolor.substr(2, 2), 16),
                parseInt(hexcolor.substr(4, 2), 16),
                255];
    },
    randomColor: function() {
        return [Math.floor(Math.random() * 256),
                Math.floor(Math.random() * 256),
                Math.floor(Math.random() * 256),
                255];
    },
    getError: function(color1, color2) {
        // We ignore alpha channel for this
        var error = [0, 0, 0],
            diff;
        for (var i = 0; i < 3; i++) {
            diff = color1[i] - color2[i];
            error[i] = diff * diff;
        }

        return error;
    }
};
