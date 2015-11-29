var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('./../lib/debug-extension')('common:models:'+fileName);

module.exports = function(UserModel) {

  /**
   * TODO: does the overridden method lack promisification? how can we write this better?
   */
  UserModel.on('dataSourceAttached', function() { //UserModel.on('attached', function() {
    var overridden = UserModel.create;

    //UserModel.prototype.create = function(data, callback) { // doesn't work, i do not see a log statement for a REST call
    UserModel.create = function(data, callback) { // works, i see a log statement for a REST call
      console.log('OVERRIDING UserModel create method');

      var self = this;
      var argsForCreate = arguments;

      // TODO: need to figure out the user from context?
      // TODO: the ACL should have already determines if this user is an org admin
      // TODO: so we need to make sure that ordganizatio nthat they belong to is
      //       the only one being referenced here when the team row/entry is created

      var currentUser = UserModel.getCurrentUserModel(callback); // returns immediately if no currentUser
      if (currentUser) {
        //console.log('inside UserModel.create() - currentUser: ', currentUser.username);
        console.log('data:', data);

        // TODO: data.seedWithOrg will be used to create an ORG is it does not exist
        return UserModel.app.models.OrgModel.findOrCreate(
          {where: {displayName: data.seedWithOrg}}, // find
          {displayName: data.seedWithOrg} // or create
        )
          .spread(function(orgModel, created) {
            (created) ? log.debug('created', 'OrgModel', orgModel)
              : log.debug('found', 'OrgModel', orgModel);

            if (created) {
              // TODO: role can only be orgAdmin and if data.seedWithRole doesn't match that, we have a problem
            }
            else {
              // TODO: role can be whatever is in data.seedWithRole
            }

            data.orgModelId = orgModel.id; // setup relationship explicitly

            return overridden.apply(self, argsForCreate);
          })
          .catch(function(error){
            if (error instanceof Error) {
              log.error('UserModel > create',
                '\n', error.name + ':', error.message,
                '\n', error.stack);
            }
            else {
              log.error('UserModel > create',
                '\n', error);
            }
            callback(error);
          });

        //return overridden.apply(this, argsForCreate);
      }

    }; // TODO: shouldn't callback be used for success?
    //          how are returned promises tying into the callback here?

  });

  UserModel.observe('after save', function(ctx, next) {
    console.log('`after save` supports isNewInstance?', ctx.isNewInstance !== undefined);
    if (ctx.instance) {
      console.log('Saved %s#%s', ctx.Model.modelName, ctx.instance.id);
    }
    else {
      console.log('Updated %s matching %j',
        ctx.Model.pluralModelName,
        ctx.where);
    }
    if (ctx.isNewInstance !== undefined && ctx.isNewInstance) {
      console.log('Adding a new TeamModel entry');
      return UserModel.app.models.TeamModel.create({
        orgId: ctx.instance.orgModelId || 'blah1',
        userId: ctx.instance.id,
        role: ctx.instance.seedWithRole || 'blah2'
      })
        .then(function() {
          next();
        });
    }
    else {
      next();
    }
  });

};
