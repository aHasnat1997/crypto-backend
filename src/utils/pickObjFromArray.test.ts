import { describe, expect, it } from "vitest";
import { pickObjFromArray } from "./pickObjFromArray";


describe('pickObjFromArray()', () => {

  it('should pick items from object key and there value from array of keys', () => {
    const object = {
      name: 'Jon',
      age: 23,
      page: '2',
      limit: '20'
    };
    const keys = ['name', 'limit'];

    const result = pickObjFromArray(object, keys);

    expect(result).toEqual({
      name: 'Jon',
      limit: 20
    });
  });

})
