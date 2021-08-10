const ParamsTree = require('../lib/ParamsTree');
const ptree = require('@shasharoman/ptree');
const expect = require('chai').expect;

describe('params tree', () => {
    it('find, single params', () => {
        let tree = new ParamsTree(new ptree.Tree());
        tree.mark('GET', '/a/b:.+');
        tree.mark('GET', '/a/b:.+/c');

        expect(tree.find('GET', '/a/1').normalized).to.be.equal('/a/b');
        expect(tree.find('GET', '/a/1').params.b[0]).to.be.equal('1');

        expect(tree.find('GET', '/a/1/c').normalized).to.be.equal('/a/b/c');
        expect(tree.find('GET', '/a/1/c').params.b[0]).to.be.equal('1');
    });

    it('find, multi params', () => {
        let tree = new ParamsTree(new ptree.Tree());

        tree.mark('GET', '/a/b:.+/c:\\d+');

        expect(tree.find('GET', '/a/b/1').normalized).to.be.equal('/a/b/c');
        expect(tree.find('GET', '/a/b/1').params.b[0]).to.be.equal('b');
        expect(tree.find('GET', '/a/b/1').params.c[0]).to.be.equal('1');
    });

    it('find, differ verb', () => {
        let tree = new ParamsTree(new ptree.Tree());

        tree.mark('GET', '/a/b:.+/c:\\d+');
        expect(tree.find('GET', '/a/b/1').normalized).to.be.equal('/a/b/c');
        expect(tree.find('GET', '/a/b/1').params.b[0]).to.be.equal('b');
        expect(tree.find('GET', '/a/b/1').params.c[0]).to.be.equal('1');

        expect(tree.find('POST', '/a/b/1')).to.be.deep.equal({});

        tree.mark('POST', '/a/b:.+/c:\\d+');
        expect(tree.find('POST', '/a/b/1').normalized).to.be.equal('/a/b/c');
    });

    it('find, root params', () => {
        let tree = new ParamsTree(new ptree.Tree());

        tree.mark('GET', '/a:.+/b/c');
        tree.mark('GET', '/a:.+/d/f');
        expect(tree.find('GET', '/a/b/c').normalized).to.be.equal('/a/b/c');
        expect(tree.find('GET', '/a/b/c').params.a[0]).to.be.equal('a');
        expect(tree.find('GET', '/1/d/f').normalized).to.be.equal('/a/d/f');
        expect(tree.find('GET', '/1/d/f').params.a[0]).to.be.equal('1');
    });

    it('find, verb:*', () => {
        let tree = new ParamsTree(new ptree.Tree());

        tree.mark('*', '/a:.+/b/c');
        expect(tree.find('GET', '/a/b/c').normalized).to.be.equal('/a/b/c');
        expect(tree.find('GET', '/a/b/c').params.a[0]).to.be.equal('a');
    });

    it('find, specific-verb', () => {
        let tree = new ParamsTree(new ptree.Tree());

        tree.mark('*', '/a:.+/b/c:.+');
        tree.mark('GET', '/a:.+/b/d:.+');
        expect(tree.find('GET', '/1/b/c').normalized).to.be.equal('/a/b/d');
        expect(tree.find('GET', '/1/b/c').params.a[0]).to.be.equal('1');

        expect(tree.find('*', '/1/b/c').normalized).to.be.equal('/a/b/c');
        expect(tree.find('*', '/1/b/c').params.a[0]).to.be.equal('1');
    });

    it('find, mark order', () => {
        let tree = new ParamsTree(new ptree.Tree());

        tree.mark('GET', '/a/b/c:.+');
        tree.mark('GET', '/a/b/d:.+');
        expect(tree.find('GET', '/a/b/1', false).normalized).to.be.equal('/a/b/d');

        tree = new ParamsTree(new ptree.Tree());

        tree.mark('GET', '/a/b/d:.+');
        tree.mark('GET', '/a/b/c:.+');
        expect(tree.find('GET', '/a/b/1', false).normalized).to.be.equal('/a/b/c');
    });

    it('find, find order', () => {
        let tree = new ParamsTree(new ptree.Tree());

        tree.mark('GET', '/a/b/c:.+');
        tree.mark('GET', '/a/b/d:.+');
        expect(tree.find('GET', '/a/b/1', false).normalized).to.be.equal('/a/b/d');

        tree.mark('GET', '/a/b/e:.+');
        expect(tree.find('GET', '/a/b/1', false).normalized).to.be.equal('/a/b/d');

        tree = new ParamsTree(new ptree.Tree());
        tree.mark('GET', '/a/b/c:.+');
        tree.mark('GET', '/a/b/d:.+');
        tree.mark('GET', '/a/b/e:.+');
        expect(tree.find('GET', '/a/b/1', false).normalized).to.be.equal('/a/b/e');
    });
});