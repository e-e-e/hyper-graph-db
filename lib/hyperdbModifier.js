var hash = require('hyperdb/lib/hash')
var Readable = require('readable-stream').Readable
var LRU = require('lru')

module.exports = { attachCreateReadStream }

function attachCreateReadStream (DB) {
  DB.prototype.createReadStream = createReadStream
}

function createReadStream (key, opts) {
  if (!opts) opts = {}
  var self = this
  var path = hash(key, true)
  var cacheMax = opts.cacheSize || 128
  var keyCache = new LRU(cacheMax)
  var streamQueue
  var queueNeedsSorting = true
  var stream = new Readable({ objectMode: true })
  stream._read = read

  return stream

  function read () {
    if (stream.destroyed) return
    // if no heads - get heads and process first tries
    if (!streamQueue) {
      self.heads(function (err, heads) {
        if (err) stream.emit('error', err)
        if (!heads.length) {
          stream.push(null)
          return
        }
        streamQueue = heads.map(h => ({ node: h, index: 0 }))
        next()
      })
      return
    }
    next()
  }

  function next () {
    if (!streamQueue.length) {
      stream.push(null)
      return
    }
    // sort stream queue first to ensure that you always get the latest node
    // this requires offsetting feeds sequences based on when it started in relation to others
    if (queueNeedsSorting) streamQueue.sort(sortQueueByClockAndSeq)
    var data = streamQueue.pop()
    var node = data.node
    readNext(node, data.index, (err, match) => {
      if (err) {
        return stream.emit('error', err)
      }
      if (!match) return next()
      // check if really a match and not encountered before
      check(node, (matchingNode) => {
        if (!matchingNode) next()
        else {
          keyCache.set(node.key, true)
          stream.push(matchingNode)
        }
      })
    })
  }

  function sortQueueByClockAndSeq (a, b) {
    a = a.node
    b = b.node
    var sortValue = sortNodesByClock(a, b)
    if (sortValue !== 0) return sortValue
    // same time, so use sequence to order
    if (a.feed === b.feed) return a.seq - b.seq
    var bOffset = b.clock.reduce((p, v) => p + v, b.seq)
    var aOffset = a.clock.reduce((p, v) => p + v, a.seq)
    // if real sequence is the same then return sort on feed
    if (bOffset === aOffset) return b.feed - a.feed
    return aOffset - bOffset
  }

  function check (node, cb) {
    // is it actually a match and not a collision
    if (!(node && node.key && node.key.indexOf(key) === 0)) return cb()
    // have we encountered this node before
    if (keyCache.get(node.key)) return cb()
    // it is not in the cache but might still be a duplicate if cache is full
    // if (keyCache.length === cacheMax) {
    // so check if this is the first instance of the node
    // TODO: Atm this is a bit of a hack to get conflicting values
    // ideally this should not need to retraverse the trie.
    // Potential issue here when db is updated after stream was created!
    return self._get(node.key, false, [], noop, (err, latest) => {
      if (err) return stream.emit('error', err)
      if (sortNodesByClock(node, Array.isArray(latest) ? latest[0] : latest) >= 0) {
        cb(latest)
      } else {
        cb()
      }
    })
  }

  function readNext (node, i, cb) {
    var writers = self._writers
    var trie
    var missing = 0
    var error
    var vals
    for (; i < path.length - 1; i++) {
      if (node.path[i] === path[i]) continue
      // check trie
      trie = node.trie[i]
      if (!trie) {
        return cb(null)
      }
      vals = trie[path[i]]
      // not found
      if (!vals || !vals.length) {
        return cb(null)
      }

      missing = vals.length
      error = null
      for (var j = 0; j < vals.length; j++) {
        // fetch potential
        writers[vals[j].feed].get(vals[j].seq, (err, val) => {
          if (err) {
            error = err
          } else {
            pushToQueue({ node: val, index: i })
          }
          missing--
          if (!missing) {
            cb(error)
          }
        })
      }
      return
    }

    // Traverse the rest of the node's trie, recursively,
    // hunting for more nodes with the desired prefix.
    for (; i < node.trie.length; i++) {
      trie = node.trie[i] || []
      for (j = 0; j < trie.length; j++) {
        var entrySet = trie[j] || []
        for (var el = 0; el < entrySet.length; el++) {
          var entry = entrySet[el]
          missing++
          writers[entry.feed].get(entry.seq, (err, val) => {
            if (err) {
              error = err
            } else if (val.key && val.value) {
              pushToQueue({ node: val, index: i + 1 })
            }
            missing--
            if (!missing) {
              if (i < node.trie.length) {
                pushToQueue({ node: node, index: i + 1 })
                cb(error, false)
              } else {
                cb(error, true)
              }
            }
          })
        }
      }
      if (missing > 0) return
    }
    return cb(null, true)
  }

  function pushToQueue (item) {
    queueNeedsSorting = streamQueue.length > 0 && (sortQueueByClockAndSeq(item, streamQueue[streamQueue.length - 1]) < 0)
    streamQueue.push(item)
  }
}

function sortNodesByClock (a, b) {
  var isGreater = false
  var isLess = false
  var length = a.clock.length
  if (b.clock.length > length) length = b.clock.length
  for (var i = 0; i < length; i++) {
    var diff = (a.clock[i] || 0) - (b.clock[i] || 0)
    if (diff > 0) isGreater = true
    if (diff < 0) isLess = true
  }
  if (isGreater && isLess) return 0
  if (isLess) return -1
  if (isGreater) return 1
  return 0
}

function noop () {}
