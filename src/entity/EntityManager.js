define([
  'atlas/core/Manager',
  'atlas/core/ItemStore',
  'atlas/events/Event',
  'atlas/lib/utility/Log',
  'atlas/lib/utility/Setter',
  'atlas/model/Collection',
  'atlas/model/Ellipse',
  'atlas/model/Feature',
  'atlas/model/GeoEntity',
  'atlas/model/Mesh',
  'atlas/model/Polygon',
  'atlas/model/Line',
  'atlas/model/Image',
  'atlas/model/GeoPoint',
  'atlas/model/Vertex',
  'atlas/util/DeveloperError'
], function(Manager, ItemStore, Event, Log, Setter, Collection, Ellipse, Feature, GeoEntity, Mesh,
            Polygon, Line, Image, GeoPoint, Vertex, DeveloperError) {

  /**
   * @typedef atlas.entity.EntityManager
   * @ignore
   */
  var EntityManager;

  /**
   * Maintains a collection of created {@link atlas.model.GeoEntity} objects and provides an
   * external interface to create, update and delete them.
   * @class atlas.entity.EntityManager
   */
  EntityManager = Manager.extend(/** @lends atlas.entity.EntityManager# */{

    _id: 'entity',

    /**
     * All added {@link atlas.model.GeoEntity} objects.
     * @type {atlas.core.ItemStore}
     */
    _entities: null,

    /**
     * Contains a mapping of GeoEntity subclass names to the constructor object
     * used to create that GeoEntity. Allows overriding of the default atlas GeoEntities
     * without having to subclass the EntityManager.
     * @type {Object.<String,Function>}
     */
    _entityTypes: {
      Ellipse: Ellipse,
      Feature: Feature,
      Image: Image,
      Line: Line,
      Mesh: Mesh,
      Polygon: Polygon,
      Collection: Collection
    },

    /**
     * A map of feature ID to their display mode at the time of calling 'entity/display-mode'.
     * Records are removed when calling 'entity/display-mode/reset'.
     * @type {Object.<String, atlas.model.Feature.DisplayMode>}
     */
    _origDisplayModes: null,

    _init: function(managers) {
      this._super(managers);
      this._origDisplayModes = {};
      this._entities = new ItemStore();
    },

    /**
     * Performs any manager setup that requires the presence of other managers.
     * @param {Object} args
     */
    setup: function(args) {
      var constructors = args && args.constructors;
      if (constructors) {
        this.setGeoEntityTypes(constructors);
      }
      this.bindEvents();
    },

    bindEvents: function() {
      var handlers = [
        {
          source: 'extern',
          name: 'entity/create',
          callback: this.createFeature.bind(this)
        },
        {
          source: 'extern',
          name: 'entity/show',
          callback: this.toggleEntityVisibility.bind(this, true)
        },
        {
          source: 'extern',
          name: 'entity/hide',
          callback: this.toggleEntityVisibility.bind(this, false)
        },
        {
          source: 'extern',
          name: 'entity/remove',
          callback: function(args) {
            Log.time('entity/remove');
            var entity = this.getById(args.id);
            entity && entity.remove();
            Log.timeEnd('entity/remove');
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'entity/show/bulk',
          callback: function(args) {
            Log.time('entity/show/bulk');
            var ids;
            if (args.features) {
              ids = this.bulkCreate(args.features);
            } else if (args.ids) {
              ids = args.ids;
            } else {
              throw new Error('Either features or ids must be provided for bulk show.');
            }
            if (args.callback) {
              args.callback(ids);
            }
            Log.timeEnd('entity/show/bulk');
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'entity/hide/bulk',
          callback: function(args) {
            Log.time('entity/hide/bulk');
            this.getByIds(args.ids).forEach(function(entity) {
              entity.hide();
            }, this);
            Log.timeEnd('entity/hide/bulk');
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'entity/remove/bulk',
          callback: function(args) {
            Log.time('entity/remove/bulk');
            args.ids.forEach(function(id) {
              this.remove(id);
            }, this);
            Log.timeEnd('entity/remove/bulk');
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'entity/display-mode',
          callback: function(args) {
            // Set all features to 'footprint' display mode.
            Log.time('entity/display-mode');
            var features = args.ids ? this._getFeaturesByIds(args.ids) : this.getFeatures();
            features.forEach(function(feature) {
              var id = feature.getId();
              // Save a reference to the previous display mode to allow resetting.
              if (!this._origDisplayModes[id]) {
                this._origDisplayModes[id] = feature.getDisplayMode();
              }
              feature.setDisplayMode(args.displayMode);
            }, this);
            Log.timeEnd('entity/display-mode');
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'entity/display-mode/reset',
          callback: function(args) {
            // Resets all features to their original display mode (at the time of using entity/mode
            args = args || {};
            Log.time('entity/display-mode/reset');
            var features = this._getFeaturesByIds(args.ids || Object.keys(this._origDisplayModes));
            features.forEach(function(feature) {
              var id = feature.getId();
              var origDisplayMode = this._origDisplayModes[id];
              if (origDisplayMode) {
                feature.setDisplayMode(origDisplayMode);
                delete this._origDisplayModes[id];
              }
            }, this);
            Log.timeEnd('entity/display-mode/reset');
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'entity/rotate',
          callback: function(args) {
            if (!args || !args.ids) { return; }
            var features = this._getFeaturesByIds(args.ids);
            features.forEach(function(feature) {
              feature.rotate(args.rotate);
            });
          }.bind(this)
        },
        {
          source: 'intern',
          name: 'input/left/dblclick',
          /**
           * @param {InternalEvent#event:input/left/dblclick} args
           * @listens InternalEvent#input/left/dblclick
           * @fires InternalEvent#entity/dblclick
           * @ignore
           */
          callback: function(args) {
            var entities = this.getAt(args.position);
            if (entities.length > 0) {
              // Only capture the double click on the first entity.
              var entity = entities[0];

              /**
               * The {@link atlas.model.GeoEntity} was double-clicked.
               *
               * @event InternalEvent#entity/dblclick
               * @type {atlas.events.Event}
               * @property {String} args.id - The ID of the double-clicked entity.
               */
              this._managers.event.dispatchEvent(new Event(entity, 'entity/dblclick', {
                id: entity.getId()
              }));
            }
          }.bind(this)
        }
      ];
      this._managers.event.addEventHandlers(handlers);
    },

    /**
     * Allows overriding of the default Atlas GeoEntity types with implementation specific
     * GeoEntity types.
     * @param {Object.<String, Function>} constructors - A map of entity type names to entity
     *     constructors.
     */
    setGeoEntityTypes: function(constructors) {
      for (var key in constructors) {
        if (key in this._entityTypes) {
          //noinspection JSUnfilteredForInLoop
          this._entityTypes[key] = constructors[key];
        }
      }
    },

    // -------------------------------------------
    // CREATE ENTITIES
    // -------------------------------------------

    /**
     * Creates and adds a new Feature object to atlas-cesium.
     * @param {String} id - The ID of the Feature to add.
     * @param {Object} args - Arguments describing the Feature to add.
     * @param {String|Array.<atlas.model.GeoPoint>} [args.line=null] - Either a WKT string or array
     *     of vertices.
     * @param {String|Array.<atlas.model.GeoPoint>} [args.footprint=null] - Either a WKT string or
     *     array of vertices.
     * @param {Object} [args.mesh=null] - A object in the C3ML format describing the Features' Mesh.
     * @param {Number} [args.height=0] - The extruded height when displaying as a extruded polygon.
     * @param {Number} [args.elevation=0] - The elevation (from the terrain surface) to the base of
     *     the Mesh or Polygon.
     * @param {Boolean} [args.show=true] - Whether the feature should be initially shown when
     *     created.
     * @param {String} [args.displayMode='footprint'] - Initial display mode of feature.
     */
    createFeature: function(id, args) {
      if (typeof id === 'object') {
        args = id;
        id = args.id;
      }
      args = Setter.merge({
        show: false
      }, args);
      if (id === undefined) {
        throw new DeveloperError('Can not create Feature without specifying ID');
      } else if (this._entities.get(id)) {
        throw new DeveloperError('Can not create Feature with a duplicate ID');
      } else {
        this._bindDeps(args);
        Log.debug('Creating entity', id);
        return new this._entityTypes.Feature(id, args);
      }
    },

    /**
     * @param {String} id
     * @param {Object} args
     * @return {atlas.model.Collection}
     */
    createCollection: function(id, args) {
      this._bindDeps(args);
      return new this._entityTypes.Collection(id, {entities: args.children}, args);
    },

    /**
     * Adds manager references to the given object as dependencies later passed to models.
     * @param {Object} args
     * @return {Object} The object passed in.
     */
    _bindDeps: function(args) {
      // TODO(aramk) Use dependency injection to ensure all entities that are created have these
      // if they need them.
      // Add EventManger to the args for the feature.
      args.eventManager = this._managers.event;
      // Add the RenderManager to the args for the feature.
      args.renderManager = this._managers.render;
      // Add the EntityManager to the args for the feature.
      args.entityManager = this;
    },

    /**
     * Allows for creation of multiple Features. Skips features which already exist.
     * @param {Array} c3mls - An array of objects, with each object containing
     *    an entity description conforming to the C3ML standard.
     * @returns {Array} The IDs of the created entities.
     */
    bulkCreate: function(c3mls) {
      var ids = [];
      var collections = {};
      c3mls.forEach(function(c3ml) {
        var id = c3ml.id;
        var entity = this.getById(id);
        if (!entity) {
          // TODO(aramk) This is only performed for bulk requests and is inconsistent - clean up
          // the API for consistency.
          var c3mlData = this._parseC3ML(c3ml);
          if (c3ml.type === 'collection') {
            collections[id] = c3mlData;
          } else {
            this.createFeature(id, c3mlData);
          }
          ids.push(id);
        }
      }, this);
      // Create collections (if any) after all other entities.
      // TODO(aramk) Topologically sort all entities (including collections) based on their
      // parents/children.
      Object.keys(collections).forEach(function(id) {
        var c3mlData = collections[id];
        this.createCollection(id, c3mlData);
      }, this);
      return ids;
    },

    /**
     * Takes a object conforming to C3ML and converts it to a format expected by
     * Atlas.
     * @param {Object} c3ml - The C3ML object.
     * @returns {Object} An Atlas readable object representing the C3ML object.
     * @protected
     */
    _parseC3ML: function(c3ml) {
      // Map of C3ML type to parse of that type.
      var parsers = {
        line: this._parseC3MLline,
        mesh: this._parseC3MLmesh,
        polygon: this._parseC3MLpolygon,
        image: this._parseC3MLimage
      };
      // Generate the Geometry for the C3ML type if it is supported.
      var parser = parsers[c3ml.type];
      var geometry = parser && parser.call(this, c3ml);
      return Setter.mixin(c3ml, geometry);
    },

    // TODO(aramk) For all parsers - reuse the objects passed rather than creating new ones.
    // Mix in new parameters.

    /**
     * Parses a C3ML image object to an format supported by Atlas.
     * @param {Object} c3ml - The C3ML object to be parsed
     * @returns {Object} The parsed C3ML.
     * @private
     */
    _parseC3MLimage: function(c3ml) {
      return {
        image: {
          vertices: c3ml.coordinates,
          image: c3ml.image
        }
      };
    },

    /**
     * Parses a C3ML line object to an format supported by Atlas.
     * @param {Object} c3ml - The C3ML object to be parsed
     * @returns {Object} The parsed C3ML.
     * @private
     */
    _parseC3MLline: function(c3ml) {
      return {
        line: {
          vertices: c3ml.coordinates,
          color: c3ml.color,
          height: c3ml.height,
          elevation: c3ml.altitude
        }
      };
    },

    /**
     * Parses a C3ML polygon object to an format supported by Atlas.
     * @param {Object} c3ml - The C3ML object to be parsed
     * @returns {Object} The parsed C3ML.
     * @private
     */
    _parseC3MLpolygon: function(c3ml) {
      return {
        polygon: {
          // TODO(aramk) We need to standardize which one we use - were using "vertices" internally
          // but "coordinates" in c3ml.
          vertices: c3ml.coordinates,
          holes: c3ml.holes,
          color: c3ml.color,
          height: c3ml.height,
          elevation: c3ml.altitude
        }
      };
    },

    /**
     * Parses a C3ML mesh object to an format supported by Atlas.
     * @param {Object} c3ml - The C3ML object to be parsed
     * @returns {Object} The parsed C3ML.
     * @private
     */
    _parseC3MLmesh: function(c3ml) {
      return {
        mesh: {
          positions: c3ml.positions,
          normals: c3ml.normals,
          triangles: c3ml.triangles,
          color: c3ml.color,
          geoLocation: c3ml.geoLocation,
          scale: c3ml.scale,
          rotation: c3ml.rotation
        }
      };
    },

    /**
     * Adds a new GeoEntity into the EntityManager.
     * @param {atlas.model.GeoEntity} entity - The new GeoEntity;
     */
    add: function(entity) {
      var id = entity.getId();
      if (this._entities.get(id)) {
        throw new Error('tried to add entity', id, 'which already exists.');
      }
      if (!(entity instanceof GeoEntity)) {
        throw new DeveloperError('Can not add entity which is not a subclass of ' +
            'atlas/model/GeoEntity.');
      }
      Log.debug('entityManager: added entity', id);
      this._entities.add(entity);
    },

    /**
     * Removes the given GeoEntity from the EntityManager.
     * @param {String} id - The ID of the GeoEntity to remove.
     */
    remove: function(id) {
      if (this._entities.get(id)) {
        Log.debug('entityManager: deleted entity', id);
        var entity = this._entities.remove(id);
        // Call this last to prevent infinite loops if this method is called from within.
        entity.remove();
      }
    },

    // -------------------------------------------
    // ENTITY RETRIEVAL
    // -------------------------------------------

    /**
     * Returns the {@link atlas.model.GeoEntity} instances that are rendered and visible.
     * @returns {Object.<String, atlas.model.GeoEntity>} A map of IDs to visible entities.
     */
    getVisibleEntities: function(args) {
      args = Setter.mixin({}, args);
      if (!args.ids) {
        args.ids = this._entities.getIds();
      }
      var visible = {};
      var ids = args.ids;
      var filter = args.filter;
      ids.forEach(function(id) {
        var entity = this.getById(id);
        if (filter && !filter(entity)) {
          return;
        }
        if (entity.isVisible()) {
          visible[id] = entity;
        }
      }, this);
      return visible;
    },

    /**
     * Returns the {@link atlas.model.Feature} instances that are rendered and visible.
     * @returns {Object.<String, atlas.model.GeoEntity>} A map of IDs to visible features.
     */
    getVisibleFeatures: function() {
      return this.getVisibleEntities({
        filter: function(entity) {
          return entity instanceof Feature;
        }
      });
    },

    /**
     * Returns the GeoEntity instance corresponding to the given ID.
     * @param {String} id - The ID of the GeoEntity to return.
     * @returns {atlas.model.GeoEntity|undefined} The corresponding GeoEntity or
     *     <code>undefined</code> if there is no such GeoEntity.
     */
    getById: function(id) {
      // TODO(bpstudds): Accept either a single id or an array of IDs and return an either a
      //      single entity or an array or Entities
      return this._entities.get(id);
    },

    /**
     * @param {Array.<String>} ids - The ID of the GeoEntity to return.
     * @returns {Array.<atlas.model.GeoEntity>} The corresponding GeoEntity instances mapped by
     *     their IDs.
     */
    getByIds: function(ids) {
      var entities = [];
      ids.forEach(function(id) {
        var entity = this.getById(id);
        entity && entities.push(entity);
      }.bind(this));
      return entities;
    },

    /**
     * @returns {Array.<atlas.model.GeoEntity>}
     */
    getEntities: function() {
      return this._entities.asArray();
    },

    /**
     * @param {Array} items
     * @param {Function} type - The constructor to filter by.
     * @returns {Array} A new array containing only the items which are of the given type.
     * @private
     */
    _filterByType: function(items, type) {
      return items.filter(function(item) {
        return item instanceof type;
      });
    },

    /**
     * @param {Array} items
     * @returns {Array.<atlas.model.Feature>} A new array containing only the items which are of
     * type {@link atlas.model.Feature}.
     * @private
     */
    _filterFeatures: function(items) {
      return this._filterByType(items, Feature);
    },

    _getFeaturesByIds: function(ids) {
      return this._filterFeatures(this.getByIds(ids));
    },

    /**
     * @returns {Array.<atlas.model.Feature>}
     */
    getFeatures: function() {
      return this._filterFeatures(this.getEntities());
    },

    /**
     * Returns the GeoEntity that intersects the given point or undefined if there is no such
     * entity.
     * @param {atlas.model.GeoPoint} point - The point of interest.
     * @returns {Array.<atlas.model.GeoEntity>} The GeoEntities located at the given screen
     * coordinates.
     */
    getAt: function(point) {
      throw new DeveloperError('EntityManager.getAt not yet implemented.');
    },

    /**
     * Returns the GeoEntities located within the given Polygon.
     * @param {atlas.model.Polygon} boundingPoly - The polygon defining the geographic area to
     * retrieve GeoEntities.
     * @param {Boolean} [intersects] - If true, GeoEntities which intersect the boundingBox are
     * returned as well. Otherwise, only wholly contains GeoEntities are returned.
     * @returns {atlas.model.GeoEntity|undefined} The GeoEntities located in the bounding box,
     * or <code>undefined</code> if there are no such GeoEntities.
     * @abstract
     */
    getInPoly: function(boundingPoly, intersects) {
      throw new DeveloperError('EntityManager.getInPoly not yet implemented.');
    },

    /**
     * Returns the GeoEntities located within a given rectangle defined by two opposing
     * corner points. The points are specified using latitude and longitude.
     * @param {atlas.model.GeoPoint} point1
     * @param {atlas.model.GeoPoint} point2
     * @returns {Array.<atlas.model.GeoEntity>} The array of GeoEntities within the rectangle.
     * @abstract
     */
    getInRect: function(point1, point2) {
      throw new DeveloperError('EntityManager.getInRect not yet implemented.');
    },

    // -------------------------------------------
    // ENTITY MODIFICATION
    // -------------------------------------------

    toggleEntityVisibility: function(visible, args) {
      var ids = args.ids || [args.id];
      var action = visible ? 'show' : 'hide';

      Log.time('entity/' + action);
      ids.forEach(function(id) {
        var entity = this.getById(id);
        if (!entity) throw new Error('Tried to ' + action + ' non-existent entity ' + id);

        visible ? entity.show() : entity.hide();
      }, this);
      Log.timeEnd('entity/' + action);
    }

  });

  return EntityManager;
});
