define([
  'atlas/core/ItemStore',
  'atlas/util/Class',
  'atlas/util/DeveloperError',
  'atlas/dom/Overlay',
  'atlas/visualisation/AbstractProjection',
  'atlas/visualisation/ColourProjection',
  'atlas/visualisation/DynamicProjection',
  'atlas/visualisation/HeightProjection',
  'atlas/lib/utility/Log'
], function (ItemStore, Class, DeveloperError, Overlay, AbstractProjection, ColourProjection,
             DynamicProjection, HeightProjection, Log) {

  /**
   * @classdesc The VisualisationManager is responsible for tracking, applying
   * and removing Projections.
   * @param {Object.<String, Object>} atlasManagers - A map of Atlas manager names to
   *      the current instance of that manager.
   * @class atlas.visualisation.VisualisationManager
   */
  var VisualisationManager = Class.extend( /** @lends atlas.visualisation.VisualisationManager# */{

    // TODO(bpstudds): Refactor this class to 'GeoChartFactory'? or 'ProjectionFactory'?
    _atlasManagers: null,

    /**
     * The an ItemStore of all static projections.
     * @type {atlas.core.ItemStore}
     * @private
     */
    _staticPrjs: null,

    /**
     * A map of GUI overlays to control rendering/unrendering of Projections.
     */
    _overlays: null,

    /**
     * An Overlay containing all the Legends for current projections.
     * @type {atlas.dom.Overlay}
     * @private
     */
    _legendContainer: null,

    /**
     * An ItemStore for all of the Overlay objects for the legends.
     * @type {atlas.core.ItemStore}
     * @private
     */
    _legendStore: null,

    _init: function (atlasManagers) {
      this._atlasManagers = atlasManagers;
      this._atlasManagers.visualisation = this;
      this._staticProjections = new ItemStore();
      this._legendStore = new ItemStore();
      this._overlays = {};
    },

    /**
     * Performs any setup for the Manager that requires other Atlas managers to exist.
     */
    setup: function () {
      this._bindEvents();
    },

    /**
     * Binds functionality of the VisualisationManager to specific events.
     */
    _bindEvents: function () {
      this._eventHandlers = [
        {
          source: 'extern',
          name: 'projection/add',
          /* Creates a new projection.
           * @param {String} args.type - The type of projection, either 'colour' or 'height'.
           * @param {Array.<String>} args.ids - An array of GeoEntity IDs that the projection affects.
           * @param {Object} args.config - Constructor arguments as required by the type of projection. Refer to @{link atlas.visualisation.AbstractProjection}, @{link atlas.visualisation.ColourProjection}, and @{link atlas.visualisation.HeightProjection}.
           * @returns {atlas.visualisation.AbstractProjection} The old projection as <code>args.theOldProjection</code> and the new one as <code>args.theProjection</code>.
           */
          callback: function (args) {
            args.theProjection = this.createProjection(args);
            this.addProjection(args.theProjection);
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'projection/render',
          /*
           * @param {String} args - The artifact of the projection to render.
           */
          callback: function (args) {
            this.render(args.id);
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'projection/unrender',
          /*
           * @param {String} args - The artifact of the projection to unrender.
           */
          callback: function (args) {
            this.unrender(args.id);
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'projection/remove',
          /*
           * @param {String} args - The artifact of the projection to remove.
           */
          callback: function (args) {
            this.remove(args.id);
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'projection/remove/all',
          callback: function () {
            this.removeAll();
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'projection/dynamic/add',
          /*
           * Creates a new dynamic projection.
           * @param {Object} args
           * @param {String} args.type - The type of projection, either 'colour' or 'height'.
           * @param {Array.<String>} args.ids - An array of GeoEntity ids that the projection affects.
           * @param {Array.<Object>} args.data - An array of objects mapping index to a map of GeoEntity id to it's parameter value for that index.
           * @param {Object} args.config - Constructor arguments as required by the type of projection. Refer to @{link atlas.visualisation.AbstractProjection}, @{link atlas.visualisation.ColourProjection}, and @{link atlas.visualisation.HeightProjection}.
           * @returns {atlas.visualisation.DynamicProjection} The new dynamic projection as <code>args.theProjection</code>.
           */
          callback: function (args) {
            args.theProjection = this.createDynamicProjection(args);
            this.addDynamicProjection(args.theProjection);
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'projection/dynamic/remove',
          /*
           * @param {String} args - The artifact of the dynamic projection to remove.
           */
          callback: function (args) {
            this._projections['dynamic-'+args].stop();
            delete this._projections['dynamic-'+args];
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'projection/dynamic/start',
          /*
           * @param {String} args - The artifact of the dynamic projection to start.
           */
          callback: function (args) {
            this._projections['dynamic-'+args].start();
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'projection/dynamic/pause',
          /*
           * @param {String} args - The artifact of the dynamic projection to pause.
           */
          callback: function (args) {
            this._projections['dynamic-'+args].pause();
          }.bind(this)
        },
        {
          source: 'extern',
          name: 'projection/dynamic/stop',
          /*
           * @param {String} args - The artifact of the dynamic projection to stop.
           */
          callback: function (args) {
            this._projections['dynamic-'+args].stop();
          }.bind(this)
        }
      ];
      this._atlasManagers.event.addEventHandlers(this._eventHandlers);
    },

    // -------------------------------------------
    // Getters and Setters
    // -------------------------------------------

    getLegendContainer: function () {
      if (!this._legendContainer) {
        this._legendContainer = new Overlay({
          id: 'visman-projection-container',
          parent: this._atlasManagers.dom.getDom(),
          title: 'Projections',
          position: {top: 300, left: 0}
        })
      }
      return this._legendContainer;
    },

    // -------------------------------------------
    // Static Projections
    // -------------------------------------------

    /**
     * Creates a new projection.
     * @param {Object} args
     * @param {String} args.type - The type of projection, either 'colour' or 'height'.
     * @param {Array.<String>} args.ids - An array of GeoEntity IDs that the projection affects.
     * @param {Object} args.config - Constructor arguments as required by the type of projection. Refer to @{link atlas.visualisation.AbstractProjection}, @{link atlas.visualisation.ColourProjection}, and @{link atlas.visualisation.HeightProjection}.
     * @returns {atlas.visualisation.AbstractProjection} The new projection object.
     */
    createProjection: function (args) {
      var Projection = args.type === 'colour' ? ColourProjection : HeightProjection;

      args.config.entities = {};
      args.ids.forEach(function (id) {
        args.config.entities[id] = this._atlasManagers.entity.getById(id);
      }, this);

      return new Projection(args.config);
    },

    /**
     * Creates a new dynamic projection.
     * @param {Object} args
     * @param {String} args.type - The type of projection, either 'colour' or 'height'.
     * @param {Array.<String>} args.ids - An array of GeoEntity ids that the projection affects.
     * @param {Array.<Object>} args.data - An array of objects mapping index to a map of GeoEntity id to it's parameter value for that index.
     * @param {Object} args.config - Constructor arguments as required by the type of projection. Refer to @{link atlas.visualisation.AbstractProjection}, @{link atlas.visualisation.ColourProjection}, and @{link atlas.visualisation.HeightProjection}.
     * @returns {atlas.visualisation.DynamicProjection} The new dynamic projection object.
     */
    createDynamicProjection: function (args) {
      var Projection = args.type === 'colour' ? ColourProjection : HeightProjection;
      // Set up the config for projection construction.
      args.config.values = {};
      args.config.entities = {};
      args.ids.forEach(function (id) {
        args.config.entities[id] = this._atlasManagers.entity.getById(id);
      }, this);
      var staticPrj = new Projection(args.config);

      return new DynamicProjection(staticPrj, args.data, args);
    },

    _addLegend: function (projection) {
      var id = projection.getId(),
          legendData = projection.getLegend(),
          keyHtml = Overlay.generateTable(legendData.legend),
          legendHtml;
      legendHtml = '<div class="caption">' + legendData.caption + '</div>';
      legendHtml += keyHtml;

      var container = this.getLegendContainer().getDomElements().content,
          legendOverlay = new Overlay({
            id: id,
            parent: container,
            title: legendData.title,
            cssClass: 'legend',
            onRemove: function (e) { this.remove(id); }.bind(this),
            onEnabledChange: function (e) { this.toggleRender(id); }.bind(this),
            showMinimised: true,
            cssPosition: 'relative',
            content: legendHtml
          });
      this._legendStore.add(legendOverlay);
    },

    showLegends: function () {
      if (!this._projections['colour']) { return; }

      // TODO(bpstudds): This needs to be refactored so we can have multiple legends.
      var legendData = this._projections['colour'].getLegend(),
          legendHtml = Overlay.generateTable(legendData.legend),
          html;
      html = '<div class="caption">' + legendData.caption + '</div>';
      html += legendHtml;

      this._legends = new Overlay({
        parent: this._atlasManagers.dom.getDom(),
        title: legendData.title,
        'class': 'legend',
        // TODO(bpstudds): Add IDs to projections, use the ID rather than artifact to store.
        onRemove: function (e) { this.remove('colour'); }.bind(this),
        dimensions: {top: 50, left: 0},
        content: html
      });

      this._legends.show();
    },

    hideLegends: function () {
      if (this._legends) {
        this._legends.remove();
      }
    },

    // -------------------------------------------
    // MODIFIERS
    // -------------------------------------------

    /**
     * Adds a Projection to be managed by the VisualisationManager.
     * @param {atlas.visualisation.AbstractProjection} projection - The New Projection instance to add.
     */
    addProjection: function (projection) {
      if (!(projection instanceof AbstractProjection)) {
        throw new DeveloperError('Tried to add an object to the VisualisationManager which is not a subclass of atlas.visualisation.AbstractProjection');
      }
      var id = projection.getId(),
          old = this._staticProjections.get(id);
      if (old) {
        Log.error('Tried to add projection with the same ID as an existing projection');
        return;
      }
      this._staticProjections.add(projection);
      this._addLegend(projection);
    },

    addDynamicProjection: function (dynamic) {
      var target = 'dynamic-'+dynamic._projector.ARTIFACT,
          BUTTON = 'visual-btn',
          SLIDER = 'visual-slider';

      this._projections[target] = dynamic;
      this._overlays[target] = new Overlay({
        parent: this._atlasManagers.dom.getDom(),
        dimensions: {top: 0, left: 0},
        content:
          '<p>'+target+'</p>' +
          '<input type="range" id="' + SLIDER + '-fps-' + target + '" min="1" max="30"> </br> ' +
          '<button id="' + BUTTON + '-play-' + target + '">&gt</button>' +
          '<button id="' + BUTTON + '-pause-' + target + '">||&gt</button>' +
          '<button id="' + BUTTON + '-stop-' + target + '">!</button>'
      });
      var getFpsFromForm = function (target) {
        return document.getElementById(SLIDER + '-fps-' + target).value;
      };
      document.getElementById(BUTTON + '-play-' + target).addEventListener('click', function (event) {
        this.setFps(getFpsFromForm(target));
        event.button === 0 && this.start();
      }.bind(this._projections[target]));

      document.getElementById(BUTTON + '-pause-' + target).addEventListener('click', function (event) {
        event.button === 0 && this.pause();
      }.bind(this._projections[target]));

      document.getElementById(BUTTON + '-stop-' + target).addEventListener('click', function (event) {
        event.button === 0 && this.stop();
      }.bind(this._projections[target]));
    },

    /**
     * Removes the projection affecting the given artifact.
     * @param {string} id - The id of the projection to be removed.
     * @returns {atlas.visualisation.AbstractProjection|null} The Projection removed, or null
     *    if a projection does not existing for the given artifact.
     */
    remove: function (id) {
      var prj = this._staticProjections.get(id),
          legend = this._legendStore.get(id);
      if (!prj) {
        Log.warn('Tried to remove projection ' + id + ' that does not exist.');
        return;
      }
      if (this._currentProjection === id) {
        this._currentProjection = null;
      }
      // Unrender projection and remove the projections legend.
      prj.unrender();
      legend.remove();
      this._legendStore.remove(id);
      this._staticProjections.remove(id);
      return prj;
    },

    /**
     * Removes projections on all artifacts.
     * @returns {Object.<String, atlas.visualisation.AbstractProjection>} The removed projections.
     */
    removeAll: function () {
      return Object.keys(this._projections).map(function(artifact) {
        return this.remove(artifact);
      }.bind(this));
    },

    // -------------------------------------------
    // BEHAVIOUR
    // -------------------------------------------

    /**
     * Renders the effects of the Projection currently Affect the given artifact.
     * @param {Object} id - The ID of the projection to render.
     */
    render: function (id) {
      // Unrender all other projections
      var prj = this._staticProjections.get(id),
          artifact = prj.ARTIFACT;
      if (!prj) {
        throw new DeveloperError('Tried to render projection ' + id
            + ' without adding a projection object.');
      } else {
        prj.render();
        this._atlasManagers.event.handleInternalEvent('projection/render/complete',
            {id: prj.getId(), name: artifact});
      }
    },

    /**
     * Unrenders the effects of the Projection currently affecting the given artifact.
     * @param {String} id - The ID of the projection to unrender.
     */
    unrender: function (id) {
      // TODO(bpstudds): Add support for un-rendering a subset of entities.
      var prj = this._staticProjections.get(id),
          artifact = prj.ARTIFACT;
      if (!prj) {
        throw new DeveloperError('Tried to unrender projection ' + id
          + ' without adding a projection object.');
      } else {
        prj.unrender();
        this._atlasManagers.event.handleInternalEvent('projection/unrender/complete',
            {id: prj.getId(), name: artifact});
      }
    },

    /**
     * Toggles a static projection between having its effects rendered and not rendered.
     * @param {String} id - The artifact of the projection to toggle.
     */
    toggleRender: function (id) {
      var projection = this._staticProjections.get(id),
          legend = this._legendStore.get(id);

      if (!this._currentProjection) {
        projection.render();
        legend.maximise();
        this._currentProjection = id;

      } else if (this._currentProjection === id) {
        projection.unrender();
        legend.minimise();
        this._currentProjection = null;

      } else {
        var prevId = this._currentProjection,
            prevProjection = this._staticProjections.get(prevId),
            prevLegend = this._legendStore.get(prevId);

        prevProjection.unrender();
        prevLegend.minimise();
        projection.render();
        legend.maximise();
        this._currentProjection = id;
      }
    }
  });

  return VisualisationManager;
});
