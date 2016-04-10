var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('server:mixins:'+fileName);

var loopbackUtils = require('loopback/lib/utils');

/**
 * If the mixin applies to both client and server models,
 * put it in the common/mixins directory.
 *
 * If it applies only to server models,
 * put it in the server/mixins directory.
 *
 * @param Model - is the model class
 * @param options - is an object containing the configurable properties from model definition file
 *
 * for ex:
 * "mixins": {
 *   "myMixin": {
 *     "myOptionA": "blue",
 *     "myOptionB": "green"
 *   }
 * }
 */
module.exports = function(Model, options) {

  var modelName = Model.definition.name;
  log(modelName, 'inside mixin...');

  /*Model.observe('attached', function() {
    log(modelName, 'observe.attached()');
  });

  Model.observe('dataSourceAttached', function() {
    log(modelName, 'observe.dataSourceAttached()');
  });

  Model.on('dataSourceAttached', function() {
    log(modelName, 'on.dataSourceAttached()');
  });*/

  Model.on('attached', function() { //Model.on('dataSourceAttached', function() {
    log(modelName, 'on.attached()');

    var overriddenCreate = Model.create;
    var overriddenFind = Model.find;

    Model.create = function(data, callback) { // works, i see a log statement for a REST call
      log(modelName, 'create()', 'OVERRIDDEN method');

      // handle both callbacks and promise based invocations
      callback = callback || loopbackUtils.createPromiseCallback();

      var currentUser = Model.getCurrentUserModel(callback); // returns immediately if no currentUser
      if (currentUser) { // ACL for WRITE permission to $authenticated users MUST be setup for client-side invokes to be secure
        log(modelName, 'create()', 'client side call: will attach orgModelId to data:', data);
        data.orgModelId = currentUser.orgModelId;
        return overriddenCreate.apply(this, arguments);
      }
      else { // without this block, it will be a no-op for server-side invokes
        log(modelName, 'create()', 'server side call: will create as-is');
        return overriddenCreate.apply(this, arguments);
      }

      return callback.promise;
    }; // Model.create ENDS

    Model.find = function(filter, callback) { // works, i see a log statement for a REST call
      log(modelName, 'find()', 'OVERRIDDEN method');

      // handle both callbacks and promise based invocations
      callback = callback || loopbackUtils.createPromiseCallback();

      var currentUser = Model.getCurrentUserModel(callback); // returns immediately if no currentUser
      if (currentUser) { // ACL for WRITE permission to $authenticated users MUST be setup for client-side invokes to be secure
        console.log(modelName, 'find()', 'filter before edits:', filter);
        if (filter === undefined || filter === null) filter = {};
        if (filter.where === undefined || filter.where === null) filter.where = {};
        filter.where.orgModelId = currentUser.orgModelId; // TODO: will it break for purely server-side invokes?
        console.log(modelName, 'find()', 'filter after edits:', filter);

        log(modelName, 'find()', 'client side call: will query w/ orgModelId');
        return overriddenFind.apply(this, arguments);
      }

      return callback.promise;
    }; // Model.find ENDS

    // TODO: override other READ/WRITE methods for multi-tenancy too
  }); // Model.on.attached ENDS

};
