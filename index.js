function Graph (db, opts) {
  if (!(this instanceof Graph)) return new Graph(db, opts)
}

Graph.prototype.get = function (triples, callback) {
  callback(new Error('not implemented'))
}

Graph.prototype.put = function (triples, callback) {
  callback(new Error('not implemented'))
}

Graph.prototype.search = function (query, callback) {
  callback(new Error('not implemented'))
}

Graph.prototype.generateBatch = function (triple, type) {

}

Graph.prototype.close = function (callback) {
  callback(new Error('not implemented'))
}

module.exports = Graph
