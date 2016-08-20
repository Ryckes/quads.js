
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
    }
};
