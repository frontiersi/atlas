// Build profile for RequireJS.
({
  baseUrl: '../src',
  packages: [
    {name: 'jquery', location: '../lib', main: 'jquery'},

    // These all belong to subdiv.
    {name: 'atlas/lib/subdiv', location: '../lib/subdiv/src'},
    {name: 'ConvexHullGrahamScan', location: '../lib/subdiv/lib', main: 'ConvexHullGrahamScan'},
    {name: 'hull', location: '../lib/subdiv/lib', main: 'hull'},
    {name: 'jsts', location: '../lib/subdiv/lib/jsts'},
    {name: 'tinycolor', location: '../lib/subdiv/lib', main: 'tinycolor'},
    {name: 'underscore', location: '../lib/subdiv/lib', main: 'underscore'},
    {name: 'utility', location: '../lib/subdiv/lib/utility'},

    // This is the expected name of utm-converter in subdiv.
    {name: 'utm-converter', location: '../lib', main: 'UtmConverter'}
  ],
  paths: {
    'atlas': '',
    'atlas/lib': '../lib',
    'atlas/lib/utility': '../lib/utility/src'
  },
  name: 'main',
  out: '../dist/atlas.min.js',
  excludeShallow: ['main']
})
