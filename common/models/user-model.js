var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('./../lib/debug-extension')('common:models:'+fileName);

module.exports = function(UserModel) {

  /**
   * TODO: does the overridden method lack promisification? how can we write this better?
   */
  UserModel.on('dataSourceAttached', function() { //UserModel.on('attached', function() {
    var overriddenCreate = UserModel.create;

    /**
     * Keep in mind, this method may be invoked by:
     *   a) server-side calls which usually don't have any logged in user or request/response
     *   b) RESTful client calls which may be "attempted" by orgAdmins (allowed) and non-orgAdmins (not-allowed)
     *
     * @param data
     * @param callback
     */
    UserModel.create = function(data, callback) { // works, i see a log statement for a REST call
      log.debug('create', 'OVERRIDING UserModel create method');

      var self = this;
      var argsForCreate = arguments;

      var currentUser = UserModel.getCurrentUserModel(callback); // returns immediately if no currentUser
      if (currentUser) {
        //console.log('inside UserModel.create() - currentUser: ', currentUser.username);
        log.trace('data:', data);

        log.debug('data.seedWithOrg will be used to create an ORG if it does not exist');
        // using `return` here will cause: "Error: Can't set headers after they are sent."
        UserModel.app.models.OrgModel.findOrCreate( //return UserModel.app.models.OrgModel.findOrCreate(
          {where: {displayName: data.seedWithOrg}}, // find
          {displayName: data.seedWithOrg} // or create
        )
          .spread(function(orgModel, created) {
            (created) ? log.debug('created', 'OrgModel', orgModel)
              : log.debug('found', 'OrgModel', orgModel);

            if (created) {
              log.debug('for users who "self-signup", the role MUST be `orgAdmin`');
              data.seedWithRole = 'orgAdmin';
            }
            else {
              // for users who are added by an `orgAdmin`, the role can client specified
              // ... whatever is present in the incoming data.seedWithRole

              // TODO: since the ACL makes sure that only `orgAdmins` can access this method via REST,
              //       there isn't a need to check currentUser's role here explicitly ... is there?

              // TODO: validate that the named role in data.seedWithRole is indeed a valid `Role` in the DB
            }

            data.orgModelId = orgModel.id; // setup relationship explicitly

            return overriddenCreate.apply(self, argsForCreate);
          }) // END of spread-block
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
          }); // END of catch-block

        //return overriddenCreate.apply(this, argsForCreate);
      } // END of if-currentUser-block

      // TODO: shouldn't callback be used for success?
      //       how are returned promises tying into the callback here?
    }; // END of UserModel.create

  }); // END of UserModel.on.dataSourceAttached

  UserModel.observe('after save', function(ctx, next) {
    log.debug('`after save` supports isNewInstance?', ctx.isNewInstance !== undefined);
    if (ctx.instance) {
      log.debug('Saved %s#%s', ctx.Model.modelName, ctx.instance.id);
    }
    else {
      log.debug('Updated %s matching %j',
        ctx.Model.pluralModelName,
        ctx.where);
    }
    if (ctx.isNewInstance !== undefined && ctx.isNewInstance) {
      log.debug('Will add a new TeamModel entry');
      UserModel.app.models.TeamModel.create({
        orgId: ctx.instance.orgModelId,
        userId: ctx.instance.id,
        role: ctx.instance.seedWithRole
      }, function(err, obj){
        if(err){
          log.debug('Failed to add a new TeamModel entry', err);
          next(err);
        } else {
          log.debug('Added a new TeamModel entry');
          next();
        }
      });
    }
    else {
      log.debug('Will NOT add a new TeamModel entry');
      next();
    }
  });

};
