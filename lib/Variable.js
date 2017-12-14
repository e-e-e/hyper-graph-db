function Variable (name) {
  if (!(this instanceof Variable)) return new Variable(name)
  this.name = name
}

Variable.prototype.bind = function (solution, value) {
  if (!this.isBindable(solution, value)) return null
  var newsolution = Object.assign({}, solution)
  newsolution[this.name] = value
  return newsolution
}

Variable.prototype.isBound = function (solution) {
  return solution[this.name] !== undefined
}

Variable.prototype.isBindable = function (solution, value) {
  return !solution[this.name] || solution[this.name] === value
}

module.exports = Variable
