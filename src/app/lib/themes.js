(function (App) {
    'use strict';

    var fs = require('fs');
    var path = require('path');

    function get_new_themes() {
        var packageJson = require(path.join(process.cwd(), 'package.json'));

        var themes = Object.keys(packageJson.dependencies)
            .filter((p) => (/(butter-theme-.*)/.test(p)));
                    
        return Object.assign({}, themes);
    }

    function get_themes() {
        var theme_files = fs.readdirSync('./src/app/themes/');
        var themes = theme_files.reduce((a, file) => {
            a[file] = file.slice(0, -10).split('_').join(' ');
            return a;
        }, {});

        var tp_themes = {};
        try {
            var tp_theme_files = fs.readdirSync('./src/app/themes/third_party');
            tp_themes = tp_theme_files.reduce((a, file) => {
                a[file] = file.slice(0, -10).split('_').join(' ') + i18n.__('(Third Party)');
                return a;
            }, {});
        } catch(e) {
            console.warn('Couldn\'t load third party themes');
        }

        return Object.assign({}, themes, tp_themes);
    }

    App.Themes = get_new_themes();
})(window.App);
