define([
  'atlas/core/ItemStore',
  'atlas/lib/OpenLayers',
  'atlas/lib/Q',
  'atlas/lib/utility/Log',
  'atlas/lib/utility/Setter',
  // Base class
  'atlas/model/GeoEntity',
  'atlas/model/GeoPoint',
  'atlas/model/Handle',
  'atlas/util/ConvexHullFactory',
  'atlas/util/DeveloperError',
  'atlas/util/WKT',
  'underscore'
], function(ItemStore, OpenLayers, Q, Log, Setter, GeoEntity, GeoPoint, Handle, ConvexHullFactory,
            DeveloperError, WKT, _) {

  /**
   * @typedef atlas.model.Collection
   * @ignore
   */
  var Collection;

  /**
   * @classdesc A collection of {@link GeoEntity} objects which are treated as a single entity. In
   * general, the entities are able to change independently unless the change is invoked on the
   * collection, in which case in propagates to all entities.
   *
   * @abstract
   * @extends atlas.model.GeoEntity
   * @class atlas.model.Collection
   */
  Collection = GeoEntity.extend(/** @lends atlas.model.Collection# */ {

    /**
     * All the entities managed by this collection.
     * @type {atlas.core.ItemStore<atlas.model.GeoEntity>}
     * @protected
     */
    _entities: null,

    /**
     * @param {String} id
     * @param {Object} data
     * @param {Array.<String>} data.entities - A set of {@link GeoEntity} IDs.
     * @param {Object} args
     * @param {Boolean} [args.groupSelect=true] - Whether selecting an entity selects the entire
     * collection.
     * @private
     */
    _setup: function(id, data, args) {
      // Necessary for calling setElevation().
      this._entities = new ItemStore();
      this._initDelegation();
      this._initEvents();
      // Add entities before setup to ensure style is recursively set on entities.
      var entityIds = data.entities || [];
      entityIds.forEach(this.addEntity, this);
      this._super(id, data, args);
      this._visible = false;
      args = Setter.mixin({groupSelect: true}, args);
      args.groupSelect && this._initSelection();
    },

    _setupStyle: function(data, args) {
      var style = this._parseStyle(data, args);
      style && this.setStyle(style);
    },

    // -------------------------------------------
    // ENTITY MANAGEMENT
    // -------------------------------------------

    /**
     * @param {String} id - The ID of a {@link atlas.model.GeoEntity}.
     */
    addEntity: function(id) {
      var entity = this._entityManager.getById(id);
      if (!entity) {
        throw new Error('Entity with id "' + id + '" not found - cannot add to collection');
      }
      if (this._entities.get(id)) {
        Log.warn('Entity with ID ' + id + ' already added to collection.');
      } else {
        this._entities.add(entity);
        entity.setParent(this);
      }
    },

    /**
     * @param {String} id
     * @returns {atlas.model.GeoEntity} The entity with the given ID that was removed, or null if
     * it doesn't exist in this collection and wasn't removed.
     */
    removeEntity: function(id) {
      var entity = this._entities.get(id);
      if (entity) {
        this._entities.remove(id);
        entity.setParent(null);
      } else {
        Log.warn('Entity with ID ' + id + ' is not in collection.');
      }
    },

    /**
     * @param {String} id
     * @returns {atlas.model.GeoEntity} The entity with the given ID, or null if it doesn't exist in
     * this collection.
     */
    getEntity: function(id) {
      return this._entities.get(id);
    },

    /**
     * @returns {atlas.core.ItemStore<atlas.model.GeoEntity>} The entities in this collection.
     */
    getEntities: function() {
      return this._entities.clone();
    },

    getChildren: function() {
      return this._entities.asArray();
    },

    /**
     * Calls the given method on each {@link atlas.model.GeoEntity} in this collection, passing the
     * given arguments. If the method doesn't exist, it isn't called.
     * @param {String} methodName
     * @param {Array} args
     * @private
     */
    _forEntities: function(methodName, args) {
      return this._entities.forEach(function(item) {
        var method = item[methodName];
        method && method.apply(item, args);
      });
    },

    /**
     * Calls the given method on each {@link atlas.model.GeoEntity} in this collection. Passes the
     * returned value to the given callback. If the method doesn't exist, it isn't called and the
     * callback receives an undefined value.
     * @param {String} methodName
     * @param {Array} args
     * @param {Function} callback
     * @returns {Boolean} Whether the given callback succeeds for all entities.
     * @private
     */
    _everyEntity: function(methodName, args, callback) {
      return this._entities.every(function(item) {
        var value;
        var method = item[methodName];
        if (method) {
          value = method.apply(item, args);
        }
        return callback(value);
      });
    },

    /**
     * Calls the given method on each {@link atlas.model.GeoEntity} in this collection. Passes the
     * returned value to the given callback. If the method doesn't exist, it isn't called and the
     * callback receives an undefined value.
     * @param {String} methodName
     * @param {Array} args
     * @param {Function} callback
     * @returns {Boolean} Whether the given callback succeeds for some entities.
     * @private
     */
    _someEntity: function(methodName, args, callback) {
      return this._entities.some(function(item) {
        var value;
        var method = item[methodName];
        if (method) {
          value = method.apply(item, args);
        }
        return callback(value);
      });
    },

    /**
     * Calls the given method on each {@link atlas.model.GeoEntity} in this collection, passing the
     * given arguments.
     * @param {String} methodName
     * @param {Array} args
     * @private
     */
    _getEntityValues: function(methodName, args) {
      var values = [];
      this._entities.forEach(function(item) {
        var value;
        var method = item[methodName];
        if (method) {
          value = method.apply(item, args);
          if (value !== undefined) {
            values.push(value);
          }
        }
      });
      return values;
    },

    _initDelegation: function() {
      // TODO(aramk) getHandles should create a new ItemStore and add all.

      // Call on all entities.
      var forMethods = ['createHandles', 'addHandles', 'clearHandles', 'setHeight',
          'enableExtrusion', 'disableExtrusion'];
      forMethods.forEach(function(method) {
        this[method] = function() {
          return this._forEntities(method, arguments);
        };
      }, this);
      // Call on all entities and the collection.
      var forSelfMethods = ['remove', 'show', 'hide', 'translate', 'scale', 'setSelected',
          'setElevation', 'setStyle', 'modifyStyle'];
      forSelfMethods.forEach(function(method) {
        var selfMethod = this[method];
        this[method] = function() {
          this._forEntities(method, arguments);
          return selfMethod.apply(this, arguments);
        };
      }, this);
      // All entities must return true.
      var everyMethods = ['isRenderable', 'isSelected'];
      everyMethods.forEach(function(method) {
        this[method] = function() {
          return this._everyEntity(method, arguments, function(value) {
            return !!value;
          });
        };
      }, this);
      // Some entities must return true.
      var someMethods = ['isVisible'];
      someMethods.forEach(function(method) {
        this[method] = function() {
          return this._someEntity(method, arguments, function(value) {
            return !!value;
          });
        };
      }, this);
    },

    // -------------------------------------------
    // EVENTS
    // -------------------------------------------

    /**
     * Listen for events on the entities and removes them from this collection if they are removed.
     * @private
     *
     * @listens InternalEvent#entity/remove
     */
    _initEvents: function() {
      // If the original target is this feature, don't dispatch the event since it would be a
      // duplicate.
      var isOwnEvent = function(event) {
        return event.getTarget() === this;
      }.bind(this);
      // This responds to events which bubble up from children entities.
      this.addEventListener('entity/remove', function(event) {
        if (isOwnEvent(event)) return;
        var id = event.getTarget().getId();
        if (this.getEntity(id)) {
          this.removeEntity(id);
        }
        // Prevent this event from bubbling up further since the ancestors of this entity shouldn't
        // need to worry about its children.
        event.cancel();
      }.bind(this));
    },

    // -------------------------------------------
    // GETTERS AND SETTERS
    // -------------------------------------------

    getCentroid: function() {
      // Prevent caching the centroid since we do not determine when children will change yet.
      return this._calcCentroid();
    },

    _calcCentroid: function() {
      var wkt = WKT.getInstance();
      if (this._entities.isEmpty()) {
        return null;
      } else {
        // If the collection only contains a single child, use centroid of that child which is more
        // accurate.
        var singleChild = this._getSingleChild();
        if (singleChild) {
          return singleChild.getCentroid();
        }
        // We use the footprint since the centroid of the OpenLayers.Geometry.Collection does not
        // produce a valid estimate.
        var footprint = this.getOpenLayersFootprintGeometry();
        return footprint ? wkt.geoPointFromOpenLayersPoint(footprint.getCentroid()) : null;
      }
    },

    getOpenLayersFootprintGeometry: function() {
      var wkt = WKT.getInstance();
      var vertices = [];
      var children = this.getRecursiveChildren();
      if (children.length == 0) {
        return null;
      }
      children.forEach(function(entity) {
        // Don't attempt to generate 
        if (entity instanceof Collection) {
          return;
        }
        var geometry = entity.getOpenLayersGeometry();
        if (!geometry) {
          return;
        }
        var geometryVertices = wkt.geoPointsFromOpenLayersGeometry(geometry);
        if (geometryVertices.length === 0) {
          return;
        }
        geometryVertices.forEach(function(vertex) {
          vertices.push(vertex);
        });
      });
      var hullVertices = ConvexHullFactory.getInstance().fromVertices(vertices);
      return wkt.openLayersPolygonFromGeoPoints(hullVertices);
    },

    /**
     * @return {GeoEntity|null} The only child in the collection, or null if more than one child
     *     exists. Excludes children which are themselves collections.
     */
    _getSingleChild: function() {
      var children = this.getRecursiveChildren();
      var singleChild = null;
      _.some(children, function(child) {
        if (!(child instanceof Collection)) {
          if (singleChild) {
            singleChild = false;
            return true;
          } else {
            singleChild = child;
          }
        }
      });
      return singleChild;
    },

    getOpenLayersGeometry: function(args) {
      var components = this._entities.map(function(entity) {
        return entity.getOpenLayersGeometry(args);
      });
      return new OpenLayers.Geometry.Collection(components);
    },

    createHandle: function(vertex, index) {
      // TODO(aramk) Use a factory to use the right handle class.
      return new Handle(this._bindDependencies({target: vertex, index: index, owner: this}));
    },

    getGeometry: function() {
      throw new DeveloperError('Collection does not have a geometry - request from each entity.');
    },

    getAppearance: function() {
      throw new DeveloperError('Collection does not have an appearance - request from each ' +
          'entity.');
    },

    getElevation: function() {
      // Take the minimum elevation for all entities.
      var values = this._getEntityValues('getElevation');
      if (values.length === 0) {
        return null;
      } else {
        return Math.min.apply(null, values);
      }
    },

    getHeight: function() {
      // Take the maximum height for all entities.
      var values = this._getEntityValues('getHeight');
      if (values.length === 0) {
        return null;
      } else {
        return Math.max.apply(null, values);
      }
    },

    toJson: function() {
      return Setter.merge(this._super(), {
        type: 'collection',
        children: this._entities.map(function(entity) {
          return entity.getId();
        })
      });
    },

    ready: function() {
      return Q.all(this._entities.map(function(entity) {
        return entity.ready();
      }));
    },

    // -------------------------------------------
    // MODIFIERS
    // -------------------------------------------

    rotate: function(rotation, centroid) {
      // Rotation should be applied on each child entity around the same centroid - by default that
      // of the collection.
      centroid = centroid || this.getCentroid();
      this._super(rotation, centroid);
      this._entities.forEach(function(entity) {
        entity.rotate(rotation, centroid);
      });
    },

    _build: function() {
      // Collection does not have geometry to build.
    },

    _initSelection: function() {
      var collection = this;
      var actions = {'select': true, 'deselect': false};
      Object.keys(actions).forEach(function(name) {
        var state = actions[name];
        var handle = this._eventManager.addEventHandler('intern', 'entity/' + name, function(args) {
          var match = args.ids.some(function(id) {
            return collection.getEntity(id);
          });
          if (match) {
            collection.setSelected(state);
          }
        });
        this._bindEventHandle(handle);
      }, this);
    },

    // Ignore all style since it's handled by the entities. Otherwise, setting the style for this
    // feature applies it to the form and this changes it from the pre-select style.
    _setSelectStyle: function() {
    },

    _revertSelectStyle: function() {
    }

  });

  return Collection;
});
