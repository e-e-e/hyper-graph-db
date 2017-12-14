const PassThrough = require('readable-stream').PassThrough
const pump = require('pump')

const utils = require('./lib/utils')
const Variable = require('./lib/Variable')
const HyperdbDiffTransform = require('./lib/HyperdbDiffTransform')
const planner = require('./lib/queryPlanner')

function Graph (db, opts) {
  if (!(this instanceof Graph)) return new Graph(db, opts)
  this.db = db
}

Graph.prototype.v = (name) => new Variable(name)

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

Graph.prototype.searchStream = function (query, options) {
  const result = new PassThrough({ objectMode: true })
  const defaults = { solution: {} }
  if (!query || query.length === 0) {
    result.end()
    return result
  } else if (!Array.isArray(query)) {
    query = [ query ]
  }
  const plannedQuery = planner(query)

  var streams = plannedQuery.map((triple) => {
    const stream = triple.stream
    return stream({ triple: utils.filterTriple(triple), db: this, index: triple.index })
  })

  streams[0].start = true
  streams[0].end(defaults.solution)

  streams.push(result)
  pump(streams)
  return result
}

Graph.prototype.search = function (query, callback) {
  utils.collect(this.searchStream(query), callback)
}

Graph.prototype.generateBatch = utils.generateBatch

Graph.prototype.close = function (callback) {
  callback()
}

module.exports = Graph
