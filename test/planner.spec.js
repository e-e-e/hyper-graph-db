/* eslint-env mocha */
const expect = require('chai').expect
const planner = require('../lib/planner')
const v = require('../lib/Variable')

describe('query planner', () => {
  var query, expected

  it('should return single entries with no changes', () => {
    query = [ { predicate: 'friend' } ]
    expect(planner(query)).to.eql(query)
  })

  it('should order queries based on size', () => {
    query = [{
      subject: v('x'),
      predicate: 'friend',
      object: v('c')
    }, {
      subject: v('x'),
      predicate: 'abc',
      object: 'xyz'
    }]

    expected = [{
      subject: v('x'),
      predicate: 'abc',
      object: 'xyz'
    }, {
      subject: v('x'),
      predicate: 'friend',
      object: v('c')
    }]

    expect(planner(query)).to.eql(expected)
  })

  it('should return queries in the same order if they have the same variables', () => {
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
      object: v('c')
    }, {
      subject: v('c'),
      predicate: 'friend',
      object: v('x')
    }]

    expect(planner(query)).to.eql(expected)
  })

  it('should sort three condition queries', () => {
    query = [{
      subject: v('b'),
      predicate: 'friend',
      object: v('c')
    }, {
      subject: v('a'),
      predicate: 'friend',
      object: v('b')
    }, {
      subject: 'bob',
      predicate: 'father',
      object: v('a')
    }]

    expected = [{
      subject: 'bob',
      predicate: 'father',
      object: v('a')
    }, {
      subject: v('a'),
      predicate: 'friend',
      object: v('b')
    }, {
      subject: v('b'),
      predicate: 'friend',
      object: v('c')
    }]
    expect(planner(query)).to.eql(expected)
  })

  it('should sort same number of vars in order of solving simplicity', () => {
    query = [{
      subject: v('x'),
      predicate: 'friend',
      object: v('c')
    }, {
      subject: v('y'),
      predicate: 'friend',
      object: v('z')
    }, {
      subject: v('c'),
      predicate: 'friend',
      object: v('y')
    }]

    expected = [
      query[2],
      query[0],
      query[1]
    ]
    expect(planner(query)).to.eql(expected)
  })

  it('should sort queries with same # vars based on overlapping vars (bis)', () => {
    query = [{
      subject: v('1'),
      predicate: 'friend',
      object: v('2')
    }, {
      subject: v('2'),
      predicate: 'friend',
      object: v('3')
    }, {
      subject: v('3'),
      predicate: 'friend',
      object: v('4')
    }, {
      subject: v('3'),
      predicate: 'has',
      object: v('4')
    }]

    expected = [
      query[3],
      query[2],
      query[1],
      query[0]
    ]
    expect(planner(query)).to.eql(expected)
  })
})

//   it('should put the variables from the previous condition in the same order', () => {
//     query = [{
//       subject: v('x0'),
//       predicate: 'friend',
//       object: 'davide'
//     }, {
//       subject: v('x1'),
//       predicate: 'friend',
//       object: v('x0')
//     }, {
//       subject: v('x1'),
//       predicate: 'friend',
//       object: v('x2')
//     }]

//     expected = [{
//       subject: v('x0'),
//       predicate: 'friend',
//       object: 'davide',
//       stream: JoinStream,
//       index: 'pos'
//     }, {
//       subject: v('x1'),
//       predicate: 'friend',
//       object: v('x0'),
//       stream: SortJoinStream,
//       index: 'pos'
//     }, {
//       subject: v('x1'),
//       predicate: 'friend',
//       object: v('x2'),
//       stream: SortJoinStream,
//       index: 'pso'
//     }]

//     planner(query, (err, result) => {
//       expect(result).to.eql(expected)
//       done(err)
//     })
//   })

//   it('should use a SortJoinStream for another three-conditions query', (done) => {
//     query = [{
//       subject: 'matteo',
//       predicate: 'friend',
//       object: v('x')
//     }, {
//       subject: v('x'),
//       predicate: 'friend',
//       object: v('y')
//     }, {
//       subject: v('y'),
//       predicate: 'friend',
//       object: 'daniele'
//     }]

//     expected = [{
//       subject: 'matteo',
//       predicate: 'friend',
//       object: v('x'),
//       stream: JoinStream,
//       index: 'pso'
//     }, {
//       subject: v('x'),
//       predicate: 'friend',
//       object: v('y'),
//       stream: SortJoinStream,
//       index: 'pso'
//     }, {
//       subject: v('y'),
//       predicate: 'friend',
//       object: 'daniele',
//       stream: SortJoinStream,
//       index: 'pos'
//     }]

//     planner(query, (err, result) => {
//       expect(result).to.eql(expected)
//       done(err)
//     })
//   })

//   it('should use a SortJoinStream for the friend-of-a-friend-of-a-friend scenario', (done) => {
//     query = [{
//       subject: 'matteo',
//       predicate: 'friend',
//       object: v('x')
//     }, {
//       subject: v('x'),
//       predicate: 'friend',
//       object: v('y')
//     }, {
//       subject: v('y'),
//       predicate: 'friend',
//       object: v('z')
//     }]

//     expected = [{
//       subject: 'matteo',
//       predicate: 'friend',
//       object: v('x'),
//       stream: JoinStream,
//       index: 'pso'
//     }, {
//       subject: v('x'),
//       predicate: 'friend',
//       object: v('y'),
//       stream: SortJoinStream,
//       index: 'pso'
//     }, {
//       subject: v('y'),
//       predicate: 'friend',
//       object: v('z'),
//       stream: SortJoinStream,
//       index: 'pso'
//     }]

//     planner(query, (err, result) => {
//       expect(result).to.eql(expected)
//       done(err)
//     })
//   })

//   it('should pick the correct indexes with multiple predicates going out the same subject', (done) => {
//     query = [{
//       subject: v('a'),
//       predicate: 'friend',
//       object: 'marco'
//     }, {
//       subject: v('a'),
//       predicate: 'friend',
//       object: v('x1')
//     }, {
//       subject: v('x1'),
//       predicate: 'friend',
//       object: v('a')
//     }]

//     expected = [{
//       subject: v('a'),
//       predicate: 'friend',
//       object: 'marco',
//       stream: JoinStream,
//       index: 'pos'
//     }, {
//       subject: v('a'),
//       predicate: 'friend',
//       object: v('x1'),
//       stream: SortJoinStream,
//       index: 'pso'
//     }, {
//       subject: v('x1'),
//       predicate: 'friend',
//       object: v('a'),
//       stream: SortJoinStream,
//       index: 'pos'
//     }]

//     planner(query, (err, result) => {
//       expect(result).to.eql(expected)
//       done(err)
//     })
//   })

//   describe('without approximateSize', () => {
//     beforeEach(() => {
//       db = {
//         db: {
//         }
//       }
//     })

//     it('should order two conditions based on their size', (done) => {
//       query = [{
//         subject: 'matteo',
//         predicate: 'friend',
//         object: v('a')
//       }, {
//         subject: v('b'),
//         predicate: 'friend',
//         object: v('c')
//       }]

//       expected = [{
//         subject: 'matteo',
//         predicate: 'friend',
//         object: v('a'),
//         stream: JoinStream
//       }, {
//         subject: v('b'),
//         predicate: 'friend',
//         object: v('c'),
//         stream: JoinStream
//       }]

//       planner(query, (err, result) => {
//         expect(result).to.eql(expected)
//         done(err)
//       })
//     })

//     it('should order two conditions based on their size (bis)', (done) => {
//       query = [{
//         subject: v('b'),
//         predicate: 'friend',
//         object: v('c')
//       }, {
//         subject: 'matteo',
//         predicate: 'friend',
//         object: v('a')
//       }]

//       expected = [{
//         subject: 'matteo',
//         predicate: 'friend',
//         object: v('a'),
//         stream: JoinStream
//       }, {
//         subject: v('b'),
//         predicate: 'friend',
//         object: v('c'),
//         stream: JoinStream
//       }]

//       planner(query, (err, result) => {
//         expect(result).to.eql(expected)
//         done(err)
//       })
//     })
//   })
// })
