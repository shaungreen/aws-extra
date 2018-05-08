const buildSdk = () => {
  const sdk = {
    AWS: require('aws-sdk'),
    logging: true,
    logFunctionHolder: {
      logFunction: (info) => console.log(`AWS SDK: ${info.service}.${info.operation} => ${info.success ? 'ok' : 'failed'}${info.recordCount ? ' (' + info.recordCount + ' ' + info.recordType + ')' : ''}`)
    },
    original: {}
  }
  sdk.injectLogFunction = (f) => { sdk.logFunctionHolder.logFunction = f }
  const unsupportedServices = ['CloudSearchDomain', 'IotData']
  const metadata = require('aws-sdk/apis/metadata')
  for (let service of Object.keys(sdk.AWS).filter(s => !unsupportedServices.includes(s))) {
    const serviceIdentifier = sdk.AWS[service].serviceIdentifier
    if (serviceIdentifier) {
      // get metadata about service and its apis that amazon helpfully provides
      const latestApiVersion = sdk.AWS[service].apiVersions[sdk.AWS[service].apiVersions.length - 1]
      const serviceMetadata = metadata[serviceIdentifier]
      const serviceApiFilenameRoot = 'aws-sdk/apis/' + (serviceMetadata.prefix ? serviceMetadata.prefix : serviceMetadata.name.toLowerCase()) + '-' + latestApiVersion
      const serviceApiMainFilename = serviceApiFilenameRoot + '.min.json'
      const serviceApiPageFilename = serviceApiFilenameRoot + '.paginators.json'
      const apiSpec = require(serviceApiMainFilename)
      let pageSpec
      try {
        pageSpec = require(serviceApiPageFilename)
      } catch (err) {
        pageSpec = undefined
      }
      // create the service object
      sdk.original[service] = new sdk.AWS[service]({})
      // build the enhanced service - promisfied and with added logging
      const newName = newServiceName(service)
      sdk[newName] = {}
      for (let operation of Object.keys(apiSpec.operations)) {
        // existing operations get promisfied and have logging added
        const functionName = operation.substring(0, 1).toLowerCase() + operation.substring(1)
        sdk[newName][functionName] = async (options) => {
          const logInfo = {
            service: service,
            operation: operation,
            options: options
          }
          try {
            const result = await sdk.original[service][functionName](options).promise()
            if (sdk.logging) {
              logInfo.success = true
              logInfo.recordType = 'record'
              logInfo.recordCount = 1
              if (pageSpec && pageSpec.pagination[operation].result_key) {
                logInfo.recordType = (Array.isArray(pageSpec.pagination[operation].result_key)) ? pageSpec.pagination[operation].result_key[0] : pageSpec.pagination[operation].result_key
                logInfo.recordCount = result[logInfo.recordType].length
              }
              await sdk.logFunctionHolder.logFunction(logInfo)
            }
            return result
          } catch (err) {
            if (sdk.logging) {
              logInfo.success = false
              await sdk.logFunctionHolder.logFunction(logInfo)
            }
            throw err
          }
        }
        // add ".all()" functions for paginated operations
        if (pageSpec && pageSpec.pagination[operation]) {
          sdk[newName][functionName].all = async (options) => {
            const resultSet = []
            let finished = false
            while (!finished) {
              const callResult = await sdk[newName][functionName](options)
              const recordType = (Array.isArray(pageSpec.pagination[operation].result_key)) ? pageSpec.pagination[operation].result_key[0] : pageSpec.pagination[operation].result_key
              for (let item of callResult[recordType]) {
                resultSet.push(item)
              }
              if (callResult[pageSpec.pagination[operation].output_token]) {
                if (!options) options = {}
                Object.assign(options, { [pageSpec.pagination[operation].input_token]: callResult[pageSpec.pagination[operation].output_token] })
              } else {
                finished = true
              }
            }
            return { [pageSpec.pagination[operation].result_key]: resultSet }
          }
        }
      }
    }
  }
  return sdk
}

const newServiceName = (name) => {
  const exceptions = [
    { orig: 'APIGateway', new: 'apiGateway' },
    { orig: 'ELBv2', new: 'elbv2' },
    { orig: 'IoTAnalytics', new: 'iotAnalytics' },
    { orig: 'IoTJobsDataPlane', new: 'iotJobsDataPlane' },
    { orig: 'WAFRegional', new: 'wafRegional' },
    { orig: 'XRay', new: 'xray' }
  ]
  const exception = exceptions.find(e => e.orig === name)
  if (exception) {
    return exception.new
  } else if (/[a-z]/.test(name)) {
    return name.substring(0, 1).toLowerCase() + name.substring(1)
  } else {
    return name.toLowerCase()
  }
}

module.exports = buildSdk()
