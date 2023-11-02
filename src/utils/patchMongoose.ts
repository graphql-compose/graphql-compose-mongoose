import mongoose, { IndexDefinition, IndexOptions } from 'mongoose';

export function renameObjKey(
  oldObj: Record<string, unknown>,
  oldKey: string,
  newKey: string | number
) {
  const keys = Object.keys(oldObj);
  return keys.reduce(
    (acc, val) => {
      if (val === oldKey) {
        acc[newKey] = oldObj[oldKey];
      } else {
        acc[val] = oldObj[val];
      }
      return acc;
    },
    {} as Record<string, unknown>
  );
}

const oldMongooseSchemaIndexDef = mongoose.Schema.prototype.index;
mongoose.Schema.prototype.index = function (fields: IndexDefinition, options?: IndexOptions) {
  // @ts-ignore
  if (mongoose.Schema.prototype.indexMethodPatched) {
    return oldMongooseSchemaIndexDef.call(this, fields, options);
  }
  fields || (fields = {});
  options || (options = {});
  for (const key in fields) {
    // @ts-ignore
    if (this.aliases[key]) {
      // @ts-ignore
      fields = renameObjKey(fields, key, this.aliases[key]);
    }
  }
  // @ts-ignore
  mongoose.Schema.prototype.indexMethodPatched = true;
  return oldMongooseSchemaIndexDef.call(this, fields, options);
};

export function patchMongooseSchemaIndex() {}
