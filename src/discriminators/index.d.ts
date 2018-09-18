import { TypeConverterOpts } from '../composeWithMongoose';

export {
  DiscriminatorTypeComposer,
  DiscriminatorOptions,
} from './DiscriminatorTypeComposer';

export function mergeCustomizationOptions(
  baseCOptions: TypeConverterOpts,
  childCOptions?: TypeConverterOpts,
): TypeConverterOpts | void;
