const Transform = require('readable-stream').Transform
const inherits = require('inherits')
const utils = require('./utils')
const queryMask = utils.queryMask
const maskUpdater = utils.maskUpdater
const matcher = utils.matcher

function JoinStream (options) {
  if (!(this instanceof JoinStream)) {
    return new JoinStream(options)
  }
  options.objectMode = true
  Transform.call(this, options)

  this.triple = options.triple
  this.matcher = matcher(options.triple)
  this.mask = queryMask(options.triple)
  this.maskUpdater = maskUpdater(options.triple)
  this.limit = options.limit
  this._limitCounter = 0
  this.db = options.db
  this._ended = false
  this.filter = options.filter
  this.offset = options.offset

  this.once('pipe', (source) => {
    source.on('error', (err) => {
      this.emit('error', err)
    })
  })

  this._onErrorStream = (err) => {
    this.emit('error', err)
  }

  this._onDataStream = (triple) => {
    var newsolution = this.matcher(this._lastSolution, triple)

    if (this._ended || !newsolution) {
      return
    }

    this.push(newsolution)
    this._limitCounter += 1
    if (this.limit && this._limitCounter === this.limit) {
      this._readStream.destroy()
      this._ended = true
      this.push(null)
    }
  }

  this._options = {
    filter: this.filter,
    offset: this.offset,
    encode: options.encode ? !!options.encode : false
  }
}

inherits(JoinStream, Transform)

JoinStream.prototype._transform = function transform (solution, encoding, done) {
  if (this._ended) {
    return done()
  }
  var newMask = this.maskUpdater(solution, this.mask)

  this._lastSolution = solution
  this._readStream = this.db.getStream(newMask, this._options)

  this._readStream.on('data', this._onDataStream)
  this._readStream.on('error', this._onErrorStream)
  this._readStream.on('end', done)
}

module.exports = JoinStream
