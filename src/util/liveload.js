const watchDir = require('./watch');
const tinylr = require('tiny-lr');
const growl = require('growl');
const path = require('path');
const Stream = require('stream');
const PassThrough = require('stream').PassThrough;
const env = process.env.NODE_ENV || 'development';

const getSnippet = (port) => [
  "<!-- livereload snippet -->",
  "<script>document.write('<script src=\"http://'",
  " + (location.host || 'localhost').split(':')[0]",
  " + ':" + port + "/livereload.js?snipver=1\"><\\/script>')",
  "</script>",
  ""
  ].join('\n');

/**
 * 
 * @param {String} root root directory for watching required
 * @param {Object} opts optional options
 * @api public
 */
module.exports = (root, opts = {
  port: 35729,
  includes: [],
  excludes: [],
}) => {
  if (env !== 'development') {
    return async (ctx, next) => {
      await next();
    }
  }
  const port = opts.port;
  opts.includes = opts.includes.concat(['js', 'css', 'html']);
  opts.excludes = opts.excludes.concat(['node_modules']);
  const snippet = getSnippet(port);
  //setup the server
  const server = new tinylr();
  server.listen(port, err => {
    if (err) { throw err; }
    console.log('... Starting Livereload server on ' + port);
  });
  watchDir(root, opts, function (file) {
    //send notification
    const basename = path.basename(file);
    growl('Change file: ' + basename + '. Reloading...', { image: 'Safari', title: 'liveload' });
    server.changed({
      body: { files: file }
    });
  })
  return async (ctx, next) => {
    await next();
    if (ctx.type && !ctx.type.includes('html')) return;

    let body = ctx.body;
    let len = ctx.res.length;
    //replace body
    if (Buffer.isBuffer(ctx.body)) {
      body = ctx.body.toString();
    }

    if (typeof body === 'string') {
      ctx.body = body.replace(/<\/body>/, function (w) {
        if (len) { ctx.set('Content-Length', len + Buffer.byteLength(snippet)); }
        return snippet + w;
      });
    } else if (body instanceof Stream) {
      var stream = ctx.body = new PassThrough();
      body.setEncoding('utf8');
      if (len) { ctx.set('Content-Length', len + Buffer.byteLength(snippet)); }
      body.on('data', chunk => {
        chunk = chunk.replace(/<\/body>/, function (w) {
          return snippet + w;
        });
        stream.write(chunk);
      });
      body.on('end', () => {
        stream.end();
      })
      body.on('error', ctx.onerror);
    }
  }
}