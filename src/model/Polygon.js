define([
  'atlas/lib/utility/Setter',
  'atlas/material/Color',
  'atlas/model/Style',
  'atlas/util/DeveloperError',
  // Base class
  'atlas/model/VertexedEntity'
], function(Setter, Color, Style, DeveloperError, VertexedEntity) {

  /**
   * @typedef atlas.model.Polygon
   * @ignore
   */
  var Polygon;

  /**
   * @classdesc Represents a 2D polygon.
   *
   * @param {Number} id - The ID of this Polygon.
   * @param {Object} data - Data describing the Polygon.
   * @param {String|Array.<atlas.model.GeoPoint>} [data.vertices=[]] - Either a WKT string or
   *     an array of vertices describing the Polygon.
   * @param {Number} [data.height=0] - The extruded height of the Polygon to form a prism.
   * @param {Number} [data.elevation] - The elevation of the base of the Polygon (or prism).
   * @param {atlas.material.Color} [data.color] - The fill color of the Polygon. Overrides the
   *     given style.
   * @param {atlas.material.Color} [data.borderColor] - The border color of the Polygon.
   *     Overrides the given style.
   * @param {atlas.model.Style} [data.style=Style.getDefault()] - The Style to apply to the
   *     Polygon.
   * @param {Object} [args] - Option arguments describing the Polygon.
   * @param {atlas.model.GeoEntity} [args.parent=null] - The parent entity of the Polygon.
   * @returns {atlas.model.Polygon}
   *
   * @class atlas.model.Polygon
   * @extends atlas.model.VertexedEntity
   */
  Polygon = VertexedEntity.extend(/** @lends atlas.model.Polygon# */ {

    // TODO(aramk) Either put docs on params and document the getters and setters which don't have
    // obvious usage/logic.
    // TODO(aramk) Units for height etc. are open to interpretation - define them as metres in docs.

    /**
     * List of counter-clockwise ordered array of vertices constructing holes of this polygon.
     * @type {Array.<Array.<atlas.model.GeoPoint>>}
     * @private
     */
    _holes: null,

    /**
     * The extruded height of the polygon in metres (if rendered as extruded polygon).
     * @type {Number}
     * @private
     */
    _height: 0,

    /**
     * Whether the Polygon should be rendered as an extruded polygon or a 2D polygon.
     * @type {Boolean}
     * @protected
     */
    _showAsExtrusion: false,

    /**
     * Constructs a new Polygon
     * @ignore
     */
    _setup: function(id, data, args) {
      this._super(id, data, args);
      // Don't have closed polygons.
      var len = this._vertices.length;
      if (this._vertices[0] === this._vertices[len - 1] && len > 1) {
        this._vertices.pop();
      }
      if (data.holes) {
        this._holes = this._getSanitizedVertices(data.holes);
      }
      this._height = parseFloat(data.height) || this._height;
    },

    // -------------------------------------------
    // GETTERS AND SETTERS
    // -------------------------------------------

    /**
     * Enables showing the polygon as an extruded polygon.
     */
    enableExtrusion: function() {
      var oldValue = this._showAsExtrusion;
      this._showAsExtrusion = true;
      if (oldValue !== true) {
        this.setDirty('model');
        this._update();
      }
    },

    /**
     * Disables showing the polygon as an extruded polygon.
     */
    disableExtrusion: function() {
      var oldValue = this._showAsExtrusion;
      this._showAsExtrusion = false;
      if (oldValue !== false) {
        this.setDirty('model');
        this._update();
      }
    },

    /**
     * @returns {Boolean} Whether the polygon should be shown as an extruded polygon.
     */
    isExtrusion: function() {
      return this._showAsExtrusion;
    },

    /**
     * Set the extruded height of the polygon to form a prism.
     * @param {Number} height The extruded height of the building.
     */
    setHeight: function(height) {
      if (this._height !== height) {
        this._height = height;
        this.setDirty('vertices');
        this._update();
      }
    },

    /**
     * @returns {Number} The extrusion height of the polygon.
     */
    getHeight: function() {
      return this._height;
    },

    // -------------------------------------------
    // MODIFIERS
    // -------------------------------------------

    /**
     * Function to enable interactive editing of the polygon.
     * @abstract
     */
    edit: function() {
      throw new DeveloperError('Can not call methods on abstract Polygon.');
    }

  });

  return Polygon;
});
