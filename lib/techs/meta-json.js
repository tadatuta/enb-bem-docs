var path = require('path'),
    vow = require('vow'),
    vfs = require('enb/lib/fs/async-fs'),
    vm = require('vm'),
    bemjsonToDeps = require('bemjson-to-deps');

module.exports = require('enb/lib/build-flow').create()
    .name('meta-json')
    .target('target', '?.meta.json')
    .defineOption('langs', [])
    .defineOption('examples', [])
    .builder(function () {
        var node = this.node,
            root = node.getRootDir(),
            dir = node.getDir(),
            logger = node.getLogger(),
            langs = this._langs,
            name = path.basename(dir),
            json = {
                block: name,
                // Оставляем примеры только для текущего блока
                examples: this._examples.filter(function (example) {
                    return path.basename(path.dirname(example.path)) === name;
                })
            },
            jsdocTarget = node.unmaskTargetName('?.jsdoc.json');

        if (node.hasRegisteredTarget(jsdocTarget)) {
            json.jsdocFile = path.join(dir, jsdocTarget);
        }

        var mdFiles = [],
            dochtmlFiles = [];

        if (langs && langs.length) {
            langs.forEach(function (lang) {
                var dochtmlTarget = node.unmaskTargetName('?.' + lang + '.doc.html'),
                    mdTarget = node.unmaskTargetName('?.' + lang + '.md');

                if (node.hasRegisteredTarget(mdTarget)) {
                    mdFiles.push(path.join(dir, mdTarget));
                }

                if (node.hasRegisteredTarget(dochtmlTarget)) {
                    dochtmlFiles.push(path.join(dir, dochtmlTarget));
                }
            });
        } else {
            var dochtmlTarget = node.unmaskTargetName('?.doc.html'),
                mdTarget = node.unmaskTargetName('?.md');

            if (node.hasRegisteredTarget(mdTarget)) {
                mdFiles.push(path.join(dir, mdTarget));
            }

            if (node.hasRegisteredTarget(dochtmlTarget)) {
                dochtmlFiles.push(path.join(dir, dochtmlTarget));
            }
        }

        if (Object.keys(mdFiles).length) {
            json.mdFiles = mdFiles;
        }

        if (Object.keys(dochtmlFiles).length) {
            json.dochtmlFiles = dochtmlFiles;
        }

        // Добавляем entityDeps
        return vow.all(json.examples.map(function (example) {
            var source = example.source;

            function addEntityDeps (source) {
                var bemjson;

                try {
                    bemjson = vm.runInNewContext(source.charAt(0) === '(' ? source : '(' + source + ')');
                } catch (err) {
                    logger.logWarningAction('example', path.join('..', '..', example.path),
                        err.name + ': ' + (err.stack || err.message));

                    return;
                }

                example.entityDeps = bemjsonToDeps.denormalizeDeps(bemjsonToDeps.getEntities(bemjson));

                return example;
            }

            if (source) {
                return addEntityDeps(source);
            }

            var bemjsonFile = path.join(root, example.path, example.name + '.bemjson.js.symlink');

            return vfs.read(bemjsonFile, 'utf8').then(addEntityDeps);
        })).then(function (examples) {
            json.examples = examples;

            return JSON.stringify(json);
        });
    })
    .createTech();
