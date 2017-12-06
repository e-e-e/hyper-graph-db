const utils = require('./lib/utils')

function Graph (db, opts) {
  this.db = db
  if (!(this instanceof Graph)) return new Graph(db, opts)
}

Graph.prototype.get = function (triple, callback) {
  const stream = this.db.createDiffStream(utils.createQuery(triple))
  collect(stream, (err, results) => {
    if (err) return callback(err)
    // could do this filtering we collect the stream
    const deletions = results.reduce((p, v, i) => {
      if (v.type === 'del') p[v.key] = i // delete upto this index
      return p
    }, {})
    const filtered = results.reduce((p, v, i) => {
      if (v.type !== 'put') return p
      if (!deletions[v.key] || i > deletions[v.key]) {
        p.push(JSON.parse(v.value[0].toString()))
      }
      return p
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

function doAction (action) {
  return function (triples, callback) {
    if (!triples) return callback(new Error('Must pass triple'))
    let entries = (!triples.reduce) ? [triples] : triples
    entries = entries.reduce((prev, triple) => {
      return prev.concat(this.generateBatch(triple, action))
    }, [])
    this.db.batch(entries.reverse(), callback)
  }
}

Graph.prototype.put = doAction('put')
Graph.prototype.del = doAction('del')

Graph.prototype.search = function (query, callback) {
  callback(new Error('not implemented'))
}

Graph.prototype.generateBatch = utils.generateBatch

Graph.prototype.close = function (callback) {
  callback()
}

module.exports = Graph
