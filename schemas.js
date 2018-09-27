const Joi = require('joi')

const addressSchema = {
  address: Joi.string().regex(/^0x/).alphanum().length(42).required(),
}

const receiverSchema = Object.assign({amount: Joi.number().required().positive()}, addressSchema)

module.exports = {
  addressSchema,
  receiverSchema
}