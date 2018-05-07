const sdk = require('./index').sdk

const main = async () => {
  const result = await sdk.s3.listBuckets()
  console.log(result)
}

main()
