export default function toMongoDottedObject(
  obj: object,
  target?: object,
  path?: string[],
): { [dottedPath: string]: any };
