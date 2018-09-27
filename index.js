'use strict';
const express = require('express')
const Joi = require('joi')
const Thor = require('./thor')
const schemas = require('./schemas')

const port = process.env.PORT || 3000
const endpoint = process.env.ENDPOINT || 'http://localhost:8669' // thor node API address
const contractAddress = process.env.CONTRACT || ''
const privateKey = process.env.PRIV || ''

const thor = new Thor(endpoint, contractAddress)
thor.setPrivateKey(privateKey)

const app = express()
app.use(express.json()) // Use middleware of JSON

function no_account_loaded(res){
  if (!thor.isLoaded()){
    res.send({
      'error': 'No sender account configured!'
    })
    res.end()
    return true
  } else {
    return false
  }
}

// Hello?
app.get('/hello', (req, res) => {
  res.send('hello')
})

// Get the root holder, balance status,
// public address/private key loading status
app.get('/root/status', (req, res) => {
  if (no_account_loaded(res)) return
  thor.accountStatus(thor.credential.address, true).then(
    result => {
      res.send({
        'result': result
      })
      res.end()
    },
    error => {
      res.send({'error': error})
      res.end()
    }
  )
})

// Destroy the root account in memory
app.get('/root/destroy', (req, res) => {
  thor.destroyCredential()
  res.send({
    'result': true
  })
})

// Suspend the send TIC action.
// Use during emergency situation.
app.get('/root/suspend', (req, res) => {
  thor.pauseTransfer()
  res.send({
    'result': true
  })
})

// Resume the send TIC action.
app.get('/root/resume', (req, res) => {
  thor.resumeTransfer()
  res.send({
    'result': true
  })
})

// Send {amount} of TIC to the target {address}
// { address: 0x...., amount: 0.1234 }
app.post('/tic/send', (req, res) => {
  if (no_account_loaded(res)) return
  const incoming = Joi.validate(req.body, schemas.receiverSchema)
  if (incoming.error){
    res.send({
      'error': incoming.error.toString()
    })
    return
  }
  
  thor.sendTIC(incoming.value.address, incoming.value.amount).then(
    result => {
      res.send({
        'result': {
          'TxHash': result
        }
      }
    )},
    error => {
      res.send({
        'error': error.toString()
      })
    }
  )
})

// Get the root holder, balance status,
// public address/private key loading status
app.get('/account/:address', (req, res) => {
  if (no_account_loaded(res)) return
  const incoming = Joi.validate(req.params, schemas.addressSchema)
  if (incoming.error){
    res.send({
      'error': incoming.error.toString()
    })
    return
  }

  thor.accountStatus(incoming.value.address, true).then(
    result => {
      res.send({
        'result': result
      })
      res.end()
    },
    error => {
      res.send({'error': error})
      res.end()
    }
  )
})

app.listen(port, () => { console.log(`listening on ${port} ...`)})