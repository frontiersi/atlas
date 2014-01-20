define([
  'atlas/util/Class',
  'atlas/util/DeveloperError',
  'atlas/util/mixin'
], function (Class, DeveloperError, mixin) {

  /**
   * Constructs a new AbstractProjection object.
   * @classDesc Describes the interface and generic methods for a Projection. A Projection
   * is used project the value of an Entity's parameter onto some renderable artifact.
   * @author Brendan Studds
   * @abstract
   * @class atlas.visualisation.AbstractProjection
   * @param {Object} args - Arguments to construct the AbstractProjection
   * @param {String} args.type - The type of projection, currently only 'continuous' supported.
   * @param {Object.<String, atlas.model.GeoEntity>} args.entities - A map of GeoEntity ID to GeoEntity instances that are affected by the projection.
   * @param {Object.<String, Number>} args.values - A map of GeoEntity ID to parameter value to be projected.
   * @param {Object} [args.configuration] - Optional configuration of the projection.
   */
  return Class.extend(/** @lends atlas.visualisation.AbstractProjection# */ {

    /**
     * The type of artifact being projected onto.
     * @constant
     */
    ARTIFACT: null,

    /**
     * The type of the projection, currently only 'continuous' is supported.
     * @type {String}
     * @protected
     */
    _type: null,

    /**
     * A map of GeoEntity ID to GeoEntity instance affected by the Projection. It is
     * assumed that every ID that appears in <code>_entities</code> appears in <code>_values</code>
     */
    _entities: null,

    /**
     * A map of Entity ID to its parameter value to be projected. It is
     * assumed that every ID that appears in <code>_values</code> appears in <code>_entities</code>
     * @type {Object.<String, Number>}
     * @protected
     */
    _values: null,

    /**
     * A map of Entity ID to the effect the projection has.
     * @type {Object.<String, Object>}
     * @property {Number} oldVal - The value of an Entity's artifact before this projection was applied.
     * @property {Number} newVal - The value of an Entity's artifact after this projection was applied.
     * @protected
     */
    _effects: null,

    /**
     * Contains calculated statistical data for the set of
     * {@link atlas.visualisation.AbstractProjection#values|values} governing the projection.
     * @property {Number} min - The minimum value.
     * @property {Number} max - The maximum value.
     * @property {Number} sum - The sum of all values.
     * @property {Number} ave - The average of all values.
     * @protected
     */
    _stats: null,

    /**
     * Contains a map of Entity ID to parameters required for the projection.
     * @protected
     */
    _params: null,

    /**
     * Contains options configuring the behaviour of the Projection.
     * @type {Object}
     * @protected
     */
    _configuration: null,

    /**
     * Constructs a new AbstractProjection
     * @see {@link atlas.visualisation.AbstractProjection}
     * @ignore
     */
    _init: function (args) {
      args = mixin({
        type: 'continuous',
        values: {},
        entities: {},
        configuration: {}
      }, args);
      if (args.type !== 'continuous') {
        throw new DeveloperError('Tried to instantiate Projection with unsupported type', args.type);
      }
      this._type = args.type;
      this._effects = {};
      this._entities = args.entities;
      this._values = args.values;
      this._configuration = args.configuration;
      this._params = this._calculateProjectionParameters();
    },

    /**
     * Renders the effects of the Projection on all or a subset of the GeoEntities linked
     * to this projection.
     * @param {String|Array.<String>} [id] - Either a single GeoEntity ID or an array of IDs.
     */
    render: function (id) {
      this._mapToEntitiesById(this._render, id);
    },

    /**
     * Renders the effects of the Projection on a single GeoEntity.
     * @param {atlas.model.GeoEntity} entity - The GeoEntity to render.
     * @param {Object} params - The parameters of the Projection for the given GeoEntity.
     * @protected
     */
    _render: function (entity, params) {
      throw new DeveloperError('Tried to call abstract method "_render" of AbstractProjection.');
    },

    /**
     * Renders the effects of the Projection on all or a subset of the GeoEntities linked
     * to this projection.
     * @param {String|Array.<String>} [id] - Either a single GeoEntity ID or an array of IDs.
     */
    unrender: function (id) {
      this._mapToEntitiesById(this._unrender, id);
    },

    /**
     * Renders the effects of the Projection on a single GeoEntity.
     * @param {atlas.model.GeoEntity} entity - The GeoEntity to unrender.
     * @param {Object} params - The parameters of the Projection for the given GeoEntity.
     * @protected
     */
    _unrender: function (entity, params) {
      throw new DeveloperError('Tried to call abstract method "_unrender" of AbstractProjection.');
    },

    /**
     * Process all (or a subset) of GeoEntities and applies a given function to them.
     * @param {Function.<atlas.model.GeoEntity, Object>} f - The function to apply to the GeoEntities.
     * @param {String|Array.<String>} [id] - Either a single GeoEntity ID or an array of IDs.
     * @private
     */
    _mapToEntitiesById: function (f, id) {
      var ids = this._constructIdList(id);
      // Process each entity for the win.
      ids.forEach(function (id) {
        var theEntity = this._entities[id];
        var theParams = this._params[id];
        if (theEntity) {
          f.call(this, theEntity, theParams);
        }
      }, this);
    },

    /**
     * Updates the projection with a new set of values and configuration data.
     * @param {Object} args - The data to update the projection with.
     * @param {Object.<String, Number>} [args.values] - Updated or new values to project.
     * @param {Boolean} [args.addToExisting=false] - If true, existing data is updated. If false,
     *      any existing data related to the updated data is deleted
     */
    update: function (args) {
      args.addToExisting = args.addToExisting === undefined ? false : args.addToExisting;
      if (args.values) {
        this._values = args.addToExisting ? mixin(this._values, args.values) : args.values;
        // TODO(bpstudds): Allow for updating a subset of parameters.
        delete this._stats;
        delete this._params;
        // TODO(bpstudds): Allow for updating a subset of parameters.
        this._params = this._calculateProjectionParameters();
      }
    },

    /**
     * @returns {String} The type of the Projection.
     */
    getType: function () {
      return this._type;
    },

    /**
     * @returns {Object.<String, Number>} The map of Entity ID to value for the Projection.
     */
    getValues: function () {
      return this._values;
    },

    /**
     * @returns {Object} The configuration of the Projection.
     */
    getConfiguration: function() {
      return this._configuration;
    },

    /**
     * Calculates the statistical properties for the set of parameter values of this Projection.
     * The statistical properties calculated depend on the
     * {@link atlas.visualisation.AbstractProjection#type|type} of the projection.
     * @returns {Object}
     * @protected
     */
    _calculateValuesStatistics: function () {
      // TODO(bpstudds): Add the ability to specify which IDs to update see HeightProjection#render.
      var ids = Object.keys(this._values);
      var stats = {'sum': 0};
      if (ids.length > 0) {
        stats.min = { id: ids[0], value: this._values[ids[0]] };
        stats.max = { id: ids[0], value: this._values[ids[0]] };
        stats.count = ids.length;
        // Calculate min, max, and sum values.
        ids.forEach(function (id) {
          var thisValue = this._values[id];
          stats.sum += parseInt(thisValue, 10) || 0;
          if (thisValue < stats.min.value) { stats.min = { 'id': id, 'value': thisValue };}
          if (thisValue > stats.max.value) { stats.max = { 'id': id, 'value': thisValue };}
        }, this);
        stats.average = stats.sum / stats.count;
        stats.range = stats.max.value - stats.min.value;
      }
      return stats;
    },

    /**
     * Calculates the projection parameters for each Entity's value in the Projection. The exact
     * parameters calculated depend on the {@link atlas.visualisation.AbstractProjection#type|type}
     * of the projection.
     * @returns {Object}
     * @protected
     */
    _calculateProjectionParameters: function () {
      // TODO(bpstudds): Add the ability to specify which IDs to update see HeightProjection#render.
      // Update the value statistics if necessary.
      this._stats = this._stats ? this._stats : this._calculateValuesStatistics();
      var params = {};
      var ids = Object.keys(this._values);
      ids.forEach(function (id) {
        var thisValue = this._values[id];
        var param = {};
        param.diffFromAverage = thisValue - this._stats.average;
        param.ratioBetweenMinMax = this._stats.range === 0 ? Number.POSITIVE_INFINITY : (thisValue - this._stats.min.value) / (this._stats.range);
        param.ratioFromAverage = (thisValue - this._stats.average);
        param.ratioFromAverage /= (param.ratioFromAverage < 0 ?
            (this._stats.average - this._stats.min.value) : (this._stats.max.value - this._stats.average));
        params[id] = param;
      }, this);
      return params;
    },

    /**
     * Constructs a list of IDs that are intended to be projected on. Either none, one, or an array
     * of IDs can be provided. If IDs are provided, a list of these IDs is returned. If no ID
     * are provided; a list of all IDs of Entities specified in the Projection is returned.
     * @param {String|Array.<String>} [id] - Either a single GeoEntity ID or an array of IDs.
     * @returns {Array.<String>} - An array of GeoEntity IDs.
     * @protected
     */
    _constructIdList: function (id) {
      var ids = null;
      var allIds = Object.keys(this._entities);
      // If argument id was provided...
      if (id && !id.length) { ids = [id]; }
      if (id && id.length > 0) { ids = id; }
      // ... use the entities it specifies instead of all the entities.
      if (!ids) { ids = allIds; }
      return ids;
    }
  });
});
