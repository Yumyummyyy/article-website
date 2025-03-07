const error = require('../middleware/error')
const { sequelize, DataTypes } = require('../database')
const Spoodaweb = require('../databaseModels/spoodaweb')(sequelize, DataTypes)

const errMsg = 'The data received is invalid. This is probably a client side error.'

module.exports = {
  async validate (req, res, next) {
    try {
      if (!req.body.spoodawebId) throw next(error.create(errMsg))
      const spoodaweb = await Spoodaweb.findOne({
        where: {id: req.body.spoodawebId}
      })
      if (spoodaweb === null) throw next(error.create('The spoodaweb you are editing does not exist within the database, or there is a client side error.'))
      let data = req.body.spoodawebData
      if (data === undefined) throw next(error.create(errMsg))
      for (const budName in data) {
        const bud = data[budName]
        switch (bud.operation) {
          case undefined:
            throw next(error.create(errMsg))
          case 'sub':
            break
        }
        next()
      }
    } catch(err) {
      next(err)
    }
  },
  async end (req, res, next) {
    res.send({type: true, message: 'spoodaweb successfully saved'})
  }
}
