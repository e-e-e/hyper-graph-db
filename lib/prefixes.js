const PREFIX_KEY = '@prefix/'
const PREFIX_REGEX = /^(\w+):/
const DEFAULT_PREFIXES = {
  _: 'hg://',
  foaf: 'http://xmlns.com/foaf/0.1/'
}

function toKey (prefix) {
  return PREFIX_KEY + prefix
}
function fromKey (key) {
  return key.replace(PREFIX_KEY, '')
}

function fromNodes (nodes) {
  return {
    prefix: fromKey(nodes[0].key),
    uri: nodes[0].value
  }
}

function toPrefixed (uri, prefixes) {
  if (!prefixes) return uri
  const prefix = Object.keys(prefixes).find(v => uri.startsWith(prefixes[v]))
  if (!prefix) return uri
  return uri.replace(prefixes[prefix], prefix + ':')
}

function fromPrefixed (uri, prefixes) {
  if (!prefixes) return uri
  const match = uri.match(PREFIX_REGEX)
  if (match && prefixes[match[1]]) {
    return uri.replace(PREFIX_REGEX, prefixes[match[1]])
  }
  return uri
}

module.exports = {
  DEFAULT_PREFIXES,
  PREFIX_KEY,
  toKey,
  fromKey,
  fromNodes,
  toPrefixed,
  fromPrefixed
}
