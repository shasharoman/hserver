const debug = require('debug')('hserver:params-tree');

const _ = require('lodash');

module.exports = class ParamsTree {
    constructor(root) {
        this.root = root;
        this.cache = [];
    }

    mark(verbs = '*', rule) {
        debug('mark', verbs, rule);

        if (!/:/.test(rule)) {
            return;
        }

        if (_.isString(verbs)) {
            verbs = [verbs];
        }

        let current = '';
        let params = rule.match(/[^/]+:[^/]+/g);

        _.each(rule.split(/[^/]+:[^/]+/g), (item, index) => {
            current += item + (params[index] || '');
            let node = this.root.findOrMake(current.replace(/:[^/]+/g, ''));
            if (!params[index]) {
                return;
            }

            node.params = node.params || {};
            _.each(verbs, verb => {
                node.params[verb] = node.params[verb] || [];
                node.params[verb].push(params[index].replace(/[^/]+:/g, ''));
            });
        });
    }

    find(verb, path) {
        debug('find', verb, path);

        let cache = _.find(this.cache, item => {
            if (item.verb !== verb) {
                return false;
            }

            let paths = _.filter(path.split('/'), item => !!item);
            if (paths.length !== item.rules.length) {
                return false;
            }

            let flags = _.map(paths, (path, index) => {
                if (_.isString(item.rules[index])) {
                    return item.rules[index] === path;
                }
                return item.rules[index].test(path);
            });
            return !_.some(flags, item => !item);
        });
        if (cache) {
            return this.parse(path, cache.rule);
        }

        let ends = [this.root.root];
        let names = _.filter(path.split('/'), item => !!item);

        for (let i = 0; i < names.length; i++) {
            let name = names[i];
            ends = _.map(ends, item => _.filter(item.children, item => {
                if (!item.params) {
                    return item.name === name;
                }

                let matchs = (item.params[verb] || []).concat(verb === '*' ? [] : ((item.params || {})['*'] || []));
                return _.some(matchs, item => new RegExp(item).test(name));
            }));
            ends = _.flatten(ends);

            if (_.isEmpty(ends)) {
                break;
            }
        }

        if (_.isEmpty(ends)) {
            return {};
        }
        let matchs = _.map(ends, item => {
            let nodes = [item];
            while (nodes[0].parent) {
                nodes.unshift(nodes[0].parent);
            }
            nodes.shift(); // shift root node
            return nodes;
        });
        if (matchs.length > 1) {
            matchs = _.sortBy(matchs, nodes => {
                let priority = 0;
                for (let i = 0; i < nodes.length; i++) {
                    if (!nodes.params) { // is name matched
                        priority += 1;
                        continue;
                    }

                    let matchs = nodes[i].params[verb] || [];
                    priority += _.some(matchs, item => new RegExp(item).test(names[i])) ? 1 : 0;
                }
                return priority;
            });
        }

        let rule = '/' + _.map(_.last(matchs), (item, index) => {
            let matchs = ((item.params || {})[verb] || []).concat(verb === '*' ? [] : ((item.params || {})['*'] || []));
            let matched = _.find(matchs, item => new RegExp(item).test(names[index]));

            return matched ? `${item.name}:${matched}` : item.name;
        }).join('/');

        let rules = _.map(_.filter(rule.split('/'), item => !!item), item => {
            if (!/:/.test(item)) {
                return item;
            }
            return new RegExp(item.replace(/[^/]+:/, ''));
        });

        this.cache.push({
            rule,
            verb,
            rules
        });

        return this.parse(path, rule);
    }

    parse(path, rule) {
        debug('parse', path, rule);

        let paths = _.filter(path.split('/'), item => !!item);
        let rules = _.filter(rule.split('/'), item => !!item);

        let params = {};
        _.each(rules, (item, index) => {
            if (!/:/.test(item)) {
                return;
            }

            params[item.replace(/:.+$/g, '')] = paths[index].match(new RegExp(item.replace(/^.+:/g, '')));
        });
        params = _.mapValues(params, items => _.map(items, item => decodeURIComponent(item)));

        return {
            params,
            normalized: rule.replace(/:[^/]+/g, '')
        };
    }
};