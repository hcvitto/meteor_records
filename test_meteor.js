records = new Mongo.Collection('Records');

Router.configure({
  layoutTemplate: 'ApplicationLayout'
});

Router.route('/', {
    name: 'home',
    template: 'Home',
    yieldRegions: {
        "aside": {to: 'home aside'}
    }
});

Router.route('/lista', {
    name: 'lista',
    //template: 'Lista',
    yieldRegions: {
        'aside': {to: 'lista aside'}
    },
    data: function (){
        return { records: records.find() };
    }
});

Router.route('/inserisci-disco/:id?', function () {
    if (this.params.id) {
        var record = records.findOne(this.params.id);
    } else {
        var record = '';
    }
    this.render('InserisciDisco', {
        data: record
    });
    this.render('Aside', { to: 'aside inserisci' });
}, { name: 'InserisciDisco' });

if (Meteor.isClient) {
    Template.InserisciDisco.events({
        'submit form': function(event, template) {
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
                records.update({
                    id: $form.find('#id').val()
                }, {
                    $set: record
                }, function(err, res){
                    if (err) console.log(err);
                    Router.go('lista');
                });
            } else {
                records.insert(record, function(err, res){
                    if (err) console.log(err);
                    Router.go('lista');
                });
            }
            return false;
        }
    });
    Template.Lista.events({
        'click .modificaBtn': function(event, template) {
            var $btn = $(event.target);
            Router.go($btn.attr('href'));
            return false;
        },
        'click .cancellaBtn': function(event, template) {
            if (confirm('Sei sicuro?')) {
                var $btn = $(event.target);
                records.remove($btn.attr('href'), function(err, res) {
                    if (err) console.log(err);
                     Router.go('lista');
                });
            }
            return false;
        }
    });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });

}
