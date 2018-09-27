const Thor = require('./thor')

const endpoint = process.env.ENDPOINT || 'http://localhost:8669'

const testHolder = {
  address: '0x083b700e7c0d5c8878ee1d29957ef795411f744d',
  privateKey: 'ae7c3bd2abb65788a42cc3c01059479ecbeea2a3bf8c62ce20af9e1dae1fa5f9'
}

const testReceiver = {
  address: '0x395d3e47d15052872ffac4af447931ad8bea7c3d',
  privateKey: '1604c5fc2828257935a7aebe3653043be4af56a1cee8beff44a3608c0b907bc2',
}

const testContractAddress = '0xd1162ea6ffc44c877d3abce171876ff3fbb3f7fd'

let thor

beforeEach(() => {
  thor = new Thor(endpoint, testContractAddress)
})

describe('thor node initialize', () => {
  test('thor node to be initialized', () => {
    expect(thor.credential).toEqual({
      privateKey: '',
      address: ''
    })
  })

  test('install privateKey on thor node', () =>{
    expect(thor.setPrivateKey(testHolder.privateKey)).toBeTruthy()
    expect(thor.credential.address).toEqual(testHolder.address)
    expect(thor.isLoaded()).toBeTruthy()
  })

  test('destroy credential on thor node', () => {
    thor.destroyCredential()
    expect(thor.credential).toEqual({
      privateKey: '',
      address: ''
    })
    expect(thor.isLoaded()).toBeFalsy()
  })

  test('install wrong privateKey on thor node', ()=>{
    expect(thor.setPrivateKey('123123123')).toBeFalsy()
    expect(thor.credential).toEqual({
      privateKey: '',
      address: ''
    })
  })
})

describe('transfers', () => {
  test('check balance of holder', async () => {
    const accountStatus = await thor.accountStatus(testHolder.address)
    console.log(accountStatus.vet.toString(10))
    console.log(accountStatus.vtho.toString(10))
    console.log(accountStatus.tic.toString(10))
  })

  test('check balance of receiver', async () => {
    const accountStatus = await thor.accountStatus(testReceiver.address)
    console.log(accountStatus.vet.toString(10))
    console.log(accountStatus.vtho.toString(10))
    console.log(accountStatus.tic.toString(10))
  })

  test('transfer some token from holder to receiver', async () => {
    thor.setPrivateKey(testHolder.privateKey)
    const amount = 100  // 100 Tokens
    const txHash = await thor.sendTIC(testReceiver.address, amount)
    console.log(txHash)
  })
})