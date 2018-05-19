# aws-extra: Overview and Examples

## Promises and Async / Await
The entire SDK is promisfied:

~~~ javascript
const awsExtra = require('aws-extra')
const aws = awsExtra()

const myBuckets = await aws.s3.listBuckets()
console.log(myBuckets) // same return value as from natural AWS SDK
~~~

## Logging
Logging of calls to the SDK is enabled by default, but you can turn it off if you like:

~~~ javascript
const awsExtra = require('aws-extra')
const aws = awsExtra()

aws.logLevel = 'NONE' // turns logging off, valid options are NONE, INFO, and DEBUG
const myFunctions = await aws.lambda.listFunctions()
console.log('functions length:', myFunctions.Functions.length)
aws.logLevel = 'INFO'
const myInstances = await aws.ec2.describeInstances()
console.log('instances length:', myInstances.Reservations.length)

/*
example output:
  functions length: 50
  AWS SDK: EC2.DescribeInstances => ok (11 Reservations)
  instances length: 11
*/   
~~~

You can inject your own logger into the `aws` object if you wish.  All log calls are promise-aware, so you can log to a database or anywhere you'd like:

~~~ javascript
const awsExtra = require('aws-extra')
const aws = awsExtra()

aws.injectLogFunction(info => console.log(info))
const myInstances = await aws.ec2.describeInstances()
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

## Pagination handling
Get all the pages at once! (Works for all paginated SDK operations)

~~~ javascript
const awsExtra = require('aws-extra')
const aws = awsExtra()

const myFunctions = await aws.lambda.listFunctions.all()
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
