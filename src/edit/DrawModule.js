define([
  './BaseEditModule',
  'atlas/lib/utility/Log',
  'atlas/lib/utility/Setter'
], function(BaseEditModule, Log, Setter) {

  /**
   * @typedef atlas.edit.DrawModule
   * @ignore
   */
  var DrawModule;

  /**
   * @classdesc Handles logic for drawing {@link atlas.model.Polygon} objects through user
   * interaction.
   * @extends {atlas.render.BaseEditModule}
   * @class atlas.edit.DrawModule
   */
  DrawModule = BaseEditModule.extend({

    _vertices: null,
    /**
     * Contains the {@link atlas.model.Polygon} being drawn.
     * @type {atlas.model.Feature}
     */
    _feature: null,
    /**
     * The milliseconds from epoch of the last click. Used to detect a double click.
     * @type {Number}
     */
    _lastClickTime: null,
    /**
     * The maximum amount of time difference between clicks to detect as a double click.
     * @type {Number}
     */
    _doubleClickDelta: 200,
    /**
     * Used the generate IDs for the drawn objects.
     * @type {Number}
     */
    _nextId: 0,

    _init: function(atlasManagers) {
      this._super(atlasManagers);
      this.reset();
    },

    _getNextId: function() {
      return '_draw_' + ++this._nextId;
    },

    getEventBindings: function() {
      return Setter.mixin(this._super(), {
        'input/leftclick': this._add,
        'entity/draw': {
          callback: this._draw,
          source: 'extern',
          persistent: true
        }
      });
    },

    /**
     * Sets up the resources needed before drawing.
     * @private
     */
    _setup: function() {
      if (!this._feature) {
        this._feature = this._atlasManagers.entity.createFeature(this._getNextId(), {
          polygon: {
            vertices: []
          }
        });
        this._vertices = this._feature.getVertices();
        this._atlasManagers.edit.enable({
          entities: [this._feature], show: false, addHandles: false});
      }
    },

    /**
     * Called at the start of the drawing to bind event callbacks.
     * @param {Object} args
     * @param {Function} [args.update] - A callback invoked as the object is drawn (vertices are
     * added).
     * @param {Function} [args.create] - A callback invoked when drawing is complete.
     * @private
     */
    _draw: function(args) {
      var onUpdate = args.update;
      var onCreate = args.create;
      onUpdate && this._handlers.update.push(onUpdate);
      onCreate && this._handlers.create.push(onCreate);
      this.enable();
      this._atlasManagers.edit.enableModule('translation');
    },

    /**
     * Executes the given handlers with the drawn object.
     * @param handlers
     * @private
     */
    _executeHandlers: function(handlers) {
      handlers.forEach(function(handler) {
        handler.call(this, {
          feature: this._feature,
          vertices: this._vertices
        });
      }, this);
    },

    /**
     * Called when a vertex should be added during drawing.
     * @private
     */
    _add: function(args) {
      var handles = this._atlasManagers.edit._handles;
      var targetId = this._atlasManagers.render.getAt(args.position)[0],
          target = handles.get(targetId);
      if (target) {
        this._atlasManagers.edit.getModule('translation').cancel();
        this._finish(args);
        return;
      }

      if (this._lastClickTime) {
        var diff = Date.now() - this._lastClickTime;
        if (diff <= this._doubleClickDelta) {
          this._finish(args);
          return;
        }
      }
      this._lastClickTime = Date.now();

      this._setup();
      var point = this._atlasManagers.render.convertScreenCoordsToLatLng(args.position);
      var vertex = point.toVertex();
      this._vertices.push(vertex);

      var handle = this._feature.createHandle(vertex);
      handle.render();
      // TODO(aramk) Abstract this.
      handles.add(handle);
      if (this._vertices.length >= 3) {
        this._feature.show();
      }
      this._executeHandlers(this._handlers.update);
    },

    /**
     * Called when drawing has finished.
     * @private
     */
    _finish: function(args) {
      if (this._vertices.length < 3) {
        alert('A polygon must have at least 3 vertices.');
        return;
      }
      this._executeHandlers(this._handlers.create);
      this.reset();
      this.disable();
    },

    /**
     * Removes drawing resources.
     */
    reset: function() {
      this._feature = null;
      this._vertices = null;
      this._handlers = {
        update: [],
        create: []
      };
      this._lastClickTime = null;
      this._atlasManagers.edit.disable();
    }

  });
  return DrawModule;
});
