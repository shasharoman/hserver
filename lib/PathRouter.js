const debug = require('debug')('hserver:path-router');

const ptree = require('@shasharoman/ptree');

const StageTree = require('./StageTree');

module.exports = class Router {
    constructor() {
        this.root = new ptree.Tree();
        this.stree = new StageTree(this.root);
    }

    use(path, invoke, options = {}) {
        debug('use', path, options);

        let {
            verb,
            stage
        } = options;

        verb = verb || '*';
        stage = stage || 'accept';

        this.stree.onStage(stage, verb, path, invoke);
    }

    mount(parent, path = '/') {
        debug('mount', parent, path);

        this.root.mount(parent.root, path);
        return parent;
    }

    async process(verb, path, context = {}, asyncListener = () => {}) {
        debug('process', verb, path, context);

        return await this.stree.process(verb, path, context, asyncListener);
    }

    toString() {
        return this.root.toString();
    }
};