import TypeComposer from '../../../../graphql-compose/src/typeComposer';

export const inputHelperArgsGen = (gqType) => {
  const composer = new TypeComposer(gqType);
  const inputComposer = composer.getInputTypeComposer();

  return {
    input: {
      name: 'input',
      type: inputComposer.getType(),
    },
  };
};
