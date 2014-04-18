define([
  'atlas/util/Class',
  'atlas/util/DeveloperError',
  'atlas/util/default',
  'atlas/util/dom/DomClass',
  'atlas/util/dom/DomChild',
  'atlas/util/mixin',
  'atlas/lib/utility/Log'
], function(Class, DeveloperError, defaultValue, DomClass, DomChild, mixin, Log) {
  "use strict";

  /**
   * @classdesc Object to manage the DOM node that Atlas is rendered into.
   *
   * @param {Object} atlasManagers - A mapping of every manager type in Atlas to the manager instance.
   * @param {String} [domId] - The ID of the DOM element to attach Atlas to.
   *
   * @class atlas.dom.DomManager
   */
  var DomManager = mixin(Class.extend(/** @lends atlas.dom.DomManager# */ {
    /**
     * A mapping of every manager type in Atlas to the manager instance. This
     * object is created on Atlas, but the manager instances are set by each
     * manager upon creation.
     * @type {Object}
     */
    _atlasManagers: null,

    _currentDomNode: null,

    _rendered: null,

    _visible: null,

    _init: function(atlasManagers, domId) {
      this._atlasManagers = atlasManagers;
      this._atlasManagers.dom = this;

      this._rendered = false;
      this._visible = false;

      if (this._currentDomNode !== null) {
        this.setDom(this._currentDomNode, true);
      }
    },

    // -------------------------------------------
    // GETTERS AND SETTERS
    // -------------------------------------------

    /**
     * Changes the DOM node which Atlas is displayed in.
     * If Atlas is currently displayed changing the DOM automatically causes
     * it to be re-rendered in the new DOM element.
     *
     * @param {String|HTMLElement} elem - Either the ID of a DOM element or the element itself.
     * @param {Boolean} [show=true] - Whether the object should be displayed immediately in this new location.
     */
    setDom: function(elem, show) {
      var showNow = defaultValue(show, true);
      var newDomNode = typeof elem === 'string' ? document.getElementById(elem) : elem;
      if (!newDomNode) {
        throw new DeveloperError('DOM node not found: ' + elem);
      }
//      var newDomNodeId = newDomNode.id;

      // Move existing DOM if there is one.
      Log.debug('setting DOM node', newDomNode);
      if (this._currentDomNode !== null) {
        // Always show in the new position if Atlas is being moved.
        showNow = true;
        Log.debug('moving atlas from', this._currentDomNode, 'to', newDomNode);
        var curDomNode = this._currentDomNode;
        var childDomNode = DomChild.getChildren(curDomNode);
        DomChild.addChildren(newDomNode, childDomNode);
        Log.debug('moved atlas into', newDomNode);
      }
      this._currentDomNode = newDomNode;
      // Show in new location if required.
      DomClass[showNow ? 'remove' : 'add'](newDomNode, 'hidden');
      this._visible = !!showNow;
      // Cause the set DOM element to be populated with the Atlas visualisation.
      this.populateDom(newDomNode);
    },

    /**
     * @returns {HTMLElement} The current DOM node used by Atlas.
     */
    getDom: function() {
      return this._currentDomNode;
    },

    /**
     * Calculates the relative (x, y) coordinate in the Atlas widget for the given global (x, y)
     * coordinate of an event.
     *
     * @param {Object} screenCoords - The absolute coordinates of the event to make relative.
     * @param {Number} screenCoords.x - The absolute x coordinate.
     * @param {Number} screenCoords.y - The absolute y coordinate.
     * @returns {Object} An object with relative x and y coordinates.
     */
    translateEventCoords: function(screenCoords) {
      var element = this.getDom(),
          style = window.getComputedStyle(element),
          getCss = function (css) {
            return parseInt(style.getPropertyValue(css).replace('px', '')) || 0;
          };
      return {
        x: screenCoords.x - element.getBoundingClientRect().left - getCss('padding-left'),
        y: screenCoords.y - element.getBoundingClientRect().top - getCss('padding-top')
      }
    },

    getHeight: function() {
      return this._currentDomNode.offsetHeight;
    },

    getWidth: function() {
      return this._currentDomNode.offsetWidth;
    },

    // -------------------------------------------
    // MODIFIERS
    // -------------------------------------------

    /**
     * Populates the Atlas DOM element.
     * @abstract
     */
    populateDom: function(id) {
      throw new DeveloperError('Can not call abstract method atlas/dom/DomManager.populateDom');
    },

    /**
     * Shows the Atlas DOM element.
     */
    show: function() {
      if (!this._visible) {
        DomClass.remove(this._currentDomNode, 'hidden');
        this._visible = true;
      }
    },

    /**
     * Hides the Atlas DOM element.
     */
    hide: function() {
      if (this._visible) {
        DomClass.add(this._currentDomNode, 'hidden');
        this._visible = false;
      }
    },

    /**
     * Toggles the visiblity of the Atlas DOM element.
     */
    toggleVisibility: function() {
      this._visible ? this.hide() : this.show();
    }

  }), // End class instance definitions.

      // -------------------------------------------
      // STATICS
      // -------------------------------------------

      {
        // Nope
      }
  ); // End class static definitions.

  return DomManager;
});
