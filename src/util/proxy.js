const HttpProxy = require('http-proxy');
const proxyServer = HttpProxy.createProxyServer();
const chalk = require('chalk');

module.exports = (context, options) => (ctx, next) => {
  if (!ctx.req.url.startsWith(context)) return next();

  const { logs, rewrite, target } = options;

  return new Promise((resolve, reject) => {
    if (logs) logger(ctx, target);

    if (typeof rewrite === 'function') {
      ctx.req.url = rewrite(ctx.req.url);
    }

    proxyServer.web(ctx.req, ctx.res, options, e => {
      const status = {
        ECONNREFUSED: 503,
        ETIMEOUT: 504
      }[e.code];
      if (status) {
        ctx.status = status;
      }
      resolve();
    });
  });
};

function logger (ctx, target) {
  console.log(
    `${chalk.green('proxy:')} ${chalk.bold(ctx.req.method)} ${chalk.blue(ctx.req.url)} ${chalk.gray('from')} ${chalk.cyan(target)}`
  );
}
