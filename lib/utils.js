const Variable = require('./Variable')
const prefixes = require('./prefixes')
const constants = require('./constants')

const spo = constants.HEXSTORE_INDEXES.spo
const tripleAliasMap = {
  s: 'subject',
  p: 'predicate',
  o: 'object'
}

function isNewDatabase (db) {
  return !(db.feeds.length > 1 || db.feeds[0].length > 0)
}

function put (db, data, callback) {
  var i = 0

  next()

  function next (err) {
    if (err) return callback(err)
    var v = data[i++]
    db.put(v[0], v[1], (i < data.length) ? next : callback)
  }
}

function collect (stream, cb) {
  var res = []
  stream.on('data', res.push.bind(res))
  stream.once('error', cb)
  stream.once('end', cb.bind(null, null, res))
}

function filterTriple (triple) {
  const filtered = {}
  spo.forEach((key) => {
    if (triple.hasOwnProperty(key)) {
      filtered[key] = triple[key]
    }
  })
  return filtered
}

function escapeKeyValue (value, prefixMap) {
  if (typeof value === 'string' || value instanceof String) {
    return prefixes.toPrefixed(value, prefixMap).replace(/(\/)/g, '%2F')
  }
  return value
}

function unescapeKeyValue (value, prefixMap) {
  return prefixes.fromPrefixed(value.replace(/%2F/g, '/'), prefixMap)
}

function encodeTriple (triple, prefixMap) {
  spo.forEach((key) => {
    if (triple.hasOwnProperty(key)) {
      triple[key] = escapeKeyValue(triple[key], prefixMap)
    }
  })
  return triple
}

function encodeKey (key, triple) {
  var result = key
  var def = constants.HEXSTORE_INDEXES[key]
  var i = 0
  var value = triple[def[i]]
  // need to handle this smarter
  while (value) {
    result += '/' + value
    i += 1
    value = triple[def[i]]
  }
  if (i < 3) {
    result += '/'
  }
  return result
}

function decodeKey (key, prefixMap) {
  const values = key.split('/')
  if (values.length < 4) throw new Error('Key is not in triple form')
  const order = values[0]
  const triple = {}
  for (var i = 0; i < 3; i++) {
    const k = tripleAliasMap[order[i]]
    triple[k] = unescapeKeyValue(values[i + 1], prefixMap)
  }
  return triple
}

function typesFromPattern (pattern) {
  return Object.keys(pattern).filter((key) => {
    switch (key) {
      case 'subject':
        return !!pattern.subject
      case 'predicate':
        return !!pattern.predicate
      case 'object':
        return !!pattern.object
      default:
        return false
    }
  })
}

function hasKey (key) {
  return spo.indexOf(key) >= 0
}

function keyIsNotAObject (tripleKey) {
  return typeof tripleKey !== 'object'
}

function not (fn) {
  return (...args) => !fn(...args)
}

function keyIsAVariable (tripleKey) {
  return tripleKey instanceof Variable
}

function extraDataMask (obj) {
  return Object.keys(obj)
    .filter(not(keyIsAVariable))
    .reduce((prev, key) => {
      prev[key] = obj[key]
      return prev
    }, {})
}

function objectMask (criteria, obj) {
  return Object.keys(obj)
    .filter(hasKey)
    .filter(key => criteria(obj[key]))
    .reduce((prev, key) => {
      prev[key] = obj[key]
      return prev
    }, {})
};

function variableNames (obj) {
  return Object.keys(obj)
    .filter(key => hasKey(key) && keyIsAVariable(obj[key]))
    .map(key => obj[key].name)
};

function queryMask (object) {
  return objectMask(keyIsNotAObject, object)
};

function variablesMask (object) {
  return objectMask(keyIsAVariable, object)
};

function maskUpdater (pattern) {
  const variables = variablesMask(pattern)
  return (solution, mask) => {
    const maskCopy = Object.assign({}, mask)
    return Object.keys(variables)
      .reduce((newMask, key) => {
        const variable = variables[key]
        if (variable.isBound(solution)) {
          newMask[key] = solution[variable.name]
        }
        return newMask
      }, maskCopy)
  }
}

function matcher (pattern) {
  const variables = variablesMask(pattern)

  return (solution, triple) => {
    return Object.keys(variables).reduce((newSolution, key) => {
      if (newSolution) {
        return variables[key].bind(newSolution, triple[key])
      }
      return newSolution
    }, solution)
  }
}

function materializer (pattern, data) {
  return Object.keys(pattern).reduce((result, key) => {
    if (pattern[key] instanceof Variable) {
      result[key] = data[pattern[key].name]
    } else {
      result[key] = pattern[key]
    }
    return result
  }, {})
}

module.exports = {
  isNewDatabase,
  put,
  escapeKeyValue,
  unescapeKeyValue,
  encodeTriple,
  encodeKey,
  decodeKey,
  typesFromPattern,
  filterTriple,
  collect,
  extraDataMask,
  queryMask,
  variablesMask,
  variableNames,
  maskUpdater,
  matcher,
  materializer
}
