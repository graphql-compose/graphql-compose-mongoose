import { InputTypeComposer, AnyTypeComposer, replaceTC } from 'graphql-compose';

export function makeFieldsRecursiveNullable(
  itc: InputTypeComposer,
  opts: { prefix?: string; suffix?: string; skipTypes?: AnyTypeComposer<any>[] }
): void {
  // clone all subtypes and make all its fields nullable
  itc.getFieldNames().forEach((fieldName) => {
    itc.makeFieldNullable(fieldName);
    let fieldTC = itc.getFieldTC(fieldName);
    if (fieldTC instanceof InputTypeComposer) {
      if (opts?.prefix || opts?.suffix) {
        const newName = dedupedName(fieldTC.getTypeName(), opts);
        fieldTC = fieldTC.clone(newName);
        // replace field type with keeping in place List & NonNull modificators if they are present
        itc.getField(fieldName).type = replaceTC(itc.getField(fieldName).type, fieldTC);
      }
      if (!opts.skipTypes) opts.skipTypes = [];
      if (!opts.skipTypes.includes(fieldTC)) {
        opts.skipTypes.push(fieldTC);
        makeFieldsRecursiveNullable(fieldTC, opts);
      }
    }
  });
}

function dedupedName(name: string, opts: { prefix?: string; suffix?: string }): string {
  let newName = name;
  const { prefix, suffix } = opts;

  if (prefix && !newName.startsWith(prefix)) {
    newName = `${prefix}${newName}`;
  }

  if (suffix && !newName.endsWith(suffix)) {
    newName = `${newName}${suffix}`;
  }

  return newName;
}
