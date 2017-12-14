/* eslint-env mocha */
const expect = require('chai').expect
const ram = require('random-access-memory')
const hypergraph = require('../index')
const hyperdb = require('hyperdb')

function ramStore (filename) {
   // filename will be one of: data, bitfield, tree, signatures, key, secret_key
   // the data file will contain all your data concattenated.
   // just store all files in ram by returning a random-access-memory instance
  return ram()
}

describe('a basic triple store', function () {
  let db
  let hyper

  beforeEach(function () {
    hyper = hyperdb(ramStore)
    db = hypergraph(hyper)
  })

  afterEach(function (done) {
    db.close(done)
  })

  it('should put a triple', function (done) {
    var triple = { subject: 'a', predicate: 'b', object: 'c' }
    db.put(triple, done)
  })

  describe('with a triple inserted', function () {
    var triple

    beforeEach(function (done) {
      triple = { subject: 'a', predicate: 'b', object: 'c' }
      db.put(triple, done)
    })

    it('should get it specifiying the subject', function (done) {
      db.get({ subject: 'a' }, (err, list) => {
        expect(list).to.eql([triple])
        done(err)
      })
    })

    it('should get it specifiying the object', function (done) {
      db.get({ object: 'c' }, (err, list) => {
        expect(list).to.eql([triple])
        done(err)
      })
    })

    it('should get it specifiying the predicate', function (done) {
      db.get({ predicate: 'b' }, (err, list) => {
        expect(list).to.eql([triple])
        done(err)
      })
    })

    it('should get it specifiying the subject and the predicate', function (done) {
      db.get({ subject: 'a', predicate: 'b' }, (err, list) => {
        expect(list).to.eql([triple])
        done(err)
      })
    })

    it('should get it specifiying the subject and the object', function (done) {
      db.get({ subject: 'a', object: 'c' }, (err, list) => {
        expect(list).to.eql([triple])
        done(err)
      })
    })

    it('should get it specifiying the predicate and the object', function (done) {
      db.get({ predicate: 'b', object: 'c' }, (err, list) => {
        expect(list).to.eql([triple])
        done(err)
      })
    })

    it('should get it specifiying the subject and falsy params', function (done) {
      db.get({ subject: 'a', predicate: false, object: null }, (err, list) => {
        expect(list).to.eql([triple])
        done(err)
      })
    });

    ['subject', 'predicate', 'object'].forEach(function (type) {
      it('should get nothing if nothing matches an only ' + type + ' query',
         function (done) {
           var query = {}
           query[type] = 'notfound'
           db.get(query, (err, list) => {
             expect(list).to.eql([])
             done(err)
           })
         })
    })

    it('should return the triple through the getStream interface', function (done) {
      var stream = db.getStream({ predicate: 'b' })
      stream.on('data', function (data) {
        expect(data).to.eql(triple)
      })
      stream.on('end', done)
    })

    it('should return the triple through the getStream interface with falsy params', function (done) {
      var stream = db.getStream({ subject: null, predicate: 'b', object: false })
      stream.on('data', function (data) {
        expect(data).to.eql(triple)
      })
      stream.on('end', done)
    })

    xit('should get the triple if limit 1 is used', function (done) {
      db.get({ limit: 1 }, (err, list) => {
        expect(list).to.eql([triple])
        done(err)
      })
    })

    xit('should get the triple if limit 0 is used', function (done) {
      db.get({ limit: 0 }, (err, list) => {
        expect(list).to.eql([triple])
        done(err)
      })
    })

    xit('should get the triple if offset 0 is used', function (done) {
      db.get({ offset: 0 }, (err, list) => {
        expect(list).to.eql([triple])
        done(err)
      })
    })

    xit('should not get the triple if offset 1 is used', function (done) {
      db.get({ offset: 1 }, (err, list) => {
        expect(list).to.eql([])
        done(err)
      })
    })
  })

  it('should put an array of triples', function (done) {
    var t1 = { subject: 'a', predicate: 'b', object: 'c' }
    var t2 = { subject: 'a', predicate: 'b', object: 'd' }
    db.put([t1, t2], done)
  })

  it('should get only triples with exact match of subjects', function (done) {
    var t1 = { subject: 'a1', predicate: 'b', object: 'c' }
    var t2 = { subject: 'a', predicate: 'b', object: 'd' }
    db.put([t1, t2], function () {
      db.get({ subject: 'a' }, function (err, matched) {
        expect(matched.length).to.eql(1)
        expect(matched[0]).to.eql(t2)
        done(err)
      })
    })
  })

  describe('with special characters', function () {
    it('should support string contain ::', function (done) {
      var t1 = {subject: 'a', predicate: 'b', object: 'c'}
      var t2 = {subject: 'a::a::a', predicate: 'b', object: 'c'}
      db.put([t1, t2], function () {
        db.get({subject: 'a'}, (err, values) => {
          expect(values).to.have.lengthOf(1)
          done(err)
        })
      })
    })
    it('should support string contain \\::', function (done) {
      var t1 = {subject: 'a', predicate: 'b', object: 'c'}
      var t2 = {subject: 'a\\::a', predicate: 'b', object: 'c'}
      db.put([t1, t2], function () {
        db.get({subject: 'a'}, (err, values) => {
          expect(values).to.have.lengthOf(1)
          done(err)
        })
      })
    })
    it('should support string end with :', function (done) {
      var t1 = {subject: 'a', predicate: 'b', object: 'c'}
      var t2 = {subject: 'a:', predicate: 'b', object: 'c'}
      db.put([t1, t2], function () {
        db.get({subject: 'a:'}, (err, values) => {
          expect(values).to.have.lengthOf(1)
          expect(values[0].subject).to.equal('a:')
          done(err)
        })
      })
    })
    it('should support string end with \\', function (done) {
      var t1 = {subject: 'a', predicate: 'b', object: 'c'}
      var t2 = {subject: 'a\\', predicate: 'b', object: 'c'}
      db.put([t1, t2], function () {
        db.get({subject: 'a\\'}, (err, values) => {
          expect(values).to.have.lengthOf(1)
          expect(values[0].subject).to.equal('a\\')
          done(err)
        })
      })
    })
  })

  it('should put a triple with an object to false', function (done) {
    var t = { subject: 'a', predicate: 'b', object: false }
    db.put(t, function () {
      hyper.get('spo::a::b::false', done)
    })
  })

  describe('with two triple inserted with the same predicate', function () {
    var triple1,
      triple2

    beforeEach(function (done) {
      triple1 = { subject: 'a1', predicate: 'b', object: 'c' }
      triple2 = { subject: 'a2', predicate: 'b', object: 'd' }
      db.put([triple1, triple2], done)
    })

    it('should get one by specifiying the subject', function (done) {
      db.get({ subject: 'a1' }, (err, list) => {
        expect(list).to.eql([triple1])
        done(err)
      })
    })

    it('should get one by specifiying the subject and a falsy predicate', function (done) {
      db.get({ subject: 'a1', predicate: null }, (err, list) => {
        expect(list).to.eql([triple1])
        done(err)
      })
    })

    it('should get two by specifiying the predicate', function (done) {
      db.get({ predicate: 'b' }, (err, list) => {
        expect(list).to.eql([triple1, triple2])
        done(err)
      })
    })

    it('should get two by specifiying the predicate and a falsy subject', function (done) {
      db.get({ subject: null, predicate: 'b' }, (err, list) => {
        expect(list).to.eql([triple1, triple2])
        done(err)
      })
    })

    it('should remove one and still return the other', function (done) {
      db.del(triple2, function () {
        db.get({ predicate: 'b' }, (err, list) => {
          expect(list).to.eql([triple1])
          done(err)
        })
      })
    })

    it('should return both triples through the getStream interface', function (done) {
      var triples = [triple1, triple2]
      var stream = db.getStream({ predicate: 'b' })
      stream.on('data', function (data) {
        expect(data).to.eql(triples.shift())
      })

      stream.on('end', done)
    })

    xit('should return only one triple with limit 1', function (done) {
      db.get({ predicate: 'b', limit: 1 }, (err, list) => {
        expect(list).to.eql([triple1])
        done(err)
      })
    })

    xit('should return two triples with limit 2', function (done) {
      db.get({ predicate: 'b', limit: 2 }, (err, list) => {
        expect(list).to.eql([triple1, triple2])
        done(err)
      })
    })

    xit('should return three triples with limit 3', function (done) {
      db.get({ predicate: 'b', limit: 3 }, (err, list) => {
        expect(list).to.eql([triple1, triple2])
        done(err)
      })
    })

    xit('should support limit over streams', function (done) {
      var triples = [triple1]
      var stream = db.getStream({ predicate: 'b', limit: 1 })
      stream.on('data', function (data) {
        expect(data).to.eql(triples.shift())
      })

      stream.on('end', done)
    })

    xit('should return only one triple with offset 1', function (done) {
      db.get({ predicate: 'b', offset: 1 }, (err, list) => {
        expect(list).to.eql([triple2])
        done(err)
      })
    })

    xit('should return only no triples with offset 2', function (done) {
      db.get({ predicate: 'b', offset: 2 }, (err, list) => {
        expect(list).to.eql([])
        done(err)
      })
    })

    xit('should support offset over streams', function (done) {
      var triples = [triple2]
      var stream = db.getStream({ predicate: 'b', offset: 1 })
      stream.on('data', function (data) {
        expect(data).to.eql(triples.shift())
      })

      stream.on('end', done)
    })

    xit('should return the triples in reverse order with reverse true', function (done) {
      db.get({ predicate: 'b', reverse: true }, (err, list) => {
        expect(list).to.eql([triple2, triple1])
        done(err)
      })
    })

    xit('should return the last triple with reverse true and limit 1', function (done) {
      db.get({ predicate: 'b', reverse: true, limit: 1 }, (err, list) => {
        expect(list).to.eql([triple2])
        done(err)
      })
    })

    xit('should support reverse over streams', function (done) {
      var triples = [triple2, triple1]
      var stream = db.getStream({ predicate: 'b', reverse: true })
      stream.on('data', function (data) {
        expect(data).to.eql(triples.shift())
      })

      stream.on('end', done)
    })
  })

  describe('with two triple inserted with the same predicate and same object', function () {
    var triple1
    var triple2

    beforeEach(function (done) {
      triple1 = { subject: 'a', predicate: 'b', object: 'c' }
      triple2 = { subject: 'a2', predicate: 'b', object: 'c' }
      db.put([triple1, triple2], done)
    })

    it('should get one by specifiying the subject', function (done) {
      db.get({ subject: 'a' }, (err, list) => {
        expect(list).to.eql([triple1])
        done(err)
      })
    })

    it('should get one by specifiying the exact triple', function (done) {
      db.get({subject: 'a', predicate: 'b', object: 'c'}, (err, list) => {
        expect(list).to.eql([triple1])
        done(err)
      })
    })

    it('should get one by specifiying the subject and a falsy predicate', function (done) {
      db.get({ subject: 'a', predicate: null }, (err, list) => {
        expect(list).to.eql([triple1])
        done(err)
      })
    })

    it('should get two by specifiying the predicate', function (done) {
      db.get({ predicate: 'b' }, (err, list) => {
        expect(list).to.eql([triple1, triple2])
        done(err)
      })
    })

    it('should get two by specifiying the predicate and a falsy subject', function (done) {
      db.get({ subject: null, predicate: 'b' }, (err, list) => {
        expect(list).to.eql([triple1, triple2])
        done(err)
      })
    })

    it('should remove one and still return the other', function (done) {
      db.del(triple2, function () {
        db.get({ predicate: 'b' }, (err, list) => {
          expect(list).to.eql([triple1])
          done(err)
        })
      })
    })

    it('should return both triples through the getStream interface', function (done) {
      var triples = [triple1, triple2]
      var stream = db.getStream({ predicate: 'b' })
      stream.on('data', function (data) {
        expect(data).to.eql(triples.shift())
      })

      stream.on('end', done)
    })

    xit('should return only one triple with limit 1', function (done) {
      db.get({ predicate: 'b', limit: 1 }, (err, list) => {
        expect(list).to.eql([triple1])
        done(err)
      })
    })

    xit('should return two triples with limit 2', function (done) {
      db.get({ predicate: 'b', limit: 2 }, (err, list) => {
        expect(list).to.eql([triple1, triple2])
        done(err)
      })
    })

    xit('should return three triples with limit 3', function (done) {
      db.get({ predicate: 'b', limit: 3 }, (err, list) => {
        expect(list).to.eql([triple1, triple2])
        done(err)
      })
    })

    xit('should support limit over streams', function (done) {
      var triples = [triple1]
      var stream = db.getStream({ predicate: 'b', limit: 1 })
      stream.on('data', function (data) {
        expect(data).to.eql(triples.shift())
      })

      stream.on('end', done)
    })

    xit('should return only one triple with offset 1', function (done) {
      db.get({ predicate: 'b', offset: 1 }, (err, list) => {
        expect(list).to.eql([triple2])
        done(err)
      })
    })

    xit('should return only no triples with offset 2', function (done) {
      db.get({ predicate: 'b', offset: 2 }, (err, list) => {
        expect(list).to.eql([])
        done(err)
      })
    })

    xit('should support offset over streams', function (done) {
      var triples = [triple2]
      var stream = db.getStream({ predicate: 'b', offset: 1 })
      stream.on('data', function (data) {
        expect(data).to.eql(triples.shift())
      })

      stream.on('end', done)
    })

    xit('should return the triples in reverse order with reverse true', function (done) {
      db.get({ predicate: 'b', reverse: true }, (err, list) => {
        expect(list).to.eql([triple2, triple1])
        done(err)
      })
    })

    xit('should return the last triple with reverse true and limit 1', function (done) {
      db.get({ predicate: 'b', reverse: true, limit: 1 }, (err, list) => {
        expect(list).to.eql([triple2])
        done(err)
      })
    })

    xit('should support reverse over streams', function (done) {
      var triples = [triple2, triple1]
      var stream = db.getStream({ predicate: 'b', reverse: true })

      stream.on('data', function (data) {
        expect(data).to.eql(triples.shift())
      })

      stream.on('end', done)
    })
  })

  xdescribe('with 10 triples inserted', function () {
    beforeEach(function (done) {
      var triples = []
      for (var i = 0; i < 10; i++) {
        triples[i] = { subject: 's', predicate: 'p', object: 'o' + i }
      }
      db.put(triples, done)
    })

    if (!process.browser) {
      it('should return the approximate size', function (done) {
        db.approximateSize({ predicate: 'b' }, function (err, size) {
          expect(size).to.be.a('number')
          done(err)
        })
      })
    }
  })

  xit('should put triples using a stream', function (done) {
    var t1 = { subject: 'a', predicate: 'b', object: 'c' }
    var t2 = { subject: 'a', predicate: 'b', object: 'd' }
    var stream = db.putStream()
    stream.on('close', done)

    stream.write(t1)
    stream.end(t2)
  })

  xit('should store the triples written using a stream', function (done) {
    var t1 = { subject: 'a', predicate: 'b', object: 'c' }
    var t2 = { subject: 'a', predicate: 'b', object: 'd' }
    var stream = db.putStream()

    stream.write(t1)
    stream.end(t2)

    stream.on('close', function () {
      var triples = [t1, t2]
      var readStream = db.getStream({ predicate: 'b' })

      readStream.on('data', function (data) {
        expect(data).to.eql(triples.shift())
      })

      readStream.on('end', done)
    })
  })

  xit('should del the triples using a stream', function (done) {
    var t1 = { subject: 'a', predicate: 'b', object: 'c' }
    var t2 = { subject: 'a', predicate: 'b', object: 'd' }
    var stream = db.putStream()

    stream.write(t1)
    stream.end(t2)

    stream.on('close', function () {
      var delStream = db.delStream()
      delStream.write(t1)
      delStream.end(t2)

      delStream.on('close', function () {
        var readStream = db.getStream({ predicate: 'b' })

        var results = []
        readStream.on('data', function (data) {
          results.push(data)
        })

        readStream.on('end', function () {
          expect(results).to.have.property('length', 0)
          done()
        })
      })
    })
  })

  xit('should support filtering', function (done) {
    var triple1 = { subject: 'a', predicate: 'b', object: 'd' }
    var triple2 = { subject: 'a', predicate: 'b', object: 'c' }

    db.put([triple1, triple2], function () {
      function filter (triple) {
        return triple.object === 'd'
      }

      db.get({ subject: 'a', predicate: 'b', filter: filter }, (err, results) => {
        expect(results).to.eql([triple1])
        done(err)
      })
    })
  })
})

describe('deferred open support', function () {
  var db

  afterEach(function (done) {
    db.close(done)
  })

  it('should support deferred search', function (done) {
    db = hypergraph(hyperdb(ramStore))
    db.search([{ predicate: 'likes' }], function () {
      done()
    })
  })
})

describe('generateBatch', function () {
  var db
  var hyper

  beforeEach(function () {
    hyper = hyperdb(ramStore)
    db = hypergraph(hyper)
  })

  afterEach(function (done) {
    db.close(done)
  })

  it('should generate a batch from a triple', function () {
    var triple = { subject: 'a', predicate: 'b', object: 'c' }
    var ops = db.generateBatch(triple)
    expect(ops).to.have.property('length', 6)
    ops.forEach(function (op) {
      expect(op).to.have.property('type', 'put')
      expect(JSON.parse(op.value)).to.eql(triple)
    })
  })

  it('should generate a batch of type', function () {
    var triple = { subject: 'a', predicate: 'b', object: 'c' }
    var ops = db.generateBatch(triple, 'del')
    expect(ops).to.have.property('length', 6)
    ops.forEach(function (op) {
      expect(op).to.have.property('type', 'put')
      expect(JSON.parse(op.value)).to.eql(null)
    })
  })
})
