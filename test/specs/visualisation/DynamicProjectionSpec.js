define([
  'atlas/visualisation/AbstractProjection',
  'atlas/model/Feature',
  // Code under test.
  'atlas/visualisation/DynamicProjection'
], function (AbstractProjection, Feature, DynamicProjection) {

  describe('A DynamicProjection', function () {
    var dynPrj,
        mockedPrj,
        someEntities,
        data = [
          { index: 0,
            values: {0: 0, 1: 10, 2: 20, 3: 30, 4: 40}
          },
          { index: 10,
            values: {0: 1, 1: 11, 2: 21, 3: 31, 4: 41}
          },
          { index: 20,
            values: {0: 2, 1: 12, 2: 22, 3: 32, 4: 42}
          },
          { index: 30
          }
        ];

    beforeEach(function () {
      someEntities = {
        0: new Feature(0, {id: 0}),
        1: new Feature(1, {id: 1}),
        2: new Feature(2, {id: 2}),
        3: new Feature(3, {id: 3}),
        4: new Feature(4, {id: 4})
      };
      someEntities[0].mockedValue = 0;
      someEntities[1].mockedValue = 1;
      someEntities[2].mockedValue = 2;
      someEntities[3].mockedValue = 3;
      someEntities[4].mockedValue = 4;
      mockedPrj = new AbstractProjection({values: {}, entities: someEntities});

      // Mock getting the previous state from the projection (doesn't exist yet.)
      mockedPrj.getPreviousState = function () {
        var state = {};
        Object.keys(this._entities).forEach(function (id) {
          state[id] = this._entities[id].mockedValue;
        }, this);
        return state;
      }.bind(mockedPrj);

      // Mock setting the previous state from the projection (doesn't exist yet.)
      mockedPrj.setPreviousState = function (state) {
        Object.keys(state).forEach(function (id) {
          this._effects[id].oldValue = state[id];
        }, this);
      }.bind(mockedPrj);

      // Mock rendering using the abstract projection.
      mockedPrj.render = function () {
        Object.keys(this._entities).forEach(function (id) {
          var curVal = this._entities[id].mockedValue,
              newVal = this._values[id];
          this._effects[id] = {oldValue: curVal, newValue: newVal};
          this._entities[id].mockedValue = newVal;
        }, this);
      }.bind(mockedPrj);
    });

    describe('can be constructed', function () {

      it('by default', function () {
        dynPrj = new DynamicProjection(mockedPrj, data);
        expect(dynPrj).not.toBeNull();
      });
    });

    describe('once constructed', function () {
      beforeEach(function () {
        dynPrj = new DynamicProjection(mockedPrj, data);
        spyOn(dynPrj, '_render').andCallThrough();
      });

      afterEach(function () {
        mockedPrj = null;
        dynPrj = null;
        someEntities = null;
      });

      it('can be started', function () {
        dynPrj.start();
        expect(dynPrj.getStatus()).toEqual('playing');
        expect(dynPrj._initial).toEqual({0: 0, 1: 1, 2: 2, 3: 3, 4: 4});
      });

      xit('can be paused', function () {
        dynPrj.start();
        dynPrj.stop();
        expect(dynPrj.getStatus()).toEqual('paused');
      })
    })
  })
});
