const utils = require('./lib/utils')
const HyperdbDiffTransform = require('./lib/HyperdbDiffTransform')
function Graph (db, opts) {
  if (!(this instanceof Graph)) return new Graph(db, opts)
  this.db = db
}

Graph.prototype.getStream = function (triple) {
  const stream = this.db.createDiffStream(utils.createQuery(triple))
  return stream.pipe(new HyperdbDiffTransform(this.db))
}

Graph.prototype.get = function (triple, callback) {
  utils.collect(this.getStream(triple), callback)
}

// this is not implemented in hyperdb yet
// for now we just put a null value in the db
Graph.prototype.del = doAction('del')

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

Graph.prototype.putStream = function (triple) {
}

Graph.prototype.search = function (query, callback) {
  callback(new Error('not implemented'))
}

Graph.prototype.generateBatch = utils.generateBatch

Graph.prototype.close = function (callback) {
  callback()
}

module.exports = Graph
