import { getFilterHelperArgOptsMap } from './filter';
import { getLimitHelperArgsOptsMap } from './limit';
import { getRecordHelperArgsOptsMap } from './record';

export * from './filter';
export * from './limit';
export * from './projection';
export * from './record';
export * from './skip';
export * from './sort';

export const MergeAbleHelperArgsOpts: {
  sort: string;
  skip: string;
  limit: ReturnType<typeof getLimitHelperArgsOptsMap>;
  filter: ReturnType<typeof getFilterHelperArgOptsMap>;
  record: ReturnType<typeof getRecordHelperArgsOptsMap>;
};
