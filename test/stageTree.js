const StageTree = require('../lib/StageTree');
const ptree = require('@shasharoman/ptree');
const expect = require('chai').expect;

describe('stage tree', () => {
    it('onStage', () => {
        let fn = () => {};
        let tree = new StageTree(new ptree.Tree());

        tree.onStage('enter', '*', '/', fn);
        tree.onStage('input', 'GET', '/api', fn);
        tree.onStage('accept', 'GET', '/api', fn);
        tree.onStage('output', 'GET', '/api', fn);
        tree.onStage('leave', '*', '/', fn);

        let invoke = tree.invoke('*', '/');
        expect(invoke).to.be.an.instanceof(Array);
        invoke = invoke[0];
        expect(invoke.enter).to.be.an.instanceof(Array);
        expect(invoke.enter.length).to.be.equal(1);
        expect(invoke.leave).to.be.an.instanceof(Array);
        expect(invoke.leave.length).to.be.equal(1);

        expect(invoke.enter[0] === fn).to.be.equal(true);
        expect(invoke.leave[0] === fn).to.be.equal(true);

        let apiInvoke = tree.invoke('GET', '/api');
        expect(apiInvoke).to.be.an.instanceof(Array);
        apiInvoke = apiInvoke[1];
        expect(apiInvoke.enter).to.be.an.instanceof(Array);
        expect(apiInvoke.enter.length).to.be.equal(0);
        expect(apiInvoke.input.length).to.be.equal(1);
        expect(apiInvoke.accept.length).to.be.equal(1);
        expect(apiInvoke.output.length).to.be.equal(1);

        expect(apiInvoke.input[0] === fn).to.be.equal(true);
        expect(apiInvoke.accept[0] === fn).to.be.equal(true);
        expect(apiInvoke.output[0] === fn).to.be.equal(true);
    });

    it('onStage, throw error in accept will be catch in leave stage', async () => {
        let fn = () => {};
        let errFn = () => {
            throw new Error('mock error');
        };
        let errMsg = '';
        let tree = new StageTree(new ptree.Tree());

        tree.onStage('enter', '*', '/', fn);
        tree.onStage('input', 'GET', '/api', fn);
        tree.onStage('accept', 'GET', '/api', errFn);
        tree.onStage('output', 'GET', '/api', fn);
        tree.onStage('leave', '*', '/', (ret, ctx, err) => {
            errMsg = err.message;
        });

        try {
            await tree.process('GET', '/api', {}, () => {});
        }
        catch (err) {
            expect(err.message).to.be.equal('mock error');
        }

        expect(errMsg).to.be.equal('mock error');
    });

    it('onStage, throw error in 404:notFound will be catch in leave stage', async () => {
        let fn = () => {};
        let errFn = () => {
            throw new Error('mock error');
        };
        let errMsg = '';
        let tree = new StageTree(new ptree.Tree());

        tree.onStage('enter', '*', '/', fn);
        tree.onStage('accept', 'GET', '/', errFn);
        tree.onStage('leave', '*', '/', (ret, ctx, err) => {
            errMsg = err.message;
        });

        await tree.process('GET', '/app/xxx', {}, () => {});
        expect(errMsg).to.be.equal('Not Found');
    });
});