/* eslint-env mocha */
const expect = require('chai').expect
const ram = require('random-access-memory')
const tmp = require('tmp')
const path = require('path')
const hyperdb = require('hyperdb')

const hypergraph = require('../index')
const constants = require('../lib/constants')
const prefixes = require('../lib/prefixes')

function ramStore (filename) {
   // filename will be one of: data, bitfield, tree, signatures, key, secret_key
   // the data file will contain all your data concattenated.
   // just store all files in ram by returning a random-access-memory instance
  return ram()
}

describe('hypergraph', function () {
  let db
  context('when newly created it adds metadata to db', () => {
    it('includes graph version', (done) => {
      db = hypergraph(ramStore)
      db.on('ready', () => {
        db.db.get('@version', (err, node) => {
          expect(err).to.not.be.a('error')
          expect(node[0].value.toString()).to.match(/\d+.\d+.\d+.*/)
          done()
        })
      })
    })
    it('includes index type (default)', (done) => {
      db = hypergraph(ramStore)
      db.on('ready', () => {
        db.db.get('@index', (err, node) => {
          expect(err).to.not.be.a('error')
          expect(node[0].value.toString()).to.eql('hex')
          done()
        })
      })
    })
    it('includes index type (option.index = tri)', (done) => {
      db = hypergraph(ramStore, { index: 'tri' })
      db.on('ready', () => {
        db.db.get('@index', (err, node) => {
          expect(err).to.not.be.a('error')
          expect(node[0].value.toString()).to.eql('tri')
          done()
        })
      })
    })
    it('includes name (default)', (done) => {
      db = hypergraph(ramStore)
      db.on('ready', () => {
        db.db.get('@name', (err, node) => {
          expect(err).to.not.be.a('error')
          expect(node[0].value.toString()).to.eql(constants.DEFAULT_BASE)
          done()
        })
      })
    })
    it('includes name (option.name)', (done) => {
      db = hypergraph(ramStore, { base: 'this://' })
      db.on('ready', () => {
        db.db.get('@name', (err, node) => {
          expect(err).to.not.be.a('error')
          expect(node[0].value.toString()).to.eql('this://')
          done()
        })
      })
    })
    it('includes default prefixes', (done) => {
      db = hypergraph(ramStore)
      db.on('ready', () => {
        const stream = db.db.createReadStream('@prefix/')
        var count = 0
        stream.on('data', (nodes) => {
          const prefix = prefixes.fromKey(nodes[0].key)
          count++
          expect(nodes[0].value.toString()).to.eql(constants.DEFAULT_PREFIXES[prefix])
        })
        stream.on('error', done)
        stream.on('end', () => {
          expect(count).to.eql(Object.keys(constants.DEFAULT_PREFIXES).length)
          done()
        })
      })
    })
    it('includes only specified prefixes (options.prefixes)', (done) => {
      var customPrefixes = {
        schema: 'http://schema.org/',
        library: 'http://purl.org/library/',
        void: 'http://rdfs.org/ns/void#',
        dct: 'http://purl.org/dc/terms/',
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        madsrdf: 'http://www.loc.gov/mads/rdf/v1#',
        discovery: 'http://worldcat.org/vocab/discovery/',
        bgn: 'http://bibliograph.net/',
        pto: 'http://www.productontology.org/id/',
        dc: 'http://purl.org/dc/elements/1.1/'
      }
      db = hypergraph(ramStore, { prefixes: customPrefixes })
      db.on('ready', () => {
        const stream = db.db.createReadStream('@prefix/')
        var count = 0
        stream.on('data', (nodes) => {
          const prefix = prefixes.fromKey(nodes[0].key)
          count++
          expect(nodes[0].value.toString()).to.eql(customPrefixes[prefix])
        })
        stream.on('error', done)
        stream.on('end', () => {
          expect(count).to.eql(Object.keys(customPrefixes).length)
          done()
        })
      })
    })
  })
  context('when loading db that already exists', () => {
    it('does not add new metadata', (done) => {
      tmp.dir({ unsafeCleanup: true }, function (err, dir, cleanupCallback) {
        if (err) return done(err)
        const dbDir = path.join(dir, 'test.db')
        // create new hyperdb
        const hyper = hyperdb(dbDir)
        hyper.on('ready', () => {
          // as something so that its not an empty feed
          hyper.put('test', 'data', (err) => {
            if (err) return finish(err)
            openExistingDBAsGraphDB()
          })
        })
        hyper.on('error', finish)

        function openExistingDBAsGraphDB () {
          db = hypergraph(dbDir)
          db.on('ready', () => {
            db.db.get('@version', (err, nodes) => {
              expect(nodes).to.eql(null)
              finish(err)
            })
          })
          db.on('error', finish)
        }
        function finish (e) {
          cleanupCallback()
          done(e)
        }
      })
    })
    it('overrides options with metadata set in hyperdb (index)')
    it('overrides options with metadata set in hyperdb (name)')
  })
})
