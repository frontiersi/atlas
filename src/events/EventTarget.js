define([
  'atlas/lib/utility/Setter',
  'atlas/lib/utility/Class'
], function(Setter, Class) {
  "use strict";

  /**
   * @classdesc EventTarget is a mixin class that provides an object with the
   * ability to dispatch and listen to events. This implementation is close to
   * dojo/on than the DOM Event model.
   *
   * @param {atlas.events.EventManager} [em=null] - The EventManager object managing the event system.
   * @param {atlas.events.EventTarget} [parent=null] - The parent of the EventTarget.

   * @class atlas.events.EventTarget
   */
  return Class.extend(/** @lends atlas.events.EventTarget# */ {

    /**
     * The EventManager for this EventTarget.
     * @type {atlas.events.EventManager}
     * @protected
     */
    _eventManager: null,

    /**
     * Maps an EventListenerID to a tuple containing the Event type and
     * the event handler callback.
     * @type {Object}
     * @private
     */
    _eventHandlers: null,

    /**
     * Each EventListener needs a unique ID. These are determined from this counter.
     * @type {Number}
     * @private
     */
    _nextEventListenerId: 0,

    /**
     * Constructs a new EventTarget.
     * @see {@link atlas.events.EventTarget}
     * @ignore
     */
    _init: function(em, parent) {
      this._eventManager = Setter.def(em, null);
      this._eventHandlers = {};
      parent && this.setParent(parent);
    },

    /**
     * Initialise the EventTarget post-construction.
     * @param {atlas.events.EventManager} em - The EventManager object managing the event system.
     * @param {atlas.events.EventTarget} parent - The parent EventTarget of the EventTarget.
     */
    initEventTarget: function(em, parent) {
      this._eventManager = em;
      this.parent = parent;
    },

    /**
     * Notify the EventManager that an event has been emitted. The EventManager
     * then handles the propagation of the event through the EventTarget hierarchy.
     * @param  {atlas.events.Event} event - The Event object to be propagated.
     */
    dispatchEvent: function(event) {
      this._eventManager.dispatchEvent(event);
    },

    /**
     * Allows an object to register to events emmited from the EventTarget.
     * @param {String} type - The name of the event being registered to.
     * @param {Function} callback - A callback function to be called when the event occurs.
     * @returns {Object} An EventListener object used to de-register the EventListener from the event.
     */
    addEventListener: function(type, callback) {
      // Use closure in place of lang.hitch for the cancel() function.
      var listener = {
        id: 'id' + this._nextEventListenerId,
        cancel: function(target, id) {
          return function() {
            target._removeEventListener(id);
          };
        }(this, 'id' + this._nextEventListenerId)
      };
      // Add the EventListener to the eventHandlers map.
      this._eventHandlers[listener.id] = {
        type: type,
        // Prevent any events dispatched in the handler from causing infinite loops if the handler is
        // invoked before it completes execution.
        callback: this._wrapEventListenerCallback(callback).bind(this)
      };
      this._nextEventListenerId++;
      return listener;
    },

    /**
     * @param  {Function} callback
     * @return {Function} A wrapped version of the given callback that ensures the callback will be
     * ignored if it is called recursively.
     */
    _wrapEventListenerCallback: function(callback) {
      var isHandling = false;
      return function() {
        if (isHandling) return;
        isHandling = true;
        callback.apply(this, arguments);
        isHandling = false;
      };
    },

    /**
     * Removes the identified event listener from the EventTarget. This function
     * is called by the EventListener object returned by
     * {@link atlas.events.EventTarget#addEventListener|addEventListener}.
     * @param  {Number} id - The ID of the EventListener to remove.
     * @protected
     */
    _removeEventListener: function(id) {
      delete this._eventHandlers[id];
    },

    /**
     * Handles events that bubble up to the EventTarget.
     * @param  {atlas.events.Event} event - The Event to be handled.
     * @returns {atlas.events.Event} The Event to be propagated to the next
     *     EventTarget in the hierarchy.
     */
    handleEvent: function(event) {
      for (var id in this._eventHandlers) {
        if (this._eventHandlers.hasOwnProperty(id) &&
            this._eventHandlers[id].type === event.getType()) {
          event = this._eventHandlers[id].callback(event) || event;
        }
      }
      return event;
    },

    /**
     * @param {atlas.model.GeoEntity} parent
     */
    setParent: function(parent) {
      this._parent = parent;
    },

    /**
     * @return {atlas.model.GeoEntity}
     */
    getParent: function() {
      return this._parent;
    },

    /**
     * Removes event handlers.
     */
    remove: function() {
      for (var id in this._eventHandlers) {
        this._removeEventListener(id);
      }
    }

  });
});
