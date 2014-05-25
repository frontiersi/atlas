define([
  'atlas/util/Class',
  'atlas/lib/utility/Setter'
], function (Class, Setter) {

  /**
   * @classdesc An Overlay can be used to place panels overlaying the Atlas
   * render (or in fact, any section of the host website) which can display
   * information.
   *
   * @param {Object} args - Arguments to the constructor.
   * @param {String|HTMLElement} [args.parent=document] - The DOM ID or element instance to place the Overlay on.
   * @param {Object} [args.dimensions] - The dimensions of the Overlay.
   * @param {Object} [args.dimensions.top=0] - The dimension from the top of <code>parent</code> to the top of the Overlay in pixels.
   * @param {Object} [args.dimensions.left=0] - The dimension from the left of <code>parent</code> to the left of the Overlay in pixels.
   * @param {Object} [args.dimensions.height] - The height of the Overlay, by default it fits the content.
   * @param {Object} [args.dimensions.width] - The width of the Overlay, by default it fits the content.
   * @param {String} [args.content=''] - Either a plain text or HTML to be rendered in the Overlay.
   *
   * @class atlas.dom.Overlay
   */
  var Overlay = Class.extend(/** @lends atlas.dom.Overlay# */ {

    /**
     * The parent element of the Overlay, null if the Overlay is positioned absolutely within
     * the document.
     * @type {HTMLElement}
     * @protected
     */
    _parent: null,

    /**
     * The class(es) to apply to the Overlay HTML.
     * @type {String}
     * @protected
     */
    _cssClass: null,

    /**
     * The title to place on the overlay.
     * @type {String}
     * @protected
     */
    _title: null,

    /**
     * The position of the Overlay. If both <code>top</code> and <code>bottom</code> are specified,
     * height is ignored. If both <code>left</code> and <code>right</code> are specified,
     * width is ignored.
     * @type {Object}
     * @property {Number} top - Distance in pixels from the top edge of the Parent.
     * @property {Number} left - Distance in pixels from the left edge of the Parent.
     * @property {Number} bottom - Distance in pixels from the bottom edge of the Parent.
     * @property {Number} right - Distance in pixels from the right edge of the Parent.
     */
    _position: null,

    /**
     * The dimensions of the Overlay
     * @type {Object}
     * @property {Number} height - Height of the Overlay in pixels.
     * @property {Number} width - Width of the Overlay in pixels.
     * @protected
     */
    _dimensions: null,

    /**
     * The content of the Overlay. Currently supports HTML and plain text.
     * @type {String}
     * @protected
     */
    _content: null,

    /**
     * Function handler for when the Overlay is removed. The context of this
     * function is assumed to be correctly set.
     * @function
     * @protected
     */
    _onRemove: null,

    /*
     * Constructor for the overlay
     * @ignore
     */
    _init: function (args) {
      args = Setter.mixin({
        parent: document,
        cssClass: '',
        title: '',
        position: {top: 0, left: 0},
        dimensions: {width: 0, height: 0},
        content: ''
      }, args);
      if (typeof args.parent === 'string') {
        args.parent = document.getElementById(parent);
      }
      this._id = args.id;
      this._parent = args.parent;
      this._cssClass = args.cssClass;
      this._title = args.title;
      this._onRemove = args.onRemove;
      this._position = args.position;
      this._dimensions = args.dimensions;
      this._content = args.content;
      // Construct element and append it to the parent.
      this._element = this._render();
    },

    // -------------------------------------------
    // Getters and Setters
    // -------------------------------------------

    isVisible: function () {
      if (this._element === undefined) { return false; }
      return !this._element.classList.contains('hidden');
    },

    getContent: function () {
      return this._content;
    },

    getCssClass: function () {
      return this._cssClass;
    },

    getDimensions: function () {
      return this._dimensions;
    },

    getId: function () {
      return this._id;
    },

    getParent: function () {
      return this._parent;
    },

    getPosition: function () {
      return this._position;
    },

    // -------------------------------------------
    // Modifiers
    // -------------------------------------------

    /**
     * Creates the element for the HTML of the Overlay.
     * @returns {HTMLElement} The rendered DOM for the Overlay.
     * @protected
     */
    _render: function () {
      var element = document.createElement('div');
      element.classList.add('overlay');
      this._cssClass !== '' && element.classList.add(this._cssClass);

      // Add title and remove button to content if necessary.
      var title = '<div class="title">' + this._title;
      if (this._onRemove) {
        title += '<button class="remove">X</button>';
      }
      title +=  '</div>'
      this._content = title.concat(this._content);

      // Create the overlay html.
      element.innerHTML = this._content;

      // Set the Overlay's position.
      this._position.top !== undefined && (element.style.top = this._position.top + 'px');
      this._position.left !== undefined && (element.style.left = this._position.left + 'px');
      if (this._position.bottom !== undefined) {
        element.style.bottom = this._position.bottom + 'px';
        this._position.top !== undefined && (this._dimensions.height = 0);
      }
      if (this._position.right !== undefined) {
        element.style.right = this._position.right + 'px';
        this._position.left !== undefined && (this._dimensions.width = 0);
      }

      // Width and Height don't need to be set, even if height and width are set to '0'.
      this._dimensions.height && (element.style.height = this._dimensions.height + 'px');
      this._dimensions.width && (element.style.width = this._dimensions.width + 'px');

      // Attach to parent
      this._parent.appendChild(element);

      // Add event handler to close button
      if (this._onRemove) {
        var buttons = element.getElementsByClassName('remove');
        buttons[0].addEventListener('click', function (e) {
          // 0 -> left click.
          if (e.button === 0) {
            this._onRemove(e);
          }
        }.bind(this))
      }

      return element;
    },

    /**
     * Hides the Overlay from view.
     */
    hide: function () {
      if (this._element === undefined) { return; }
      this._element.classList.add('hidden');
    },

    /**
     * Shows the overlay on the parent document.
     */
    show: function () {
      if (this._element === undefined) { return; }
      this._element.classList.remove('hidden');
    },

    /**
     * Removes the Overlay from the parent document.
     */
    remove: function () {
      if (this._element === undefined) { return; }
      this.hide();
      this._parent.removeChild(this._element);
    }
  }); // End class instance definition


    // -------------------------------------------
    // Statics
    // -------------------------------------------

    /**
     * Creates a series of HTML attributes based on the given data structure.
     * @param {Object} data - The map of attributes to values.
     * @param {String} [data.cssClass=''] - The CSS class of the tag.
     * @param {String} [data.id=''] - The ID of the tag.
     * @param {atlas.model.Colour} [data.bgColour=null] - The CSS background-color to apply to the tag.
     * @returns {String} The HTML string of the attributes.
     */
    Overlay.parseAttributes = function (data) {
      var html = '',
          style = '',
          data = data || {};
      data.cssClass && (html += 'class="' + data.cssClass +'" ');
      data.id && (html += 'id="' + data.id +'" ');
      data.background && (style += 'background:' + data.background + ';');
      data.bgColour && (style += 'background-color:' + data.bgColour.toHexString() + ';');
      data.width && (style += 'width:' + data.width + ';');
      if (style !== '') {
        html += 'style="' + style +'"';
      }
      if (html === '') { return ''; }
      return (html = ' ' + html.trim());
    };

    /**
     * Generates a HTML table from a 2D array of objects describing the table. The first
     * index of the 2D array represents a row in the table, the second index represents
     * the column. Each array element should conform to the <code>data</code> parameter
     * of {@link atlas.dom.Overlay~parseAttributes}, as well as having a <code>value</code>
     * property which will be placed into the cell.
     * @param {Object} data - The table data.
     * @returns {String}
     *
     * @example <caption>Form of data expected by generateTable</caption>
     * data = {
     *   id: 'tableID',
     *   class: 'tableClass',
     *   rows: [
     *     { id: 'row1_ID',
     *       cells: [
     *         { value: 'cellContents', class: 'class', bgColour = Colour.RED, ... }
     *         { value: 'cellContents2', bgColour = Colour.GREEN, ... }
     *       ]
     *     },
     *     { id: 'row2_ID',
     *       cells: [
     *         { value: 'cellContents', class: 'class', bgColour = Colour.RED, ... }
     *         { value: 'cellContents2', bgColour = Colour.GREEN, ... }
     *       ]
     *     }
     *   ]
     * }
     */
    Overlay.generateTable = function (data) {
      if (!data || !data.rows) { return ''; }
      var tableAttributes = Overlay.parseAttributes(data),
          html = '<table' + tableAttributes + '>';
      data.rows.forEach(function (row) {
        var rowAttributes = Overlay.parseAttributes(row);
        html += '<tr' + rowAttributes + '>';
        row.cells.forEach(function (cell) {
          var cellAttributes = Overlay.parseAttributes(cell);
          html += '<td' + cellAttributes + '>' + (cell.value || '') + '</td>';
        });
        html += '</tr>';
      });
      html += '</table>';
      return html;
    };

  return Overlay;
});
