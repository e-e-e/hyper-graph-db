/* eslint-env mocha */
const expect = require('chai').expect
const ram = require('random-access-memory')
const hypergraph = require('../index')
const constants = require('../lib/constants')

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
        stream.on('data', (nodes) => {

        })
        stream.on('error', done)
        stream.on('end', () => {
          done()
        })
      })
    })
  })
  context('when loading db that already exists', () => {
    it('does not add new metadata')
    it('overrides options with metadata set in hyperdb (index)')
    it('overrides options with metadata set in hyperdb (name)')
  })
})
