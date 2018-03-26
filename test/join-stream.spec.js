/* eslint-env mocha */

const expect = require('chai').expect
const ram = require('random-access-memory')
const hypergraph = require('../index')
const fixture = require('./fixture/foaf')

function ramStore (filename) {
   // filename will be one of: data, bitfield, tree, signatures, key, secret_key
   // the data file will contain all your data concattenated.
   // just store all files in ram by returning a random-access-memory instance
  return ram()
}

describe('JoinStream', () => {
  let db
  beforeEach((done) => {
    db = hypergraph(ramStore)
    db.put(fixture, done)
  })

  afterEach((done) => {
    db.close(done)
  })

  it('should do a join with one results', (done) => {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'daniele'
    }], (err, results) => {
      expect(results).to.have.property('length', 1)
      expect(results[0]).to.have.property('x', 'matteo')
      done(err)
    })
  })

  it('should support non-array search parameter', (done) => {
    db.search({
      subject: db.v('x'),
      predicate: 'friend',
      object: 'daniele'
    }, (err, results) => {
      expect(results).to.have.property('length', 1)
      expect(results[0]).to.have.property('x', 'matteo')
      done(err)
    })
  })

  it('should do a join with two results', (done) => {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'marco'
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }], (err, results) => {
      expect(results).to.have.property('length', 2)
      expect(results[0]).to.have.property('x', 'daniele')
      expect(results[1]).to.have.property('x', 'lucio')
      done(err)
    })
  })

  it('should do a join with three conditions', (done) => {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: db.v('y')
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }, {
      subject: 'lucio',
      predicate: 'friend',
      object: db.v('y')
    }], (err, results) => {
      expect(results).to.have.property('length', 4)
      done(err)
    })
  })

  it('should return the two solutions through the searchStream interface', (done) => {
    var solutions = [{ x: 'daniele' }, { x: 'lucio' }]
    var stream = db.searchStream([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'marco'
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }])

    stream.on('data', (data) => {
      expect(data).to.eql(solutions.shift())
    })

    stream.on('end', done)
  })

  it('should allow to find mutual friends', (done) => {
    var solutions = [{ x: 'daniele', y: 'matteo' }, { x: 'matteo', y: 'daniele' }]
    var stream = db.searchStream([{
      subject: db.v('x'),
      predicate: 'friend',
      object: db.v('y')
    }, {
      subject: db.v('y'),
      predicate: 'friend',
      object: db.v('x')
    }])

    stream.on('data', (data) => {
      var solutionIndex = -1

      solutions.forEach((solution, i) => {
        var found = Object.keys(solutions).every((v) => {
          return solution[v] === data[v]
        })
        if (found) {
          solutionIndex = i
        }
      })

      if (solutionIndex !== -1) {
        solutions.splice(solutionIndex, 1)
      }
    })

    stream.on('end', () => {
      expect(solutions).to.have.property('length', 0)
      done()
    })
  })

  it('should allow to intersect common friends', (done) => {
    var solutions = [{ x: 'matteo' }, { x: 'marco' }]
    var stream = db.searchStream([{
      subject: 'lucio',
      predicate: 'friend',
      object: db.v('x')
    }, {
      subject: 'daniele',
      predicate: 'friend',
      object: db.v('x')
    }])

    stream.on('data', (data) => {
      expect(data).to.eql(solutions.shift())
    })

    stream.on('end', () => {
      expect(solutions).to.have.property('length', 0)
      done()
    })
  })

  it('should support the friend of a friend scenario', (done) => {
    var solutions = [{ x: 'daniele', y: 'marco' }]
    var stream = db.searchStream([{
      subject: 'matteo',
      predicate: 'friend',
      object: db.v('x')
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: db.v('y')
    }, {
      subject: db.v('y'),
      predicate: 'friend',
      object: 'davide'
    }])

    stream.on('data', (data) => {
      expect(data).to.eql(solutions.shift())
    })

    stream.on('end', () => {
      expect(solutions).to.have.property('length', 0)
      done()
    })
  })

  xit('should return triples from a join aka materialized API', (done) => {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'marco'
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }], {
      materialized: {
        subject: db.v('x'),
        predicate: 'newpredicate',
        object: 'abcde'
      }
    }, (err, results) => {
      expect(results).to.eql([{
        subject: 'daniele',
        predicate: 'newpredicate',
        object: 'abcde'
      }, {
        subject: 'lucio',
        predicate: 'newpredicate',
        object: 'abcde'
      }])
      done(err)
    })
  })

  it('should support a friend-of-a-friend-of-a-friend scenario', (done) => {
    var solutions = [
      { x: 'daniele', y: 'matteo', z: 'daniele' },
      { x: 'daniele', y: 'marco', z: 'davide' }
    ]

    var stream = db.searchStream([{
      subject: 'matteo',
      predicate: 'friend',
      object: db.v('x')
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: db.v('y')
    }, {
      subject: db.v('y'),
      predicate: 'friend',
      object: db.v('z')
    }])
    stream.on('data', (data) => {
      expect(data).to.eql(solutions.shift())
    })

    stream.on('end', () => {
      expect(solutions).to.have.property('length', 0)
      done()
    })
  })

  xit('should emit triples from the stream interface aka materialized API', (done) => {
    var triples = [{
      subject: 'daniele',
      predicate: 'newpredicate',
      object: 'abcde'
    }]
    var stream = db.searchStream([{
      subject: 'matteo',
      predicate: 'friend',
      object: db.v('x')
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: db.v('y')
    }, {
      subject: db.v('y'),
      predicate: 'friend',
      object: 'davide'
    }], {
      materialized: {
        subject: db.v('x'),
        predicate: 'newpredicate',
        object: 'abcde'
      }
    })

    stream.on('data', (data) => {
      expect(data).to.eql(triples.shift())
    })

    stream.on('end', () => {
      expect(triples).to.have.property('length', 0)
      done()
    })
  })

  it('should support filtering inside a condition', (done) => {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'daniele',
      filter: triple => triple.subject !== 'matteo'
    }], (err, results) => {
      expect(results).to.have.length(0)
      done(err)
    })
  })

  it('should support filtering inside a second-level condition', (done) => {
    db.search([{
      subject: 'matteo',
      predicate: 'friend',
      object: db.v('y')
    }, {
      subject: db.v('y'),
      predicate: 'friend',
      object: db.v('x'),
      filter: (triple) => triple.object !== 'matteo'
    }], (err, results) => {
      expect(results).to.eql([{
        'y': 'daniele',
        'x': 'marco'
      }])
      done(err)
    })
  })

  xit('should support solution filtering', (done) => {
    db.search([{
      subject: 'matteo',
      predicate: 'friend',
      object: db.v('y')
    }, {
      subject: db.v('y'),
      predicate: 'friend',
      object: db.v('x')
    }], {
      filter: (context, callback) => {
        if (context.x !== 'matteo') {
          callback(null, context)
        } else {
          callback(null)
        }
      }
    }, (err, results) => {
      expect(results).to.eql([{
        'y': 'daniele',
        'x': 'marco'
      }])
      done(err)
    })
  })

  xit('should support solution filtering w/ 2 args', (done) => {
    // Who's a friend of matteo and aged 25.
    db.search([{
      subject: db.v('s'),
      predicate: 'age',
      object: db.v('age')
    }, {
      subject: db.v('s'),
      predicate: 'friend',
      object: 'matteo'
    }], {
      filter: (context, callback) => {
        if (context.age === 25) {
          callback(null, context) // confirm
        } else {
          callback(null) // refute
        }
      }
    }, (err, results) => {
      expect(results).to.eql([{
        'age': 25,
        's': 'daniele'
      }])
      done(err)
    })
  })

  it('should return only one solution with limit 1', (done) => {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'marco'
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }], { limit: 1 }, (err, results) => {
      expect(results).to.have.property('length', 1)
      expect(results[0]).to.have.property('x', 'daniele')
      done(err)
    })
  })

  it('should return only one solution with limit 1 (bis)', (done) => {
    db.search([{
      subject: 'lucio',
      predicate: 'friend',
      object: db.v('x')
    }, {
      subject: 'daniele',
      predicate: 'friend',
      object: db.v('x')
    }], { limit: 1 }, (err, results) => {
      expect(results).to.have.property('length', 1)
      expect(results[0]).to.have.property('x', 'matteo')
      done(err)
    })
  })

  xit('should return skip the first solution with offset 1', (done) => {
    db.search([{
      subject: db.v('x'),
      predicate: 'friend',
      object: 'marco'
    }, {
      subject: db.v('x'),
      predicate: 'friend',
      object: 'matteo'
    }], { offset: 1 }, (err, results) => {
      expect(results).to.have.property('length', 1)
      expect(results[0]).to.have.property('x', 'lucio')
      done(err)
    })
  })

  it('should find homes in paris', (done) => {
    var paris = 'http://dbpedia.org/resource/Paris'
    var parisians = [
      {
        webid: 'https://my-profile.eu/people/deiu/card#me',
        name: '"Andrei Vlad Sambra"'
      }, {
        webid: 'http://bblfish.net/people/henry/card#me',
        name: '"Henry Story"'
      }
    ]

    db.put(require('./fixture/homes_in_paris'), () => {
      db.search([{
        subject: 'http://manu.sporny.org#person',
        predicate: 'http://xmlns.com/foaf/0.1/knows',
        object: db.v('webid')
      }, {
        subject: db.v('webid'),
        predicate: 'http://xmlns.com/foaf/0.1/based_near',
        object: paris
      }, {
        subject: db.v('webid'),
        predicate: 'http://xmlns.com/foaf/0.1/name',
        object: db.v('name')
      }
      ], (err, solution) => {
        expect(solution).to.eql(parisians)
        done(err)
      })
    })
  })
})
