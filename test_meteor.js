records = new Mongo.Collection('Records');
comments = new Mongo.Collection('Comments');

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
            submitted: new Date().getTime(),
            upvoters: []
        });
        // registro il record
        return records.insert(rec, function(err, id) {
            if (err) console.log("Errore nell'insert");
        });
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
    },
    voteRec: function(id) {
        var user = Meteor.user();
        if (!user)
            throw new Meteor.Error(401, "Non sei loggato");
        /*var recExist = records.findOne(id);
        if (!recExist)
            throw new Meteor.Error(401, "Non esiste il record");
        if (_.include(recExist.upvoters, user._id))
            throw new Meteor.Error(422, 'Already upvoted this post');*/
        records.update({
            _id: id,
            upvoters: {$ne: user._id}
        }, {
            $addToSet: { upvoters: user._id },
            $inc: { "disco.votes": 1 }
        });
    },
    insertComment: function (cmtAttributes) {
        var user = Meteor.user();
        // controllo se l'utente è loggato
        if (!user)
            throw new Meteor.Error(401, "Non sei loggato");

        // aggiungo alcuni dati di default al record
        var cmt = _.extend(cmtAttributes, {
            userId: user._id,
            autore: user.username,
            data: new Date().getTime()
        });
        // registro il record
        return comments.insert(cmt, function(err, id) {
            if (err) console.log("Errore nell'insert del commento");
        });
    }
});

/*records.allow({
    insert: function (userId, doc) {
        // only allow posting if you are logged in
        return !!userId;
    },
    update: function (userId, doc) {
        return !!userId;
    },
    remove: function (userId, doc) {
        return !!userId;
    }
});
comments.allow({
    insert: function (userId, doc) {
        // only allow posting if you are logged in
        return !!userId;
    }
});*/
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
    loadingTemplate: 'Loading'/*,
    waitOn: function () {
        return Meteor.subscribe('voted'); // la spostiamo nella route per la paginazione
    }*/
});

Router.onBeforeAction('loading');
Router.onBeforeAction(requireLogin, {
    only: 'InserisciDisco'
});
/*Router.onBeforeAction(function() {
    clearErrors();
    this.next();
});*/

ListaController = RouteController.extend({
    template: 'Lista',
    pageIncrement: 10,
    limit: function() {
        return parseInt(this.params.recs) || this.pageIncrement;
    },
    findOptions: function() {
        return {sort: {submitted: -1}, limit: this.limit()};
    },
    waitOn: function() {
        return Meteor.subscribe('records', {}, this.findOptions());
    },
    records: function() {
        return records.find({}, this.findOptions());
    },
    data: function() {
        var hasMore = this.records().count() === this.limit();
        var nextPath = this.route.path({ recs: this.limit() + this.pageIncrement });
        return {
            records: this.records(),
            nextPath: hasMore ? nextPath : null
        };
    } 
});

Router.route('/', {
    name: 'home',
    template: 'Home',
    yieldRegions: {
        "aside": {
            to: 'home aside'
        }
    }
});

Router.route('/lista/:recs?', {
    name: 'lista',
    controller: ListaController,
    /*waitOn: function() {
        var limit = parseInt(this.params.recs) || 5;
        return Meteor.subscribe('records', { sort: {"autore.nome": -1}, limit: limit });
    },
    data: function() {
        var limit = parseInt(this.params.recs) || 5;
        return {
            records: records.find({}, { sort: {"autore.nome": -1}, limit: limit})
        };
    },*/
    yieldRegions: {
        'aside': {
            to: 'lista aside'
        }
    }
});

Router.route('/commenti/:_id', function () {
    var record = records.findOne(this.params._id);
    //console.log(record);
    if (!record) Flash.warning('top', 'Questo record non esiste', 5000);
    this.render('Commenti', {
        data: record
    });
}, {
    name: 'commenti',
    waitOn: function() {
        Meteor.subscribe('records', this.params._id);
        Meteor.subscribe('comments');
    }
});

Router.route('/userComments/:autore', function () {
    var userComments = comments.find({ autore: this.params.autore });
    this.render('userComments', {
        data: function() {
            return {
                autore: this.params.autore,
                userComments: userComments
            }
        }
    });
}, {
    name: 'userComments',
    waitOn: function() {
        Meteor.subscribe('comments');
    }
});

Router.route('/inserisci-disco/:_id?', function () {
    if (this.params._id)
        var record = records.findOne(this.params._id);
    //if (!record) Flash.warning('top', 'Questo record non esiste', 5000);
    this.render('InserisciDisco', {
        data: record
    });
}, {
    name: 'InserisciDisco',
    waitOn: function() {
        Meteor.subscribe('records', this.params._id);
    }
});

UI.registerHelper('formatTime', function(context, options) {
    if(context)
        return moment(context).format('MM/DD/YYYY, hh:mm');
});

if (Meteor.isClient) {
    //Meteor.subscribe('records');
    //Meteor.subscribe('comments'); // la sposto nella route
    
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
                    votes: $form.find('#votes').val()*1
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
            Meteor.call('voteRec', this._id, function(err) {
                if (err) console.log(err);
            });
            return false;
        },
        'click .cancellaBtn': function (event, template) {
            if (confirm('Sei sicuro?')) {
                Meteor.call('deleteRec', this._id, function (err, res) {
                    if (err) console.log(err);
                    //Router.go('lista');
                    Flash.success('top', 'Deleted', 5000);
                });
            }
            return false;
        }
    });
    Template.Commenti.events({
        'submit form': function (event, template) {
            event.preventDefault();
            var now = new Date();
            var $form = $(event.target);
            var comment = {
                record: this._id,
                testo: $form.find('#text').val()
            }
            Meteor.call('insertComment', comment, function(err, id) {
                if (err) console.log(err);
                Flash.success('top', 'Commento inserito', 5000);
                template.$('textarea').val('');
            });
            return false;
        }
    });   
    Template.Lista.helpers({
        /*records: function () { // eliminato perchè spostato nella route per la paginazione
            return records.find({}, {
                sort: {
                    "autore.nome": 1
                }
            });
        }*/
        nonVotato: function () {
            var user = Meteor.user();
            if (user) {
                if (_.indexOf(this.upvoters, user._id)==-1)
                    return new Spacebars.SafeString(' - <a class="btn btn-small plusBtn" href="/vota-disco/' + this._id + '" data-id="' + this._id + '"     role="button">Like</a>');
            }
        }
    });
    Template.Voted.helpers({
        records: function () {
            Meteor.subscribe('records', {}, { sort: { "disco.votes": -1 }, limit: 2 });
            return records.find({}, { sort: { "disco.votes": -1 }, limit: 2 });
        }
    });
    Template.Commenti.helpers({
        comments: function () {
            return comments.find({ record: this._id }, {
                sort: {
                    submitted: -1
                }
            });
        }
    });
    /*Template.userComments.helpers({
        userComments: function () {
            return comments.find({ userId: this.userId }, {
                sort: {
                    submitted: -1
                }
            });
        }
    });*/
    Accounts.ui.config({
        passwordSignupFields: 'USERNAME_ONLY'
    });
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
    Meteor.publish('records', function (id, options) {
        return records.find(id, options);
    });
    Meteor.publish('comments', function () {
        return comments.find();
    });
}