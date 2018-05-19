const defaultLogFunction = (info) => {
  const validLogLevels = ['NONE', 'INFO', 'DEBUG']
  if (['INFO', 'DEBUG'].includes(info.logLevel)) console.log(`AWS SDK: ${info.service}.${info.operation} => ${info.success ? 'ok' : 'failed'}${info.recordCount ? ' (' + info.recordCount + ' ' + info.recordType + ')' : ''}`)
  if (info.logLevel === 'DEBUG') {
    console.log(`AWS SDK: ${info.service}.${info.operation} params => ${JSON.stringify(info.params)}`)
    console.log(`AWS SDK: ${info.service}.${info.operation} result => ${JSON.stringify(info.result)}`)
  }
  if (!validLogLevels.includes(info.logLevel)) throw new Error(`Invalid logLevel value of "${info.logLevel}" was provided to logging function.  Valid values are ${validLogLevels}.`)
}

module.exports = defaultLogFunction
