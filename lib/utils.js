const Variable = require('./Variable')
const prefixes = require('./prefixes')

const defs = {
  spo: ['subject', 'predicate', 'object'],
  sop: ['subject', 'object', 'predicate'], // [optional]
  pos: ['predicate', 'object', 'subject'],
  pso: ['predicate', 'subject', 'object'], // [optional]
  ops: ['object', 'predicate', 'subject'], // [optional]
  osp: ['object', 'subject', 'predicate']
}
const tripleAliasMap = {
  s: 'subject',
  p: 'predicate',
  o: 'object'
}
const defKeys = Object.keys(defs)

function collect (stream, cb) {
  var res = []
  stream.on('data', res.push.bind(res))
  stream.once('error', cb)
  stream.once('end', cb.bind(null, null, res))
}

function filterTriple (triple) {
  const filtered = {}
  defs.spo.forEach((key) => {
    if (triple.hasOwnProperty(key)) {
      filtered[key] = triple[key]
    }
  })
  return filtered
}

function escapeKeyValue (value) {
  if (typeof value === 'string' || value instanceof String) {
    return prefixes.toPrefixed(value, prefixes.DEFAULT_PREFIXES).replace(/(\/)/g, '%2F')
  }
  return value
}

function unescapeKeyValue (value) {
  return prefixes.fromPrefixed(value.replace(/%2F/g, '/'), prefixes.DEFAULT_PREFIXES)
}

function decodeKey (key) {
  const values = key.split('/')
  if (values.length < 4) throw new Error('Key is not in triple form')
  const order = values[0]
  const triple = {}
  for (var i = 0; i < 3; i++) {
    const k = tripleAliasMap[order[i]]
    triple[k] = unescapeKeyValue(values[i + 1])
  }
  return triple
}

function encodeKey (key, triple) {
  var result = key
  var def = defs[key]
  var i = 0
  var value = triple[def[i]]
  // need to handle this smarter
  while (value) {
    result += '/' + escapeKeyValue(value)
    i += 1
    value = triple[def[i]]
  }
  if (i < 3) {
    result += '/'
  }
  return result
}

function encodeKeys (triple) {
  return defKeys.map(key => encodeKey(key, triple))
}

function generateBatch (triple, action) {
  if (!action) action = 'put'
  var data = null
  if (action === 'put') {
    data = JSON.stringify(extraDataMask(triple))
  }
  return encodeKeys(triple).map(key => ({
    type: 'put', // no delete in hyperdb so just putting nulls
    key: key,
    value: data
  }))
}

function possibleIndexes (types) {
  var result = defKeys.filter((key) => {
    var matches = 0
    return defs[key].every(function (e, i) {
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

function findIndex (types, preferedIndex) {
  var result = possibleIndexes(types)
  if (preferedIndex && result.some(r => r === preferedIndex)) {
    return preferedIndex
  }
  return result[0]
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

function createQuery (pattern, options) {
  var types = typesFromPattern(pattern)
  var preferedIndex = options && options.index
  var index = findIndex(types, preferedIndex)
  var key = encodeKey(index, pattern)
  return key
}

function hasKey (key) {
  return defs.spo.indexOf(key) >= 0
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
  defs,
  defKeys,
  encodeKey,
  decodeKey,
  filterTriple,
  collect,
  generateBatch,
  createQuery,
  extraDataMask,
  queryMask,
  variablesMask,
  variableNames,
  maskUpdater,
  matcher,
  materializer
}
