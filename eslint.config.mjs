import tsparser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
	{
		ignores: ["node_modules/**", "main.js", "*.js", "esbuild.config.mjs"],
	},
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "./tsconfig.json",
				ecmaVersion: "latest",
				sourceType: "module",
			},
		},
		plugins: {
			obsidianmd: obsidianmd,
		},
		rules: {
			// Obsidian-specific rules
			"obsidianmd/no-sample-code": "error",
			"obsidianmd/sample-names": "error",
			"obsidianmd/validate-manifest": "error",
			"obsidianmd/detach-leaves": "error",
			"obsidianmd/no-static-styles-assignment": "warn",
			"obsidianmd/prefer-file-manager-trash-file": "warn",
			"obsidianmd/ui/sentence-case": ["warn", { allowAutoFix: true }],
			"obsidianmd/no-forbidden-elements": "warn",
			"obsidianmd/no-plugin-as-component": "warn",
			"obsidianmd/no-tfile-tfolder-cast": "warn",
			"obsidianmd/commands/no-command-in-command-id": "warn",
			"obsidianmd/commands/no-command-in-command-name": "warn",
		},
	},
];
