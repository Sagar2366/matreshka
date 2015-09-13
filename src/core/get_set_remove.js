define(['matreshka_dir/var/magic', 'matreshka_dir/var/sym'], function(magic, sym) {
    var set;

    magic.get = function(object, key) {
        return object && object[key];
    };

    // set method is the most often used method
    // we need to optimize it as good as possible
    set = magic.set = function(object, key, v, evt) {

        if (!object || typeof object != 'object') return object;

        var type = typeof key,
            _isNaN = Number.isNaN || function(value) {
                return typeof value == 'number' && isNaN(value);
            },
            special, events, prevVal, newV, i, _evt, triggerChange;

        if (type == 'undefined') return object;

        if (type == 'object') {
            for (i in key)
                if (key.hasOwnProperty(i)) {
                    set(object, i, key[i], v);
                }
            return object;
        }

        if (!object[sym] || !object[sym].special || !object[sym].special[key]) {
            object[key] = v;
            return object;
        }

        special = object[sym].special[key];
        events = object[sym].events;

        prevVal = special.value;

        if (special.mediator && v !== prevVal && (!evt || !evt.skipMediator && !evt.fromMediator)) {
            newV = special.mediator(v, prevVal, key, object);
        } else {
            newV = v;
        }

        _evt = {
            value: newV,
            previousValue: prevVal,
            key: key,
            node: special.$nodes[0] || null,
            $nodes: special.$nodes,
            self: object
        };

        if (evt && typeof evt == 'object') {
            for (i in evt) {
                _evt[i] = evt[i];
            }
        }

        triggerChange = (newV !== prevVal || _evt.force) && !_evt.silent;

        if (triggerChange) {
            events['beforechange:' + key] && magic._fastTrigger(object, 'beforechange:' + key, _evt);

            events.beforechange && magic._fastTrigger(object, 'beforechange', _evt);
        }

        special.value = newV;

        if (newV !== prevVal || _evt.force || _evt.forceHTML || newV !== v && !_isNaN(newV)) {
            if (!_evt.silentHTML) {
                events['_runbindings:' + key] && magic._fastTrigger(object, '_runbindings:' + key, _evt);
            }
        }

        if (triggerChange) {
            events['change:' + key] && magic._fastTrigger(object, 'change:' + key, _evt);

            events.change && magic._fastTrigger(object, 'change', _evt);
        }

        if ((newV !== prevVal || _evt.force || _evt.forceHTML) && !_evt.skipLinks) {
            events['_rundependencies:' + key] &&
                magic._fastTrigger(object, '_rundependencies:' + key, _evt);
        }

        return object;
    };


    magic.remove = function(object, key, evt) {
        if (!object || typeof object != 'object') return null;

        var exists,
            keys = String(key).split(/\s/),
            i,
            _evt = {
                keys: keys
            };

        if (evt && typeof evt == 'object') {
            for (i in evt) {
                _evt[i] = evt[i];
            }
        }

        for (i = 0; i < keys.length; i++) {
            key = keys[i];
            exists = key in object;

            if (exists) {
                _evt.key = key;
                _evt.value = object[key];

                try { // @IE8 spike
                    delete object[key];
                } catch (e) {}

                if (object[sym]) {
                    magic.unbindNode(object, key);
                    magic.off(object, 'change:' + key + ' beforechange:' + key
                        + ' _runbindings:' + key + ' _rundependencies:' + key);
                    delete object[sym].special[key];

                    if (!_evt.silent) {
                        magic._fastTrigger(object, 'delete', _evt);
                        magic._fastTrigger(object, 'delete:' + key, _evt);
                    }
                }
            }
        }

        return object;
    };
});
