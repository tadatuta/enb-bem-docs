var path = require('path'),
    rootPath = path.join(__dirname, '..', '..', '..');

module.exports = function (config) {
    config.includeConfig(rootPath);

    var docs = config.module('enb-bem-docs').createConfigurator('docs');

    docs.configure({
        destPath: 'set.docs',
        levels: getLevels(config),
        jsdoc: { suffixes: ['vanilla.js', 'browser.js', 'js'] }
    });
};

function getLevels(config) {
    return [
        'blocks'
    ].map(function (level) {
        return config.resolvePath(level);
    });
}
