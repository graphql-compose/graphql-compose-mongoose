import { Schema } from './mongooseCommon';
import { convertSchemaToGraphQL } from '../fieldsConverter';

// name: 'EnumLanguageName',
// description: 'Language names (https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)',
const enumLanguageName = {
  en: { description: 'English' },
  ru: { description: 'Russian' },
  zh: { description: 'Chinese' },
};

const enumLanguageSkill = {
  basic: { description: 'can read' },
  fluent: { description: 'can talk' },
  native: { description: 'since birth' },
};

const LanguageSchema = new Schema(
  {
    ln: {
      type: String,
      description: 'Language names (https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)',
      enum: Object.keys(enumLanguageName),
    },
    sk: {
      type: String,
      description: 'Language skills',
      enum: Object.keys(enumLanguageSkill),
    },
  }
);

export default LanguageSchema;

// Such way we can set Type name for Schema which is used in another schema.
// Otherwise by default it will have name `${ParentSchemaName}${ParentSchemaFieldName}`
convertSchemaToGraphQL(LanguageSchema, 'Language');
