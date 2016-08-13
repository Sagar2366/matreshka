import lookForBinder from '../lookforbinder';
import createNodeHandler from './_createnodehandler';
import createObjectHandler from './_createobjecthandler';
import triggerOne from '../trigger/_triggerone';
import addListener from '../on/_addlistener';
import debounce from '../_helpers/debounce';
import set from '../set';
import matreshkaError from '../_helpers/matreshkaerror';

const spaceReg = /\s+/;

// handles binding for single property & node
// the function is used at bindNode
export default function bindSingleNode(object, {
    binder: givenBinder,
    key,
    $nodes,
    node,
    eventOptions,
    propDef
}) {
    const {
        silent,
        getOnBind,
        setOnBind,
        debounceSetValue=true,
        debounceGetValue=true,
        debounceSetValueOnBind=false,
        debounceGetValueOnBind=false,
        useExactBinder=false
    } = eventOptions;
    // create bindings array in property definition object
    const bindings = propDef.bindings = propDef.bindings || []; // eslint-disable-line no-param-reassign
    let { value } = propDef;
    const bindingOptions = {
        self: object,
        key,
        value,
        $nodes,
        node
    };
    let isUndefined = typeof value === 'undefined';
    let binder;
    let objectHandler;
    let nodeHandler;

    // do not allow to bind more than 2 nodes to "sandbox" (for all nodes) and "container" (for Matreshka.Array)
    if(bindings.length && (key === 'sandbox' || object.isMatreshkaArray && key === 'container')) {
        throw matreshkaError('binding:magic_props_nodes_length');
    }


    // get actual binder
    if (givenBinder !== null) {
        // by default binder passed to bindNode is extended by default binder
        // useExactBinder turns this behavior off
        if(useExactBinder) {
            binder = givenBinder;
        } else {
            // getting default binder
            const foundBinder = lookForBinder(node);

            // if default binder is found
            if (foundBinder) {
                // extend found binder by given binder
                if (givenBinder) {
                    nofn.assign(foundBinder, givenBinder);
                }

                binder = foundBinder;
            } else {
                // default binder is not found
                binder = givenBinder || {};
            }
        }
    }

    const { getValue, setValue, on, initialize } = binder;

    // call binder.initialize
    if (initialize) {
        initialize.call(node, bindingOptions);
    }

    // calls getValue immediately and reassign a property
    // when all required conditions are met for this
    if(getValue) {
        const syncNodeHandler = createNodeHandler({
            object,
            key,
            node,
            propDef,
            binder,
            bindingOptions
        });

        let debouncedNodeHandler;

        if(debounceGetValue || debounceGetValueOnBind) {
            debouncedNodeHandler = debounce(syncNodeHandler);
        }

        if (debounceGetValue) {
            nodeHandler = debouncedNodeHandler;
        } else {
            nodeHandler = syncNodeHandler;
        }

        // TODO: Throw error when "on" and maybe other binder properties has wrong type
        if (typeof on === 'function') {
            on.call(node, nodeHandler, bindingOptions);
        } else if (typeof on === 'string'){
            // addEventListener is faster than "on" method from any DOM library
            nofn.forEach(on.split(spaceReg),
                evtName => node.addEventListener(evtName, nodeHandler));
        }

        if (isUndefined && getOnBind !== false || getOnBind === true) {
            if(debounceGetValueOnBind) {
                debouncedNodeHandler();
            } else {
                syncNodeHandler();
            }
        }

        isUndefined = typeof propDef.value === 'undefined';
    }

    // add needed event handlers the object when setValue is given
    if (setValue) {
        const syncObjectHandler = createObjectHandler({
            node,
            propDef,
            binder,
            bindingOptions,
            eventOptions
        });

        let debouncedObjectHandler;

        if(debounceSetValue || debounceSetValueOnBind) {
            debouncedObjectHandler = debounce(syncObjectHandler);
        }

        if (debounceSetValue) {
            objectHandler = debouncedObjectHandler;
        } else {
            objectHandler = syncObjectHandler;
        }

        addListener(object, `_change:bindings:${key}`, objectHandler, null, { skipChecks: true });

        if (!isUndefined && setOnBind !== false || setOnBind === true) {
            if(debounceSetValueOnBind) {
                debouncedObjectHandler();
            } else {
                syncObjectHandler();
            }
        }
    }

    // add binding data to bindings array
    bindings.push({
        on,
        node,
        binder,
        objectHandler,
        nodeHandler,
        bindingOptions
    });

    // fire events
    if (!silent) {
        const extendedEventOptions = {
            key,
            node,
            ...eventOptions
        };

        triggerOne(object, `bind:${key}`, extendedEventOptions);
        triggerOne(object, 'bind', extendedEventOptions);
    }
}