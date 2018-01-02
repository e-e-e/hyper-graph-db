const PassThrough = require('readable-stream').PassThrough
const Transform = require('readable-stream').Transform
const pump = require('pump')

const utils = require('./lib/utils')
const Variable = require('./lib/Variable')
const HyperdbDiffTransform = require('./lib/HyperdbDiffTransform')
const JoinStream = require('./lib/JoinStream')
const planner = require('./lib/planner')

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

function doActionStream (action) {
  return function () {
    const transform = new Transform({
      objectMode: true,
      transform (triples, encoding, done) {
        if (!triples) return done()
        let entries = (!triples.reduce) ? [triples] : triples
        entries = entries.reduce((prev, triple) => {
          return prev.concat(utils.generateBatch(triple, action))
        }, [])
        this.push(entries.reverse())
        done()
      }
    })
    const writeStream = this.db.createWriteStream()
    transform.pipe(writeStream)
    return transform
  }
}

// this is not implemented in hyperdb yet
// for now we just put a null value in the db

Graph.prototype.put = doAction('put')
Graph.prototype.putStream = doActionStream('put')

Graph.prototype.del = doAction('del')
Graph.prototype.delStream = doActionStream('del')

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
    return new JoinStream({ triple, db: this })
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
