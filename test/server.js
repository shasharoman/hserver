const Server = require('../lib/Server');
const ParamsRouter = require('../lib/ParamsRouter');
const http = require('http');
const expect = require('chai').expect;

describe('server', () => {
    it('process, context direct', async () => {
        let server = new Server();
        server.use('/a/b/c', ctx => ctx.pathname);

        expect(await server.process({
            pathname: '/a/b/c'
        })).to.be.equal('/a/b/c');
    });

    it('listen', async () => {
        let server = new Server();
        server.use('/a/b/c', ctx => ctx.pathname);
        server.listen(3001);

        expect(await server.process({
            pathname: '/a/b/c'
        })).to.be.equal('/a/b/c');

        await new Promise(resolve => setTimeout(resolve, 10));
        let ret = {};
        let req = http.request('http://localhost:3001/a/b/c', res => {
            ret.statusCode = res.statusCode;
            ret.headers = res.headers;
            res.on('data', chunk => {
                ret.body = chunk.toString();
            });
        });
        req.end();
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(ret.headers['content-type']).to.be.equal('application/json; charset=utf8');
        expect(ret.statusCode).to.be.equal(200);
        expect(ret.body).to.be.equal('"/a/b/c"');

        server.close();
    });

    it('take', async () => {
        let server = new Server();

        let router = new ParamsRouter();
        router.use('/', () => '');
        router.use('/a', () => '');

        let origin = router.toString();
        server = server.take('/', router);

        expect(server.toString()).to.be.equal(origin);
    });
});