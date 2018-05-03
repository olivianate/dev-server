const Koa = require('koa');
const path = require('path');
const opn = require('open');
const koa_static = require('koa-static');
const liveload = require('./util/liveload');
const proxies = require('./util/proxy');
const ip = require('ip');
const devServer = new Koa();

exports.run = (projectConfig) =>{
    const { options, proxy, root } = projectConfig;
    const { port, open, reload } = options;
    
    if(reload) {
        devServer.use(liveload(root));
    };

    // setup static files
    devServer.use(koa_static(root));

    // setup proxy
    Object.keys(proxy).forEach(path=>{
        console.log(proxy[path]);
        devServer.use(proxies(path, {
            target: proxy[path].target,
            changeOrigin: true,
            logs: true,
        }));    
    });

    // start server
    devServer.listen(port);
    if(open){
        const host = ip.address();
        opn(`http://${host}:${port}`);
    }
};