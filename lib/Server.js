const debug = require('debug')('hserver:server');
const http = require('http');

const defaultAdapter = require('./adapter');
const ParamsRouter = require('./ParamsRouter');

module.exports = class Server {
    constructor(adapter = {}) {
        this.adapter = Object.assign({}, defaultAdapter, adapter);

        this.router = new ParamsRouter();
        this.server = http.createServer(async (req, res) => {
            let ctx = {};
            let ret = null;
            try {
                this.adapter.onRequest(req);
                res.on('finish', () => {
                    this.adapter.onFinish(ret);
                });

                ctx = await this.adapter.context(req);
                ret = await this.process(ctx);
                if (!res.finished) {
                    await this.adapter.response(res, ctx, ret);
                }
            }
            catch (err) {
                err.stage = err.stage || 'unknown';
                this.adapter.onError(err, res, ctx, ret);
            }
        });
    }

    use(...args) {
        debug('use', ...args);

        this.router.use(...args);
    }

    take(path = '/', router) {
        debug('take', path, router);

        router.mount(this.router, path);
        return this;
    }

    listen(...args) {
        debug('listen', ...args);

        return this.server.listen(...args);
    }

    close(...args) {
        debug('close', ...args);

        return this.server.close(...args);
    }

    async process(ctx) {
        debug('process', ctx);

        return await this.router.process(ctx.method, ctx.pathname, ctx, this.adapter.onError);
    }

    toString() {
        return this.router.toString();
    }
};