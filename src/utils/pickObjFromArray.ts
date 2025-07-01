/**
 * Picks specified keys from an object.
 *
 * @param {Record<string, any>} obj - The source object.
 * @param {string[]} keys - Array of keys to pick from the source object.
 * @returns {Record<string, any>} - An object containing only the specified keys.
 */
export const pickObjFromArray = (obj: Record<string, any>, keys: string[]): Record<string, any> => {
  const finalObj: Record<string, any> = {};

  keys.forEach(key => {
    if (obj && Object.hasOwnProperty.call(obj, key)) {
      if (key === 'limit' || key === 'page') {
        finalObj[key] = Number(obj[key]);
      } else {
        finalObj[key] = obj[key];
      }
    }
  });

  return finalObj;
};
