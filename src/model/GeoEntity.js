define([
  'atlas/core/ItemStore',
  'atlas/events/Event',
  // Base class
  'atlas/events/EventTarget',
  'atlas/lib/utility/Setter',
  'atlas/lib/utility/Types',
  'atlas/model/Colour',
  'atlas/model/Style',
  'atlas/util/DeveloperError',
  'atlas/util/WKT'
], function(ItemStore, Event, EventTarget, Setter, Types, Colour, Style, DeveloperError, WKT) {

  /**
   * @typedef atlas.model.GeoEntity
   * @ignore
   */
  var GeoEntity;

  /**
   * @classdesc A GeoEntity is an abstract class that represents an entity that
   * has a defined place in 3D space. A GeoEntity is a purely
   * abstract module that is extended by other atlas entities that specify
   * what is this particular GeoEntity represents (eg. a polygon or a line).
   *
   * @param {Number} id - The ID of this GeoEntity.
   * @param {Object} args - Both optional and required construction parameters.
   * @param {String} args.id - The ID of the GeoEntity.
   * @param {atlas.render.RenderManager} args.renderManager - The RenderManager object responsible for the GeoEntity.
   * @param {atlas.events.EventManager} args.eventManager - The EventManager object responsible for the Event system.
   * @param {atlas.events.EventTarget} [args.parent] - The parent EventTarget object of the GeoEntity.
   *
   * @see {atlas.model.Feature}
   * @see {atlas.model.Polygon}
   * @see {atlas.model.Network}
   * @see {atlas.model.Line}
   * @see {atlas.model.GeoPoint}
   * @see {atlas.model.Vertex}
   *
   * @abstract
   * @extends atlas.events.EventTarget
   * @class atlas.model.GeoEntity
   */
  GeoEntity = Setter.mixin(EventTarget.extend(/** @lends atlas.model.GeoEntity# */ {
    /**
     * The ID of the GeoEntity
     * @type {String}
     * @protected
     */
    _id: null,

    /*
     * ID of the parent GeoEntity of the GeoEntity. Defined in EventTarget.
     * @name _parent
     * @type {String}
     * @protected
     */

    /**
     * The RenderManager object for the GeoEntity.
     * @type {atlas.render.RenderManager}
     * @protected
     */
    _renderManager: null,

    /**
     * The EntityManager for the GeoEntity.
     * @type {atlas.entity.EntityManager}
     * @protected
     */
    _entityManager: null,

    /**
     * The centroid of the entity.
     * @type {atlas.model.GeoPoint}
     * @protected
     */
    _centroid: null,

    /**
     * The area of the GeoEntity in metres squared.
     * @type {Number}
     * @protected
     */
    _area: null,

    /**
     * Whether the GeoEntity is visible.
     * @type {Boolean}
     * @protected
     */
    _visible: false,

    /**
     * Whether the GeoEntity can be rendered.
     * @type {Boolean}
     * @protected
     */
    _renderable: false,

    /**
     * Components of the GeoEntity which have been changed and need to be updated when
     * the GeoEntity is re-rendered.
     * @type {Object.<String, Boolean>}
     * @protected
     */
    _dirty: null,

    /**
     * Geometry data for the GeoEntity that allows it to be rendered.
     * @type {Object}
     * @protected
     */
    _geometry: null,

    /**
     * Appearance data to modified how the GeoEntity is rendered.
     * @type {Object}
     * @protected
     */
    _appearance: null,

    /**
     * The style of the GeoEntity when rendered.
     * @type {atlas.model.Style}
     * @protected
     */
    _style: null,

    /**
     * The style of the GeoEntity when before a change in style (e.g. during selection).
     * @type {atlas.model.Style}
     * @protected
     */
    _previousStyle: null,

    /**
     * Whether the GeoEntity is selected.
     * @type {Boolean}
     */
    _selected: false,

    /**
     * {@link atlas.model.Handle} objects used for editing.
     * @type {atlas.core.ItemStore}
     */
    _handles: null,

    /**
     * The {@link atlas.model.Handle} on the entity itself.
     */
    _entityHandle: null,

    _init: function(id, args) {
      if (typeof id === 'object') {
        args = id;
        id = args.id;
      } else {
        args = args || {};
      }
      id = id.toString();
      // Call the superclass' (EventTarget) constructor.
      this._super(args.eventManager, args.parent);
      this.clean();
      this.setDirty('entity');

      if (!id || typeof id === 'object') {
        throw new DeveloperError('Can not create instance of GeoEntity without an ID');
      }
      this._id = id.toString();
      this._renderManager = args.renderManager;
      this._eventManager = args.eventManager;
      this._entityManager = args.entityManager;
      this._entityManager && this._entityManager.add(this.getId(), this);
      this.setStyle(args.style || GeoEntity.getDefaultStyle());
      this._handles = new ItemStore();
      this._visible = Setter.def(args.show, false);
    },

    // TODO(aramk) Use better dependency injection.
    /**
     * @param args - Any object used for construction.
     * @returns {Object} - The given object with manager dependencies added.
     * @protected
     */
    _bindDependencies: function(args) {
      return Setter.mixin(args, {
        renderManager: this._renderManager,
        eventManager: this._eventManager,
        entityManager: this._entityManager
      });
    },

    // -------------------------------------------
    // GETTERS AND SETTERS
    // -------------------------------------------

    /**
     * @returns {String} The ID of the GeoEntity.
     */
    getId: function() {
      return this._id;
    },

    getCentroid: function() {
      if (!this._centroid) {
        this._centroid = this._calcCentroid();
      }
      return this._centroid.clone();
    },

    _calcCentroid: function() {
      var wkt = WKT.getInstance();
      return wkt.vertexFromOpenLayersPoint(this.getOpenLayersGeometry().getCentroid());
    },

    /**
     * @returns {Number} The area of the GeoEntity in metres squared, if applicable.
     */
    getArea: function() {
      if (Types.isNullOrUndefined(this._area)) {
        this._area = this._calcArea();
      }
      return this._area;
    },

    _calcArea: function() {
      return this.getOpenLayersGeometry().getGeodesicArea();
    },

    /**
     * @returns {OpenLayers.Geometry}
     * @abstract
     */
    getOpenLayersGeometry: function() {
      throw new DeveloperError('Can not call abstract method "getOpenLayersGeometry" of GeoEntity');
    },

    /**
     * @returns {Array.<atlas.model.Handle>} An array of Handles used to edit the GeoEntity.
     */
    createHandles: function() {
      throw new DeveloperError('Can not call abstract method "createHandles" of GeoEntity');
    },

    /**
     * @param {atlas.model.GeoPoint} [vertex] - The vertex in the entity to associate with the
     * {@link atlas.model.Handle}. If not provided, the centroid of the entity should be used.
     * @param {Number} [index] - The index of the vertex in this object. Only necessary if a vertex
     * is provided.
     * @returns {atlas.model.GeoPoint}
     */
    createHandle: function(vertex, index) {
      throw new DeveloperError('Can not call abstract method "createHandle" of GeoEntity');
    },

    /**
     * @returns {Array.<atlas.model.Handle>}
     */
    addHandles: function() {
      var handles = this.createHandles();
      this.setHandles(handles);
      return handles;
    },

    /**
     * @param {atlas.model.Handle} handle
     * @returns {atlas.model.Handle}
     */
    addHandle: function(handle) {
      this._handles.add(handle);
      return handle;
    },

    /**
     * @param {Array.<atlas.model.Handle>} handles
     */
    setHandles: function(handles) {
      this.clearHandles();
      this._handles.addArray(handles);
    },

    getHandles: function() {
      return this._handles;
    },

    getEntityHandle: function() {
      return this._entityHandle;
    },

    setEntityHandle: function(entityHandle) {
      this._entityHandle = entityHandle;
    },

    clearHandles: function() {
      this._handles.purge();
    },

    /**
     * Sets a particular component of the GeoEntity to dirty, which affects how the GeoEntity is
     * rendered.
     * @param component
     */
    setDirty: function(component) {
      if (typeof component === 'string') {
        this._dirty[component] = true;
      } else if (typeof component === 'object') {
        var components = component;
        if (!(component instanceof Array)) {
          components = Object.keys(component);
        }
        components.forEach(function(key) {
          this._dirty[key] = true;
        }, this)
      }
    },

    /**
     * Set a particular component to be clean, or cleans the GeoEntity entirely.
     * @param {string} [component] - The component to clean, if absent or null the entire GeoEntity
     *     is marked clean.
     */
    setClean: function(component) {
      if (!component) {
        delete this._dirty[component];
      } else {
        this.clean();
      }
    },

    /**
     * @param {String} [component] A specific component to check.
     * @returns {Boolean} Whether the given <code>component</code> is dirty, or if
     * <code>component</code> is not given, the GeoEntity as a whole.
     */
    isDirty: function(component) {
      if (component === undefined) {
        return Object.keys(this._dirty).length > 0;
      }
      return component in this._dirty;
    },

    /**
     * Clears all of the <code>_dirty</code> flags on the GeoEntity, signifying that the
     * GeoEntity is currently correctly rendered.
     */
    clean: function() {
      this._dirty = {};
    },

    /**
     * Sets the Style for the GeoEntity.
     * @param {atlas.model.Style} style - The new style to use.
     * @returns {atlas.model.Style} The old style, or null if it was not changed.
     */
    setStyle: function(style) {
      // Only change style if the new style is different so _previousStyle isn't clobbered.
      if (this._style && this._style.equals(style)) {
        return null;
      }
      this.setDirty('style');
      this._previousStyle = this._style;
      this._style = style;
      var isVisible = this.isVisible();
      isVisible && this._build();
      this._updateVisibility(isVisible);
      return this._previousStyle;
    },

    /**
     * @returns {atlas.model.Style}
     */
    getStyle: function() {
      return this._style;
    },

    /**
     * @returns {atlas.model.Style}
     */
    getPreviousStyle: function() {
      return this._previousStyle;
    },

    /**
     * @returns {Boolean} Whether the GeoEntity is currently renderable.
     */
    isRenderable: function() {
      return Object.keys(this._dirty).length === 0;
    },

    /**
     * Returns the geometry data for the GeoEntity so it can be rendered.
     * The <code>build</code> method should be called to construct this geometry
     * data.
     * @returns {Object} The geometry data.
     */
    getGeometry: function() {
      return this._geometry;
    },

    /**
     * Returns the appearance data for the GeoEntity so it can be rendered.
     * The <code>build</code> method should be called to construct this appearance
     * data.
     * @returns {Object} The appearance data.
     */
    getAppearance: function() {
      return this._appearance;
    },

    // -------------------------------------------
    // MODIFIERS
    // -------------------------------------------

    /**
     * Modifies specific components of the GeoEntity's style.
     * @param {Object} newStyle - The new values for the Style components.
     * @param {atlas.model.Colour} [newStyle.fillColour] - The new fill colour.
     * @param {atlas.model.Colour} [newStyle.borderColour] - The new border colour.
     * @param {Number} [newStyle.borderWidth] - The new border width colour.
     * @returns {Object} A mapping of parameters that have been changed to their old value.
     */
    // TODO(aramk) This is quite complicated - perhaps rely only on setStyle.
    modifyStyle: function(newStyle) {
      if (Object.keys(newStyle).length <= 0) {
        return {};
      }

      this.setDirty('style');
      var oldStyle = {};
      // Work out what's changing
      newStyle.fillColour && (oldStyle.fillColour = this._style.getFillColour());
      newStyle.borderColour && (oldStyle.borderColour = this._style.getBorderColour());
      newStyle.borderWidth && (oldStyle.borderWidth = this._style.getBorderWidth());
      // Generate new style based on what's changed.
      newStyle = Setter.mixin({
        fillColour: this._style.getFillColour(),
        borderColour: this._style.getBorderColour(),
        borderWidth: this._style.getBorderWidth()
      }, newStyle);
      this._style = new Style(newStyle);
      return oldStyle;
    },

    /**
     * Translates the GeoEntity by the given vector.
     * @param {atlas.model.GeoPoint} translation - The amount to move the GeoEntity in latitude,
     * longitude and elevation.
     * @abstract
     */
    translate: function(translation) {
      throw new DeveloperError('Can not call abstract method "translate" of GeoEntity');
    },

    /**
     * Scales the GeoEntity by the given vector. This scaling can be uniform in all axis or non-uniform.
     * A scaling factor of <code>1</code> has no effect. Factors lower or higher than <code>1</code>
     * scale the GeoEntity down or up respectively. ie, <code>0.5</code> is half as big and
     * <code>2</code> is twice as big.
     * @param {atlas.model.Vertex} scale - The vector to scale the GeoEntity by.
     * @param {Number} scale.x - The scale along the <code>x</code> axis of the GeoEntity.
     * @param {Number} scale.y - The scale along the <code>y</code> axis of the GeoEntity.
     * @param {Number} scale.z - The scale along the <code>z</code> axis of the GeoEntity.
     *
     * @abstract
     */
    scale: function(scale) {
      throw new DeveloperError('Can not call abstract method "scale" of GeoEntity');
    },

    /**
     * Rotates the GeoEntity by the given vector.
     * @param {atlas.model.Vertex} rotation - The vector to rotate the GeoEntity by.
     * @param {Number} rotation.x - The rotation about the <code>x</code> axis in degrees, negative
     *      rotates clockwise, positive rotates counterclockwise.
     * @param {Number} rotation.y - The rotation about the <code>y</code> axis in degrees, negative
     *        rotates clockwise, positive rotates counterclockwise.
     * @param {Number} rotation.z - The rotation about the <code>z</code> axis in degrees, negative
     *      rotates clockwise, positive rotates counterclockwise.
     *
     * @abstract
     */
    rotate: function(rotation) {
      throw new DeveloperError('Can not call abstract method "rotate" of GeoEntity');
    },

    /**
     * Function to build the GeoEntity so it can be rendered.
     * @abstract
     */
    _build: function() {
      throw new DeveloperError('Can not call abstract method of GeoEntity.');
    },

    /**
     * Function to remove the GeoEntity from rendering. This function should
     * be overridden on subclasses to accomplish any cleanup that
     * may be required.
     */
    remove: function() {
      this.hide();
      // TODO(aramk) We should try to keep consistent with these - either all entities have
      // references to managers or none do - otherwise we could have discrepancies in the entity
      // manager like a removed entity still being referenced.
      this._entityManager && this._entityManager.remove(this._id);
      this._eventManager && this._eventManager.dispatchEvent(new Event(new EventTarget(),
          'entity/remove', {
            id: this.getId()
          }));
    },

    /**
     * Shows the GeoEntity in the current scene.
     */
    show: function() {
      this._visible = true;
      !this.isRenderable() && this._build();
      this._updateVisibility(true);
    },

    /**
     * Hides the GeoEntity from the current scene.
     */
    hide: function() {
      this._visible = false;
      this._updateVisibility(false);
    },

    /**
     * @returns {Boolean} Whether the GeoEntity is currently visible.
     */
    isVisible: function() {
      return this._visible;
    },

    /**
     * @param {Boolean} visible
     */
    setVisibility: function(visible) {
      visible ? this.show() : this.hide();
    },

    /**
     * Toggles the visibility of the GeoEntity.
     */
    toggleVisibility: function() {
      this.setVisibility(!this.isVisible());
    },

    /**
     * Overridable method to update the visibility of underlying geometries based on the given
     * visibility.
     * @param {Boolean} visible
     * @abstract
     * @private
     */
    _updateVisibility: function(visible) {
      // Override in subclasses.
    },

    // -------------------------------------------
    // BEHAVIOUR
    // -------------------------------------------

    /**
     * Handles the behaviour when this entity is selected.
     */
    _onSelect: function() {
      this.setStyle(GeoEntity.getSelectedStyle());
    },

    /**
     * Handles the behaviour when this entity is selected.
     */
    _onDeselect: function() {
      this.setStyle(this.getPreviousStyle());
    },

    /**
     * @returns {Boolean} Whether the entity is selected.
     */
    isSelected: function() {
      return this._visible;
    },

    /**
     * Sets the selection state of the entity.
     * @param {Boolean} selected
     * @returns {Boolean} The original selection state of the entity.
     */
    setSelected: function(selected) {
      this._selected = selected;
      selected ? this._onSelect() : this._onDeselect();
    }

  }), {

    // -------------------------------------------------
    // Statics
    // -------------------------------------------------

    /**
     * The default style of the entity.
     * @returns {atlas.model.Style}
     */
    getDefaultStyle: function() {
      return new Style({fillColour: Colour.GREEN, borderColour: Colour.BLACK});
    },

    /**
     * The style of the entity during selection.
     * @returns {atlas.model.Style}
     */
    getSelectedStyle: function() {
      return new Style({fillColour: Colour.RED, borderColour: Colour.BLACK});
    }

  });

  return GeoEntity;
});
