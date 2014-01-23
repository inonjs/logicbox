(function (root, factory) {
    'use strict';

    if (typeof exports === 'object') {
        // CommonJS
        var _           = require('underscore');
        var async       = require('async');
        module.exports  = factory(_, async);
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(['underscore', 'async'], factory);
    } else {
        // Global Variables
        root.logicbox = factory(root._, root.async);
    }
}(this, function (_, async) {
    'use strict';

    var DEFAULT_OPTIONS = {
        basePath: process.cwd()
    };

    return function(env, options) {
        var actions;

        function _require(file) {
            file = require('path').resolve(options.basePath, file);
            return require(file);
        }

        function coerce(thing) {
            if('function' === typeof thing) { return thing; }
            if('string' === typeof thing) { return _require(thing); }

            throw new TypeError('only functions or strings are allowed.');
        }

        function array() {
            return _.chain(arguments).flatten().compact().value();
        }

        function normalize(action) {
            if(typeof action === 'string' || typeof action === 'function') {
                action = { handler: action };
            }

            _.each(['observer', 'pre', 'post'], function(key) {
                action[key] = _.map(array(action[key]), coerce);
            });

            action.handler = coerce(action.handler);

            return action;
        }

        function compose(action) {
            var chain, observers;

            action      = normalize(action);
            chain       = array(action.pre, action.handler, action.post);
            observers   = array(action.observer);

            var iterator = function(input, fn, cb) { fn(env, input, cb); };

            return function(input, cb) {
                async.reduce(chain, input, iterator, function(err, output) {
                    observers.forEach(function(observer) {
                        observer(env, output, err);
                    });
                    cb(err, output);
                });

            };
        }

        options = _.extend({}, DEFAULT_OPTIONS, options);

        actions = _.reduce(options.actions, function(memo, action, name) {
            memo[name] = compose(action);
            return memo;
        }, {});

        return function dispatch(name, input, cb) {
            var handler = actions[name];

            if(!handler) {
                throw new Error('dispatcher cannot find action named "' + name + '"');
            }

            handler(input, cb);
        };
    };

}));
