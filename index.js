const utils = require('./lib/utils')

function Graph (db, opts) {
  this.db = db
  if (!(this instanceof Graph)) return new Graph(db, opts)
}

Graph.prototype.get = function (triple, callback) {
  const stream = this.db.createDiffStream(utils.createQuery(triple))
  collect(stream, (err, results) => {
    if (err) return callback(err)
    const filtered = results.reduce((prev, result) => {
      if (result.type === 'put') {
        prev.push(JSON.parse(result.value[0].toString()))
      }
      return prev
    }, [])
    callback(null, filtered)
  })
}

function collect (stream, cb) {
  var res = []
  stream.on('data', res.push.bind(res))
  stream.once('error', cb)
  stream.once('end', cb.bind(null, null, res))
}

Graph.prototype.put = function (triples, callback) {
  if (!triples) return callback(new Error('Must pass triple'))
  let entries = (!triples.reduce) ? [triples] : triples
  entries = entries.reduce((prev, triple) => {
    return prev.concat(this.generateBatch(triple, 'put'))
  }, [])
  this.db.batch(entries, callback)
}

Graph.prototype.search = function (query, callback) {
  callback(new Error('not implemented'))
}

Graph.prototype.generateBatch = utils.generateBatch

Graph.prototype.close = function (callback) {
  callback()
}

module.exports = Graph
