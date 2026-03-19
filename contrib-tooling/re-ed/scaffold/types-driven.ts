#!/usr/bin/env node
/**
 * scaffold-edit-comp-v2.ts
 *
 * Reads a pre-flattened TypeScript entity file and scaffolds a standalone
 * editor package into packages/<name>-editor/.
 *
 * First run:  creates every file.
 * Subsequent: skips 1st-pass-only files, shows a diff for override
 *             candidates and asks before overwriting.
 *
 * Usage: node --experimental-strip-types tools/scaffold-edit-comp-v2.ts tools/samples/v-t.ts [VehicleType]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

import { parse, type ParseResult } from "./parse.ts";
import {
  buildTypeDeclarations,
  buildValidateChecks,
  buildHelperImports,
  buildHelperTypeImports,
  buildEditorTypeImports,
  buildHelperNormalizeFns,
  buildNormalizeFieldAssignments,
  buildNormalizeResultFields,
  buildHelperSerializeFns,
  buildSerializeMappings,
  buildEditorSections,
  buildRefRowComponents,
  buildNormalizePascalTests,
  buildNormalizeCamelTests,
  buildNormalizeBooleanTests,
  buildNormalizeUnionTests,
  buildNormalizeRefArrayTests,
  buildSerializeFieldTests,
  buildSerializeBooleanTests,
  buildSerializeRefArrayTests,
  buildSerializeAllVals,
  buildValidateTypeTests,
  buildValidateUnionTests,
  buildValidateValidObj,
} from "./builders.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toolsDir = dirname(fileURLToPath(import.meta.url));
const scaffoldDir = resolve(toolsDir, ".");

function loadTemplate(subdir: string, name: string): string {
  return readFileSync(resolve(scaffoldDir, subdir, name), "utf-8");
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

function writeOut(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
  console.log(`  wrote ${path}`);
}

function colorDiff(existingPath: string, newContent: string): string | null {
  const tmpPath = `${existingPath}.scaffolder-new`;
  writeFileSync(tmpPath, newContent, "utf-8");
  try {
    execSync(`diff -u "${existingPath}" "${tmpPath}"`, { encoding: "utf-8" });
    return null;
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string };
    if (e.status === 1 && e.stdout) {
      return e.stdout;
    }
    return null;
  } finally {
    try {
      execSync(`rm -f "${tmpPath}"`);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

// ---------------------------------------------------------------------------
// File definitions
// ---------------------------------------------------------------------------

interface FileSpec {
  outputPath: string;
  templateDir: string;
  templateName: string;
  vars: (r: ParseResult) => Record<string, string>;
}

function firstPassFiles(): FileSpec[] {
  return [
    {
      outputPath: "package.json",
      templateDir: "init_only",
      templateName: "package.json.tpl",
      vars: () => ({}),
    },
    {
      outputPath: "tsconfig.json",
      templateDir: "init_only",
      templateName: "tsconfig.json.tpl",
      vars: () => ({}),
    },
    {
      outputPath: "vite.config.ts",
      templateDir: "init_only",
      templateName: "vite.config.ts.tpl",
      vars: () => ({}),
    },
    {
      outputPath: "src/index.ts",
      templateDir: "init_only",
      templateName: "index.ts.tpl",
      vars: (r) => ({ HELPER_TYPE_IMPORTS: buildHelperTypeImports(r) }),
    },
    {
      outputPath: "src/Editor.css",
      templateDir: "init_only",
      templateName: "Editor.css.tpl",
      vars: () => ({}),
    },
    {
      outputPath: "src/Editor.tsx",
      templateDir: "init_only",
      templateName: "Editor.tsx.tpl",
      vars: (r) => ({
        SECTIONS: buildEditorSections(r),
        EDITOR_TYPE_IMPORTS: buildEditorTypeImports(r),
        REF_ROW_COMPONENTS: buildRefRowComponents(r),
      }),
    },
    {
      outputPath: "__tests__/normalize.test.ts",
      templateDir: "init_only",
      templateName: "normalize.test.ts.tpl",
      vars: (r) => ({
        PASCAL_TESTS: buildNormalizePascalTests(r),
        CAMEL_TESTS: buildNormalizeCamelTests(r),
        BOOLEAN_TESTS: buildNormalizeBooleanTests(r),
        UNION_TESTS: buildNormalizeUnionTests(r),
        REF_ARRAY_TESTS: buildNormalizeRefArrayTests(r),
      }),
    },
    {
      outputPath: "__tests__/serialize.test.ts",
      templateDir: "init_only",
      templateName: "serialize.test.ts.tpl",
      vars: (r) => ({
        FIELD_TESTS: buildSerializeFieldTests(r),
        BOOLEAN_TESTS: buildSerializeBooleanTests(r),
        REF_ARRAY_TESTS: buildSerializeRefArrayTests(r),
        ALL_VALS: buildSerializeAllVals(r),
      }),
    },
    {
      outputPath: "__tests__/validate.test.ts",
      templateDir: "init_only",
      templateName: "validate.test.ts.tpl",
      vars: (r) => ({
        TYPE_TESTS: buildValidateTypeTests(r),
        UNION_TESTS: buildValidateUnionTests(r),
        VALID_OBJ: buildValidateValidObj(r),
      }),
    },
  ];
}

function overrideCandidates(): FileSpec[] {
  return [
    {
      outputPath: "src/generated/types.ts",
      templateDir: "always",
      templateName: "types.ts.tpl",
      vars: (r) => ({ TYPE_DECLARATIONS: buildTypeDeclarations(r) }),
    },
    {
      outputPath: "src/generated/validate.ts",
      templateDir: "always",
      templateName: "validate.ts.tpl",
      vars: (r) => ({
        CHECKS: buildValidateChecks(r),
        HELPER_IMPORTS: buildHelperImports(r),
      }),
    },
    {
      outputPath: "src/normalize.ts",
      templateDir: "always",
      templateName: "normalize.ts.tpl",
      vars: (r) => ({
        FIELD_ASSIGNMENTS: buildNormalizeFieldAssignments(r),
        RESULT_FIELDS: buildNormalizeResultFields(r),
        HELPER_TYPE_IMPORTS: buildHelperTypeImports(r),
        HELPER_NORMALIZE_FNS: buildHelperNormalizeFns(r),
      }),
    },
    {
      outputPath: "src/serialize.ts",
      templateDir: "always",
      templateName: "serialize.ts.tpl",
      vars: (r) => ({
        MAPPINGS: buildSerializeMappings(r),
        HELPER_TYPE_IMPORTS: buildHelperTypeImports(r),
        HELPER_SERIALIZE_FNS: buildHelperSerializeFns(r),
      }),
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const entityPath = process.argv[2];
if (!entityPath) {
  console.error(
    "Usage: node --experimental-strip-types tools/scaffold-edit-comp-v2.ts <entity.ts> [InterfaceName]",
  );
  process.exit(1);
}

const entityFile = resolve(entityPath);
if (!existsSync(entityFile)) {
  console.error(`Entity file not found: ${entityFile}`);
  process.exit(1);
}

const mainName = process.argv[3]; // optional — defaults to first interface
const result = parse(entityFile, mainName);
const title = result.main.name;
const pkgName = `${title.toLowerCase()}-editor`;
console.log(`Using pkgName: ${pkgName} (main interface: ${title})`);

const pkgDir = resolve("packages");
const pkgPath = resolve(pkgDir, pkgName);
const shared = { TITLE: title, PKG_NAME: pkgName };

const fill = (spec: FileSpec) =>
  fillTemplate(loadTemplate(spec.templateDir, spec.templateName), {
    ...shared,
    ...spec.vars(result),
  });

if (!existsSync(pkgDir)) mkdirSync(pkgDir, { recursive: true });
const isRescaffold = existsSync(pkgPath);

async function rescaffold(): Promise<void> {
  console.log(`Re-scaffolding @entur/${pkgName} from updated entity...\n`);

  const firstPassSkipped = firstPassFiles().map((s) => s.outputPath);
  console.log(`  skipping 1st-pass-only files:`);
  for (const p of firstPassSkipped) {
    console.log(`    ${p}`);
  }
  console.log("");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let wrote = 0;
  let skipped = 0;
  let unchanged = 0;

  for (const spec of overrideCandidates()) {
    const outPath = resolve(pkgPath, spec.outputPath);
    const newContent = fill(spec);

    if (!existsSync(outPath)) {
      writeOut(outPath, newContent);
      wrote++;
      continue;
    }

    const diff = colorDiff(outPath, newContent);
    if (diff === null) {
      console.log(`  ${spec.outputPath} — unchanged`);
      unchanged++;
      continue;
    }

    console.log(`\n── diff: ${spec.outputPath} ──`);
    console.log(diff);

    const answer = await rl.question(`  Overwrite ${spec.outputPath}? [y/N] `);
    if (answer.trim().toLowerCase() === "y") {
      writeOut(outPath, newContent);
      wrote++;
    } else {
      console.log(`  skipped ${spec.outputPath}`);
      skipped++;
    }
  }

  rl.close();
  console.log(
    `\nRe-scaffold complete: ${wrote} written, ${unchanged} unchanged, ${skipped} skipped.`,
  );
}

if (!isRescaffold) {
  console.log(`Scaffolding @entur/${pkgName} from ${entityPath}...\n`);

  for (const spec of firstPassFiles()) {
    writeOut(resolve(pkgPath, spec.outputPath), fill(spec));
  }
  for (const spec of overrideCandidates()) {
    writeOut(resolve(pkgPath, spec.outputPath), fill(spec));
  }

  console.log(`\nDone! Next steps:`);
  console.log(`  npm install`);
  console.log(`  npm test -w @entur/${pkgName}`);
  console.log(`  npm run build -w @entur/${pkgName}`);
} else {
  rescaffold();
}
