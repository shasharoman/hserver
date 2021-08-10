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
});