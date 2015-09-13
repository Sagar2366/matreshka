define([
    'matreshka_dir/var/magic',
    'matreshka_dir/core/initmk',
    'matreshka_dir/util/common'
], function(magic, initMK, util) {
    var onDebounce = magic.onDebounce = function(object, names, callback, debounceDelay, triggerOnInit, context, evtData) {
        if (!object || typeof object != 'object') return object;

        var cbc, i;

        if (typeof names == 'object') {
            for (i in names)
                if (names.hasOwnProperty(i)) {
                    onDebounce(object, i, names[i], callback, debounceDelay, triggerOnInit, context);
                }

            return object;
        }

        // flip args
        if (typeof debounceDelay != 'number') {
            evtData = context;
            context = triggerOnInit;
            triggerOnInit = debounceDelay;
            debounceDelay = 0;
        }

        cbc = util.debounce(callback, debounceDelay);

        // set reference to real callback for .off method
        cbc._callback = callback;

        return magic.on(object, names, cbc, triggerOnInit, context, evtData);
    };
});
