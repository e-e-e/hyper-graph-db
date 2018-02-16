const hyperdb = require('hyperdb')
const stream = require('readable-stream')
const pump = require('pump')
const inherits = require('inherits')
const events = require('events')
const SparqlIterator = require('sparql-iterator')

const constants = require('./lib/constants')
const utils = require('./lib/utils')
const prefixes = require('./lib/prefixes')
const Variable = require('./lib/Variable')
const HyperdbReadTransform = require('./lib/HyperdbReadTransform')
const JoinStream = require('./lib/JoinStream')
const planner = require('./lib/planner')
const pkg = require('./package.json')
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

  if (typeof key === 'string') key = Buffer.from(key, 'hex')

  if (!Buffer.isBuffer(key) && !opts) {
    opts = key
    key = null
  }

  if (!opts) opts = {}
  this.db = hyperdb(storage, key, opts)
  this._prefixes = Object.assign({}, opts.prefixes || constants.DEFAULT_PREFIXES)
  this._prefixes._ = opts.base || constants.DEFAULT_BASE
  this._indexes = opts.index === 'tri'
    ? constants.HEXSTORE_INDEXES_REDUCED
    : constants.HEXSTORE_INDEXES
  this._indexKeys = Object.keys(this._indexes)

  this.db.on('error', (e) => {
    this.emit('error', e)
  })
  this.db.on('ready', (e) => {
    if (utils.isNewDatabase(this.db)) {
      this._onNew((err) => {
        if (err) return this.emit('error', err)
        this.emit('ready', e)
      })
    } else {
      this.emit('ready', e)
    }
  })
}

inherits(Graph, events.EventEmitter)

Graph.prototype._onNew = function (cb) {
  const metadata = [
    ['@version', pkg.version],
    ['@index', Object.keys(this._indexes).length === 3 ? 'tri' : 'hex'],
    ['@name', this._prefixes._]
  ]
  Object.keys(this._prefixes).forEach((key) => {
    if (key !== '_') {
      metadata.push([prefixes.toKey(key), this._prefixes[key]])
    }
  })
  utils.put(this.db, metadata, cb)
}

Graph.prototype.v = (name) => new Variable(name)

Graph.prototype.listPrefixes = function (callback) {
  // should cache this somehow
  const prefixStream = this.db.createReadStream(constants.PREFIX_KEY)
  utils.collect(prefixStream, (err, data) => {
    if (err) return callback(err)
    var names = data.reduce((p, nodes) => {
      var data = prefixes.fromNodes(nodes)
      p[data.prefix] = data.uri
      return p
    }, {})
    callback(null, names)
  })
}

Graph.prototype.addPrefix = function (prefix, uri, cb) {
  this.db.put(prefixes.toKey(prefix), uri, cb)
}

Graph.prototype.getStream = function (triple, opts) {
  const stream = this.db.createReadStream(this._createQuery(triple))
  return stream.pipe(new HyperdbReadTransform(this.db, this._prefixes, opts))
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
      return prev.concat(this._generateBatch(triple, action))
    }, [])
    this.db.batch(entries.reverse(), callback)
  }
}

function doActionStream (action) {
  return function () {
    const self = this
    const transform = new Transform({
      objectMode: true,
      transform (triples, encoding, done) {
        if (!triples) return done()
        let entries = (!triples.reduce) ? [triples] : triples
        entries = entries.reduce((prev, triple) => {
          return prev.concat(self._generateBatch(triple, action))
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

Graph.prototype.queryStream = function (query) {
  return new SparqlIterator(query, { hypergraph: this })
}

Graph.prototype.query = function (query, callback) {
  utils.collect(this.queryStream(query), callback)
}

Graph.prototype.close = function (callback) {
  callback()
}

/* PRIVATE FUNCTIONS */

Graph.prototype._generateBatch = function (triple, action) {
  if (!action) action = 'put'
  var data = null
  if (action === 'put') {
    data = JSON.stringify(utils.extraDataMask(triple))
  }
  return this._encodeKeys(triple).map(key => ({
    type: 'put', // no delete in hyperdb so just putting nulls
    key: key,
    value: data
  }))
}

Graph.prototype._encodeKeys = function (triple) {
  const encodedTriple = utils.encodeTriple(triple, this._prefixes)
  return this._indexKeys.map(key => utils.encodeKey(key, encodedTriple))
}

Graph.prototype._createQuery = function (pattern, options) {
  var types = utils.typesFromPattern(pattern)
  var preferedIndex = options && options.index
  var index = this._findIndex(types, preferedIndex)
  const encodedTriple = utils.encodeTriple(pattern, this._prefixes)
  var key = utils.encodeKey(index, encodedTriple)
  return key
}

Graph.prototype._possibleIndexes = function (types) {
  var result = this._indexKeys.filter((key) => {
    var matches = 0
    return this._indexes[key].every(function (e, i) {
      if (types.indexOf(e) >= 0) {
        matches++
        return true
      }
      if (matches === types.length) {
        return true
      }
    })
  })
  result.sort()
  return result
}

Graph.prototype._findIndex = function (types, preferedIndex) {
  var result = this._possibleIndexes(types)
  if (preferedIndex && result.some(r => r === preferedIndex)) {
    return preferedIndex
  }
  return result[0]
}

module.exports = Graph
