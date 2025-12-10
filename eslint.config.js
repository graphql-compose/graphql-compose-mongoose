const {
    defineConfig,
    globalIgnores,
} = require("eslint/config");

const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const prettier = require("eslint-plugin-prettier");
const globals = require("globals");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});
const path = require("path");

module.exports = defineConfig([{
    languageOptions: {
        parser: tsParser,
        sourceType: "module",

        parserOptions: {
            useJSXTextNode: true,
            project: [path.resolve(__dirname, "tsconfig.json")],
        },

        globals: {
            ...globals.jasmine,
            ...globals.jest,
        },
    },

    plugins: {
        "@typescript-eslint": typescriptEslint,
        prettier,
    },

    extends: compat.extends(
        "plugin:@typescript-eslint/recommended",
        "prettier",
        "plugin:prettier/recommended",
    ),

    rules: {
        "no-underscore-dangle": 0,
        "arrow-body-style": 0,
        "no-unused-expressions": 0,
        "no-plusplus": 0,
        "no-console": 0,
        "func-names": 0,

        "comma-dangle": ["error", {
            arrays: "always-multiline",
            objects: "always-multiline",
            imports: "always-multiline",
            exports: "always-multiline",
            functions: "ignore",
        }],

        "no-prototype-builtins": 0,
        "prefer-destructuring": 0,
        "no-else-return": 0,

        "lines-between-class-members": ["error", "always", {
            exceptAfterSingleLine: true,
        }],

        "@typescript-eslint/explicit-member-accessibility": 0,
        "@typescript-eslint/no-explicit-any": 0,
        "@typescript-eslint/no-inferrable-types": 0,
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/no-use-before-define": 0,
        "@typescript-eslint/no-empty-function": 0,
        "@typescript-eslint/camelcase": 0,
        "@typescript-eslint/ban-ts-comment": 0,
    },
}, globalIgnores(["lib/*", "es/*", "mjs/*", "node8/*", "**/jest.config.js"])]);
