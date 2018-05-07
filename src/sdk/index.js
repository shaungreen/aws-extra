const buildSdk = () => {
  const sdk = {
    AWS: require('aws-sdk'),
    original: {}
  }
  const unsupportedServices = ['CloudSearchDomain', 'IotData']
  const metadata = require('aws-sdk/apis/metadata')
  for (let service of Object.keys(sdk.AWS).filter(s => !unsupportedServices.includes(s)).sort()) {
    const serviceIdentifier = sdk.AWS[service].serviceIdentifier
    if (serviceIdentifier) {
      // get metadata about service and its apis that amazon helpfully provides
      const latestApiVersion = sdk.AWS[service].apiVersions[sdk.AWS[service].apiVersions.length - 1]
      const serviceMetadata = metadata[serviceIdentifier]
      let serviceApiFilename = 'aws-sdk/apis/'
      serviceApiFilename += serviceMetadata.prefix ? serviceMetadata.prefix : serviceMetadata.name.toLowerCase()
      serviceApiFilename += '-' + latestApiVersion + '.min.json'
      const apiSpec = require(serviceApiFilename)
      // create the service object
      sdk.original[service] = new sdk.AWS[service]({})
      // build the enhanced service
      const newName = newServiceName(service)
      sdk[newName] = {}
      for (let operation of Object.keys(apiSpec.operations)) {
        const functionName = operation.substring(0, 1).toLowerCase() + operation.substring(1)
        sdk[newName][functionName] = (options) => sdk.original[service][functionName](options).promise()
      }
    }
  }
  return sdk
}

const newServiceName = (name) => {
  if (/[a-z]/.test(name)) {
    return name.substring(0, 1).toLowerCase() + name.substring(1)
  } else {
    return name.toLowerCase()
  }
}

module.exports = buildSdk()
