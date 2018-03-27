/* eslint-env mocha */
const expect = require('chai').expect
const prefixes = require('../lib/prefixes')

describe('prefix utilities', () => {
  describe('toKey', () => {
    it('converts a prefix to a key', () => {
      expect(prefixes.toKey('this')).to.eql('@prefix/this')
    })
  })

  describe('fromKey', () => {
    it('converts a key to its prefix', () => {
      expect(prefixes.fromKey('@prefix/this')).to.eql('this')
    })
  })

  describe('fromNodes', () => {
    it('converts hyperdb nodes to prefix/uri object', () => {
      const dummyNodes = [{ key: '@prefix/this', value: Buffer.from('http://this.example.com') }]
      expect(prefixes.fromNodes(dummyNodes)).to.eql({ uri: 'http://this.example.com', prefix: 'this' })
    })
    it('ignores conflicts', () => {
      const dummyNodes = [
        { key: '@prefix/this', value: Buffer.from('http://this.example.com') },
        { key: '@prefix/this', value: Buffer.from('http://conflict.example.com') }
      ]
      expect(prefixes.fromNodes(dummyNodes)).to.eql({ uri: 'http://this.example.com', prefix: 'this' })
    })
  })

  describe('toPrefixed', () => {
    it('returns unmodified string if prefix is undefined', () => {
      const str = 'http://test.com/this/ok#wow'
      const prefixed = prefixes.toPrefixed(str)
      expect(prefixed).to.eql(str)
    })
    it('returns unmodified string if prefix is not set', () => {
      const str = 'http://test.com/this/ok#wow'
      const prefixed = prefixes.toPrefixed(str, { 'wow': 'http://wow.com/' })
      expect(prefixed).to.eql(str)
    })
    it('returns prefix string if prefix is present', () => {
      const str = 'http://wow.com/now/this#and_hashed'
      const prefixed = prefixes.toPrefixed(str, { 'wow': 'http://wow.com/' })
      expect(prefixed).to.eql('wow:now/this#and_hashed')
    })
  })

  describe('fromPrefixed', () => {
    it('returns unmodified string if prefix is undefined', () => {
      const str = 'some:thing'
      const prefixed = prefixes.fromPrefixed(str)
      expect(prefixed).to.eql(str)
    })
    it('returns unmodified string if prefix is not set', () => {
      const str = 'some:thing'
      const prefixed = prefixes.fromPrefixed(str, { 'wow': 'http://wow.com/' })
      expect(prefixed).to.eql(str)
    })
    it('returns prefix string if prefix is present', () => {
      const str = 'wow:now'
      const prefixed = prefixes.fromPrefixed(str, { 'wow': 'http://wow.com/' })
      expect(prefixed).to.eql('http://wow.com/now')
    })
  })
})
