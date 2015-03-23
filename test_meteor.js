records = new Mongo.Collection('Records');
records.allow({
    insert: function(userId, doc) {
        // only allow posting if you are logged in
        return !! userId;
    },   
    update: function(userId, doc) {
        // only allow posting if you are logged in
        return !! userId;
    },     
    remove: function(userId, doc) {
        // only allow remove posting if you are logged in
        return !! userId;
    }
});

var requireLogin = function(pause) {
    if (! Meteor.user()) {
        if (Meteor.loggingIn()) {
            this.render(this.loadingTemplate);
        } else {
            this.render('accessDenied');
        }
        pause();
    } else {
        this.next();
    }
}

Router.configure({
    layoutTemplate: 'ApplicationLayout',
    loadingTemplate: 'Loading',
    waitOn: function() { return Meteor.subscribe('records'); }
});

Router.onBeforeAction('loading');
Router.onBeforeAction(requireLogin, {only: 'InserisciDisco'});

Router.route('/', {
    name: 'home',
    template: 'Home',
    yieldRegions: {
        "aside": {
            to: 'home aside'
        }
    }
});

Router.route('/lista', {
    name: 'lista',
    //template: 'Lista',
    yieldRegions: {
        'aside': {
            to: 'lista aside'
        }
    }
});

Router.route('/inserisci-disco/:_id?', function () {
    if (this.params._id) {
        var record = records.findOne(this.params._id);
    } else {
        var record = '';
    }
    this.render('InserisciDisco', {
        data: record
    });
    /*this.render('Aside', {
        to: 'aside inserisci'
    });*/
}, {
    name: 'InserisciDisco'
});


if (Meteor.isClient) {
    Meteor.subscribe('records');
    
    Template.InserisciDisco.events({
        'submit form': function (event, template) {
            var $form = $(event.target);
            var record = {
                autore: {
                    nome: $form.find('#autore').val(),
                    sito: $form.find('#sitoAutore').val()
                },
                disco: {
                    titolo: $form.find('#titolo').val(),
                    genere: $form.find('#titolo').val(),
                    anno: $form.find('#anno').val(),
                    copertina: $form.find('#copertina').val()
                },
                label: {
                    nome: $form.find('#label').val(),
                    sito: $form.find('#sitoLabel').val()
                }
            }
            if ($form.find('#id').val()) {
                var id = records.findOne($form.find('#id').val());
                records.update({
                    _id: $form.find('#id').val()
                }, {
                    $set: record
                }, function (err, res) {
                    if (err) console.log(err);
                    Flash.success('top', 'Updated', 5000);
                    Router.go('lista');
                });
            } else {
                records.insert(record, function (err, res) {
                    if (err) console.log(err);
                    Flash.success('top', 'Inserted', 5000);
                    Router.go('lista');
                });
            }
            return false;
        }
    });
    Template.Lista.events({
        'click .plusBtn': function (event, template) {
            var $btn = $(event.target);
            records.update({
                _id: $btn.data('id')
            }, {
                $inc: {
                    "disco.votes": 1
                }
            }, function (err, res) {
                if (err) console.log(err);
            });
            return false;
        },
        'click .modificaBtn': function (event, template) {
            var $btn = $(event.target);
            Router.go($btn.attr('href'));
            return false;
        },
        'click .cancellaBtn': function (event, template) {
            if (confirm('Sei sicuro?')) {
                var $btn = $(event.target);
                records.remove($btn.attr('href'), function (err, res) {
                    if (err) console.log(err);
                    Router.go('lista');
                });
            }
            return false;
        }
    });
    
    Template.Lista.helpers({
        records: function() {
            return records.find();
        }
    });    
    Template.Voted.helpers({
        records: function() {
            return records.find({}, { sort: { "disco.votes": -1 } , limit: 2 });
        }
    });

    Accounts.ui.config({ passwordSignupFields: 'USERNAME_ONLY' });
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
    Meteor.publish('records', function () {
        return records.find({}, { sort: { "autore.nome": 1 } });
    });
}