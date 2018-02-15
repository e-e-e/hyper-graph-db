const HEXSTORE_INDEXES = {
  spo: ['subject', 'predicate', 'object'],
  pos: ['predicate', 'object', 'subject'],
  osp: ['object', 'subject', 'predicate'],
  sop: ['subject', 'object', 'predicate'], // [optional]
  pso: ['predicate', 'subject', 'object'], // [optional]
  ops: ['object', 'predicate', 'subject'] // [optional]
}
const HEXSTORE_INDEXES_REDUCED = {
  spo: HEXSTORE_INDEXES.spo,
  pos: HEXSTORE_INDEXES.pos,
  osp: HEXSTORE_INDEXES.osp
}
const PREFIX_KEY = '@prefix/'
const DEFAULT_PREFIXES = {
  _: 'hg://',
  foaf: 'http://xmlns.com/foaf/0.1/'
}

module.exports = {
  PREFIX_KEY,
  DEFAULT_PREFIXES,
  HEXSTORE_INDEXES,
  HEXSTORE_INDEXES_REDUCED
}
