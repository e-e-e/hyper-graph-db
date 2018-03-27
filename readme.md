# hyper-graph-db

[![Greenkeeper badge](https://badges.greenkeeper.io/e-e-e/hyper-graph-db.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/e-e-e/hyper-graph-db.svg?branch=master)](https://travis-ci.org/e-e-e/hyper-graph-db) [![Coverage Status](https://coveralls.io/repos/github/e-e-e/hyper-graph-db/badge.svg?branch=master)](https://coveralls.io/github/e-e-e/hyper-graph-db?branch=master)

hyper-graph-db is a graph database on top of [hyperdb](https://github.com/mafintosh/hyperdb). It interface and test specs have been adapted from [LevelGraph](https://github.com/levelgraph/levelgraph).

Like LevelGraph, **hyper-graph-db** follows the **Hexastore** approach as presented in the article: [Hexastore: sextuple indexing for semantic web data management C Weiss, P Karras, A Bernstein - Proceedings of the VLDB Endowment, 2008](http://www.vldb.org/pvldb/1/1453965.pdf). As such hyper-graph-db uses six indices for every triple in order to access them as fast as it is possible.

## install

```
npm install hyper-graph-db
```

This requires node v6.x.x or greater.

## basic usage

```js
var hypergraph = require('hyper-graph-db')

var db = hypergraph('./my.db', { valueEncoding: 'utf-8' })

var triple = { subject: 'a', predicate: 'b', object: 'c' }

db.put(triple, function (err) {
  if (err) throw err
  db.get({ subject: 'a' }, function(err, list) {
    console.log(list)
  });
})
```

## API

#### `var db = hypergraph(storage, [key], [options])`

Returns an instance of hyper-graph-db. Arguments are passed directly to hyperdb, look at its constructor [API](https://github.com/mafintosh/hyperdb#var-db--hyperdbstorage-key-options) for configuration options.

Extra Options:
```js
{
  index: 'hex' || 'tri', // 6 or 3 indices, default 'hex'
  name: string, // name that prefixes blank nodes
  prefixes: { // an object representing RDF namespace prefixes
    [sorthand]: string,
  },
}
```

The prefix option can be used to further reduce db size, as it will auto replace namespaced values with their prefered prefix.

For example: `{ vcard: 'http://www.w3.org/2006/vcard/ns#' }` will store `http://www.w3.org/2006/vcard/ns#given-name` as `vcard:given-name`.

**Note:** `index`, `name`, and `prefixes` can only be set when a graph db is first created. When loading an existing graph these values are also loaded from the db.

#### `db.on('ready')`

*This event is passed on from underlying hyperdb instance.*

Emitted exactly once: when the db is fully ready and all static properties have
been set. You do not need to wait for this when calling any async functions.

#### `db.on('error', err)`

*This event is passed on from underlying hyperdb instance.*

Emitted if there was a critical error before `db` is ready.

#### `db.put(triple, [callback])`

Inserts **Hexastore** formated entries for triple into the graph database.

#### `var stream = db.putStream(triple)`

Returns a writable stream.

#### `db.get(triple, [options], callback)`

Returns all entries that match the triple. This allows for partial  pattern-matching. For example `{ subject: 'a' })`, will return all triples with subject equal to 'a'.

Options:
```js
{
  limit: number, // limit number of triples returned
  offset: number, // offset returned
  filter: function (triple) { return bool }, // filter the results
}
```

#### `db.del(triple, [callback])`

Remove triples indices from the graph database.

#### `var stream = db.delStream(triple)`

Returns a writable stream for removing entries.

#### `var stream = db.getStream(triple, [options])`

Returns a readable stream of all matching triples.

Allowed options:
```js
{
  limit: number, // limit number of triples returned
  offset: number, // offset returned
  filter: function (triple) { return bool }, // filter the results
}
```

#### `db.query(query, callback)`

Allows for querying the graph with [SPARQL](https://www.w3.org/TR/sparql11-protocol/) queries.
Returns all entries that match the query.

SPARQL queries are implemented using [sparql-iterator](https://github.com/e-e-e/sparql-iterator) - a fork of [Linked Data Fragments Client](https://github.com/LinkedDataFragments/Client.js).

#### `var stream = db.queryStream(query)`

Returns a stream of results from the SPARQL query.

#### `db.search(patterns, [options], callback)`

Allows for Basic Graph Patterns searches where all patterns must match.
Expects patterns to be an array of triple options of the form:

```js
{
  subject: String || Variable, // required
  predicate: String || Variable, // required
  object: String || Variable, // required
  filter: Function, // optional
}
```

Allowed options:
```js
{
  limit: number, // limit number of results returned
}
```

filter: function (triple) { return bool },

```js
db.put([{
    subject: 'matteo',
    predicate: 'friend',
    object: 'daniele'
  }, {
    subject: 'daniele',
    predicate: 'friend',
    object: 'matteo'
  }, {
    subject: 'daniele',
    predicate: 'friend',
    object: 'marco'
  }, {
    subject: 'lucio',
    predicate: 'friend',
    object: 'matteo'
  }, {
    subject: 'lucio',
    predicate: 'friend',
    object: 'marco'
  }, {
    subject: 'marco',
    predicate: 'friend',
    object: 'davide'
  }], () => {

  const stream = db.search([{
    subject: 'matteo',
    predicate: 'friend',
    object: db.v('x')
  }, {
    subject: db.v('x'),
    predicate: 'friend',
    object: db.v('y')
  }, {
    subject: db.v('y'),
    predicate: 'friend',
    object: 'davide'
  }], (err, results) => {
    if (err) throw err
    console.log(results)
  })
})
```

#### `var stream = db.searchStream(queries)`

Returns search results as a stream.

#### `db.graphVersion()`

Returns the version of hyper-graph-db that created the db.

#### `db.indexType()`

Returns the type of index which the graph is configured to use: `hex` or `tri`.

#### `db.name()`

Returns the name used for blank nodes when searching the db.

#### `db.prefixes()`

Returns an object representing the RDF prefixes used by the db.

