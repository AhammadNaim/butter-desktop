(function (App) {
    'use strict';

    var _this;

    var MainWindow = Marionette.View.extend({
        template: '#main-window-tpl',

        id: 'main-window',

        regions: {
            Header: '#header',
            Content: '#content',
            DetailsContainer: '#details-container',
            FileSelector: '#file-selector-container',
            Player: '#player',
            Settings: '#settings-container',
            InitModal: '#initializing',
            Disclaimer: '#disclaimer-container',
            About: '#about-container',
            Keyboard: '#keyboard-container',
            Help: '#help-container',
            TorrentCollection: '#torrent-collection-container',
            Issue: '#issue-container',
            Notification: '#notification'
        },

        ui: {
            posterswidth_alert: '.notification_alert'
        },

        events: {
            'dragover': 'preventDefault',
            'drop': 'preventDefault',
            'dragstart': 'preventDefault',
            'click .links': 'links'
        },

        initialize: function () {
            _this = this;

            _.each(_this.getRegions(), function (element, index) {

                element.on('show', function (view) {
                    if (view.className && App.ViewStack[0] !== view.className) {
                        App.ViewStack.push(view.className);
                    }
                    App.vent.trigger('viewstack:push', view.className);
                });

                element.on('empty', function (view) {
                    var viewName = (typeof view !== 'undefined' ? view.className : 'unknown');
                    App.ViewStack.pop();
                    App.vent.trigger('viewstack:pop', viewName);
                    if (!App.ViewStack[0]) {
                        App.ViewStack = ['main-browser'];
                    }
                });

            });

            // Application events
            App.vent.on('show:tab', this.showTab.bind(this));

            App.vent.on('shows:update', _.bind(this.updateShows, this));
            App.vent.on('shows:init', _.bind(this.initShows, this));

            // Add event to show disclaimer
            App.vent.on('disclaimer:show', _.bind(this.showDisclaimer, this));
            App.vent.on('disclaimer:close', _.bind(this.getRegion('Disclaimer').empty, this.getRegion('this')));

            // Add event to show about
            App.vent.on('about:show', _.bind(this.showAbout, this));
            App.vent.on('about:close', _.bind(this.getRegion('About').empty, this.getRegion('this')));

            // Keyboard
            App.vent.on('keyboard:show', _.bind(this.showKeyboard, this));
            App.vent.on('keyboard:close', _.bind(this.getRegion('Keyboard').empty, this.getRegion('this')));
            App.vent.on('keyboard:toggle', _.bind(this.toggleKeyboard, this));

            // Help
            App.vent.on('help:show', _.bind(this.showHelp, this));
            App.vent.on('help:close', _.bind(this.getRegion('Help').empty, this.getRegion('this')));
            App.vent.on('help:toggle', _.bind(this.toggleHelp, this));

            // Issue
            App.vent.on('issue:new', _.bind(this.showIssue, this));
            App.vent.on('issue:close', _.bind(this.getRegion('Issue').empty, this.getRegion('this')));

            // Movies
            App.vent.on('movie:showDetail', _.bind(this.showMovieDetail, this));
            App.vent.on('movie:closeDetail', _.bind(this.closeMovieDetail, this.DetailsContainer));

            // Tv Shows
            App.vent.on('tvshow:showDetail', _.bind(this.showShowDetail, this));
            App.vent.on('tvshow:closeDetail', _.bind(this.closeShowDetail, this.DetailsContainer));

            // Settings events
            App.vent.on('settings:show', _.bind(this.showSettings, this));
            App.vent.on('settings:close', _.bind(this.getRegion('Settings').empty, this.getRegion('this')));

            App.vent.on('notification:show', _.bind(this.showNotification, this));
            App.vent.on('notification:close', _.bind(this.closeNotification, this));

            App.vent.on('system:openFileSelector', _.bind(this.showFileSelector, this));
            App.vent.on('system:closeFileSelector', _.bind(this.getRegion('FileSelector').empty, this.getRegion('this')));

            App.vent.on('system:tvstAuthenticated', _.bind(this.tvstAuthenticated, this));

            // Stream events
            App.vent.on('stream:started', _.bind(this.streamStarted, this));
            App.vent.on('stream:ready', _.bind(this.streamReady, this));
            App.vent.on('stream:local', _.bind(this.showPlayer, this));
            App.vent.on('player:close', _.bind(this.showViews, this));
            App.vent.on('player:close', _.bind(this.getRegion('Player').empty, this.getRegion('this')));

            App.vent.on('restartButter', _.bind(this.restartButter, this));

            App.vent.on('updatePostersSizeStylesheet', _.bind(this.updatePostersSizeStylesheet, this));
        },

        onAttach: function () {
            this.showChildView('Header', new App.View.TitleBar());
            // Set the app title (for Windows mostly)
            win.title = App.Config.title;

            var status = new Backbone.Model({
                status: i18n.__('Init Database'),
                done: 0.05
            });
            // Show loading modal on startup
            var that = this;
            this.showChildView('Content', new App.View.InitModal({
                model: status
            }));

            App.db.initialize(status)
                .then(function () {
                    status.set({
                        status: i18n.__('Create Temp Folder'),
                        done: 0.25
                    });

                    // Create the System Temp Folder. This is used to store temporary data like movie files.
                    if (!fs.existsSync(Settings.tmpLocation)) {
                        fs.mkdir(Settings.tmpLocation, function (err) {
                            if (!err || err.errno === '-4075') {
                                //success
                            } else {
                                Settings.tmpLocation = path.join(os.tmpdir(), Settings.projectName);
                                fs.mkdir(Settings.tmpLocation);
                            }
                        });
                    }

                    status.set({
                        status: i18n.__('Set System Theme'),
                        done: 0.30
                    });

                    try {
                        fs.statSync('src/app/themes/' + Settings.theme);
                    } catch (e) {
                        Settings.theme = 'Official_-_Dark_theme.css';
                        AdvSettings.set('theme', 'Official_-_Dark_theme.css');
                    }

                    $('link#theme').attr('href', 'themes/' + Settings.theme);

                    // focus win. also handles AlwaysOnTop
                    App.vent.trigger('window:focus');

                    status.set({
                        status: i18n.__('Disclaimer'),
                        done: 0.50
                    });

                    // we check if the disclaimer is accepted
                    if (!AdvSettings.get('disclaimerAccepted')) {
                        that.showDisclaimer();
                    }

                    status.set({
                        status: i18n.__('Done'),
                        done: 1
                    });

                    that.getRegion('InitModal').empty();

                    var lastOpen = (Settings.startScreen === 'Last Open');
                    if (Settings.startScreen) {
                        that.showTab(Settings.startScreen);
                    } else if (lastOpen && Settings.lastTab) {
                        that.showTab(Settings.lastTab);
                    } else {
                        that.showTab(App.Config.getTabs().pop().type);
                    }

                    // do we celebrate events?
                    if (AdvSettings.get('events')) {
                        $('.events').css('display', 'block');
                    }

                    // set player from settings
                    var players = App.Device.Collection.models;
                    for (var i in players) {
                        if (players[i].id === AdvSettings.get('chosenPlayer')) {
                            App.Device.Collection.setDevice(AdvSettings.get('chosenPlayer'));
                        }
                    }

                    // Focus the window when the app opens
                    win.focus();

                });

            // Cancel all new windows (Middle clicks / New Tab)
            win.on('new-win-policy', function (frame, url, policy) {
                policy.ignore();
            });

            App.vent.trigger('updatePostersSizeStylesheet');
            App.vent.trigger('main:ready');
        },

        showTab: function (newTab) {
            this.getRegion('Settings').empty();
            this.getRegion('DetailsContainer').empty();
            this.lastView && this.getRegion('lastView').empty();

            App.currentview = newTab;

            var model = App.Model.getCollectionModelForTab(newTab);
            var view = App.View.getViewForTab(newTab);
            this.lastView = new view({collectionModel: model});
            this.showChildView('Content', this.lastView);

            App.vent.trigger('selected:tab', newTab);
        },

        updateShows: function (e) {
            var that = this;
            App.vent.trigger('tvshow:closeDetail');
            this.showChildView('Content', new App.View.InitModal());
            App.db.syncDB(function () {
                that.getRegion('InitModal').empty();
                that.tvshowTabShow();
                // Focus the window when the app opens
                win.focus();

            });
        },

        // used in app to re-triger a api resync
        initShows: function (e) {
            var that = this;
            App.vent.trigger('settings:close');
            this.showChildView('Content', new App.View.InitModal());
            App.db.initDB(function (err, data) {
                that.getRegion('InitModal').empty();

                if (!err) {
                    // we write our new update time
                    AdvSettings.set('tvshow_last_sync', +new Date());
                }

                App.vent.trigger('shows:list');
                // Focus the window when the app opens
                win.focus();

            });
        },

        showDisclaimer: function (e) {
            this.showChildView('Disclaimer', new App.View.DisclaimerModal());
        },

        showAbout: function (e) {
            this.showChildView('About', new App.View.About());
        },

        showKeyboard: function (e) {
            this.showChildView('Keyboard', new App.View.Keyboard());
        },

        toggleKeyboard: function (e) {
            if ($('.keyboard-container').length > 0) {
                App.vent.trigger('keyboard:close');
            } else {
                this.showKeyboard();
            }
        },

        showHelp: function (e) {
            this.showChildView('Help', new App.View.Help());
        },

        toggleHelp: function (e) {
            if ($('.help-container').length > 0) {
                App.vent.trigger('help:close');
            } else {
                this.showHelp();
            }
        },

        showIssue: function (e) {
            this.showChildView('Issue', new App.View.Issue());
        },

        preventDefault: function (e) {
            e.preventDefault();
        },

        showMovieDetail: function (movieModel) {
            this.showChildView('DetailsContainer', new App.View.MovieDetail({
                model: movieModel
            }));
        },

        closeMovieDetail: function (movieModel) {
            $('.spinner').hide();
            _this.getRegion('DetailsContainer').empty();
            App.vent.trigger('shortcuts:list');
        },

        showNotification: function (notificationModel) {
            this.showChildView('Notification', new App.View.Notification({
                model: notificationModel
            }));
        },

        closeNotification: function () {
            this.getRegion('Notification').empty();
        },

        showShowDetail: function (showModel) {
            this.showChildView('DetailsContainer', new App.View.ShowDetail({
                model: showModel
            }));
        },

        closeShowDetail: function (showModel) {
            $('.spinner').hide();
            _this.getRegion('DetailsContainer').empty();
            App.vent.trigger('shortcuts:list');
        },

        showFileSelector: function (fileModel) {
            App.vent.trigger('about:close');
            App.vent.trigger('stream:stop');
            App.vent.trigger('player:close');
            this.showChildView('FileSelector', new App.View.FileSelector({
                model: fileModel
            }));
        },

        showSettings: function (settingsModel) {
            this.showChildView('Settings', new App.View.Settings.Container({
                collection: App.Model.Settings.Tabs
            }));
        },

        tvstAuthenticated: function () {
            console.info('TVShow Time: authenticated');
        },

        streamStarted: function (stateModel) {

            // People wanted to keep the active
            // modal (tvshow/movie) detail open when
            // the streaming start.
            //
            // this.getRegion('Detailscontainer').empty();
            //
            // uncomment previous line to close it

            this.showChildView('Player', new App.View.Loading({
                model: stateModel
            }));
        },

        streamReady: function (streamModel) {
            App.Device.Collection.startDevice(streamModel);
        },

        showPlayer: function (streamModel) {
            this.showChildView('Player', new App.View.Player({
                model: streamModel
            }));
            this.Content.$el.hide();
            if (this.DetailsContainer.$el !== undefined) {
                this.DetailsContainer.$el.hide();
            }
        },

        showViews: function (streamModel) {
            this.Content.$el.show();
            try {
                this.DetailsContainer.$el.show();

                var detailWin = this.DetailsContainer.el.firstElementChild.classList[0];

                if (detailWin === 'shows-container-contain') {
                    App.vent.trigger('shortcuts:shows');
                    App.ViewStack = ['main-browser', 'shows-container-contain', 'app-overlay'];
                } else {
                    App.vent.trigger('shortcuts:movies');
                    App.ViewStack = ['main-browser', 'movie-detail', 'app-overlay'];
                }
            } catch (err) {
                App.ViewStack = ['main-browser', 'app-overlay'];
            }
            $(window).trigger('resize');
        },

        updatePostersSizeStylesheet: function () {

            var that = this;

            App.db.getSetting({
                    key: 'postersWidth'
                })
                .then(function (doc) {
                    var postersWidth = doc.value;
                    var postersHeight = Math.round(postersWidth * Settings.postersSizeRatio);
                    var postersWidthPercentage = (postersWidth - Settings.postersMinWidth) / (Settings.postersMaxWidth - Settings.postersMinWidth) * 100;
                    var fontSize = ((Settings.postersMaxFontSize - Settings.postersMinFontSize) * postersWidthPercentage / 100) + Settings.postersMinFontSize;

                    var stylesheetContents = [
                        '.list .items .item {',
                        'width:', postersWidth, 'px;',
                        '}',

                        '.list .items .item .cover,',
                        '.load-more {',
                        'background-size: cover;',
                        'width: ', postersWidth, 'px;',
                        'height: ', postersHeight, 'px;',
                        '}',

                        '.item {',
                        'font-size: ' + fontSize + 'em;',
                        '}',

                        '.ghost {',
                        'width: ', postersWidth, 'px;',
                        '}'
                    ].join('');

                    $('#postersSizeStylesheet').remove();

                    $('<style>', {
                        'id': 'postersSizeStylesheet'
                    }).text(stylesheetContents).appendTo('head');

                    // Copy the value to Settings so we can get it from templates
                    Settings.postersWidth = postersWidth;

                    // Display PostersWidth
                    var humanReadableWidth = Number(postersWidthPercentage + 100).toFixed(0) + '%';
                    if (typeof App.currentview !== 'undefined') {
                        that.ui.posterswidth_alert.show().text(i18n.__('Posters Size') + ': ' + humanReadableWidth).delay(3000).fadeOut(400);
                    }
                    $('.cover-image').css('width', Settings.postersWidth);
                });
        },

        links: function (e) {
            e.preventDefault();
            nw.Shell.openExternal($(e.currentTarget).attr('href'));
        },

        restartButter: function () {
            var argv = nw.App.fullArgv,
                CWD = process.cwd();

            argv.push(CWD);
            child.spawn(process.execPath, argv, {
                cwd: CWD,
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore']
            }).unref();
            nw.App.quit();
        }
    });

    App.View.MainWindow = MainWindow = MainWindow;
})(window.App);
