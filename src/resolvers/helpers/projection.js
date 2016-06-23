
export function projectionHelper(resolveParams) {
  const projection = resolveParams.projection;
  if (projection) {
    resolveParams.cursor = resolveParams.cursor.select(projection); // eslint-disable-line
  }
}
