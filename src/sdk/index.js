const buildSdk = () => {
  const sdk = {
    AWS: require('aws-sdk'),
    logLevel: 'INFO',
    logFunctionHolder: {},
    natural: {}
  }
  sdk.injectLogFunction = (f) => { sdk.logFunctionHolder.logFunction = f }
  sdk.injectLogFunction(defaultLogFunction)
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
      const serviceApiWaitFilename = serviceApiFilenameRoot + '.waiters2.json'
      const apiSpec = require(serviceApiMainFilename)
      let pageSpec
      try {
        pageSpec = require(serviceApiPageFilename)
      } catch (err) {
        pageSpec = undefined
      }
      let waitSpec
      try {
        waitSpec = require(serviceApiWaitFilename)
      } catch (err) {
        waitSpec = undefined
      }
      // create the service object
      sdk.natural[service] = new sdk.AWS[service]({})
      // build the enhanced service - promisfied and with added logging
      const newName = newServiceName(service)
      sdk[newName] = {}
      for (let operation of Object.keys(apiSpec.operations)) {
        // existing "normal" operations get promisfied, have logging added, and are paginated
        const functionName = operation.substring(0, 1).toLowerCase() + operation.substring(1)
        sdk[newName][functionName] = async (params) => {
          const logInfo = {
            logLevel: sdk.logLevel,
            service: service,
            operation: operation,
            params: params
          }
          try {
            const result = await sdk.natural[service][functionName](params).promise()
            logInfo.success = true
            logInfo.recordType = 'record'
            logInfo.recordCount = 1
            logInfo.result = result
            if (pageSpec && pageSpec.pagination[operation] && pageSpec.pagination[operation].result_key) {
              logInfo.recordType = (Array.isArray(pageSpec.pagination[operation].result_key)) ? pageSpec.pagination[operation].result_key[0] : pageSpec.pagination[operation].result_key
              logInfo.recordCount = result[logInfo.recordType].length
            }
            await sdk.logFunctionHolder.logFunction(logInfo)
            return result
          } catch (err) {
            logInfo.success = false
            logInfo.result = err
            await sdk.logFunctionHolder.logFunction(logInfo)
            throw err
          }
        }
        // add ".all()" functions for paginated operations
        if (pageSpec && pageSpec.pagination[operation]) {
          sdk[newName][functionName].all = async (params) => {
            const resultSet = []
            let finished = false
            while (!finished) {
              const callResult = await sdk[newName][functionName](params)
              const recordType = (Array.isArray(pageSpec.pagination[operation].result_key)) ? pageSpec.pagination[operation].result_key[0] : pageSpec.pagination[operation].result_key
              for (let item of callResult[recordType]) {
                resultSet.push(item)
              }
              if (callResult[pageSpec.pagination[operation].output_token]) {
                if (!params) params = {}
                Object.assign(params, { [pageSpec.pagination[operation].input_token]: callResult[pageSpec.pagination[operation].output_token] })
              } else {
                finished = true
              }
            }
            return { [pageSpec.pagination[operation].result_key]: resultSet }
          }
        }
      }
      // add a waitFor when appropriate
      if (waitSpec) {
        sdk[newName].waitFor = async (state, params) => {
          const logInfo = {
            logLevel: sdk.logLevel,
            service: service,
            operation: `WaitFor('${state}')`,
            params: params
          }
          try {
            await sdk.logFunctionHolder.logFunction({
              logLevel: sdk.logLevel,
              service: service,
              operation: `WaitFor('${state}') starting`,
              params: params,
              success: true,
              recordType: 'waiting',
              recordCount: 1
            })
            const result = await sdk.natural[service].waitFor(state, params).promise()
            logInfo.success = true
            logInfo.recordType = 'finished'
            logInfo.recordCount = 1
            logInfo.result = result
            await sdk.logFunctionHolder.logFunction(logInfo)
            return result
          } catch (err) {
            logInfo.success = false
            logInfo.result = err
            await sdk.logFunctionHolder.logFunction(logInfo)
            throw err
          }
        }
      }
    }
  }
  return sdk
}

const defaultLogFunction = (info) => {
  const validLogLevels = ['NONE', 'INFO', 'DEBUG']
  if (['INFO', 'DEBUG'].includes(info.logLevel)) console.log(`AWS SDK: ${info.service}.${info.operation} => ${info.success ? 'ok' : 'failed'}${info.recordCount ? ' (' + info.recordCount + ' ' + info.recordType + ')' : ''}`)
  if (info.logLevel === 'DEBUG') {
    console.log(`AWS SDK: ${info.service}.${info.operation} params => ${JSON.stringify(info.params)}`)
    console.log(`AWS SDK: ${info.service}.${info.operation} result => ${JSON.stringify(info.result)}`)
  }
  if (!validLogLevels.includes(info.logLevel)) throw new Error(`Invalid logLevel value of "${info.logLevel}" was provided to logging function.  Valid values are ${validLogLevels}.`)
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
