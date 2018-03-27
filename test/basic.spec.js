/* eslint-env mocha */
const expect = require('chai').expect
const ram = require('random-access-memory')
const tmp = require('tmp')
const path = require('path')
const hyperdb = require('hyperdb')
const pkg = require('../package.json')

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
      db = hypergraph(ramStore, { name: 'this://' })
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
              expect(nodes).to.eql([])
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

    context('with graph already containing index, version, name and prefixes', () => {
      const options = {
        index: 'tri',
        name: 'baseName',
        prefixes: {
          test: 'http://hyperreadings.info/test#',
          xsd: 'http://www.w3.org/2001/XMLSchema#'
        }
      }
      let cleanup = () => {}
      let graphDir
      before((done) => {
        tmp.dir({ unsafeCleanup: true }, (err, dir, cleanupCallback) => {
          if (err) return done(err)
          cleanup = cleanupCallback
          graphDir = dir
          const graph = hypergraph(graphDir, options)
          graph.on('ready', () => { done() })
          graph.on('error', done)
        })
      })
      after(() => {
        cleanup()
      })
      it('contains version that was used to create the db', (done) => {
        const graph = hypergraph(graphDir)
        graph.on('ready', () => {
          graph.graphVersion((err, version) => {
            expect(err).to.eql(null)
            expect(version).to.eql(pkg.version)
            done()
          })
        })
      })
      it('overrides options with metadata set in hyperdb (index)', (done) => {
        const graph = hypergraph(graphDir, { index: 'hex' })
        graph.on('ready', () => {
          graph.indexType((err, index) => {
            expect(err).to.eql(null)
            expect(index).to.eql(options.index)
            done()
          })
        })
      })
      it('overrides options with metadata set in hyperdb (name)', (done) => {
        const graph = hypergraph(graphDir, { index: 'hex', name: 'overrideMe' })
        graph.on('ready', () => {
          graph.name((err, name) => {
            expect(err).to.eql(null)
            expect(name).to.eql(options.name)
            done()
          })
        })
      })
      it('overrides options with metadata set in hyperdb (prefix)', (done) => {
        const prefixes = {
          thing: 'http://some.co/thing#'
        }
        const graph = hypergraph(graphDir, { index: 'hex', name: 'overrideMe', prefixes })
        graph.on('ready', () => {
          graph.prefixes((err, prefixes) => {
            expect(err).to.eql(null)
            expect(prefixes).to.deep.eql(options.prefixes)
            done()
          })
        })
      })
    })
  })
})
