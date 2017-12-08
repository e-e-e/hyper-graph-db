const Transform = require('readable-stream').Transform
const inherits = require('inherits')

function HyperdbDiffTransform (options) {
  if (!(this instanceof HyperdbDiffTransform)) {
    return new HyperdbDiffTransform(options)
  }

  Transform.call(this, options)

  this.once('pipe', (source) => {
    source.on('error', e => this.emit('error', e))
  })
}

inherits(HyperdbDiffTransform, Transform)

HyperdbDiffTransform.prototype._transform = function transform (chunk, encoding, done) {
  if (chunk.type === 'put') this.push(chunk.value[0].toString())
  done()
}

module.exports = HyperdbDiffTransform
