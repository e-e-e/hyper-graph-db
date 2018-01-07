const Transform = require('readable-stream').Transform
const inherits = require('inherits')

function HyperdbDiffTransform (db, options) {
  if (!(this instanceof HyperdbDiffTransform)) {
    return new HyperdbDiffTransform(db, options)
  }
  var opts = options || {}
  this.db = db
  this._finished = false
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

inherits(HyperdbDiffTransform, Transform)

HyperdbDiffTransform.prototype._transform = function transform (nodes, encoding, done) {
  // if (chunk.type === 'put') {
  //   const seq = chunk.nodes[0].seq
  //   const feedSeq = chunk.nodes[0].feedSeq
  //   this.db.get(chunk.name, (err, nodes) => {
  //     if (err) {
  //       this.emit('error', err)
  //       done()
  //     }
  //     const node = nodes[0]
  //     if (node.feedSeq === feedSeq && node.seq === seq) {
  //       if (node.value !== null) this.push(JSON.parse(node.value.toString()))
  //     }
  //     done()
  //   })
  // }
  if (this._finished) return done()
  if (this._limit && this._count >= this._limit) {
    this.push(null)
    this._sources.forEach(source => source.destroy())
    this._finished = true
    return
  }
  var value = nodes[0].value && JSON.parse(nodes[0].value.toString())
  if (value !== null && (!this._filter || this._filter(value))) {
    if (this._count >= this._offset) {
      this.push(value)
    }
    this._count++
  }
  done()
}

module.exports = HyperdbDiffTransform
