export function toMongoDottedObject(
  obj: object,
  target?: object,
  path?: string[],
): { [dottedPath: string]: any };

export function toMongoFilterDottedObject(
  obj: object,
  target?: object,
  path?: string[],
): { [dottedPath: string]: any };
