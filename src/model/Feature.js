define([
  'atlas/events/Event',
  'atlas/lib/utility/Objects',
  'atlas/lib/utility/Setter',
  'atlas/model/Mesh',
  'atlas/model/Polygon',
  'atlas/util/DeveloperError',
  // Base class.
  'atlas/model/GeoEntity'
], function(Event, Objects, Setter, Mesh, Polygon, DeveloperError, GeoEntity) {

  /**
   * @typedef atlas.model.Feature
   * @ignore
   */
  var Feature;

  // TODO(aramk) Docs about display mode arguments are outdated.
  /**
   * @classdesc A Feature represents an entity that can be visualised either
   * as a 2D line, 2D footprint, an 3D extrusion of said footprint, or a 3D mesh.
   *
   * @param {Number} id - The ID of this Feature.
   * @param {Object} args - Parameters describing the feature.
   * @param {atlas.render.RenderManager} args.renderManager - The RenderManager object responsible
   * for rendering the Feature.
   * @param {atlas.events.EventManager} args.eventManager - The EventManager object responsible for
   * the event system.
   * @param {String|Array.<atlas.model.GeoPoint>} [args.footprint=null] - Either a WKT string or array
   * of Vertices describing the footprint polygon.
   * @param {atlas.model.Mesh} [args.mesh=null] - The Mesh object for the Feature.
   * @param {Number} [args.height=0] - The extruded height when displaying as a extruded polygon.
   * @param {Number} [args.elevation=0] - The elevation (from the terrain surface) to the base of
   * the Mesh or Polygon.
   * @param {Boolean} [args.show=false] - Whether the feature should be initially shown when
   * created.
   * @param {String} [args.displayMode=Feature.DisplayMode.FOOTPRINT] - Initial display mode of
   * feature. Mesh trumps Footprint, which trumps Line if they are both defined in terms of which is
   * displayed by default.
   *
   * @see {@link atlas.model.Polygon}
   * @see {@link atlas.model.Mesh}
   *
   * @class atlas.model.Feature
   * @extends atlas.model.GeoEntity
   */
  Feature = Setter.mixin(GeoEntity.extend(/** @lends atlas.model.Feature# */ {

    /**
     * The 2D line of this Feature.
     * @type {atlas.model.Line}
     * @protected
     */
    _line: null,

    /**
     * The 2D footprint of this Feature.
     * @type {atlas.model.Polygon}
     * @protected
     */
    _footprint: null,

    /**
     * 3D mesh of this Feature.
     * @type {atlas.model.Mesh}
     * @protected
     */
    _mesh: null,

    /**
     * 2D image of this Feature.
     * @type {atlas.model.Image}
     * @protected
     */
    _image: null,

    /**
     * The extrusion height of the Feature.
     * @type {Number}
     * @protected
     */
    _height: null,

    /**
     * The elevation of the Feature.
     * @type {Number}
     * @protected
     */
    _elevation: null,

    /**
     * The display mode of the Feature.
     * Mesh trumps Footprint, which trumps Line if they are both defined in terms of which is
     * displayed by default.
     * @type {atlas.model.Feature.DisplayMode}
     * @protected
     */
    _displayMode: null,

    _init: function(id, args) {
      this._super(id, args);
      var displayMode = args.displayMode;
      var propertyToDisplayMode = {
        mesh: Feature.DisplayMode.MESH,
        ellipse: Feature.DisplayMode.EXTRUSION,
        polygon: Feature.DisplayMode.EXTRUSION,
        line: Feature.DisplayMode.LINE,
        image: Feature.DisplayMode.IMAGE
      };
      Object.keys(propertyToDisplayMode).forEach(function(prop) {
        var mode = propertyToDisplayMode[prop];
        var form = args[prop];
        if (form) {
          this.setForm(mode, form);
          displayMode = displayMode || mode;
        }
      }, this);
      this.setDisplayMode(displayMode);
      this._height = parseFloat(args.height) || 0.0;
      this._elevation = parseFloat(args.elevation) || 0.0;
      this._initDelegation();
      this._initEvents();
    },

    // -------------------------------------------
    // GETTERS AND SETTERS
    // -------------------------------------------

    /**
     * Binds various methods in {@link atlas.model.GeoEntity} which should be entirely delegated to
     * the currently active form without any extra work.
     * @private
     */
    _initDelegation: function() {
      var methods = ['isRenderable', 'isDirty', 'setDirty', 'clean', 'createHandles',
        'createHandle', 'addHandles', 'addHandle', 'clearHandles', 'setHandles', 'getHandles',
        'getCentroid', 'getArea', 'getVertices', 'getOpenLayersGeometry', 'translate',
        'scale', 'rotate', 'setScale', 'setRotation', 'setElevation'];
      methods.forEach(function(method) {
        this[method] = function() {
          return this._delegateToForm(method, arguments);
        };
      }, this);
    },

    _delegateToForm: function(method, args) {
      var form = this.getForm();
      return form && form[method].apply(form, args);
    },

    _delegateToForms: function(method, args) {
      var forms = this.getForms();
      forms.forEach(function(form) {
        form[method].apply(form, args);
      });
    },

    /**
     * @param {atlas.model.Feature.DisplayMode} displayMode
     * @param {atlas.model.GeoEntity} entity
     */
    setForm: function(displayMode, entity) {
      var property = this._getFormPropertyName(displayMode);
      if (!property) throw new Error('Invalid display mode: ' + displayMode);
      this[property] = entity;
      entity.setParent(this);
      this.isVisible() && this.show();
    },

    /**
     * @param {atlas.model.Feature.DisplayMode} [displayMode]
     * @returns {atlas.model.GeoEntity} The form for the given display mode, or the current
     * display mode if none is given.
     */
    getForm: function(displayMode) {
      displayMode = displayMode || this._displayMode;
      if (displayMode) {
        var property = this._getFormPropertyName(displayMode);
        if (!property) throw new Error('Invalid display mode: ' + displayMode);
        return this[property];
      } else {
        return null;
      }
    },

    getForms: function () {
      var forms = [];
      Feature.getDisplayModeIds().forEach(function (displayMode) {
        var form = this.getForm(displayMode);
        form && forms.push(form);
      }, this);
      return forms;
    },

    /**
     * @param {atlas.model.Feature.DisplayMode} displayMode
     * @returns {String} The name of the property used for storing the given display mode.
     * @private
     */
    _getFormPropertyName: function(displayMode) {
      // TODO(aramk) Extrusion is a special case. If there are more, create a map instead.
      if (displayMode === Feature.DisplayMode.EXTRUSION) {
        displayMode = Feature.DisplayMode.FOOTPRINT;
      }
      if (Feature.DisplayMode[displayMode.toUpperCase()]) {
        return '_' + displayMode;
      } else {
        throw new DeveloperError('Invalid display mode ' + displayMode);
      }
    },

    setSelected: function(selected) {
      // Ensure a selection event is fired for the feature as well. Since setSelected alters the
      // style and it will replace the style of the entity before it is considered selected, and
      // setting the style of the feature will set the style on the entity a second time. When
      // deselected, the entity will not revert to the original style. To prevent this, call the
      // selection on the form first.
      // When deselecting, the issue is that when the feature is deselected it applies the
      // wrong pre select style on the entity due to delegation, so we want to ensure the form
      // itself reverts selection.
      // TODO(aramk) This is complicated - refactor.
      if (selected) {
        this._delegateToForm('setSelected', arguments);
        this._super(selected);
      } else {
        this._super(selected);
        this._delegateToForm('setSelected', arguments);
      }
    },

    // TODO(aramk) A lot of these operations below should be calling _super() and being called on
    // each form (even those which are not visible)?

    /**
     * Sets the elevation of the base of the feature.
     * @param {Number} elevation - The elevation of the feature.
     */
    setElevation: function(elevation) {
      var oldElevation = this._elevation;
      this._elevation = elevation;
      return this._delegateToForms('setElevation', arguments) || oldElevation;
    },

    /**
     * @returns {number} The elevation of the base of the feature.
     */
    getElevation: function() {
      return this._delegateToForm('getElevation') || this._elevation;
    },

    /**
     * Sets the extruded height of the Feature to form a prism.
     * @param {Number} height - The extruded height of the feature.
     * @returns {Number} The previous height.
     */
    setHeight: function(height) {
      var oldHeight = this._height;
      this._height = height;
      return this._delegateToForms('setHeight', arguments) || oldHeight;
    },

    /**
     * @returns {number} The extruded height of the Feature to form a prism.
     */
    getHeight: function() {
      return this._delegateToForm('getHeight') || this._height;
    },

    setStyle: function(style) {
      var oldStyle = this._style;
      this._style = style;
      return this._delegateToForms('setStyle', arguments) || oldStyle;
    },

    getStyle: function() {
      return this._delegateToForm('getStyle') || this._style;
    },

    // -------------------------------------------
    // MODIFIERS
    // -------------------------------------------

    /**
     * Modifies specific components of the Feature's style.
     * @param {Object} args - The new values for the Style components.
     * @param {atlas.model.Colour} [args.fillColour] - The new fill colour.
     * @param {atlas.model.Colour} [args.borderColour] - The new border colour.
     * @param {Number} [args.borderWidth] - The new border width colour.
     * @returns {atlas.model.Style} - The old style.
     */
    modifyStyle: function(args) {
      var oldStyle = this._super(args);
      return this._delegateToForm('modifyStyle', arguments) || oldStyle;
    },

    /**
     * Renders the Feature using its footprint.
     * @see {@link atlas.model.Polygon}
     */
    showAsFootprint: function() {
      this.setDisplayMode(Feature.DisplayMode.FOOTPRINT);
    },

    /**
     * Renders the Feature using its extruded footprint.
     * @see {@link atlas.model.Polygon}
     */
    showAsExtrusion: function() {
      this.setDisplayMode(Feature.DisplayMode.EXTRUSION);
    },

    /**
     * Renders the Feature using its mesh.
     * @see {@link atlas.model.Mesh}
     */
    showAsMesh: function() {
      this.setDisplayMode(Feature.DisplayMode.MESH);
    },

    /**
     * Renders the Feature using its mesh.
     * @see {@link atlas.model.Image}
     */
    showAsImage: function() {
      this.setDisplayMode(Feature.DisplayMode.IMAGE);
    },

    /**
     * Clean up the Feature so it can be deleted by the RenderManager.
     * @param {Boolean} recursive - Whether to remove all forms as well.
     */
    remove: function(recursive) {
      recursive = Setter.def(recursive, true);
      Feature.getDisplayModeIds().forEach(function(displayMode) {
        var propName = this._getFormPropertyName(displayMode);
        var form = this.getForm(displayMode);
        if (form) {
          recursive && form.remove();
          this[propName] = null;
        }
      }, this);
      this._super();
    },

    // -------------------------------------------
    // BEHAVIOUR
    // -------------------------------------------

    /**
     * Shows the Feature depending on its current <code>_displayMode</code>.
     */
    show: function() {
      // TODO(aramk) delegate this to the setHeight setElevation.
      if (this._displayMode === Feature.DisplayMode.LINE) {
        this._mesh && this._mesh.hide();
        this._footprint && this._footprint.hide();
        this._image && this._image.hide();
        if (this._line) {
          this._line.show();
        }
      } else if (this._displayMode === Feature.DisplayMode.FOOTPRINT) {
        this._mesh && this._mesh.hide();
        this._line && this._line.hide();
        this._image && this._image.hide();
        if (this._footprint) {
          this._footprint.disableExtrusion();
          this._footprint.show();
        }
      } else if (this._displayMode === Feature.DisplayMode.EXTRUSION) {
        this._mesh && this._mesh.hide();
        this._line && this._line.hide();
        this._image && this._image.hide();
        if (this._footprint) {
          this._footprint.enableExtrusion();
          this._footprint.show();
        }
      } else if (this._displayMode === Feature.DisplayMode.MESH) {
        this._footprint && this._footprint.hide();
        this._line && this._line.hide();
        this._image && this._image.hide();
        if (this._mesh) {
          this._mesh.show();
        }
      } else if (this._displayMode === Feature.DisplayMode.IMAGE) {
        this._footprint && this._footprint.hide();
        this._line && this._line.hide();
        this._image && this._image.hide();
        if (this._image) {
          this._image.show();
        }
      }
      // Call this afterwards to avoid calling clean() on the form, which would prevent show()
      // calling _build().
      this._super();
    },

    _update: function() {
      this._super();
      // Only update the selection of the current form and after transitioning for efficiency.
      var form = this.getForm();
      form && form.setSelected(this.isSelected());
    },

    /**
     * Hides the Feature.
     */
    hide: function() {
      this._super();
      this._delegateToForm('hide');
    },

    /**
     * @param {atlas.model.Feature.DisplayMode} displayMode
     */
    setDisplayMode: function(displayMode) {
      if (displayMode && !this._getFormPropertyName(displayMode)) {
        throw new Error('Invalid display mode: ' + displayMode);
      }
      this._displayMode = displayMode;
      this.isVisible() ? this.show() : this.hide();
    },

    /**
     * @returns {atlas.model.Feature.DisplayMode}
     */
    getDisplayMode: function() {
      return this._displayMode;
    },

    _build: function() {
      // Rendering is delegated to the form.
    },

    /**
     * Listen for events on the forms and apply it to this feature.
     * @private
     */
    _initEvents: function() {
      // If the original target is this feature, don't dispatch the event since it would be a
      // duplicate.
      var isOwnEvent = function(event) {
        return event.getTarget() === this;
      }.bind(this);
      // This responds to events in the forms which bubble up.
      this.addEventListener('entity/select', function(event) {
        if (isOwnEvent(event)) return;
        this.setSelected(true);
      }.bind(this));
      this.addEventListener('entity/deselect', function(event) {
        if (isOwnEvent(event)) return;
        this.setSelected(false);
      }.bind(this));
      this.addEventListener('entity/dblclick', function(event) {
        if (isOwnEvent(event)) return;
        var newEvent = event.clone();
        var args = Setter.cloneDeep(newEvent.getArgs());
        args.id = this.getId();
        newEvent.setArgs(args);
        this.dispatchEvent(newEvent);
      }.bind(this));
    },

    // -------------------------------------------
    // EVENTS
    // -------------------------------------------

    // Ignore all style since it's handled by the forms. Otherwise, setting the style for this
    // feature applies it to the form and this changes it from the pre-select style.
    _setSelectStyle: function() {
    },

    _revertSelectStyle: function() {
    }

  }), {

    // -------------------------------------------
    // STATICS
    // -------------------------------------------

    /**
     * The display mode of the Feature which determines the underlying geometry shown.
     * @typedef {Object} atlas.model.Feature.DisplayMode
     */
    DisplayMode: {
      LINE: 'line',
      FOOTPRINT: 'footprint',
      EXTRUSION: 'extrusion',
      MESH: 'mesh',
      IMAGE: 'image'
    },

    getDisplayModeIds: function() {
      return Objects.values(this.DisplayMode);
    }

  });
  return Feature;
});
