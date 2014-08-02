define([
  'atlas/dom/PopupFaculty',
  'atlas/util/DeveloperError'
], function (PopupFaculty, DeveloperError) {

  /**
   * Facade class for the Atlas API. This class maintains references to all
   * managers used in the implementation. It exposes an API to the host
   * application to control Atlas' behaviour.
   *
   * @author  Brendan Studds
   * @version 1.0
   *
   * @abstract
   * @alias atlas.core.Atlas
   * @constructor
   */
  var Atlas = function () {
    /**
     * A mapping of every manager type in Atlas to the manager instance. This
     * object is created on Atlas, but the manager instances are set by each
     * manager upon creation.
     * @type {Object}
     */
    this._managers = {};
  };

  Atlas.prototype.attachTo = function(elem) {
    var dom = typeof elem === 'string' ? document.getElementById(elem) : elem;
    this._managers.dom.setDom(dom, true);
    // Hook up the InputManager to the selected DOM element.
    this._managers.input.setup(dom);

    // TODO(bpstudds): Work out all this dependency injection stuff.
    this._faculties = {};
    this._faculties.popup = new PopupFaculty();
    this._faculties.popup.setup({parentDomNode: elem, eventManager: this._managers.event})
  };

  Atlas.prototype.getCameraMetrics = function () {
    return this._managers.camera.getCameraMetrics();
  };

  /**
   * Allows a particular manager to be replaced with another instance.
   * @param {String} type - The type of manager to replaced, ie 'dom' or 'render'.
   * @param {Object} manager - The new manager.
   * @returns {Object} The old manager.
   */
  Atlas.prototype.setManager = function (type, manager) {
    // TODO(bpstudds): Look into having multiple managers and switching between them?
    if (!(type in this._managers)) {
      throw new DeveloperError('Attempted to set manager of unknown type "' + type + '".');
    } else {
      var oldManager = this._managers[type];
      this._managers[type] = manager;
      return oldManager;
    }
  };

  /**
   * Sets the DOM element of Atlas to be visible.
   */
  Atlas.prototype.show = function () {
    this._managers.dom.show();
  };

  /**
   * Sets the DOM element of Atlas to be hidden.
   */
  Atlas.prototype.hide = function () {
    this._managers.dom.hide();
  };

  /**
   * Allows the Host application to publish an event to the internal
   * Atlas event system.
   * @param  {String} eventName - The type of the event to be published.
   * @param  {Object} [args] - Arguments relevant to the event.
   */
  Atlas.prototype.publish = function (eventName, args) {
    this._managers.event.handleExternalEvent(eventName, args);
  };

  /**
   * Allows the Host application to subscribe to internal events of the Atlas
   * event system.
   * @param  {String}   eventName - The event type to subscribe to.
   * @param  {Function} callback - The callback that will be called when the event occurs.
   */
  Atlas.prototype.subscribe = function (eventName, callback) {
    this._managers.event.addEventHandler('intern', eventName, callback);
  };

  /**
   * Causes a given GeoEntity to be set to visible Atlas.
   * @param {string} id - The ID of the GeoEntity to show.
   */
  Atlas.prototype.showEntity = function (id) {
    this._managers.render.show(id);
  };

  /**
   * Causes a given GeoEntity to be set to hidden Atlas.
   * @param {string} id - The ID of the GeoEntity to hide.
   */
  Atlas.prototype.hideEntity = function (id) {
    this._managers.render.hide(id);
  };

  return Atlas;
});
