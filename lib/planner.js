
const utils = require('./utils')

function planner (query, prefixMap) {
  if (query.length === 1) return [utils.encodeTriple(query[0], prefixMap)]
  // first group queries based on number of variables.
  const solved = new Set()
  var grouped = query.reduce((ordered, q) => {
    const variables = utils.variableNames(q)
    if (ordered[variables.length]) {
      ordered[variables.length].push({
        query: q,
        names: variables
      })
    } else {
      ordered[variables.length] = [{
        query: q,
        names: variables
      }]
    }
    if (variables.length === 1) {
      solved.add(variables[0])
    }
    return ordered
  }, [])
  // then order vars > 1 by if they occur in
  const orderedQueries = grouped[1] ? grouped[1].map(v => utils.encodeTriple(v.query, prefixMap)) : []

  for (let i = 2; i < grouped.length; i++) {
    if (grouped[i] === undefined) continue
    while (grouped[i].length > 0) {
      // get the next easiest to solve
      // or the one that makes the rest easiest to solve
      grouped[i].sort((a, b) => {
        // number of unsolved variables
        let unsolvedA = a.names.filter(name => !solved.has(name))
        let unsolvedB = b.names.filter(name => !solved.has(name))
        if (unsolvedA.length < unsolvedB.length) return -1
        if (unsolvedA.length > unsolvedB.length) return 1
        // calculate how many unsolved vars it has in common with others in the group
        // should this be a vector? many vars is better than solving 1 lots.
        let sharedUnsolvedA = 0
        let sharedUnsolvedB = 0
        grouped[i].forEach(v => {
          v.names.forEach((name) => {
            if (solved.has(name)) return
            if (v !== a && a.names.includes(name)) sharedUnsolvedA++
            if (v !== b && b.names.includes(name)) sharedUnsolvedB++
          })
        })
        if (sharedUnsolvedA > sharedUnsolvedB) return -1
        if (sharedUnsolvedA < sharedUnsolvedB) return 1
        return 0
      })
      const next = grouped[i].shift()
      orderedQueries.push(utils.encodeTriple(next.query, prefixMap))
      next.names.forEach(n => solved.add(n))
    }
  }
  return orderedQueries
};

module.exports = planner
