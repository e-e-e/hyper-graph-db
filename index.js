const hyperdb = require('hyperdb')
const stream = require('readable-stream')
const pump = require('pump')
const inherits = require('inherits')
const events = require('events')

const utils = require('./lib/utils')
const Variable = require('./lib/Variable')
const HyperdbReadTransform = require('./lib/HyperdbReadTransform')
const JoinStream = require('./lib/JoinStream')
const planner = require('./lib/planner')
const attachCreateReadStream = require('./lib/hyperdbModifier').attachCreateReadStream

const Transform = stream.Transform
const PassThrough = stream.PassThrough

// temporarily augment hyperdb prototype to include createReadStream
if (!hyperdb.createReadStream) {
  attachCreateReadStream(hyperdb)
}

function Graph (storage, key, opts) {
  if (!(this instanceof Graph)) return new Graph(storage, key, opts)
  events.EventEmitter.call(this)
  this.db = hyperdb(storage, key, opts)

  this.db.on('error', (e) => {
    this.emit('error', e)
  })
  this.db.on('ready', (e) => {
    this.emit('ready', e)
  })
}

inherits(Graph, events.EventEmitter)

Graph.prototype.v = (name) => new Variable(name)

Graph.prototype.getStream = function (triple, opts) {
  const stream = this.db.createReadStream(utils.createQuery(triple))
  return stream.pipe(new HyperdbReadTransform(this.db, opts))
}

Graph.prototype.get = function (triple, opts, callback) {
  if (typeof opts === 'function') return this.get(triple, undefined, opts)
  utils.collect(this.getStream(triple, opts), callback)
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

Graph.prototype.put = doAction('put')
Graph.prototype.putStream = doActionStream('put')

// this is not implemented in hyperdb yet
// for now we just put a null value in the db
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

  var streams = plannedQuery.map((triple, i) => {
    const limit = (options && i === plannedQuery.length - 1) ? options.limit : undefined
    return new JoinStream({
      triple: utils.filterTriple(triple),
      filter: triple.filter,
      db: this,
      limit
    })
  })

  streams[0].start = true
  streams[0].end(defaults.solution)

  streams.push(result)
  pump(streams)
  return result
}

Graph.prototype.search = function (query, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }
  utils.collect(this.searchStream(query, options), callback)
}

Graph.prototype.generateBatch = utils.generateBatch

Graph.prototype.close = function (callback) {
  callback()
}

module.exports = Graph
