// forage id
// find your IPFS peer ID and public key

const forage = require('../forage');

async function id(argv) {
  var db = forage.connectDB()
  var ipfsID = await forage.connectIPFS(db, argv.topic);
  var key = await forage.signing.fetchPrivateKey(db)
  var jose = require('node-jose');
  var string = forage.signing.encode(key)
  console.log('Public Key:', string)
  console.log('IPFS Peer ID:',ipfsID.id)
  await db.close()
  process.exit(0)
}

module.exports = id
