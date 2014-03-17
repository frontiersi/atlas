define([
  'atlas/model/Colour',
  // Code under test.
  'atlas/dom/Overlay'
], function (Colour, Overlay) {

  describe('An Overlay', function () {
    var parent,
        dimensions = {
          top: 100,
          left: 200,
          height: 300,
          width: 400
        },
        content = '<p>Wootage!</p>',
        args,
        overlay,
        element;

    beforeEach(function () {
      parent = document.createElement('div');
      args = {parent: parent, dimensions: dimensions, content: content};
      overlay = new Overlay(args);
    });

    afterEach(function () {
      parent = null;
      overlay = null;
      element = null;
    });

    it('can be constructed', function () {
      expect(overlay._parent).toBe(parent);
      expect(overlay._dimensions).toBe(dimensions);
      expect(overlay._content).toBe(content);
    });

    it('can create an element containing plain text from content', function () {
      expect(overlay._element.innerHTML).toEqual(content);
      expect(overlay._element.classList.contains('hidden')).toBe(false);
    });

    it('is attached to the parent node', function () {
      expect(parent.children.length).toBe(1);
      expect(parent.children[0].innerHTML).toEqual(content);
    });

    it('is dimensionsed', function () {
      expect(parent.children[0].style.top).toEqual('100px');
      expect(parent.children[0].style.left).toEqual('200px');
      expect(parent.children[0].style.height).toEqual('300px');
      expect(parent.children[0].style.width).toEqual('400px');
    });

    it('can be hidden', function () {
      overlay.hide();
      expect(parent.children[0].classList.contains('hidden')).toBe(true);
    });

    it('can be unhidden', function () {
      overlay.hide();
      overlay.show();
      expect(parent.children[0].classList.contains('hidden')).toBe(false);
    });

    it('can be removed', function() {
      console.debug(parent.children);
      overlay.remove();
      console.debug(parent.children);
      expect(parent.children.length).toBe(0);
    });

    describe ('can generate HTML', function () {
      it ('with tag class and id', function () {
        var data = {
          class: 'aClass',
          id: 'anId'
        };
        var html = Overlay.parseAttributes(data);
        expect(html).toEqual(' class="aClass" id="anId"');
      });

      it ('with inline tag styles', function () {
        var data = {
          bgColour: Colour.RED
        };
        var html = Overlay.parseAttributes(data);
        expect(html).toEqual(' style="background-color:#ff0000;"');
      });

      it ('handling blank data', function () {
        var html = Overlay.parseAttributes({});
        expect(html).toEqual('');
        var html = Overlay.parseAttributes();
        expect(html).toEqual('');
      })

      it ('as a plain table', function () {
        var data = [
          [ {value: 0}, {value: 10} ],
          [ {value: 1}, {value: 11} ]
        ];
        var html = Overlay.generateTable(data);
        expect(html).toEqual('<table><tr><td>0</td><td>10</td></tr><tr><td>1</td><td>11</td></tr></table>')
      });

      it ('as a table with background colour', function () {
        var data = [
          [ {value: 0, bgColour: Colour.RED}, {value: 10, bgColour: Colour.BLUE} ],
          [ {value: 1}, {value: 11, bgColour: Colour.GREEN} ]
        ];
        var html = Overlay.generateTable(data);
        expect(html).toEqual(
          '<table>' +
          '<tr><td style="background-color:#ff0000;">0</td><td style="background-color:#0000ff;">10</td></tr>' +
          '<tr><td>1</td><td style="background-color:#00ff00;">11</td></tr></table>'
        )
      })
    });
  }); // End 'An Overlay'.
});
