define([
], function () {

  /**
   * Facade class for the Atlas API. This class maintains references to all
   * managers used in the implementation. It exposes an API to the host 
   * application to control Atlas' behaviour.
   *
   * @author  Brendan Studds
   * @version 1.0
   *
   * @abstract
   * @alias atlas/Atlas
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
    this._managers = {
      render: {},
      dom: {},
      event: {}
    };
  };

  /**
   * Allows a particular manager to be replaced with another instance.
   * @param {String} type - The type of manager to replaced, ie 'dom' or 'render'.
   * @param {Object} manager - The new manager.
   * @returns {Object} The old manager.
   */
  Atlas.prototype.setManager = function (type, manager) {
    if (!(type in this._managers)) {
      throw new DeveloperError('Attempted to set manager of unknown type "' + type + '".');
    } else {
      var oldManager = this._managers[type];
      this._managers[type] = manager;
      return oldManager;
    }
  };

  // If you only have one manager you can't remove it.
  // TODO(bpstudds): Look into having multiple managers and switching between them?
  // Atlas.prototype.removeManager = function (type, manager) {
  //   if (len(this._managers[type]) == 1) {
  //     throw new DeveloperError('Can not remove last manager for type ' + type);
  //   }
  //   if (this._managers[type][-1] !== undefined) {
  //     delete this._managers[type][-1];
  //   }
  // };

  /**
   * Used to set the DOM element Atlas renders into and to cause Atlas to 
   * do the intial render into that element (implementation defined).
   * @param {string} domId - The ID of the DOM element to attach to.
   */
  Atlas.prototype.initialise = function (domId) {
    this._managers.dom.setDom(domId);
    this._managers.dom.populateDom(domId);
  };

  /**
   * Sets the DOM element of Atlas to be visisble.
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
   * @param  {String}   eventName - The event tyep to subscribe to.
   * @param  {Function} callback - The callback that will be called when the event occurs.
   */
  Atlas.prototype.subscribe = function (eventName, callback) {
    this._managers.event.addEventHandler('intern', eventName, callback);
  };

  // TODO(bpstudds): Need to work out if we even need this function
  //      and if we do, how to make it work.
  // /**
  //  * Function to generate a new geoentity of type Feature and add it 
  //  * to Atlas' render manager.
  //  * @see {@link atlas/model/Feature}
  //  * @param {number} id - The ID of the new Feature.
  //  * @param {object} args - The properties of the new Feature
  //  * @param {number} id - The ID of this Feature.
  //  * @param {object} [args] - Parameters describing the feature.
  //  * @param {string|Array.atlas/model/Vertex} [args.footprint=null] - Either a WKT string or array of Vertices describing the footprint polygon.
  //  * @param {mesh} [args.mesh=null] - The Mesh object for the Feature.
  //  * @param {number} [args.height=0] - The extruded height when displaying as a extruded polygon.
  //  * @param {number} [args.elevation=0] - The elevation (from the terrain surface) to the base of the Mesh or Polygon.
  //  * @param {boolean} [args.show=false] - Whether the feature should be initially shown when created.
  //  * @param {string} [args.displayMode='footprint'] - Initial display mode of feature, one of 'footprint', 'extrusion' or 'mesh'.
  //  */
  // Atlas.prototype.addFeature = function (id, args) {
  //   if (id === undefined) {
  //     throw new DeveloperError('Can add Feature without specifying id');
  //   } else {
  //     // Add EventManger to the args for the feature.
  //     args.eventManager = this._managers.event;
  //     // Add the RenderManager to the args for the feature.
  //     args.renderManager = this._managers.render;
  //     var feature = new this._managers.render.FeatureClass(id, args);
  //     this.addEntity(feature);
  //     return feature;
  //   }
  // };

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