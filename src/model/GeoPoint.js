define([
  'atlas/lib/utility/Types',
  'atlas/lib/utility/Setter',
  'atlas/model/Vertex',
  'atlas/util/AtlasMath',
  'atlas/lib/utility/Class'
], function(Types, Setter, Vertex, AtlasMath, Class) {

  /**
   * @typedef atlas.model.GeoPoint
   * @ignore
   */
  var GeoPoint;

  /**
   * @classdesc The GeoPoint class represents a geospatial location on a globe. The location
   * is specified with latitude, longitude, and elevation.
   * @param {Number} [latitude=0] - The GeoPoint's latitude in decimal degrees.
   * @param {Number} [longitude=0] - The GeoPoint's longitude in decimal degrees.
   * @param {Number} [elevation=0] - The GeoPoint's elevation in decimal degrees.
   * @class atlas.model.GeoPoint
   */
  GeoPoint = Class.extend(/** @lends atlas.model.GeoPoint# */ {

    /**
     * The GeoPoint's longitude in decimal degrees.
     * @type {Number}
     */
    longitude: null,

    /**
     * The GeoPoint's latitude in decimal degrees.
     * @type {Number}
     */
    latitude: null,

    /**
     * The GeoPoint's elevation in metres.
     * @type {Number}
     */
    elevation: null,

    _init: function() {
      var firstArg = arguments[0];
      if (Types.isObjectLiteral(firstArg)) {
        this._setFromObject.apply(this, arguments);
      } else if (Types.isArrayLiteral(firstArg)) {
        this._setFromArgs.apply(this, firstArg);
      } else {
        this._setFromArgs.apply(this, arguments);
      }
      this._validate();
    },

    _setFromObject: function(args) {
      if (args.x !== undefined) {
        this._setFromArgs(args.x, args.y, args.z);
      } else {
        this._setFromArgs(args.longitude || args.lng, args.latitude || args.lat,
            args.elevation || args.height);
      }
    },

    _setFromArgs: function(longitude, latitude, elevation) {
      this.longitude = this._sanitizeValue(longitude);
      this.latitude = this._sanitizeValue(latitude);
      this.elevation = this._sanitizeValue(elevation);
    },

    _sanitizeValue: function(value) {
      if (value != null) {
        var numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error('Could not parse value: ' + value);
        } else {
          value = numValue;
        }
      } else {
        value = 0;
      }
      return value;
    },

    _validate: function() {
      var longitude = this.longitude;
      var latitude = this.latitude;
      if (longitude == null) {
        throw new Error('Longitude is required');
      } else if (latitude == null) {
        throw new Error('Latitude is required');
      } else if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude is out of range [-180,180]: ' + longitude);
      } else if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude is out of range [-90,90]: ' + latitude);
      }
    },

    // -------------------------------------------------
    // OPERATIONS
    // -------------------------------------------------

    /**
     * Subtracts a GeoPoint from this GeoPoint
     * @param {atlas.model.GeoPoint} other
     * @returns {atlas.model.GeoPoint}
     */
    subtract: function(other) {
      return new GeoPoint(this.longitude - other.longitude, this.latitude - other.latitude,
          this.elevation - other.elevation);
    },

    /**
     * Translates this GeoPoint by a given difference.
     * @param {atlas.model.GeoPoint | {latitude, longitude}} other
     * @returns {atlas.model.GeoPoint}
     */
    translate: function(other) {
      return new GeoPoint(this.longitude + other.longitude,
          this.latitude + other.latitude, this.elevation + other.elevation);
    },

    /**
     * Sets the values from the given GeoPoint.
     * @param {atlas.model.GeoPoint} other
     * @returns {atlas.model.GeoPoint} This GeoPoint.
     */
    set: function(other) {
      this._setFromObject(other);
      return this;
    },

    negate: function() {
      return new GeoPoint(0, 0, 0).subtract(this);
    },

    // -------------------------------------------
    // GENERATORS AND CONVERTERS
    // -------------------------------------------

    /**
     * @returns {atlas.model.Vertex} The GeoPoint as a new Vertex object.
     */
    toVertex: function() {
      // TODO(aramk) This uses cartographic coordinates for Vertex, which should be in cartesian.
      return new Vertex(this.longitude, this.latitude, this.elevation);
    },

    /**
     * @returns {atlas.model.GeoPoint} The GeoPoint with latitude and longitude converted to Radians.
     */
    toRadians: function() {
      return new GeoPoint(AtlasMath.toRadians(this.longitude), AtlasMath.toRadians(this.latitude),
          this.elevation);
    },

    /**
     * @returns {{degrees: Number, minutes: Number, seconds: Number}}
     * The GeoPoint as a map to degrees, minutes, and seconds values.
     */
    toDmsString: function() {
      throw 'GeoPoint.toDmsString not yet implemented.';
    },

    toString: function() {
      var northSouth = this.latitude < 0 ? -1 * this.latitude + 'S' : this.latitude + 'N',
          eastWest = this.longitude < 0 ? -1 * this.longitude + 'W' : this.longitude + 'E';
      return northSouth + ' ' + eastWest;
    },

    toArray: function() {
      return [this.longitude, this.latitude, this.elevation];
    },

    /**
     * @returns {atlas.model.GeoPoint} A deep copy of this object.
     */
    clone: function() {
      return new GeoPoint(this);
    },

    /**
     * @param {atlas.model.GeoPoint} other
     * @returns {Boolean} Whether the given object is exactly equal to this one.
     */
    equals: function(other) {
      return this.longitude === other.longitude && this.latitude === other.latitude &&
          this.elevation === other.elevation;
    },

    /**
     * @param {atlas.model.GeoPoint} other
     * @param {Number} [sigFigures=6] - The number of significant figures. The default value of 6
     * provides roughly 0.11m of precision.
     * @returns {Boolean} Whether the given object is equal to this one within the given significant
     * figures for decimal degrees of precision for latitude and longitude and with elevation
     * exactly equal.
     * @see http://gis.stackexchange.com/a/8674/12464
     */
    isCloseTo: function(other, sigFigures) {
      var sigFigures = Setter.def(sigFigures, 6);
      return this.longitude.toFixed(sigFigures) === other.longitude.toFixed(sigFigures) &&
          this.latitude.toFixed(sigFigures) === other.latitude.toFixed(sigFigures) &&
          this.elevation === other.elevation;
    }

  });

  /**
   * Constructs a new {@link GeoPoint} from an object containing properties for latitude,
   * longitude (both in radians), and height.
   * @returns {atlas.model.GeoPoint}
   * @static
   */
  GeoPoint.fromRadians = function(pos) {
    var point = new GeoPoint(pos);
    point.latitude = AtlasMath.toDegrees(point.latitude);
    point.longitude = AtlasMath.toDegrees(point.longitude);
    return point;
  };

  /**
   * Constructs a new GeoPoint from a Vertex object.
   * @param {atlas.model.Vertex} vertex - The vertex.
   * @param {Number} vertex.x - The longitude (horizontal position) in decimal degrees.
   * @param {Number} vertex.y - The latitude (vertical position) in decimal degrees.
   * @param {Number} vertex.z - The elevation in metres.
   * @returns {atlas.model.GeoPoint}
   * @static
   */
  GeoPoint.fromVertex = function(vertex) {
    if (!vertex) return new GeoPoint();
    return new GeoPoint(vertex.x, vertex.y, vertex.z);
  };

  /**
   * Constructs a new GeoPoint from an object containing properties for latitude,
   * longitude, and height.
   * @param other - The object containing the geospatial data.
   * @returns {atlas.model.GeoPoint}
   * @static
   */
  GeoPoint.fromLatLngHeight = function(other) {
    return new GeoPoint(other.lng, other.lat, other.height);
  };

  /**
   * Converts an array of GeoPoints to an array of Vertexes.
   * @param {Array.<atlas.model.GeoPoint>} points
   * @returns {Array.<atlas.model.Vertex>}
   * @static
   */
  GeoPoint.arrayToVertices = function(points) {
    return points.map(function(point) {
      return point.toVertex();
    });
  };

  return GeoPoint;
});
