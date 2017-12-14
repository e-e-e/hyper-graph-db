/* eslint-env mocha */
const expect = require('chai').expect
var Variable = require('../lib/Variable')

describe('Variable', () => {
  it('should have a name', () => {
    var v = new Variable('x')
    expect(v).to.have.property('name', 'x')
  })

  it('should have a name (bis)', () => {
    var v = new Variable('y')
    expect(v).to.have.property('name', 'y')
  })

  describe('#isBound', () => {
    var instance

    beforeEach(() => {
      instance = new Variable('x')
    })

    it('should return true if there is a key in the solution', () => {
      expect(instance.isBound({ x: 'hello' })).to.equal(true)
    })

    it('should return false if there is no key in the solution', () => {
      expect(instance.isBound({})).to.equal(false)
    })

    it('should return false if there is another key in the solution', () => {
      expect(instance.isBound({ hello: 'world' })).to.equal(false)
    })
  })

  describe('#bind', () => {
    var instance

    beforeEach(() => {
      instance = new Variable('x')
    })

    it('should return a different object', () => {
      var solution = {}
      expect(instance.bind(solution, 'hello')).to.not.be.equal(solution)
    })

    it('should set an element in the solution', () => {
      var solution = {}
      expect(instance.bind(solution, 'hello')).to.be.deep.equal({ x: 'hello' })
    })

    it('should copy values', () => {
      var solution = { y: 'world' }
      expect(instance.bind(solution, 'hello')).to.be.deep.equal({ x: 'hello', y: 'world' })
    })
  })

  describe('#isBindable', () => {
    var instance

    beforeEach(() => {
      instance = new Variable('x')
    })

    it('should bind to the same value', () => {
      expect(instance.isBindable({ x: 'hello' }, 'hello')).to.equal(true)
    })

    it('should not bind to a different value', () => {
      expect(instance.isBindable({ x: 'hello' }, 'hello2')).to.equal(false)
    })

    it('should bind if the key is not present', () => {
      expect(instance.isBindable({}, 'hello')).to.equal(true)
    })
  })
})
