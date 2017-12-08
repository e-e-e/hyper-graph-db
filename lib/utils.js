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
  console.log(result)
  return result
}

function genKeys (triple) {
  return defKeys.map(key => genKey(key, triple))
}

function generateBatch (triple, action) {
  if (!action) {
    action = 'put'
  }
  var json = JSON.stringify(triple)
  return genKeys(triple).map(key => ({
    type: action,
    key: key,
    value: json
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
  console.log(key)
  var key = genKey(index, pattern)
  return key
}

module.exports = {
  collect,
  generateBatch,
  createQuery
}
