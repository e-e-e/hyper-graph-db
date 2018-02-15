/* eslint-env mocha */

var hypergraph = require('../index')
var ram = require('random-access-memory')
var N3 = require('n3')
var fs = require('fs')
var path = require('path')
var chai = require('chai')
var expect = chai.expect

function ramStore () { return ram() }

function importTurtleFile (graph, file, callback) {
  var parser = N3.StreamParser()
  var writer = graph.putStream()
  N3.Parser._resetBlankNodeIds()
  fs.createReadStream(file).pipe(parser).pipe(writer)
  writer.on('end', callback)
  writer.on('error', callback)
}

function testQuery (graph, queryFile, expected, done) {
  var query = fs.readFileSync(queryFile)
  var s = graph.queryStream(query.toString())
  s.on('data', (d) => {
    expect(d).to.deep.equal(expected.shift())
  })
  s.on('end', () => {
    expect(expected).to.have.length(0)
    done()
  })
  s.on('error', done)
}

describe('hypergraph.queryStream', () => {
  context('with simple foaf data', () => {
    var graph
    before((done) => {
      graph = hypergraph(ramStore)
      graph.on('ready', () => {
        importTurtleFile(graph, path.join(__dirname, './data/simplefoaf.ttl'), done)
      })
    })

    it('performs CONSTRUCT query type with UNION operator', (done) => {
      console.time('query')
      var expected = [
        { subject: 'hg:b0_b',
          predicate: 'http://www.w3.org/2001/vcard-rdf/3.0#N',
          object: '_:b0' },
        { subject: '_:b0',
          predicate: 'http://www.w3.org/2001/vcard-rdf/3.0#givenName',
          object: '"Bob"' },
        { subject: '_:b0',
          predicate: 'http://www.w3.org/2001/vcard-rdf/3.0#familyName',
          object: '"Hacker"' },
        { subject: 'hg:b0_a',
          predicate: 'http://www.w3.org/2001/vcard-rdf/3.0#N',
          object: '_:b1' },
        { subject: '_:b1',
          predicate: 'http://www.w3.org/2001/vcard-rdf/3.0#givenName',
          object: '"Alice"' },
        { subject: '_:b1',
          predicate: 'http://www.w3.org/2001/vcard-rdf/3.0#familyName',
          object: '"Hacker"' }
      ]
      var query = path.join(__dirname, './queries/union.rq')
      testQuery(graph, query, expected, done)
    })
  })
  describe('with data from sparql in 11 minutes', () => {
    var graph
    beforeEach((done) => {
      graph = hypergraph(ramStore)
      graph.on('ready', () => {
        importTurtleFile(graph, path.join(__dirname, './data/sparqlIn11Minutes.ttl'), done)
      })
    })

    it('executes singular query selecting singular variable', (done) => {
      var expected = [
        { '?person': 'http://www.snee.com/hr/emp2' },
        { '?person': 'http://www.snee.com/hr/emp1' }
      ]
      var query = path.join(__dirname, `./queries/sparqlIn11Minutes1.rq`)
      testQuery(graph, query, expected, done)
    })

    it('executes two queries selecting two variables', (done) => {
      var expected = [
        { '?person': 'http://www.snee.com/hr/emp2',
          '?givenName': '"John"' },
        { '?person': 'http://www.snee.com/hr/emp1',
          '?givenName': '"Heidi"' }
      ]
      var query = path.join(__dirname, `./queries/sparqlIn11Minutes2.rq`)
      testQuery(graph, query, expected, done)
    })

    it('executes three queries selecting three variables', (done) => {
      var expected = [
        { '?givenName': '"Jane"',
          '?familyName': '"Berger"',
          '?hireDate': '"1000-03-10"' },
        { '?givenName': '"Heidi"',
          '?familyName': '"Smith"',
          '?hireDate': '"2015-01-13"' },
        { '?givenName': '"Francis"',
          '?familyName': '"Jones"',
          '?hireDate': '"2015-02-13"' },
        { '?givenName': '"John"',
          '?familyName': '"Smith"',
          '?hireDate': '"2015-01-28"' }
      ]
      var query = path.join(__dirname, `./queries/sparqlIn11Minutes3.rq`)
      testQuery(graph, query, expected, done)
    })

    it('executes filters based on a variable (String comparison not Date)', (done) => {
      var expected = [
        { '?givenName': '"Jane"',
          '?familyName': '"Berger"',
          '?hireDate': '"1000-03-10"' }
      ]
      var query = path.join(__dirname, `./queries/sparqlIn11Minutes4.rq`)
      testQuery(graph, query, expected, done)
    })

    it('executes three queries selecting three variables (again)', (done) => {
      var expected = [
        { '?givenName': '"John"',
          '?familyName': '"Smith"',
          '?oDate': '"2015-03-15"' },
        { '?givenName': '"John"',
          '?familyName': '"Smith"',
          '?oDate': '"2015-01-30"' },
        { '?givenName': '"Heidi"',
          '?familyName': '"Smith"',
          '?oDate': '"2015-01-30"' }
      ]
      var query = path.join(__dirname, `./queries/sparqlIn11Minutes5.rq`)
      testQuery(graph, query, expected, done)
    })

    it('executes three queries selecting three variables (with OPTIONAL)', (done) => {
      var expected = [
        { '?givenName': '"Jane"',
          '?familyName': '"Berger"',
          '?oDate': null },
        { '?givenName': '"John"',
          '?familyName': '"Smith"',
          '?oDate': '"2015-03-15"' },
        { '?givenName': '"John"',
          '?familyName': '"Smith"',
          '?oDate': '"2015-01-30"' },
        { '?givenName': '"Heidi"',
          '?familyName': '"Smith"',
          '?oDate': '"2015-01-30"' },
        { '?givenName': '"Francis"',
          '?familyName': '"Jones"',
          '?oDate': null }
      ]
      var query = path.join(__dirname, `./queries/sparqlIn11Minutes6.rq`)
      testQuery(graph, query, expected, done)
    })

    // NOT EXISTS is not implemented in Sparql iterator
    xit('executes three queries selecting three variables (with NOT EXISTS)', (done) => {
      var expected = []
      var query = path.join(__dirname, `./queries/sparqlIn11Minutes7.rq`)
      testQuery(graph, query, expected, done)
    })

    xit('executes two queries selecting three variables (with BIND)', (done) => {
      var expected = []
      var query = path.join(__dirname, `./queries/sparqlIn11Minutes8.rq`)
      testQuery(graph, query, expected, done)
    })

    xit('executes two queries selecting three variables (with BIND and CONCAT)', (done) => {
      var expected = []
      var query = path.join(__dirname, `./queries/sparqlIn11Minutes9.rq`)
      testQuery(graph, query, expected, done)
    })

    xit('executes two queries constructing new triples (with BIND and CONCAT)', (done) => {
      var expected = []
      var query = path.join(__dirname, `./queries/sparqlIn11Minutes11.rq`)
      testQuery(graph, query, expected, done)
    })
  })
})
