'use strict';

/**
 * How to get the logs from this file to show up?
 *  > either: `DEBUG=boot:* slc run`
 *  > or:     `DEBUG=boot:* node server/server.js`
 *
 */
var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var debug = require('debug')('boot:'+fileName);

var Promise = require('bluebird');
var _ = require('underscore');

module.exports = function(app) {
  var Role = app.models.Role;
  var RoleMapping = app.models.RoleMapping;
  var UserModel = app.models.UserModel;
  var SellerModel = app.models.SellerModel;
  //var TeamModel = app.models.TeamModel;

  var commentsIndex = 0;

  var seed = null;
  try {
    seed = require('./seed.json');
    if(process.env.SKIP_SEEDING) {
      debug('Will skip the database seeding process');
      return;
    }
  } catch (err) {
    debug('Please configure your data in `seed.json`.');
    debug('Copy `seed.json.template` to `seed.json` and replace the values with your own.');
  }

  try {
    var utils = require('loopback-boot-utils')({
      app: app,
      Role: Role,
      RoleMapping: RoleMapping,
      //UserModel: SellerModel,
      UserModel: UserModel,
      Promise: Promise,
      commentsIndex: commentsIndex
    });

    if (seed.samples && seed.samples[0]) {
      debug('('+ (++commentsIndex) +') ' + 'create users');
      return Promise.resolve() // this is a no-op but the code looks just a tad prettier this way
        /*.then(function() {
          return utils.setupUser(seed.samples[0].sysAdmin);
        })*/
        .then(function() {
          return utils.setupUser(seed.samples[0].orgAdminA);
        })
        .then(function() {
          return utils.setupUser(seed.samples[0].storeAdminA1);
        })
        .then(function() {
          return utils.setupUser(seed.samples[0].storeAdminA2);
        })
        .then(function() {
          return utils.setupUser(seed.samples[0].orgAdminB);
        })
        .then(function() {
          return utils.setupUser(seed.samples[0].storeAdminB1);
        })
        .then(function() {
          return utils.setupUser(seed.samples[0].storeAdminB2);
        });
    }
  } // end of try-block
  catch (e) {
    if(e.stack) {
      console.trace(e.stack);
    }
    else {
      console.trace(e);
    }
    throw e;
  } // end of catch-block

};
