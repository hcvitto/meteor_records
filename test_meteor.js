records = new Mongo.Collection('Records');

Meteor.methods({
    insertRec: function (recAttributes) {
        var user = Meteor.user(),
            recExist = records.findOne({
                "autore.nome": recAttributes.autore.nome,
                "disco.titolo": recAttributes.disco.titolo
            });
        // controllo se l'utente è loggato
        if (!user)
            throw new Meteor.Error(401, "Non sei loggato");
        
        // controllo se è stato già inserito
        if (recExist) {
            throw new Meteor.Error(302, 'Disco esiste', recExist._id);
        }
        // aggiungo alcuni dati di default al record
        var rec = _.extend(recAttributes, {
            userId: user._id,
            author: user.username,
            submitted: new Date().getTime()
        });
        // registro il record
        var id = records.insert(rec, function(err, id) {
            if (err) console.log("Errore nell'insert");
        });
        return id;
    },
    updateRec: function (recAttributes, id) {
        var user = Meteor.user(),
            recExist = records.findOne(id);
        // controllo se l'utente è loggato
        if (!user)
            throw new Meteor.Error(401, "Non sei loggato");
        
        // controllo se il record esiste
        if (!recExist)
            throw new Meteor.Error(401, "Non esiste");
        
        // modifico alcuni dati di default al record
        var rec = _.extend(recAttributes, {
            userId: user._id,
            author: user.username,
            submitted: new Date().getTime()
        });
        records.update(id, { $set: rec }, function(err, n) {
            if (err) console.log("Errore nell'update");
        });
    },
    deleteRec: function (id) {
        var user = Meteor.user();
        // controllo se l'utente è loggato
        if (!user)
            throw new Meteor.Error(401, "Non sei loggato");

        records.remove(id, function(err) {
            if (err) console.log("Errore nel delete");
        });
    }
});

records.allow({
    /*insert: function (userId, doc) {
        // only allow posting if you are logged in
        return !!userId;
    },*/
    update: function (userId, doc) {
        return !!userId;
    }/*,
    remove: function (userId, doc) {
        return !!userId;
    }*/
});

var requireLogin = function (pause) {
    if (!Meteor.user()) {
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
    waitOn: function () {
        return Meteor.subscribe('records');
    }
});

Router.onBeforeAction('loading');
Router.onBeforeAction(requireLogin, {
    only: 'InserisciDisco'
});
/*Router.onBeforeAction(function() {
    clearErrors();
    this.next();
});*/

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
    
    /*Errors = new Meteor.Collection(null);
    throwError = function(message) {
        Errors.insert({message: message, seen: true})
    }
    clearErrors = function() {
        Errors.remove({seen: true})
    }*/
    Template.InserisciDisco.events({
        'submit form': function (event, template) {
            event.preventDefault();
            var id = (this._id) ? this._id : '';
            var $form = $(event.target);
            var record = {
                autore: {
                    nome: $form.find('#autore').val(),
                    sito: $form.find('#sitoAutore').val()
                },
                disco: {
                    titolo: $form.find('#titolo').val(),
                    genere: $form.find('#genere').val(),
                    anno: $form.find('#anno').val(),
                    votes:  $form.find('#votes').val()*1
                },
                label: {
                    nome: $form.find('#label').val(),
                    sito: $form.find('#sitoLabel').val()
                }
            }
            if (id) {
                Meteor.call('updateRec', record, id, function (err) {
                    if (err) console.log(err);
                    Flash.success('top', 'Updated', 5000);
                    //Router.go('lista');
                });
            } else {
                Meteor.call('insertRec', record, function (err, id) {
                    if (err) console.log(err);
                    Flash.success('top', 'Inserted', 5000);
                    //Router.go('lista');
                });
            }
            return false;
        }
    });
    Template.Lista.events({
        'click .plusBtn': function (event, template) {
            event.preventDefault();
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
        'click .cancellaBtn': function (event, template) {
            if (confirm('Sei sicuro?')) {
                Meteor.call('deleteRec', this._id, function (err, res) {
                    if (err) console.log(err);
                    Flash.success('top', 'Deleted', 5000);
                    //Router.go('lista');
                });
            }
            return false;
        }
    });
    
    /*Template.errors.helpers({
        errors: function() {
            return Errors.find();
        }
    });
    Template.error.rendered = function() {
        var error = this.data;
        Meteor.defer(function() {
            Errors.update(error._id, {$set: {seen: true}});
        });
    };  */  
    Template.Lista.helpers({
        records: function () {
            return records.find({}, {
                sort: {
                    "autore.nome": 1
                }
            });
        }
    });
    Template.Voted.helpers({
        records: function () {
            return records.find({}, {
                sort: {
                    "disco.votes": -1
                },
                limit: 2
            });
        }
    });

    Accounts.ui.config({
        passwordSignupFields: 'USERNAME_ONLY'
    });
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
    Meteor.publish('records', function () {
        return records.find();
    });
}