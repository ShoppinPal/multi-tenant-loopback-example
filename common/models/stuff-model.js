module.exports = function(StuffModel) {

  StuffModel.on('dataSourceAttached', function() { //UserModel.on('attached', function() {
    var overriddenCreate = StuffModel.create;
    var overriddenFind = StuffModel.find;

    StuffModel.create = function(data, callback) { // works, i see a log statement for a REST call
      console.log('OVERRIDING StuffModel create method');

      var currentUser = StuffModel.getCurrentUserModel(callback); // returns immediately if no currentUser
      if (currentUser) {
        //console.log('inside StuffModel.create() - currentUser: ', currentUser.username);
        console.log('data:', data);
        data.orgModelId = currentUser.orgModelId; // TODO: will it break for purely server-side invokes?
        return overriddenCreate.apply(this, arguments);
      }

    }; // TODO: shouldn't callback be used for success?
    //          how are returned promises tying into the callback here?

    // TODO: rather than overriding find, findone and findbyid etc.
    //       would it be better to get currentUser in an operation hook and out the logic there instead?
    //       do findone and findbyid ultimately just call find?
    StuffModel.find = function(filter, callback) { // works, i see a log statement for a REST call
      console.log('OVERRIDING StuffModel find method');

      var currentUser = StuffModel.getCurrentUserModel(callback); // returns immediately if no currentUser
      if (currentUser) {
        //console.log('inside StuffModel.find() - currentUser: ', currentUser.username);

        if (filter === undefined || filter === null) filter = {};
        if (filter.where === undefined || filter.where === null) filter.where = {};
        filter.where.orgModelId = currentUser.orgModelId; // TODO: will it break for purely server-side invokes?
        console.log('filter:', filter);

        return overriddenFind.apply(this, arguments);
      }

    }; // TODO: shouldn't callback be used for success?
    //          how are returned promises tying into the callback here?

  }); // StuffModel.on() ENDS

};
