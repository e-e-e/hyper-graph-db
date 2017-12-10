const Transform = require('stream').Transform
const inherits = require('inherits')

function HyperdbDiffTransform (db, options) {
  this.db = db
  if (!(this instanceof HyperdbDiffTransform)) {
    return new HyperdbDiffTransform(options)
  }
  Transform.call(this, Object.assign(options || {}, { objectMode: true }))

  this.once('pipe', (source) => {
    source.on('error', e => this.emit('error', e))
  })
}

inherits(HyperdbDiffTransform, Transform)

HyperdbDiffTransform.prototype._transform = function transform (chunk, encoding, done) {
  if (chunk.type === 'put') {
    const seq = chunk.nodes[0].seq
    const feedSeq = chunk.nodes[0].feedSeq
    this.db.get(chunk.name, (err, nodes) => {
      if (err) {
        this.emit('error', err)
        done()
      }
      const node = nodes[0]
      if (node.feedSeq === feedSeq && node.seq === seq) {
        if (node.value !== null) this.push(JSON.parse(node.value.toString()))
      }
      done()
    })
  }
}

module.exports = HyperdbDiffTransform
