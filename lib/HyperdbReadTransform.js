const Transform = require('readable-stream').Transform
const inherits = require('inherits')
const utils = require('./utils')

function HyperdbReadTransform (db, basename, options) {
  if (!(this instanceof HyperdbReadTransform)) {
    return new HyperdbReadTransform(db, basename, options)
  }
  var opts = options || {}
  this.db = db
  this._prefixes = { _: basename }
  this._count = 0
  this._filter = opts.filter
  this._offset = opts.offset || 0
  this._limit = opts.limit && opts.limit + this._offset
  Transform.call(this, Object.assign(opts, { objectMode: true }))
  this._sources = []
  this.once('pipe', (source) => {
    source.on('error', e => this.emit('error', e))
    this._sources.push(source)
  })
}

inherits(HyperdbReadTransform, Transform)

HyperdbReadTransform.prototype._transform = function transform (nodes, encoding, done) {
  var value = nodes[0].value && JSON.parse(nodes[0].value.toString())
  if (value === null) return done()
  value = Object.assign(value, utils.decodeKey(nodes[0].key, this._prefixes))
  if (!this._filter || this._filter(value)) {
    if (this._count >= this._offset) {
      this.push(value)
    }
    this._count++
    if (this._limit && this._count >= this._limit) {
      this.end()
    }
  }
  done()
}

HyperdbReadTransform.prototype._flush = function (done) {
  this._sources.forEach(source => source.destroy())
  done()
}

module.exports = HyperdbReadTransform
