# multi-tenant-loopback-example

## Assumptions

1. A `sysAdmin` like role for access over REST is unnecessary when compared to the security threat it poses. One can always SSH into the server directl and use something like `loopback-console` instead for `sysAdmin` purposes. Possibly exposing some kind of server-side-only impersonation API would make it even more useful.
2. Currently there aren't any known use cases which merit exposing `TeamModel` over REST and given how it would complicate the ACLs a lot when attempting to prevent REST~ful users from adding themselves to other teams ... its just better to keep `TeamModel` at server-side-only.

## Improvements

* Instead of saving role as-is into `TeamModel` when provided by a restful client, some sort of validation against pre-seeded `Role`s should be performed.

## Testing Multi Tenancy

```
#1 orgAdminA logs in
curl -X POST \
  "http://localhost:3000/api/UserModels/login" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d "{\"username\":\"orgAdminA@orgA.com\", \"password\":\"orgAdminA\"}"
## XrnQHkS9FrBIJf9clE1aSekCvI5iEL4Xh7evgadEHYyNEz3i0GbItyQtsTNCLKp8

#2 orgAdminB logs in
curl -X POST \
  "http://localhost:3000/api/UserModels/login" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d "{\"username\":\"orgAdminB@orgB.com\", \"password\":\"orgAdminB\"}"
## TdrBJiyzLFJo2wF9dblSavnF90ZQGGEFJfyn5WuGjVUEQmvbZCX5Wws8dNR02iF6

#3 orgAdminA creates stuff
curl -X POST \
  "http://localhost:3000/api/StuffModels?access_token=XrnQHkS9FrBIJf9clE1aSekCvI5iEL4Xh7evgadEHYyNEz3i0GbItyQtsTNCLKp8" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d "{\"name\": \"stuff for orgA\"}"

#4 orgAdminB creates stuff
curl -X POST \
  "http://localhost:3000/api/StuffModels?access_token=TdrBJiyzLFJo2wF9dblSavnF90ZQGGEFJfyn5WuGjVUEQmvbZCX5Wws8dNR02iF6" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d "{\"name\": \"stuff for orgB\"}"

#5 orgAdminA can get stuff which is specific to orgA
curl -X GET \
  "http://localhost:3000/api/StuffModels/1?access_token=XrnQHkS9FrBIJf9clE1aSekCvI5iEL4Xh7evgadEHYyNEz3i0GbItyQtsTNCLKp8" \
  --header "Content-Type: application/json"

#6 orgAdminA canNOT get stuff from another org
curl -X GET \
  "http://localhost:3000/api/StuffModels/2?access_token=XrnQHkS9FrBIJf9clE1aSekCvI5iEL4Xh7evgadEHYyNEz3i0GbItyQtsTNCLKp8" \
  --header "Content-Type: application/json"

#7 orgAdminA can only LIST stuff which is specific to orgA
curl -X GET \
  "http://localhost:3000/api/StuffModels?access_token=XrnQHkS9FrBIJf9clE1aSekCvI5iEL4Xh7evgadEHYyNEz3i0GbItyQtsTNCLKp8" \
  --header "Accept: application/json"

#8 orgAdminB can only LIST stuff which is specific to orgB
curl -X GET \
  "http://localhost:3000/api/StuffModels?access_token=TdrBJiyzLFJo2wF9dblSavnF90ZQGGEFJfyn5WuGjVUEQmvbZCX5Wws8dNR02iF6" \
  --header "Accept: application/json"

#9 orgAdminA can only FIND stuff which is specific to orgA
#  filter={"where":{"name":{"like":"stuff"}}}
curl -X GET \
  "http://localhost:3000/api/StuffModels?filter=%7B%22where%22%3A%7B%22name%22%3A%7B%22like%22%3A%22stuff%22%7D%7D%7D&access_token=XrnQHkS9FrBIJf9clE1aSekCvI5iEL4Xh7evgadEHYyNEz3i0GbItyQtsTNCLKp8" \
  --header "Accept: application/json"

#10 orgAdminA can only FIND-ONE stuff which is specific to orgA
#   filter={"where":{"name":{"like":"stuff for orgB"}}}
#   SHOULD return 404 with MODEL_NOT_FOUND
curl -X GET \
  "http://localhost:3000/api/StuffModels/findOne?filter=%7B%22where%22%3A%7B%22name%22%3A%7B%22like%22%3A%22stuff%20for%20orgB%22%7D%7D%7D&access_token=XrnQHkS9FrBIJf9clE1aSekCvI5iEL4Xh7evgadEHYyNEz3i0GbItyQtsTNCLKp8" \
  --header "Accept: application/json"

#11 orgAdminA can only FIND-BY-ID stuff which is specific to orgA
#   SHOULD return 404 with MODEL_NOT_FOUND
curl -X GET \
  "http://localhost:3000/api/StuffModels/2?access_token=XrnQHkS9FrBIJf9clE1aSekCvI5iEL4Xh7evgadEHYyNEz3i0GbItyQtsTNCLKp8" \
  --header "Accept: application/json"

#12 orgAdminA can create other users like a storeAdmin
curl -X POST \
  "http://localhost:3000/api/UserModels?access_token=XrnQHkS9FrBIJf9clE1aSekCvI5iEL4Xh7evgadEHYyNEz3i0GbItyQtsTNCLKp8" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d '{"seedWithRole": "storeAdmin", "seedWithOrg":"orgA", "username": "storeAdminA3@orgA.com", "email": "storeAdminA3@orgA.com", "password": "storeAdminA3"}'

#13 a non-orgAdmin user should NOT be able to CRUD users
curl -X POST \
  "http://localhost:3000/api/UserModels/login" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d "{\"username\":\"storeAdminA3@orgA.com\", \"password\":\"storeAdminA3\"}"
# k6kvYovXXLGBqCEBHKxwCGeidv5fmlJ5IwHMjilP5gYGlKNGr1dS6gyiybJ4PICL
curl -X POST \
  "http://localhost:3000/api/UserModels?access_token=k6kvYovXXLGBqCEBHKxwCGeidv5fmlJ5IwHMjilP5gYGlKNGr1dS6gyiybJ4PICL" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  -d '{"seedWithRole": "storeAdmin", "seedWithOrg":"orgA", "username": "storeAdminA4@orgA.com", "email": "storeAdminA4@orgA.com", "password": "storeAdminA4"}'
```

## Attributions

The project is generated by [LoopBack](http://loopback.io).
