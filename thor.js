/**
 * Vechain VET functions
 * @author laalaguer@gmail.com 
 */
const axios = require('axios')
const secp256k1 = require('secp256k1')
const keccak = require('keccak')
const Web3 = require('web3')
const thorify = require("thorify").thorify
const contractAbi = require('./abi').tictalkAbi

// Decimals of VET style, 18 width of float.
const decimals = Web3.utils.toBN(10 ** 18)

/**
 * Get a number that can run in web3
*/
const getNumber = function (anything){
  return Web3.utils.toBN(anything)
}

/**
 * Turn normal number into Wei powered format, eg 10 ** 18
 * @param {float} number 
 */
const getAmount = function (number) {
  return getNumber(number).mul(decimals)
}

/**
 * Check if the private key is in good shape. 
 * @param {string} privateKey 64 characters of 0-9, A-Z, a-z 
 */
const privateKeyFormatChecker = function(privateKey){
  let regex = /^([a-z]|[A-Z]|[0-9]){64}$/
  if (privateKey.match(regex)){
    return true
  } else {
    return false
  }
}

/**
 * Check if address is in good shape.
 * @param {string} address 42 characters of 0-9, A-Z, a-z, start with 0x
 */
const addressFormatChecker = function(address){
  let regex = /^0x([a-z]|[A-Z]|[0-9]){40}$/
  if (address.match(regex)){
    return true
  } else {
    return false
  }
}

/**
 * Turn private key into address
 * @param privateKey {Buffer} 32 bytes of private key
 * @returns {Buffer} 20 bytes of address
 */
const _privateKeyToAddress = function (privateKey) {
  // 32 bytes of private key buffer to generate 65 bytes of public key.
  // Get rid of 0x04 at the begin of public key. (65-1=64 bytes remains)
  const publicKey = secp256k1.publicKeyCreate(privateKey, false).slice(1)
  // Take right-most 20 bytes and turn to hex representation.
  return keccak('keccak256').update(publicKey).digest().slice(-20)
}

/**
 * Turn private key string into address string
 * @param {string} privateKey 64 characters of a-z, A-Z, 0-9
 * @returns {string} 0x + 40 characters = 42 characters
 */
const privateKeyToAddress = function (privateKey) {
  const priv = Buffer.from(privateKey, 'hex')
  return '0x'+_privateKeyToAddress(priv).toString('hex')
}

function Thor(endpoint, contractAddress) {
  if (!contractAddress){
    throw new Error('Need ERC20/VIP180 contract address!')
  }

  if (!endpoint){
    throw new Error('Need Thor endpoint to communicate!')
  }

  this.endpoint = endpoint
  this.contractAddress = contractAddress
  this.web3 = thorify(new Web3(), endpoint)
  this.contractInstance = new this.web3.eth.Contract(contractAbi, contractAddress)
  this.instance = axios.create({
    baseURL: endpoint
  })
  this.credential = {
    privateKey: '',
    address: ''
  }
  this.pause = false
}

/**
 * Get account status
 * @param {string} address 
 * Promise with { vet: BigNumber, vtho: BigNumber, tic: BigNumber } or null
 * BigNumer is in Wei format, 10**18
 */
Thor.prototype.accountStatus = async function (address, human=false){  // async always return a Promise, if not promise then wrap it inside a promise
  try {
    const vetResponse = await this.instance.get(`/accounts/${address}`)
    const vetStatus = vetResponse.data
    const ticResponse = await this.contractInstance.methods.balanceOf(address).call({ from: address })
    const ticStatus = ticResponse

    return Promise.resolve({
      vet: human? getNumber(vetStatus.balance).div(decimals).toString(10): getNumber(vetStatus.balance),
      vtho: human? getNumber(vetStatus.energy).div(decimals).toString(10): getNumber(vetStatus.energy),
      tic: human? getNumber(ticStatus).div(decimals).toString(10): getNumber(ticStatus)
    })
  } catch (err) {
    // console.log(err)
    return Promise.reject(err)
  }
}

/**
 * Check if sender token is enough, if sender VTHO is enough.
 * @param {BigNumber} requiredTokenAmount the required token amount to send, in BN format
 */
Thor.prototype.enoughToSend = async function (requiredTokenAmount) {
  try{
    const account = await this.accountStatus(this.credential.address)
    if(!account){
      return false
    }
    if (requiredTokenAmount.gt(account.tic)){
      return false
    }
    if (account.vtho.lt(getAmount(1000))){
      return false
    }
    return true
  } catch (err){
    // console.log(err)
    return false
  }
}

/**
 * Send {amount} of TIC to {address}
 * @param {string} address 
 * @param {number} amount regular number with max 4 float point, will be converted to Wei internally
 * @returns {Promise} promise of transaction hash or 
 */
Thor.prototype.sendTIC = async function (address, amount) {
  if (!this.isLoaded()){
    return Promise.reject(new Error('No sender configured, forget to inject credentials?'))
  }

  if (this.pause) {
    return Promise.reject(new Error('The Owner paused transfer, cannot fulfill request.'))
  }

  return new Promise((resolve, reject) => {
    const amountInWei = getAmount(amount)
    this.enoughToSend(amountInWei).then(enough => {
      if (!enough){
        reject(new Error('Not enough TIC or not enough VTHO'))
      }else{
        this.contractInstance.methods.transfer(address, amountInWei.toString(10)).send({from: this.credential.address})
        .on('transactionHash', (hash) => {
          resolve(hash)
        })
        .on('error', (error) => {
          reject(error)
        })
      }
    })
  })
}

/**
 * Set the private key of the thor helper.
 * @param {string} privateKey 64 characters
 * @returns {boolean} Successfully set the key or not.
 */
Thor.prototype.setPrivateKey = function (privateKey){
  if (!privateKeyFormatChecker(privateKey)){
    return false
  }

  const address = privateKeyToAddress(privateKey)

  if (!addressFormatChecker(address)){
    return false
  }
  
  this.credential.privateKey = privateKey
  this.credential.address = address

  // Set account into wallet
  let privateAccount = this.web3.eth.accounts.privateKeyToAccount('0x'+this.credential.privateKey)
  this.web3.eth.accounts.wallet.add(privateAccount)

  return true
}

/**
 * Check if the credential is in place.
 */
Thor.prototype.isLoaded = function (){
  if (!this.credential.privateKey || this.web3.eth.accounts.wallet.length == 0) {
    return false
  } else {
    return true
  }
}

/**
 * Destroy the credential in the memeory.
 */
Thor.prototype.destroyCredential = function() {
  // remove address-privatekey from eth wallet
  if (this.credential.address){
    this.web3.eth.accounts.wallet.remove(this.credential.address)
  }
  this.credential.privateKey = ''
  this.credential.address = ''
}

/**
 * Pause all transfer
 */
Thor.prototype.pauseTransfer = function() {
  this.pause = true
}

/**
 * Resume all transfer
 */
Thor.prototype.resumeTransfer = function() {
  this.pause = false
}

module.exports = Thor