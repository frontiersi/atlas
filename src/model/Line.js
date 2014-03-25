define([
  'atlas/util/DeveloperError',
  'atlas/util/default',
  'atlas/util/WKT',
  './GeoEntity',
  './Vertex'
], function(DeveloperError, defaultValue, WKT, GeoEntity, Vertex) {
  /**
   * @classdesc Represents a 2D line segment.
   * @class atlas.model.Line
   * @extends atlas.model.GeoEntity
   */
  return GeoEntity.extend(/** @lends atlas.model.Line# */{

    /**
     * Counter-clockwise ordered array of vertices constructing polygon.
     * @type {Array.<atlas.model.Vertex>}
     * @private
     */
    _vertices: null,

    /**
     * @type {atlas.model.Style}
     * @private
     */
    _style: null,

    /**
     * The width of the line segment.
     * @type {Number}
     * @private
     */
    _width: 10,

    /**
     * Constructs a new {@link Line}.
     * @ignore
     */
    _init: function(id, lineData, args) {
      this._super(id, args);
      if (typeof lineData.vertices === 'string') {
        var wkt = WKT.getInstance(),
            vertices = wkt.verticesFromWKT(lineData.vertices);
        if (vertices instanceof Array) {
          this._vertices = vertices;
        } else {
          throw new Error('Invalid vertices for Line ' + id);
        }
      } else {
        this._vertices = defaultValue(lineData.vertices, []);
      }
      this._width = lineData.width || this._width;
    },

    /**
     * Function to enable interactive editing of the polygon.
     * @abstract
     */
    edit: function() {
      throw new DeveloperError('Can not call methods on abstract Polygon.');
    }

  });
});
