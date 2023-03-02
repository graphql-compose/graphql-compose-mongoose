import {
  SchemaComposer,
  Resolver,
  ObjectTypeComposerFieldConfigAsObjectDefinition,
  inspect,
} from 'graphql-compose';
import { graphql, ExecutionResult } from 'graphql-compose/lib/graphql';

const FIELD = 'test_field';

interface TestOperationOpts {
  schemaComposer: SchemaComposer<any>;
  operation: string;
  variables?: any;
  source?: Record<string, any>;
  context?: any;
}

async function testOperation(opts: TestOperationOpts): Promise<ExecutionResult> {
  const res = await graphql({
    schema: opts.schemaComposer.buildSchema(),
    source: opts.operation,
    rootValue: opts?.source || {},
    contextValue: opts?.context || {},
    variableValues: opts?.variables,
  });
  return res;
}

interface TestFieldConfigOpts<TSource = any, TContext = any, TArgs = any> {
  args?: TArgs;
  field:
    | ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext, TArgs>
    | Resolver<TSource, TContext, TArgs>;
  selection: string;
  source?: Record<string, any>;
  context?: TContext;
  schemaComposer?: SchemaComposer<TContext>;
}

export async function testFieldConfig<TSource = any, TContext = any, TArgs = any>(
  opts: TestFieldConfigOpts<TSource, TContext, TArgs>
): Promise<any> {
  const { field, selection, args, ...restOpts } = opts;

  const sc = opts?.schemaComposer || new SchemaComposer<TContext>();
  sc.Query.setField<any>(FIELD, field);

  const ac = _getArgsForQuery(field, args, sc);
  const selectionSet = selection.trim();
  if (!selectionSet.startsWith('{') || !selectionSet.endsWith('}')) {
    throw new Error(
      `Error in testFieldConfig({ selection: '...' }) – selection must be a string started from "{" and ended with "}"`
    );
  }
  const res = await testOperation({
    ...restOpts,
    variables: args,
    operation: `
      query ${ac.queryVars} {
        ${FIELD}${ac.fieldVars} ${selectionSet}
      }
    `,
    schemaComposer: sc,
  });

  if (res.errors) {
    throw new Error((res?.errors?.[0] as any) || 'GraphQL Error');
  }

  return res?.data?.[FIELD];
}

function _getArgsForQuery(
  fc: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any, any> | Resolver<any, any, any>,
  variables: any = {},
  schemaComposer?: SchemaComposer<any>
): {
  queryVars: string;
  fieldVars: string;
} {
  const sc = schemaComposer || new SchemaComposer();
  sc.Query.setField(FIELD, fc);

  const varNames = Object.keys(variables);

  const argNames = sc.Query.getFieldArgNames(FIELD);
  if (argNames.length === 0 && varNames.length > 0) {
    throw new Error(
      `FieldConfig does not have any arguments. But in test you provided the following variables: ${inspect(
        variables
      )}`
    );
  }

  varNames.forEach((varName) => {
    if (!argNames.includes(varName)) {
      throw new Error(
        `FieldConfig does not have '${varName}' argument. Available arguments: '${argNames.join(
          "', '"
        )}'.`
      );
    }
  });

  argNames.forEach((argName) => {
    if (sc.Query.isFieldArgNonNull(FIELD, argName)) {
      const val = variables[argName];
      if (val === null || val === undefined) {
        throw new Error(
          `FieldConfig has required argument '${argName}'. But you did not provide it in your test via variables: '${inspect(
            variables
          )}'.`
        );
      }
    }
  });

  const queryVars = varNames
    .map((n) => `$${n}: ${String(sc.Query.getFieldArgType(FIELD, n))}`)
    .join(' ');
  const fieldVars = varNames.map((n) => `${n}: $${n}`).join(' ');

  return {
    queryVars: queryVars ? `(${queryVars})` : '',
    fieldVars: fieldVars ? `(${fieldVars})` : '',
  };
}
