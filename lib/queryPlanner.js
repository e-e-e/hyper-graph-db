
const utils = require('./utils')
const JoinStream = require('./JoinStream')
const SortJoinStream = require('./SortJoinStream')

function orderedPossibleIndex (keys) {
  return utils.defKeys
    .filter(index => keys.every((key, pos) => utils.defs[index][pos] === key))
}

function planner (query) {
  // dupes!
  const result = query.map((q) => {
    q.size = Object.keys(utils.variablesMask(q)).length
    return q
  })

  result.sort((a, b) => {
    if (a.size < b.size) return -1
    if (a.size > b.size) return 1
    return 0
  })

  result.forEach((q) => {
    delete q.size
  })

  if (result.length > 1) {
    result.reduce(doSortQueryPlan)
  }

  result.forEach((q) => {
    if (!q.stream) {
      q.stream = JoinStream
    }
  })
  return result
};

function doSortQueryPlan (first, second) {
  if (first === null || first.stream === JoinStream) {
    return null
  }

  var firstQueryMask = utils.queryMask(first)
  var secondQueryMask = utils.queryMask(second)
  var firstVariablesMask = utils.variablesMask(first)
  var secondVariablesMask = utils.variablesMask(second)

  var firstVariables = Object.keys(firstVariablesMask)
    .map(key => firstVariablesMask[key])

  var secondVariables = Object.keys(secondVariablesMask)
    .map(key => secondVariablesMask[key])

  var variableKey = function (obj, variable) {
    return Object.keys(obj).filter(key => obj[key].name === variable.name)[0]
  }

  var commonVariables = firstVariables
    .filter(firstVar => secondVariables.some(secondVar => firstVar.name === secondVar.name))

  if (commonVariables.length === 0) {
    console.log('NO COMMON VARS');
    return null
  }

  var firstIndexArray = Object.keys(firstQueryMask)
  var secondIndexArray = Object.keys(secondQueryMask)

  var commonValueKeys = firstIndexArray.filter(key => secondIndexArray.indexOf(key) >= 0)

  first.stream = first.stream ? first.stream : JoinStream

  firstIndexArray = firstIndexArray.filter(key => commonValueKeys.indexOf(key) < 0)
  secondIndexArray = secondIndexArray.filter(key => commonValueKeys.indexOf(key) < 0)

  commonValueKeys.forEach((key) => {
    firstIndexArray.unshift(key)
    secondIndexArray.unshift(key)
  })

  commonVariables.sort((a, b) => {
    if (a.name < b.name) return -1
    else if (a.name > b.name) return 1
    return 0
  })

  commonVariables.forEach((commonVar) => {
    firstIndexArray.push(variableKey(firstVariablesMask, commonVar))
    secondIndexArray.push(variableKey(secondVariablesMask, commonVar))
  })

  var firstIndexes = orderedPossibleIndex(firstIndexArray)
  var secondIndexes = orderedPossibleIndex(secondIndexArray)
  first.index = first.index || firstIndexes[0]
  second.index = secondIndexes[0]
  second.stream = SortJoinStream
  return second
};


module.exports = planner
