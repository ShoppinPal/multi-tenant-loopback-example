'use strict';

var loopback = require('loopback');
var Promise = require('bluebird');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('./../lib/debug-extension')('common:mixins:'+fileName);

/**
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

  Model.getCurrentUserModel = function(cb) {
    var ctx = loopback.getCurrentContext();
    var currentUser = ctx && ctx.get('currentUser');
    if (currentUser) {
      log.trace('inside ' + Model.definition.name + '.getCurrentUserModel() - currentUser: ', (currentUser.username || currentUser.id));
      //return currentUser;
      return Promise.promisifyAll(
        currentUser,
        {
          filter: function(name, func, target){
            return !( name == 'validate');
          }
        }
      );
    }
    else if (!ctx) {
      // this means its a server-side logic call w/o any HTTP req/resp aspect to it
      return true;
    }
    else {
      // TODO: when used with core invocations, the call stack can end up here
      //       this error only makes sense to point out failures in RESTful calls
      //       how can this sanity check be made any better?
      log.error('ctx:', ctx);
      log.error('currentUser:', currentUser);
      cb('401 - unauthorized - how did we end up here? should we manage ACL access to remote methods ourselves?');
    }
  };

};
