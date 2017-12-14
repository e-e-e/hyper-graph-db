var Transform = require('readable-stream').Transform
var utils = require('./utils')
var inherits = require('inherits')
var queryMask = utils.queryMask
var matcher = utils.matcher
var materializer = utils.materializer
var genKey = utils.genKey

function SortJoinStream (options) {
  if (!(this instanceof SortJoinStream)) {
    return new SortJoinStream(options)
  }

  options.objectMode = true

  Transform.call(this, options)

  this.triple = options.triple
  this.matcher = matcher(options.triple)
  this.db = options.db

  this.once('pipe', (source) => {
    source.on('error', (err) => {
      this.emit('error', err)
    })
  })

  this._queryMask = queryMask(options.triple)
  this._queryMask.filter = options.triple.filter

  this.index = options.index

  this._previousTriple = null
  this._lastDone = null
  this._start()
  this.limit = options.limit
  this._limitCounter = 0
}

inherits(SortJoinStream, Transform)

SortJoinStream.prototype._nextTriple = function nextTriple (skip) {
  if (skip) {
    this._previousTriple = null
  }

  if (!this._previousTriple && this._readStream) {
    this._previousTriple = this._readStream.read()
  }

  if (this._previousTriple) {
    this._doRead(this._previousTriple)
  } else if (!this._readStream) {
    this.push(null)
  }
}

SortJoinStream.prototype._start = function () {
  this._readStream = this.db.getStream(this._queryMask, { index: this.index })

  this._readStream.on('error', (err) => {
    this.emit('error', err)
  })

  this._readStream.on('close', () => {
    this._readStream = null
    if (!this._previousTriple) {
      this._execLastDone()
    }
  })

  this._readStream.on('readable', () => {
    if (this._lastDone) {
      this._nextTriple()
    }
  })
}

SortJoinStream.prototype._execLastDone = function () {
  if (this._lastDone) {
    var func = this._lastDone
    this._lastDone = null
    func()
  }
}

SortJoinStream.prototype._flush = function (cb) {
  this._execLastDone()

  if (this._readStream) {
    this._readStream.destroy()
  }

  this.push(null)

  cb()
}

SortJoinStream.prototype._transform = function (solution, encoding, done) {
  this._lastSolution = solution
  this._lastDone = done
  this._nextTriple(false)
}

SortJoinStream.prototype._doRead = function doRead (triple) {
  const newSolution = this.matcher(this._lastSolution, triple)
  var done = this._lastDone

  const key = genKey(this.index, materializer(this.triple, this._lastSolution))
  const otherKey = genKey(this.index, triple)

  if (newSolution) {
    this.push(newSolution)
    this._limitCounter += 1
    if (this.limit && this._limitCounter === this.limit) {
      this._previousTriple = null
      this._execLastDone()
      this._readStream.destroy()
      this._readStream = null
      return
    }
  }

  if (key > otherKey) {
    this._nextTriple(true)
  } else {
    this._lastDone = null
    done()
  }
}

module.exports = SortJoinStream
