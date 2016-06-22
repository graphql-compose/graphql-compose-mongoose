/* @flow */

import { convertModelToGraphQL } from './fieldsConverter';

export function getTypeFromModel(mongooseModel: any, typeName: ?string = null) {
  const name: string = typeName || mongooseModel.modelName;

  return convertModelToGraphQL(mongooseModel, name);
}
