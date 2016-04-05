# multi-tenant-loopback-example

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

# What does multi-tenant mean to us?

1. Users can belong to an organization.
2. We can have multiple organizations in the same loopback server/db.
3. Any data created for the organization or any data created by the users of that organization should be segragated from the the users of another organization.
4. If we want, we should be able to configure the users that belong to the same organization to view any data that other users of that organization created.

## Assumptions

1. A `sysAdmin` like role for access over REST is unnecessary when compared to the security threat it poses. One can always SSH into the server directl and use something like `loopback-console` instead for `sysAdmin` purposes. Possibly exposing some kind of server-side-only impersonation API would make it even more useful.
2. Currently there aren't any known use cases which merit exposing `TeamModel` over REST and given how it would complicate the ACLs a lot when attempting to prevent REST~ful users from adding themselves to other teams ... its just better to keep `TeamModel` at server-side-only.

## Improvements

* Instead of saving role as-is into `TeamModel` when provided by a restful client, some sort of validation against pre-seeded `Role`s should be performed.

## Testing Multi Tenancy

* Remove any pre-existing `db.json` file and run the server with `npm start`

```
#0.a setup HOST_URL

#    > when running locally
export HOST_URL=http://localhost:3000

#    > when running agaisnt heroku or something like that
export HOST_URL=https://multi-tenant-loopback-example.herokuapp.com

#0.b make sure that HOST_URL is setup
echo $HOST_URL

#1.1 orgAdminA logs in
export ORG_ADMIN_A_TOKEN=`curl -X POST \
  "$HOST_URL/api/UserModels/login" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d "{\"username\":\"orgAdminA@orgA.com\", \"password\":\"orgAdminA\"}" | \
  node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin').toString()).id"`

#1.2 make sure that ORG_ADMIN_A_TOKEN is setup
echo $ORG_ADMIN_A_TOKEN

#2.1 orgAdminB logs in
export ORG_ADMIN_B_TOKEN=`curl -X POST \
  "$HOST_URL/api/UserModels/login" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d "{\"username\":\"orgAdminB@orgB.com\", \"password\":\"orgAdminB\"}" | \
  node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin').toString()).id"`

#2.2 make sure that ORG_ADMIN_B_TOKEN is setup
echo $ORG_ADMIN_B_TOKEN

#3 orgAdminA creates stuff
curl -w "\n" \
  -X POST \
  "$HOST_URL/api/StuffModels?access_token=$ORG_ADMIN_A_TOKEN" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d "{\"name\": \"stuff for orgA\"}"

#4 orgAdminB creates stuff
curl -w "\n" \
  -X POST \
  "$HOST_URL/api/StuffModels?access_token=$ORG_ADMIN_B_TOKEN" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d "{\"name\": \"stuff for orgB\"}"

#5 orgAdminA can get stuff which is specific to orgA
curl -w "\n" \
  -X GET \
  "$HOST_URL/api/StuffModels/1?access_token=$ORG_ADMIN_A_TOKEN" \
  --header "Content-Type: application/json"

#6 orgAdminA can NOT get stuff from another org
curl -w "\n" \
  -X GET \
  "$HOST_URL/api/StuffModels/2?access_token=$ORG_ADMIN_A_TOKEN" \
  --header "Content-Type: application/json"

#7 orgAdminA can only LIST stuff which is specific to orgA
curl -w "\n" \
  -X GET \
  "$HOST_URL/api/StuffModels?access_token=$ORG_ADMIN_A_TOKEN" \
  --header "Accept: application/json"

#8 orgAdminB can only LIST stuff which is specific to orgB
curl -w "\n" \
  -X GET \
  "$HOST_URL/api/StuffModels?access_token=$ORG_ADMIN_B_TOKEN" \
  --header "Accept: application/json"

#9 orgAdminA can only FIND stuff which is specific to orgA
#  filter={"where":{"name":{"like":"stuff"}}}
curl -w "\n" \
  -X GET \
  "$HOST_URL/api/StuffModels?filter=%7B%22where%22%3A%7B%22name%22%3A%7B%22like%22%3A%22stuff%22%7D%7D%7D&access_token=$ORG_ADMIN_A_TOKEN" \
  --header "Accept: application/json"

#10 orgAdminA can only FIND-ONE stuff which is specific to orgA
#   filter={"where":{"name":{"like":"stuff for orgB"}}}
#   SHOULD return 404 with MODEL_NOT_FOUND
curl -w "\n" \
  -X GET \
  "$HOST_URL/api/StuffModels/findOne?filter=%7B%22where%22%3A%7B%22name%22%3A%7B%22like%22%3A%22stuff%20for%20orgB%22%7D%7D%7D&access_token=$ORG_ADMIN_A_TOKEN" \
  --header "Accept: application/json"

#11 orgAdminA can only FIND-BY-ID stuff which is specific to orgA
#   SHOULD return 404 with MODEL_NOT_FOUND
curl -w "\n" \
  -X GET \
  "$HOST_URL/api/StuffModels/2?access_token=$ORG_ADMIN_A_TOKEN" \
  --header "Accept: application/json"

#12 orgAdminA can create other users like a storeAdmin
curl -w "\n" \
  -X POST \
  "$HOST_URL/api/UserModels?access_token=$ORG_ADMIN_A_TOKEN" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d '{"seedWithRole": "storeAdmin", "seedWithOrg":"orgA", "username": "storeAdminA3@orgA.com", "email": "storeAdminA3@orgA.com", "password": "storeAdminA3"}'

#13.1 storeAdminA3 logs in
export STORE_ADMIN_A3_TOKEN=`curl -X POST \
  "$HOST_URL/api/UserModels/login" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d "{\"username\":\"storeAdminA3@orgA.com\", \"password\":\"storeAdminA3\"}" | \
  node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin').toString()).id"`

#13.2 storeAdminA3 cannot create other users, this request should fail
curl -w "\n" \
  -X POST \
  "$HOST_URL/api/UserModels?access_token=$STORE_ADMIN_A3_TOKEN" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d '{"seedWithRole": "storeAdmin", "seedWithOrg":"orgA", "username": "storeAdminA4@orgA.com", "email": "storeAdminA4@orgA.com", "password": "storeAdminA4"}'

#13.2 storeAdminA3 can get stuff which is specific to orgA
curl -w "\n" \
  -X GET \
  "$HOST_URL/api/StuffModels?access_token=$STORE_ADMIN_A3_TOKEN" \
  --header "Accept: application/json"
```

## High-Level Implementation Details

1. A user signup *should* always create a new organization and new team entry to track the user as the organization's administrator (`orgAdmin`).
  1. The `create` method for `UserModel` is overridden so that the server-side is responsible for creating an `OrgModel` and doesn't trust the client to do so when a user signs up.
  2. The `after save` hook on `UserModel` is used to tie together a newly created user with an organization and a role by creating a new entry in `TeamModel`.

## Test Heroku deployment

* https://devcenter.heroku.com/articles/heroku-button#testing-the-app-json-file
  * I named it `multi-tenant-loopback-example` when I went through the process, you can name it something else: https://heroku.com/deploy?template=https://github.com/ShoppinPal/multi-tenant-loopback-example/tree/master
* Tail heroku logs: `heroku logs -t -a multi-tenant-loopback-example` ... the app name like I said was set to `multi-tenant-loopback-example` by me but you may choose anything else.

## Attributions

The project is generated by [LoopBack](http://loopback.io).
