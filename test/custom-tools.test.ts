import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, expect, test } from '@rstest/core';
import fse from 'fs-extra';
import { create } from '../src';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures', 'basic');
const testDir = path.join(fixturesDir, 'test-temp-output');

beforeEach(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  return () => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  };
});

test('should run extra tool action', async () => {
  const projectDir = path.join(testDir, 'extra-tool-action');
  let actionCalled = false;

  await create({
    name: 'test',
    root: fixturesDir,
    templates: ['vanilla'],
    getTemplateName: async () => 'vanilla',
    extraTools: [
      {
        value: 'custom-action',
        label: 'Custom Action',
        action: ({ templateName, distFolder }) => {
          expect(templateName).toBe('vanilla');
          expect(distFolder).toBe(projectDir);
          actionCalled = true;
        },
      },
    ],
    argv: [
      'node',
      'test',
      '--dir',
      projectDir,
      '--template',
      'vanilla',
      '--tools',
      'custom-action',
    ],
  });

  expect(actionCalled).toBe(true);
});

test('should run extra tool command', async () => {
  const projectDir = path.join(testDir, 'extra-tool-command');
  const testFile = path.join(__dirname, 'node_modules', 'test.txt');

  await fse.outputFile(testFile, '');
  expect(fs.existsSync(testFile)).toBe(true);

  await create({
    name: 'test',
    root: fixturesDir,
    templates: ['vanilla'],
    getTemplateName: async () => 'vanilla',
    extraTools: [
      {
        value: 'custom-command',
        label: 'Custom Command',
        command: `npx rimraf ${testFile}`,
      },
    ],
    argv: [
      'node',
      'test',
      '--dir',
      projectDir,
      '--template',
      'vanilla',
      '--tools',
      'custom-command',
    ],
  });

  expect(fs.existsSync(testFile)).toBe(false);
});

test('should filter extra tools based on template name', async () => {
  const projectDir = path.join(testDir, 'extra-tool-filter');
  let filteredToolCalled = false;
  let allowedToolCalled = false;
  let noFilterToolCalled = false;

  await create({
    name: 'test',
    root: fixturesDir,
    templates: ['vanilla'],
    getTemplateName: async () => 'vanilla',
    extraTools: [
      {
        value: 'filtered-tool',
        label: 'Filtered Tool',
        // This tool should be filtered out for 'vanilla' template
        when: (templateName) => templateName !== 'vanilla',
        action: () => {
          filteredToolCalled = true;
        },
      },
      {
        value: 'allowed-tool',
        label: 'Allowed Tool',
        // This tool should be allowed for 'vanilla' template
        when: (templateName) => templateName === 'vanilla',
        action: () => {
          allowedToolCalled = true;
        },
      },
      {
        value: 'no-filter-tool',
        label: 'No Filter Tool',
        // No `when` property - should always be available
        action: () => {
          noFilterToolCalled = true;
        },
      },
    ],
    argv: [
      'node',
      'test',
      '--dir',
      projectDir,
      '--template',
      'vanilla',
      '--tools',
      'filtered-tool,allowed-tool,no-filter-tool',
    ],
  });

  // filtered-tool should not run because `when` returns false
  expect(filteredToolCalled).toBe(false);
  // allowed-tool should run because `when` returns true
  expect(allowedToolCalled).toBe(true);
  // no-filter-tool should run because it has no `when`
  expect(noFilterToolCalled).toBe(true);
});
