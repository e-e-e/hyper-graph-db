/* eslint-env mocha */

const expect = require('chai').expect
const queryPlanner = require('../lib/queryPlanner')
const v = require('../lib/Variable')
const SortJoinStream = require('../lib/SortJoinStream')
const JoinStream = require('../lib/JoinStream')

describe('query planner', () => {
  var db, query, planner, expected

  beforeEach(() => {
    planner = (query, callback) => {
      let v
      try {
        v = queryPlanner(query)
      } catch (e) {
        callback(e)
      }
      callback(null, v)
    }
  })

  describe('with sort algorithm', () => {
    it('should return a single condition with the JoinStream', (done) => {
      query = [ { predicate: 'friend' } ]
      expected = [ { predicate: 'friend', stream: JoinStream } ]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })

    it('should put the second condition in the same order as the first', (done) => {
      query = [{
        subject: v('x'),
        predicate: 'friend',
        object: v('c')
      }, {
        subject: v('x'),
        predicate: 'abc',
        object: v('c')
      }]

      expected = [{
        subject: v('x'),
        predicate: 'friend',
        object: v('c'),
        stream: JoinStream,
        index: 'pos'
      }, {
        subject: v('x'),
        predicate: 'abc',
        object: v('c'),
        stream: SortJoinStream,
        index: 'pos'
      }]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })

    it('should create the proper index for the friend-of-a-friend query', (done) => {
      query = [{
        subject: v('x'),
        predicate: 'friend',
        object: v('c')
      }, {
        subject: v('c'),
        predicate: 'friend',
        object: v('x')
      }]

      expected = [{
        subject: v('x'),
        predicate: 'friend',
        object: v('c'),
        stream: JoinStream,
        index: 'pos'
      }, {
        subject: v('c'),
        predicate: 'friend',
        object: v('x'),
        stream: SortJoinStream,
        index: 'pso'
      }]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })

    it('should use a SortJoinStream for a three-conditions query', (done) => {
      query = [{
        subject: v('x'),
        predicate: 'friend',
        object: v('c')
      }, {
        subject: v('c'),
        predicate: 'friend',
        object: v('x')
      }, {
        subject: 'bob',
        predicate: 'father',
        object: v('c')
      }]

      expected = [{
        subject: 'bob',
        predicate: 'father',
        object: v('c'),
        stream: SortJoinStream,
        index: 'pso'
      }, {
        subject: v('x'),
        predicate: 'friend',
        object: v('c'),
        stream: JoinStream,
        index: 'pos'
      }, {
        subject: v('c'),
        predicate: 'friend',
        object: v('x'),
        stream: SortJoinStream,
        index: 'pso'
      }]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })

    it('should support inverting the index even on three-conditions queries', (done) => {
      query = [{
        subject: v('x'),
        predicate: 'friend',
        object: v('c')
      }, {
        subject: v('c'),
        predicate: 'friend',
        object: v('y')
      }, {
        subject: v('y'),
        predicate: 'friend',
        object: v('z')
      }]

      expected = [{
        subject: v('x'),
        predicate: 'friend',
        object: v('c'),
        stream: JoinStream,
        index: 'pos'
      }, {
        subject: v('c'),
        predicate: 'friend',
        object: v('y'),
        stream: SortJoinStream,
        index: 'pso'
      }, {
        subject: v('y'),
        predicate: 'friend',
        object: v('z'),
        stream: SortJoinStream,
        index: 'pso'
      }]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })

    it('should put the variables from the previous condition in the same order', (done) => {
      query = [{
        subject: v('x0'),
        predicate: 'friend',
        object: 'davide'
      }, {
        subject: v('x1'),
        predicate: 'friend',
        object: v('x0')
      }, {
        subject: v('x1'),
        predicate: 'friend',
        object: v('x2')
      }]

      expected = [{
        subject: v('x0'),
        predicate: 'friend',
        object: 'davide',
        stream: JoinStream,
        index: 'pos'
      }, {
        subject: v('x1'),
        predicate: 'friend',
        object: v('x0'),
        stream: SortJoinStream,
        index: 'pos'
      }, {
        subject: v('x1'),
        predicate: 'friend',
        object: v('x2'),
        stream: SortJoinStream,
        index: 'pso'
      }]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })

    it('should use a SortJoinStream for another three-conditions query', (done) => {
      query = [{
        subject: 'matteo',
        predicate: 'friend',
        object: v('x')
      }, {
        subject: v('x'),
        predicate: 'friend',
        object: v('y')
      }, {
        subject: v('y'),
        predicate: 'friend',
        object: 'daniele'
      }]

      expected = [{
        subject: 'matteo',
        predicate: 'friend',
        object: v('x'),
        stream: JoinStream,
        index: 'pso'
      }, {
        subject: v('x'),
        predicate: 'friend',
        object: v('y'),
        stream: SortJoinStream,
        index: 'pso'
      }, {
        subject: v('y'),
        predicate: 'friend',
        object: 'daniele',
        stream: SortJoinStream,
        index: 'pos'
      }]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })

    it('should use a SortJoinStream for the friend-of-a-friend-of-a-friend scenario', (done) => {
      query = [{
        subject: 'matteo',
        predicate: 'friend',
        object: v('x')
      }, {
        subject: v('x'),
        predicate: 'friend',
        object: v('y')
      }, {
        subject: v('y'),
        predicate: 'friend',
        object: v('z')
      }]

      expected = [{
        subject: 'matteo',
        predicate: 'friend',
        object: v('x'),
        stream: JoinStream,
        index: 'pso'
      }, {
        subject: v('x'),
        predicate: 'friend',
        object: v('y'),
        stream: SortJoinStream,
        index: 'pso'
      }, {
        subject: v('y'),
        predicate: 'friend',
        object: v('z'),
        stream: SortJoinStream,
        index: 'pso'
      }]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })

    it('should pick the correct indexes with multiple predicates going out the same subject', (done) => {
      query = [{
        subject: v('a'),
        predicate: 'friend',
        object: 'marco'
      }, {
        subject: v('a'),
        predicate: 'friend',
        object: v('x1')
      }, {
        subject: v('x1'),
        predicate: 'friend',
        object: v('a')
      }]

      expected = [{
        subject: v('a'),
        predicate: 'friend',
        object: 'marco',
        stream: JoinStream,
        index: 'pos'
      }, {
        subject: v('a'),
        predicate: 'friend',
        object: v('x1'),
        stream: SortJoinStream,
        index: 'pso'
      }, {
        subject: v('x1'),
        predicate: 'friend',
        object: v('a'),
        stream: SortJoinStream,
        index: 'pos'
      }]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })
  })

  describe('without approximateSize', () => {
    beforeEach(() => {
      db = {
        db: {
        }
      }
    })

    it('should order two conditions based on their size', (done) => {
      query = [{
        subject: 'matteo',
        predicate: 'friend',
        object: v('a')
      }, {
        subject: v('b'),
        predicate: 'friend',
        object: v('c')
      }]

      expected = [{
        subject: 'matteo',
        predicate: 'friend',
        object: v('a'),
        stream: JoinStream
      }, {
        subject: v('b'),
        predicate: 'friend',
        object: v('c'),
        stream: JoinStream
      }]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })

    it('should order two conditions based on their size (bis)', (done) => {
      query = [{
        subject: v('b'),
        predicate: 'friend',
        object: v('c')
      }, {
        subject: 'matteo',
        predicate: 'friend',
        object: v('a')
      }]

      expected = [{
        subject: 'matteo',
        predicate: 'friend',
        object: v('a'),
        stream: JoinStream
      }, {
        subject: v('b'),
        predicate: 'friend',
        object: v('c'),
        stream: JoinStream
      }]

      planner(query, (err, result) => {
        expect(result).to.eql(expected)
        done(err)
      })
    })
  })
})
