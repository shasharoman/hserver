const expect = require('chai').expect;

describe('router(path)', wrap(require('../lib/PathRouter')));
describe('router(params)', wrap(require('../lib/ParamsRouter')));

function wrap(Router) {
    return () => {
        it('use', async () => {
            let routerA = new Router();
            routerA.use('/', () => '');
            routerA.use('/a', () => '');

            let routerB = new Router();
            routerB.use('/a', () => '');

            expect(routerA.toString()).to.be.equal(routerB.toString());
        });

        it('process, accept', async () => {
            let router = new Router();

            router.use('/', () => '/');
            router.use('/api', () => '/api', {
                verb: 'GET'
            });

            expect(await router.process('GET', '/')).to.be.equal('/');
            expect(await router.process('POST', '/')).to.be.equal('/');

            expect(await router.process('GET', '/api')).to.be.equal('/api');
            expect(await router.process('GET', '/404')).to.be.equal(404);
        });

        it('process, series invoke input', async () => {
            let router = new Router();
            let event = [];

            router.use('/api', () => '/api');
            router.use('/api', async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                event.push(1);
            }, {
                stage: 'input'
            });
            router.use('/api', async () => {
                await new Promise(resolve => setTimeout(resolve, 5));
                event.push(2);
            }, {
                stage: 'input'
            });
            await router.process('GET', '/api');

            expect(event).to.be.deep.equal([1, 2]);
        });

        it('procecss, series invoke output', async () => {
            let router = new Router();
            let event = [];

            router.use('/api', () => '/api');
            router.use('/api', async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                event.push(1);
            }, {
                stage: 'output'
            });
            router.use('/api', async () => {
                await new Promise(resolve => setTimeout(resolve, 5));
                event.push(2);
            }, {
                stage: 'output'
            });

            expect(await router.process('GET', '/api')).to.be.equal('/api');
            expect(event).to.be.deep.equal([1, 2]);
        });

        it('process, skip output when input has result', async () => {
            let router = new Router();

            let inputFlag = false;
            let outputFlag = false;

            router.use('/api', () => '/api');
            router.use('/api', () => {
                inputFlag = true;
                return inputFlag;
            }, {
                stage: 'input'
            });
            router.use('/api', () => {
                outputFlag = true;
            }, {
                stage: 'output'
            });

            expect(await router.process('GET', '/api')).to.be.equal(true);
            expect(inputFlag).to.be.equal(true);
            expect(outputFlag).to.be.equal(false);
        });

        it('process, enter & leave', async () => {
            let router = new Router();
            let event = [];

            router.use('/', () => event.push('enter'), {
                stage: 'enter'
            });
            router.use('/', () => '/');
            router.use('/', () => event.push('leave'), {
                stage: 'leave'
            });

            expect(await router.process('GET', '/')).to.be.equal('/');
            expect(event).to.be.deep.equal(['enter', 'leave']);
        });

        it('process, invoke enter parallel', async () => {
            let router = new Router();
            let event = [];

            router.use('/', async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                event.push(1);
            }, {
                stage: 'enter'
            });
            router.use('/', async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                event.push(1);
            }, {
                stage: 'enter'
            });
            router.use('/', () => '/');

            expect(await router.process('GET', '/')).to.be.equal('/');

            expect(event).to.be.deep.equal([]);
            await new Promise(resolve => setTimeout(resolve, 12));
            expect(event).to.be.deep.equal([1, 1]);
        });

        it('process, enter-error', async () => {
            let router = new Router();

            router.use('/', () => {
                throw new Error();
            }, {
                stage: 'enter'
            });
            router.use('/', () => '/');

            let error = false;
            expect(await router.process('GET', '/', {}, name => {
                error = name === 'enter';
            })).to.be.equal('/');

            await new Promise(resolve => setTimeout(resolve, 12));
            expect(error).to.be.equal(true);
        });

        it('process, leave-error', async () => {
            let router = new Router();

            router.use('/', () => {
                throw new Error();
            }, {
                stage: 'leave'
            });
            router.use('/', () => '/');

            let error = false;
            expect(await router.process('GET', '/', {}, name => {
                error = name === 'leave';
            })).to.be.equal('/');

            await new Promise(resolve => setTimeout(resolve, 10));
            expect(error).to.be.equal(true);
        });

        it('process, context', async () => {
            let router = new Router();

            router.use('/', ctx => ctx);

            expect(await router.process('GET', '/', {})).to.be.deep.equal({});
            expect(await router.process('GET', '/', [])).to.be.deep.equal([]);
        });

        it('mount, root', async () => {
            let router1 = new Router();
            let router2 = new Router();

            router1.use('/a', () => {});
            router2.use('/b', () => {});
            router2.mount(router1);

            let router = new Router();
            router.use('/a', () => {});
            router.use('/b', () => {});

            expect(router1.toString()).to.be.equal(router.toString());
        });

        it('mount, specific path', async () => {
            let router1 = new Router();
            let router2 = new Router();

            router1.use('/a/b', () => {});
            router2.use('/c', () => {});
            router2.mount(router1, '/a/b');

            let router = new Router();
            router.use('/a/b', () => {});
            router.use('/a/b/c', () => {});

            expect(router1.toString()).to.be.equal(router.toString());
        });

        it('mount, accept', async () => {
            let router1 = new Router();
            let router2 = new Router();

            router1.use('/a/b', () => {});
            router2.use('/c', () => '/c');
            router2.mount(router1, '/a/b');

            expect(await router1.process('GET', '/a/b/c', {})).to.be.equal('/c');
            expect(await router2.process('GET', '/c', {})).to.be.equal(404);
        });

        it('process, omit first / in path', async () => {
            let router = new Router();

            router.use('/a/b/c', () => 'ok');
            expect(await router.process('POST', 'a/b/c', {})).to.be.equal('ok');

            router.use('d/e/f', () => 'ok');
            expect(await router.process('POST', '/d/e/f', {})).to.be.equal('ok');
        });

        it('process, output', async () => {
            let router = new Router();
            let originRet = null;

            router.use('/api', () => 'ok');
            router.use('/api', ret => {
                originRet = ret;
                return 'normalized';
            }, {
                stage: 'output'
            });

            expect(await router.process('GET', '/api', {})).to.be.equal('normalized');
            expect(originRet).to.be.equal('ok');
        });

        it('process, 204', async () => {
            let router = new Router();

            router.use('/api', () => {});
            expect(await router.process('GET', '/api', {})).to.be.equal(204);
        });

        it('process, 404', async () => {
            let router = new Router();

            router.use('/api', () => {});
            expect(await router.process('GET', '/API', {})).to.be.equal(404);
        });
    };
}