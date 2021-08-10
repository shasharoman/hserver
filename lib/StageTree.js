const debug = require('debug')('hserver:stage-tree');

const _ = require('lodash');

class StageTree {
    constructor(root) {
        this.root = root;
    }

    onStage(stage, verbs, path, invoke) {
        debug('onstage', stage, verbs, path);

        if (!['enter', 'input', 'accept', 'output', 'leave'].includes(stage)) {
            throw new Error(`unsupport stage:${stage}`);
        }

        if (_.isString(verbs)) {
            verbs = [verbs];
        }

        let node = this.root.findOrMake(path);
        node.stage = node.stage || {};
        node.stage[stage] = node.stage[stage] || {};

        _.each(verbs, verb => {
            node.stage[stage][verb] = node.stage[stage][verb] || [];
            node.stage[stage][verb].push(invoke);
        });
    }

    invoke(verb, path) {
        debug('invoke', verb, path);

        let nodes = this.root.path(path);
        if (_.isEmpty(nodes)) {
            return [];
        }

        return _.map(nodes, node => _.mapValues({
            enter: 'enter',
            input: 'input',
            accept: 'accept',
            output: 'output',
            leave: 'leave'
        }, (value) => {
            let stage = (node.stage || {})[value] || {};
            return (stage[verb] || []).concat(verb === '*' ? [] : (stage['*'] || []));
        }));
    }

    async process(verb, path, context, on) {
        debug('process', verb, path, context);

        let invokes = this.invoke(verb, path);
        if (_.isEmpty(invokes) || _.isEmpty(_.last(invokes).accept)) {
            return await this.notFound(verb, path, context, on);
        }

        let ret = undefined;
        let enters = [];
        let skipOutput = false;

        try {
            for (let invoke of invokes) {
                (invoke.enter || []).forEach(async item => {
                    try {
                        await item(context);
                    }
                    catch (err) {
                        on('enter', err);
                    }
                });
                enters.unshift(invoke);

                for (let input of invoke.input) {
                    try {
                        ret = await input(context);
                        if (!_.isUndefined(ret)) {
                            skipOutput = true;
                            break;
                        }
                    }
                    catch (err) {
                        err.stage = 'input';
                        throw err;
                    }
                }
                if (!_.isUndefined(ret)) {
                    break;
                }
            }

            if (_.isUndefined(ret)) {
                for (let accept of _.first(enters).accept) {
                    try {
                        ret = await accept(context);
                        if (!_.isUndefined(ret)) {
                            break;
                        }
                    }
                    catch (err) {
                        err.stage = 'accept';
                        throw err;
                    }
                }
                ret = _.isUndefined(ret) ? 204 : ret;
            }

            for (let invoke of enters) {
                if (!skipOutput) {
                    for (let output of invoke.output) {
                        try {
                            let r = await output(ret, context);
                            if (!_.isUndefined(r)) {
                                ret = r;
                            }
                        }
                        catch (err) {
                            err.stage = 'output';
                            throw err;
                        }
                    }
                }

                (invoke.leave || []).forEach(async item => {
                    try {
                        await item(ret, context);
                    }
                    catch (err) {
                        on('leave', err);
                    }
                });
            }
        }
        catch (err) {
            for (let invoke of enters) {
                (invoke.leave || []).forEach(async item => {
                    try {
                        await item(ret, context, err);
                    }
                    catch (err) {
                        on('leave', err);
                    }
                });
            }

            throw err;
        }

        return ret;
    }

    async notFound(verb, path, context, on) {
        debug('not-found', verb, path, context);

        let ret = undefined;
        let skipOutput = false;
        let invoke = this.invoke(verb, '/')[0];

        try {
            (invoke.enter || []).forEach(async item => {
                try {
                    await item(context);
                }
                catch (err) {
                    on('enter', err);
                }
            });

            for (let input of invoke.input) {
                try {
                    ret = await input(context);
                    if (!_.isUndefined(ret)) {
                        skipOutput = true;
                        break;
                    }
                }
                catch (err) {
                    err.stage = 'input';
                    throw err;
                }
            }

            if (!skipOutput) {
                for (let output of invoke.output) {
                    try {
                        let r = await output(ret, context);
                        if (!_.isUndefined(r)) {
                            ret = r;
                        }
                    }
                    catch (err) {
                        err.stage = 'output';
                        throw err;
                    }
                }
            }

            (invoke.leave || []).forEach(async item => {
                try {
                    await item(ret, context, new Error('Not Found'));
                }
                catch (err) {
                    on('leave', err);
                }
            });
        }
        catch (err) {
            (invoke.leave || []).forEach(async item => {
                try {
                    await item(ret, context, err);
                }
                catch (err) {
                    on('leave', err);
                }
            });

            throw err;
        }

        return ret || 404;
    }
}

module.exports = StageTree;