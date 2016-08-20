
var cmdFlags = require('commander'),
    color = require('./color');

cmdFlags
    .version('0.2.0')
    .usage('<file> [options]')
    .option('-b, --borders', 'Enable border drawing in subnodes')
    .option('-i, --iterations <number>', 'Perform up to <number> iterations', function(i) { return parseInt(i, 10); }, 1024)
    .option('-e, --error-threshold <number>', 'Adjust the error threshold required for a new frame to be saved to a file', parseFloat, 0.5)
    .option('-s, --shape <type>', 'Choose the shape of the nodes of the quad tree: "rect" (default) or "rounded".', 'rect')
    .option('-c, --background-color <color>', 'Color used for background and borders. Hex color or "random". Black by default.', '000000')
    .parse(process.argv);

if (!cmdFlags.args.length)
    cmdFlags.help(); // This also stops execution

var setup = {};

var Shapes = {
    RECT: 1,
    ROUNDED: 2
};

function parseFlags() {
    setup.filename = cmdFlags.args[0];
    setup.drawBorders = cmdFlags.borders;
    setup.iterations = cmdFlags.iterations;
    setup.errorThreshold = cmdFlags.errorThreshold;

    if (cmdFlags.shape === 'rect') { setup.shape = Shapes.RECT; }
    else if (cmdFlags.shape === 'rounded') { setup.shape = Shapes.ROUNDED; }
    else { cmdFlags.help(); process.exit(1); }

    setup.backgroundColor = cmdFlags.backgroundColor;
    if (setup.backgroundColor !== 'random') {
        setup.backgroundColor = color.hexToArray(setup.backgroundColor);
    }
}

setup.Shapes = Shapes;
setup.parseFlags = parseFlags;

module.exports = setup;
