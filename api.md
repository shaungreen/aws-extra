# aws-extra: API Documentation

The `aws-extra` module exports a single top-level function that you call to create a new, enhanced SDK.  This new sdk wraps the existing AWS SDK that you provide on your node path.  `aws-extra` should work with any version of the AWS SDK since v2.0.23, but it hasn't been tested with all of them.  Please report any bugs you find to https://gitlab.com/shaungreen/aws-extra/issues.

## Building the enhanced SDK

~~~ javascript
const awsExtra = require('aws-extra')
const aws = awsExtra()
~~~

Simply invoke the function exported by `aws-extra` to build the enhanced SDK.  The building process makes use of metadata supplied by the `aws-sdk` module to determine which operations exist, which support paging, etc.

## Configuring the wrapped AWS SDK (optional)

If you would like to pass global config settings to the wrapped AWS SDK, you can do so like this:

~~~ javascript
const awsExtra = require('aws-extra')
const config = { region: 'ap-southeast-2' }
const aws = awsExtra(config)
~~~

If you want to provide config settings for specific AWS SDK services, you can do so like this:

~~~ javascript
const awsExtra = require('aws-extra')
const config = {
  region: 'ap-southeast-2',
  Lambda: {
    apiVersion: '2015-03-31'
  }
}
const aws = awsExtra(config)
~~~

## `logLevel`

~~~ javascript
const awsExtra = require('aws-extra')
const aws = awsExtra()
console.log('default logLevel is:', aws.logLevel)
/*
example output:
  default logLevel is: INFO
*/
~~~

The `logLevel` attribute determines the type of log messages that should be output when aws sdk calls are made.  With the default logger supplied as part of `aws-extra`, log messages are printed using `console.log()` and the following log levels are recognised:
* 'NONE': no logging
* 'INFO': one line is logged for each sdk call
* 'DEBUG': three lines are logged for each sdk call:
  * the call
  * the input parameters passed
  * the result returned

NOTE: You can tailor logging by injecting your own log function (see below).

## `injectLogFunction(info => {})`

~~~ javascript
const awsExtra = require('aws-extra')
const aws = awsExtra()
aws.logLevel = 'NONE' // turns off logging
~~~

Pass this a function, and the function will be called (exactly once) each time an sdk call is made.  The function will be passed an object parameter with the following structure:

~~~ javascript
const logInfo = {
  logLevel: 'string',  // see above for possible values
  service: 'string',   // the aws service used
  operation: 'string', // the aws operation that was invoked
  success: 'boolean',  // was the sdk call successful?
  recordCount: 'int',  // how many "things" were retrieved?
  recordType: 'string' // what type of "things" were retrieved?
}
~~~
