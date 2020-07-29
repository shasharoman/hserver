const Router = require('../lib/ParamsRouter');
const expect = require('chai').expect;

describe('params router', () => {
    it('process, differ verb', async () => {
        let router = new Router();

        router.use('/', () => '/');
        router.use('/any:.+', () => '/any', {
            verb: 'GET'
        });
        router.use('/num:\\d+', () => '/num', {
            verb: 'POST'
        });

        expect(await router.process('GET', '/')).to.be.equal('/');
        expect(await router.process('POST', '/')).to.be.equal('/');

        expect(await router.process('GET', '/api')).to.be.equal('/any');
        expect(await router.process('POST', '/111')).to.be.equal('/num');
        expect(await router.process('POST', '/api')).to.be.equal(404);
    });

    it('process, multi params in path', async () => {
        let router = new Router();

        router.use('/any:.+/num:\\d+', () => '/any/num', {
            verb: 'GET'
        });
        router.use('/any:.+/any:.+', () => '/any/any', {
            verb: 'POST'
        });

        expect(await router.process('GET', '/any/1')).to.be.equal('/any/num');
        expect(await router.process('GET', '/any/ok')).to.be.equal(404);
        expect(await router.process('POST', '/any/1')).to.be.equal('/any/any');
    });

    it('process, euqal name but not match rule', async () => {
        let router = new Router();

        router.use('/num:\\d+', () => '/num');

        expect(await router.process('GET', '/111')).to.be.equal('/num');
        expect(await router.process('GET', '/num')).to.be.equal(404);
        expect(await router.process('GET', '/ok')).to.be.equal(404);
    });

    it('mount', async () => {
        let router1 = new Router();
        let router2 = new Router();

        router1.use('/a/b/c:.+', () => 'ok');
        expect(await router1.process('GET', '/a/b/c')).to.be.equal('ok');

        router2.use('/a/b/c:.+', () => 'ok');
        expect(await router2.process('GET', '/a/b/c')).to.be.equal('ok');

        router2.mount(router1, '/a/b/c');
        expect(await router1.process('GET', '/a/b/c')).to.be.equal('ok');
        expect(await router1.process('GET', '/a/b/c/a/b/c')).to.be.equal('ok');
    });

    it('params', async () => {
        let router = new Router();

        router.use('/a:\\d+/b:.+', ctx => [ctx.params.a[0], ctx.params.b[0]]);

        expect(await router.process('GET', '/1/b')).to.be.deep.equal(['1', 'b']);
        expect(await router.process('GET', '/100/bbb')).to.be.deep.equal(['100', 'bbb']);
        expect(await router.process('GET', '/a/b')).to.be.equal(404);
    });
});