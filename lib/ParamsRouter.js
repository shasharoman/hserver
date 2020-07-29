const debug = require('debug')('hserver:params-router');

const PathRouter = require('./PathRouter');
const ParamsTree = require('./ParamsTree');
const _ = require('lodash');

module.exports = class ParamsRouter extends PathRouter {
    constructor() {
        super();

        this.ptree = new ParamsTree(this.root);
    }

    use(path, invoke, options = {}) {
        debug('use', path, options);

        if (!/:/.test(path)) {
            return super.use(path, invoke, options);
        }

        this.ptree.mark(options.verb || '*', path);
        return super.use(path.replace(/:[^/]+/g, ''), invoke, options);
    }

    async process(verb, path, context = {}, asyncListener = () => {}) {
        debug('process', verb, path, context);

        let exists = this.root.exists(path);
        let noParams = !_.some(this.root.path(path), item => !!item.params);
        if (exists && noParams) {
            return await super.process(verb, path, context, asyncListener);
        }

        let ret = this.ptree.find(verb, path);
        if (_.isEmpty(ret)) {
            return await this.stree.notFound(verb, path, context, asyncListener);
        }

        context.params = ret.params;
        return await super.process(verb, ret.normalized, context, asyncListener);
    }
};