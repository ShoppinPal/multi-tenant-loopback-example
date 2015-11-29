'use strict';

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('boot:'+fileName);

module.exports = function(app) {
  var Role = app.models.Role;

  Role.registerResolver('userFromAnotherOrg', function(role, context, cb) {
    function reject() {
      process.nextTick(function() {
        cb(null, false);
      });
    }

    // do not allow anonymous users
    var currentUserId = context.accessToken.userId;
    if (!currentUserId) {
      log('do not allow anonymous users');
      return reject();
    }

    log('Role resolver for `userFromAnotherOrg`', '\n',
        ' - evaluate ' + context.model.definition.name + ' with id: ' + context.modelId, '\n',
        ' for currentUserId: ' + currentUserId);
    context.model.findById(context.modelId, function(err, modelInstance) {
      if (err) {
        log('err', err);
        return reject();
      }
      else if(!modelInstance) {
        log('no matching instance of %s found', context.model.definition.name);
        return reject();
      }
      else {
        var TeamModel = app.models.TeamModel;
        log('check if currentUserId:', currentUserId, '\n',
          'is in the team table for the given model\'s orgModelId:', modelInstance.orgModelId);
        TeamModel.count({
          orgId: modelInstance.orgModelId, // TODO: figure out the org for given model
          userId: currentUserId
        }, function(err, count) {
          if (err) {
            console.log(err);
            return cb(null, false);
          }

          log('is a user from another organization? count === 0', (count === 0));
          cb(null, count === 0); // true = is a user from another organization
        });
      }
    });
  });

  /*Role.registerResolver('$manager', function(role, context, callback) {
  });

  Role.registerResolver('$warehouse', function(role, context, callback) {
  });

  Role.registerResolver('$receiver', function(role, context, callback) {
  });*/

};
