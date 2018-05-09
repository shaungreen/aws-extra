# aws-extra

Extra layers of usefulness on top of the AWS JavaScript SDK.

Repository can be found on GitLab here: https://gitlab.com/shaungreen/aws-extra  

## What do you get?

### Promises and Async / Await
The entire SDK is promisfied:

~~~ javascript
const sdk = require('aws-extra').sdk

const myBuckets = await sdk.s3.listBuckets()
console.log(myBuckets) // same output as from natural AWS SDK
~~~

### Logging
Logging of calls to the SDK is enabled by default, but you can turn it off if you like:

~~~ javascript
const sdk = require('aws-extra').sdk

sdk.logLevel = 'NONE' // turns logging off, valid options are NONE, INFO, and DEBUG
const myFunctions = await sdk.lambda.listFunctions()
console.log('functions length:', myFunctions.Functions.length)
sdk.logLevel = 'INFO'
const myInstances = await sdk.ec2.describeInstances()
console.log('instances length:', myInstances.Reservations.length)

/*
example output:
  functions length: 50
  AWS SDK: EC2.DescribeInstances => ok (11 Reservations)
  instances length: 11
*/   
~~~

You can inject your own logger into the `aws-extra.sdk` object if you wish.  All log calls are promise-aware, so you can log to a database or anywhere you'd like:

~~~ javascript
const sdk = require('aws-extra').sdk

sdk.injectLogFunction(info => console.log(info))
const myInstances = await sdk.ec2.describeInstances()
console.log('instances length:', myInstances.Reservations.length)
/*
example output:
{ logLevel: 'INFO',
  service: 'EC2',
  operation: 'DescribeInstances',
  params: undefined,
  success: true,
  recordType: 'Reservations',
  recordCount: 11,
  result:
   { Reservations:
      [ [Object], [Object], [Object], [Object], [Object], [Object],
        [Object], [Object], [Object], [Object], [Object] ] } }
instances length: 11
*/
~~~

### Pagination handling
Get all the pages at once! (Works for all paginated SDK operations)

~~~ javascript
const sdk = require('aws-extra').sdk

const myFunctions = await sdk.lambda.listFunctions.all()
console.log('total number of functions:', myFunctions.Functions.length)

/*
example output:
  AWS SDK: Lambda.ListFunctions => ok (50 Functions)
  AWS SDK: Lambda.ListFunctions => ok (50 Functions)
  AWS SDK: Lambda.ListFunctions => ok (50 Functions)
  AWS SDK: Lambda.ListFunctions => ok (50 Functions)
  AWS SDK: Lambda.ListFunctions => ok (50 Functions)
  AWS SDK: Lambda.ListFunctions => ok (38 Functions)
  total number of functions: 288
*/
~~~

## What does it cost?
Aws-extra currently weighs in at 48KB.  It brings in no other dependencies (in production).  The aws-sdk is listed as a peer dependency in case you wish to use aws-extra for your lambda functions (which already have the aws-sdk on the node path).  If you are not using aws-extra in a lambda, you need to add aws-sdk as a dependency yourself.

Module load time was 350ms when tested (YMMV).
