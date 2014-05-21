define([
  'atlas/edit/BaseEditModule',
  'atlas/lib/utility/Log',
  'atlas/lib/utility/Setter',
  'atlas/model/Vertex',
  'atlas/util/Class',
  'atlas/util/default'
], function(BaseEditModule, Log, Setter, Vertex, Class, defaultValue) {

  /**
   * @typedef atlas.edit.TranslationModule
   * @ignore
   */
  var TranslationModule;

  /**
   * @classdesc Handles logic for movement of {@link atlas.model.GeoEntity} objects through user
   * interaction (e.g. dragging).
   * @extends {atlas.render.BaseEditModule}
   * @class atlas.edit.TranslationModule
   */
  TranslationModule = BaseEditModule.extend(/** @lends atlas.edit.TranslationModule# */ {

    /**
     * A map of entity ID to entity object to entities currently being dragged.
     * @type {Object.<String, atlas.model.GeoEntity>}
     * @private
     */
    // TODO(aramk) This isn't used at the moment - only _target is.
    _entities: null,

    /**
     * @param {Object} atlasManagers - A map of Atlas manager types to the manager instance.
     * @param {Object} [args] - Arguments to creating the TranslationModule.
     * @param {Number} [args.moveSensitivity] - Minimum number of screen pixels to move so a drag is recognised.
     * @constructor
     * @private
     */
    _init: function(atlasManagers, args) {
      this._super(atlasManagers, args);
      args = defaultValue(args, {});
      this._MOVE_SENSITIVITY = defaultValue(args.moveSensitivity, 5);
      this._atlasManagers = atlasManagers;
      this._reset();
    },

    /**
     * When translation begins, if the event is targeted on a selected {@link atlas.model.GeoEntity},
     * then all selected entities are included in the translation. If no object is selected before
     * translation, only the target entity is translated.
     */
    startDrag: function(args) {
      if (!args.target) {
        return;
      }
      this._target = args.target;
      // Lock up camera
      this._atlasManagers.camera.lockCamera();
      // Initialise the translation.
      this._lastScreenCoords = {x: args.position.x, y: args.position.y};
      this._originalLocation = this._lastLocation = this._cartographicLocation(args.position);
    },

    /**
     * Translates from the last location to the current location of the event for all entities.
     */
    updateDrag: function(args) {
      if (!this._target) {
        return;
      }

      var screenDiff = new Vertex(args.position.x,
          args.position.y).subtract(this._lastScreenCoords).absolute();
      if (screenDiff.x < this._MOVE_SENSITIVITY && screenDiff.y < this._MOVE_SENSITIVITY) {
        return;
      }
      this._lastScreenCoords = {x: args.position.x, y: args.position.y};
      var cartLocation = this._cartographicLocation(args.position);
      this._translate(this._lastLocation, cartLocation);
      this._lastLocation = cartLocation;
    },

    /**
     * Translates from the last location to the current location of the event for all entities and then
     * stops translating.
     */
    endDrag: function(args) {
      if (!this._target) {
        return;
      }
      this._lastScreenCoords = {x: args.x, y: args.y};
      //var cartLocation = this._cartographicLocation(args);
      //this._translate(this._lastLocation, cartLocation);
      this._reset();
      this._atlasManagers.camera.unlockCamera();
    },

    /**
     * Cancels the translation and moves all back to their original locations before translation began.
     */
    cancel: function(args) {
      if (!this._target) {
        Log.debug('No translation is taking place - cannot cancel', args);
      } else {
        this._atlasManagers.camera.unlockCamera();
        this._translate(this._lastLocation, this._originalLocation);
        this._reset();
      }
    },

    /**
     * Translates all entities from one location to another.
     * @param {atlas.model.GeoPoint} oldPos - The starting coordinate.
     * @param {atlas.model.GeoPoint} newPos - The ending coordinate.
     * @private
     */
    _translate: function(oldPos, newPos) {
      var diff = newPos.subtract(oldPos);
      // GeoEntity.translate expects a Vertex, not a GeoPoint.
      this._target.translate(diff.toVertex());
    },

    /**
     * Converts a screen position into a cartographic.
     * @param {Object} screenPos - The screen position.
     * @returns {atlas.model.GeoPoint}
     * @private
     */
    _cartographicLocation: function(screenPos) {
      return this._atlasManagers.render.convertScreenCoordsToLatLng(screenPos);
    },

    /**
     * Resets the state of all instance variables to their original values.
     * @private
     */
    _reset: function() {
      this._entities = undefined;
      this._entities = null;
      delete this._entities;
      this._target = null;
      this._lastLocation = null;
      this._originalLocation = null;
    }

  });
  return TranslationModule;
});
