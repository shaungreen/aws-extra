const sdk = require('./index').sdk

const main = async () => {
  const myFunctions = await sdk.lambda.listFunctions.all()
  console.log('total number of functions:', myFunctions.Functions.length)
}

main()
