/**
 * @class ?
 * Replacement for native change events which are tricky to use: to have one change event dispatched
 * on a component Internet Explorer considers that this component must have lost the focus.
 * For this being annoying this custom event may be used, but it may be used for other purposes.
 *
 * @author Pierre Voisin
 * @see CheckBoxGroup
 */
ChangeEvent = Class.create({
    /** @var {private Type} ? Type of this event. */
    type : -1,

    /** @var {private element} ? Element targeted by this event, ie. where the "bubble" is. */
    target : null,

    /** @var {private element} ? Element triggering this event, ie. the element where the change is initiated. */
    source : null,

    /**
     * @constructor ?
     * @param {Type} type Event {@link type type}.
     * @param {element} target Event {@link target target}.
     * @param {element} source Event {@link source source}.
     */
    initialize : function(type, target, source) {
        this.type = type;
        this.target = target;
        this.source = source;
    },

    /**
     * @function {public Type} ? Returns the type of this event.
     */
    getType : function() {
        return this.type;
    },

    /**
     * @function {public element} ? Returns the type of this event.
     */
    getTarget : function() {
        return this.target;
    },

    /**
     * @function {public element} ? Returns the type of this event.
     */
    getSource : function() {
        return this.source;
    },

    toString : function() {
        return "<ChangeEvent type=\"" + this.type + "\""
               + (this.source ? "\" source=\"" + this.source.id + "\"" : "")
               + (this.target ? "\" target=\"" + this.target.id + "\"" : "")
               + "/>";
    }
});

/**
 * @namespace ChangeEvent.?
 * Available types enumeration.
 */
ChangeEvent.Type = {
    /** @var {static integer} ? Default type.*/
    CHANGE : 0
};



/**
 * @class ?
 * CheckBoxGroup objects are made up of check-boxes. One of them is called the "master" since it
 * controls the global group state.
 *
 * A pattern is used to identify the check-boxes of the group while an identifier is given to
 * identify the master check-box.
 *
 * @author Pierre Voisin
 * @see ChangeEvent
 */
CheckBoxGroup = Class.create({
    /**
     * @var {protected boolean} ? Flag which indicates if the check-box group behavior is exclusive or not.
     * When it is true, all the check-boxes have to be checked to see the master check-box checked, and
     * as soon as a check-box is unchecked the master check-box is unchecked. Otherwise, as soon as a
     * check-box is checked the master check-box is checked, and for the master check-box to be
     * unchecked all the check-boxes have to be unchecked.
     */
    exclusive : true,

    /** @var {protected regex} ? Pattern used to identify the check-boxes of this group. */
    pattern : null,
    
    /**
     * @var {protected element} ? Check-box that controls the global check-box group state. Its behavior
     * depends on the {@link CheckBoxGroup.exclusive exclusive} flag value.
     */
    masterCheckBox : null,

    /** @var {protected [element]} ? Check-boxes of this group. */
    checkBoxes : null,

    /**
     * @var {private [object]} ? Listeners added by the group to its check-boxes. These listeners are used to
     * to trigger the change events for the group, that events triggering this group listeners'
     * callbacks.
     */
    checkBoxListeners : null,

    /**
     * @var {protected [object]} ?
     * Listeners to this group. They should be like:
     * <pre>group.addListener({
     *    notifyChange : function({@link ChangeEvent event}) {
     *        ...
     *    }
     *});</pre>
     */
    listeners : null,

    /**
     * @constructor {CheckBoxGroup} ?
     * @param {regex} pattern Pattern used to identify the check-boxes of this group
     * @param {optional string|element} masterCheckBox Master check-box identifier or reference.
     */
    initialize : function(pattern, masterCheckBox) {
        this.pattern = pattern || /^checkBox\[([0-9]+)\]$/;
        this.masterCheckBox = $(masterCheckBox);
        this.checkBoxes = null;
        this.checkBoxListeners = null;
        this.listeners = [];

        this.browse();
    },

    /**
     * @function {public} ?
     * Destroys this check-box group by excluding all its check-boxes and its master check-box.
     */
    destroy : function() {
        this.checkBoxes.each(function(checkBox) {
            this.exclude(checkBox);
        }, this);
        if(this.masterCheckBox) {
            this.exclude(this.masterCheckBox);
        }
    },

    /**
     * @function ? Browses the document in order to find the check-boxes of this group.
     */
    browse : function(useCache) {
        useCache = (useCache != undefined) ? useCache : false;

        // Exclude the current check-boxes.
        if(this.checkBoxes) {
            for(var index = 0; index < this.checkBoxes.length; ++index) {
                this.exclude(this.checkBoxes[index]);
            }
        }

        if(this.masterCheckBox) {
            this.include(this.masterCheckBox);
        }

        this.checkBoxes = [];

        // Browse the document.
        if(!useCache || (CheckBoxGroup.cache.length == 0)) {
            CheckBoxGroup.cache = [];
            $A(document.getElementsByTagName("input")).each(function(field) {
                if(field.type == "checkbox") {
                    CheckBoxGroup.cache.push(field);
                }
            });
        }

        for(var index = 0; index < CheckBoxGroup.cache.length; ++index) {
            var field = CheckBoxGroup.cache[index];
            if(field.id && (field != this.masterCheckBox) && field.id.match(this.pattern)) {
                this.include(field);
            }
        }
    },

    /**
     * @function ? Includes a check-box into this group.
     * @param {element} checkBox Check-box to add to this group.
     * @see exclude
     */
    include : function(checkBox) {
        if(!this.checkBoxListeners) {
            this.checkBoxListeners = {};
        }

        var listener = null;

        if(checkBox == this.masterCheckBox) {
            listener = new CheckBoxGroup.MasterCheckBoxListener(checkBox, this);
        }
        else {
            this.checkBoxes.push(checkBox);
            listener = new CheckBoxGroup.CheckBoxListener(checkBox, this);
        }

        Event.observe(checkBox, "click", listener.notifyClick);
        if(!checkBox.groups) {
            Object.extend(checkBox, {
                groups : [],

                getGroup : function(index) {
                    index = index || 0;
                    return this.groups[index];
                }
            });
        }
        checkBox.groups.push(this);

        this.checkBoxListeners[checkBox.id] = listener;
    },

    /**
     * @function ? Excludes a check-box from this group.
     * @param {element} checkBox Check-box to remove from this group.
     * @see include
     */
    exclude : function(checkBox) {
        if(this.checkBoxListeners[checkBox.id]) {
            checkBox.groups = checkBox.groups.without(this);
            Event.stopObserving(checkBox, "click", this.checkBoxListeners[checkBox.id].notifyClick);
            this.checkBoxListeners[checkBox.id] = null;
        }

        this.checkBoxes = this.checkBoxes.without(checkBox);
    },

    /**
     * @function {public} ? Returns the {@link CheckBoxGroup.masterCheckBox master check-box} of this group.
     */
    getMasterCheckBox : function() {
        return this.masterCheckBox;
    },

    /**
     * @function {public [element]} ? Returns the check-boxes of this group.
     * @param {boolean} browse Tells if the document should be {@link browse browsed} for this operation.
     */
    getCheckBoxes : function(browse) {
        if(!this.checkBoxes || browse) {
            this.browse();
        }

        return this.checkBoxes;
    },

    /**
     * @function {public [element]} ? Returns the selected check-boxes in this group.
     */
    getSelection : function() {
        var selection = $A([]);

        for(var index = 0; index < this.getCheckBoxes().length; ++index) {
            var checkBox = this.getCheckBoxes()[index];
            if(checkBox.checked && checkBox != this.getMasterCheckBox()) {
                selection.push(checkBox);
            }
        }

        return selection;
    },

    /**
     * @function {public} ? Sets the {@link exclusive exclusive} mode of this group.
     * @param {boolean} exclusive true | false
     */
    setExclusive : function(exclusive) {
        this.exclusive = exclusive;
    },

    /**
     * @function {public boolean} ? Tells if this check-box group is exclusive.
     */
    isExclusive : function() {
        return this.exclusive;
    },

    /**
     * @function {public boolean} ? Tells if all the check-boxes of this group are checked.
     */
    isComplete : function() {
        var complete = true;
        var index = 0;
        while(complete && index < this.getCheckBoxes().length) {
            complete &= this.getCheckBoxes()[index].checked;
            ++index;
        }

        return complete;
    },

    /**
     * @function {public boolean} ? Tells if none of the check-boxes of this group are checked.
     */
    isEmpty : function() {
        var empty = true;
        var index = 0;
        while(empty && index < this.getCheckBoxes().length) {
            empty &= !this.getCheckBoxes()[index].checked;
            ++index;
        }

        return empty;
    },

    /**
     * @function {public} ? Adds a {@link listeners listener} to this check-box group.
     * @param {object} listener Listener to add to this check-box group.
     */
    addListener : function(listener) {
        listener.group = this;
        listener.getGroup = function(){return this.group;};
        this.listeners.push(listener);
    },

    /**
     * @function {public} ? Dispatches an {@link ChangeEvent event} to this check-box group listeners.
     * @param {ChangeEvent} event Event to dispatch.
     */
    dispatch : function(event) {
        var index;
        switch(event.getType()) {
            case ChangeEvent.Type.CHANGE:
                for(var index = 0; index < this.listeners.length; ++index) {
                    if(this.listeners[index]["notifyChange"]) {
                        this.listeners[index].notifyChange(event);
                    }
                }
                break;
        }
    }
});

/**
 * @var {private [element]} ? Cache keeping references on the document check-boxes. It is updated
 * by the {@link browse browse} method.
 */
CheckBoxGroup.cache = [];



/** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * CheckBoxListener
 *
 * Internal listener for check-boxes included in a group. It is associated to a check-box and holds
 * a reference on the group.
 */
CheckBoxGroup.CheckBoxListener = Class.create({
    checkBox : null,
    group : null,

    initialize : function(checkBox, group) {
        this.checkBox = $(checkBox);
        this.group = group;
        // We need distinct instances of the method "notifyClick" since it is the actual listener
        // (DOM level). If we do not bind it Event#stopObserving will remove any check-box listener
        // put on the check-box, even those of other groups.
        this.notifyClick = this.constructor.prototype.notifyClick.bind(this);
    },

    notifyClick : function(event) {
//console.info((this.checkBox.checked ? "+" : "-") + "[" + this.checkBox.id + "]");
        var changes = [];

        // If there is a master check-box controlling the group...
        var masterCheckBox = this.group.getMasterCheckBox()
        if(masterCheckBox) {
            // Was the box checked?
            if(this.checkBox.checked) {
                if(this.group.isExclusive() && this.group.isComplete() || !this.group.isExclusive()) {
                    if(!masterCheckBox.checked) {
                        changes.push(masterCheckBox);
                    }
                    masterCheckBox.checked = true;
                }
            }
            else {
                if(this.group.isExclusive() || !this.group.isExclusive() && this.group.isEmpty()) {
                    if(masterCheckBox.checked) {
                        changes.push(masterCheckBox);
                    }
                    masterCheckBox.checked = false;
                }
            }
        }

        // Dispatch an event related to the check-box which changed.
        this.group.dispatch(new ChangeEvent(ChangeEvent.Type.CHANGE, this.checkBox, Event.element(event)));
        // Dispatch an event related to each other check-box which was changed.
        for(var index = 0; index < changes.length; ++index) {
            this.group.dispatch(new ChangeEvent(ChangeEvent.Type.CHANGE, changes[index], Event.element(event)));
        }
    }
});



/** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * MasterCheckBoxListener
 *
 * Internal listener for the master check-box of a group. It is associated to a check-box and holds
 * a reference on the group.
 */
CheckBoxGroup.MasterCheckBoxListener = Class.create(CheckBoxGroup.CheckBoxListener, {
    notifyClick : function(event) {
//console.info((this.checkBox.checked ? "+" : "-") + "[" + this.checkBox.id + "]*");
        var changes = [];
        var checkBoxes = this.group.getCheckBoxes();

        // Was the box checked?
        if(this.checkBox.checked) {
            // Check all the check-boxes of the group.
            for(var index = 0; index < checkBoxes.length; ++index) {
                if(!checkBoxes[index].checked) {
                    changes.push(checkBoxes[index]);
                }
                checkBoxes[index].checked = true;
            }
        }
        else {
            // Uncheck all the check-boxes of the group.
            for(var index = 0; index < checkBoxes.length; ++index) {
                if(checkBoxes[index].checked) {
                    changes.push(checkBoxes[index]);
                }
                checkBoxes[index].checked = false;
            }
        }

        // Dispatch an event related to the master check-box.
        this.group.dispatch(new ChangeEvent(ChangeEvent.Type.CHANGE, this.checkBox, Event.element(event)));
        // Dispatch an event for each check-box which was changed.
        for(var index = 0; index < changes.length; ++index) {
            this.group.dispatch(new ChangeEvent(ChangeEvent.Type.CHANGE, changes[index], Event.element(event)));
        }
    }
});
