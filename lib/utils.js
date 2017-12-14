const Variable = require('./Variable')

const defs = {
  spo: ['subject', 'predicate', 'object'],
  sop: ['subject', 'object', 'predicate'],
  pos: ['predicate', 'object', 'subject'],
  pso: ['predicate', 'subject', 'object'],
  ops: ['object', 'predicate', 'subject'],
  osp: ['object', 'subject', 'predicate']
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

function escape (value) {
  if (typeof value === 'string' || value instanceof String) {
    return value.replace(/(\\|\/)/g, '\\$&')
  }
  return value
}

function genKey (key, triple) {
  var result = '/' + key
  var def = defs[key]
  var i = 0
  var value = triple[def[i]]
  // need to handle this smarter
  while (value) {
    result += '/' + escape(value)
    i += 1
    value = triple[def[i]]
  }
  if (i < 3) {
    result += '/'
  }
  return result
}

function genKeys (triple) {
  return defKeys.map(key => genKey(key, triple))
}

function generateBatch (triple, action) {
  if (!action) action = 'put'
  var data = (action === 'put')
    ? JSON.stringify(triple)
    : null
  return genKeys(triple).map(key => ({
    type: 'put', // no delete in hyperdb so just puting nulls
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
  var key = genKey(index, pattern)
  return key
}

function hasKey (key) {
  return defs.spo.indexOf(key) >= 0
}

function keyIsNotAObject (tripleKey) {
  return typeof tripleKey !== 'object'
}

function keyIsAVariable (tripleKey) {
  return tripleKey instanceof Variable
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
    return Object.keys(variables).reduce((newMask, key) => {
      const variable = variables[key]
      if (variable.isBound(solution)) {
        newMask[key] = solution[variable.name]
      }
      // fix this
      newMask.filter = pattern.filter
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
  genKey,
  filterTriple,
  collect,
  generateBatch,
  createQuery,
  queryMask,
  variablesMask,
  maskUpdater,
  matcher,
  materializer
}
