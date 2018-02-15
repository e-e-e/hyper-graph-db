/* eslint-env mocha */
const expect = require('chai').expect
const utils = require('../lib/utils')

describe('encodeKey', () => {
  it('generates a unique index key for a triple (spo)', () => {
    var key = utils.encodeKey('spo', { subject: 'a-subject', object: 'a-object', predicate: 'a-predicate' })
    expect(key).to.eql('spo/a-subject/a-predicate/a-object')
  })
  it('generates a unique index key for a triple (spo)', () => {
    var key = utils.encodeKey('sop', { subject: 'a-subject', object: 'a-object', predicate: 'a-predicate' })
    expect(key).to.eql('sop/a-subject/a-object/a-predicate')
  })
  it('generates a unique index key for a triple (osp)', () => {
    var key = utils.encodeKey('osp', { subject: 'a-subject', object: 'a-object', predicate: 'a-predicate' })
    expect(key).to.eql('osp/a-object/a-subject/a-predicate')
  })

  it('escapes forward slashes in the triple', () => {
    var key = utils.encodeKey('spo', { subject: 'a/subject' })
    expect(key).to.eql('spo/a%2Fsubject/')
  })
})

describe('decodeKey', () => {
  it('generates a triple from a index key (spo)', () => {
    var triple = utils.decodeKey('spo/a-subject/a-predicate/a-object')
    expect(triple).to.eql({ subject: 'a-subject', object: 'a-object', predicate: 'a-predicate' })
  })
  it('generates a triple from a index key (spo)', () => {
    var triple = utils.decodeKey('sop/a-subject/a-object/a-predicate')
    expect(triple).to.eql({ subject: 'a-subject', object: 'a-object', predicate: 'a-predicate' })
  })
  it('generates a triple from a index key (osp)', () => {
    var triple = utils.decodeKey('osp/a-object/a-subject/a-predicate')
    expect(triple).to.eql({ subject: 'a-subject', object: 'a-object', predicate: 'a-predicate' })
  })

  it('unescapes escaped /‘s from index key (spo)', () => {
    var triple = utils.decodeKey('spo/a%2Fsubject/a%2Fpredicate/a%2Fobject')
    expect(triple).to.eql({ subject: 'a/subject', object: 'a/object', predicate: 'a/predicate' })
  })
})
