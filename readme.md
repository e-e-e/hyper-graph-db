# hyper-graph-db

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

Allowed options:
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

#### `db.search(queries, [options], callback)`

Allows for Basic Graph Patterns searches where all queries must match.
Expects queries to be an array of triple options of the form:

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
