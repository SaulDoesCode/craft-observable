const fs = require('fs')
const docs = require('documentation')
const beautify = require('js-beautify').js_beautify
const ClosureCompiler = require('google-closure-compiler').compiler
const babel = require('babel-core')

const LIBNAME = 'craft-observable'

let BabelOptions = {
  plugins: [
    'transform-es2015-template-literals',
    'transform-es2015-literals',
    // "transform-es2015-function-name",
    'transform-es2015-for-of',
    'transform-merge-sibling-variables',
    'transform-es2015-arrow-functions',
    'transform-es2015-block-scoped-functions',
    'transform-es2015-classes',
    'transform-es2015-object-super',
    'transform-es2015-shorthand-properties',
    'transform-es2015-duplicate-keys',
    'transform-es2015-computed-properties',
    'transform-es2015-sticky-regex',
    'transform-es2015-unicode-regex',
    'transform-es2015-spread',
    'transform-es2015-parameters',
    'transform-es2015-destructuring',
    'transform-es2015-block-scoping',
  // "transform-es2015-typeof-symbol",
  ],
  compact: true
}

function gendocs () {
  docs([`./${LIBNAME}.js`], {
    github: true
  }, (err, result) => {
    if (err) throw err
    docs.formats['md'](result, {}, (error, output) => {
      fs.writeFile(`./docs/${LIBNAME}.md`, output, 'utf8', err => {
        if (err) throw err
        console.log('docs gen success!')
      })
    })
  })
}

const babelize = code => babel.transform(code, BabelOptions).code

const minjs = loc => new Promise((pass, fail) => {
    new ClosureCompiler({
        js: loc,
        compilation_level: 'SIMPLE',
        language_in: 'ECMASCRIPT5_STRICT',
        language_out: 'ECMASCRIPT5_STRICT'
    }).run((exitcode, out, err) => {
        if (err) console.error(err)
        console.log('Success -> Script was Minified!\n')
        pass(out)
    })
})

function BundlePolyfills () {
  let path = './polyfills/'
  new ClosureCompiler({
    js: fs.readdirSync(path).map(file => {
      if (file.includes('.js')) return path + file
    }),
    compilation_level: 'SIMPLE',
    language_in: 'ECMASCRIPT5_STRICT',
    language_out: 'ECMASCRIPT5_STRICT',
    js_output_file: './dist/polyfills.min.js'
  }).run(() => {
    console.log('Success -> Polyfills Bundled and Minified!\n')
  })
}

function BabelizeBeautifyMinify (inloc, outloc) {
  babel.transformFile(inloc, BabelOptions, (err, result) => {
    if (err) throw err
    let beautifiedCode = beautify(result.code, {
      indent_size: 2
    })
    fs.writeFile(outloc, beautifiedCode, 'utf8', err => {
      if (err) throw err
      console.log(`Success -> ${LIBNAME}.js Babelized!\n`)

      minjs(outloc).then(out => {
        fs.writeFile(outloc.replace('.js', '.min.js'), out, 'utf8', err => {
          if (err) throw err
          console.log(`Success -> ${LIBNAME}.js Babelized and Minified!\n`)
        })
      })
    })
  })
}

process.argv.forEach((val, index, array) => {
  if (val == 'docs') gendocs()
  else if (val == 'polyfills') BundlePolyfills()
  else if (val == 'co') BabelizeBeautifyMinify(`./${LIBNAME}.js`, `./${LIBNAME}-es5.js`)
})
