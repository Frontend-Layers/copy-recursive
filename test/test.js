import { expect } from 'chai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sinon from 'sinon';
import copy from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcPath = path.join(__dirname, 'src');
const distPath = path.join(__dirname, 'dist');

async function createTestStructure() {
  await fs.rm(srcPath, { recursive: true, force: true });
  await fs.rm(distPath, { recursive: true, force: true });

  await fs.mkdir(srcPath, { recursive: true });
  await fs.mkdir(distPath, { recursive: true });

  // Create test files and directories
  const structure = {
    'file1.txt': 'File 1 content',
    'file2.txt': 'File 2 content',
    '_redirects': 'Redirects content',
    '_headers': 'Headers content',
    'robots.txt': 'Robots content',
    'favicon.ico': 'Favicon content',
    'folder1/': {
      'file3.txt': 'File 3 content',
      'folder2/': {
        'file4.txt': 'File 4 content'
      }
    },
    'folder3/': {
      'file5.txt': 'File 5 content'
    },
    'emptyFolder/': {},
    'video/': {},
    'fonts/': {},
    'favicons/': {},
    'report/': {}
  };

  async function createFiles(basePath, struct) {
    for (const [name, content] of Object.entries(struct)) {
      const fullPath = path.join(basePath, name);
      if (name.endsWith('/')) {
        await fs.mkdir(fullPath, { recursive: true });
        if (typeof content === 'object') {
          await createFiles(fullPath, content);
        }
      } else {
        await fs.writeFile(fullPath, content);
      }
    }
  }

  await createFiles(srcPath, structure);
}

async function clearDist() {
  await fs.rm(distPath, { recursive: true, force: true });
  await fs.mkdir(distPath, { recursive: true });
}

describe('Copy Script Tests', () => {
  let consoleLogStub;
  let consoleErrorStub;

  before(async () => {
    await createTestStructure();
  });

  beforeEach(async () => {
    await clearDist();
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
  });

  afterEach(() => {
    consoleLogStub.restore();
    consoleErrorStub.restore();
  });

  describe('Conflict Resolution Tests', () => {
    it('should rename files when conflictResolution = "rename"', async () => {
      await copy([{
        src: path.join(srcPath, 'file1.txt'),
        dest: distPath,
        flatten: true,
        conflictResolution: 'rename'
      }]);
      await copy([{
        src: path.join(srcPath, 'file1.txt'),
        dest: distPath,
        flatten: true,
        conflictResolution: 'rename'
      }]);

      const files = await fs.readdir(distPath);
      expect(files).to.include.members(['file1.txt', 'file1_1.txt']);

      const content1 = await fs.readFile(path.join(distPath, 'file1.txt'), 'utf8');
      const content2 = await fs.readFile(path.join(distPath, 'file1_1.txt'), 'utf8');
      expect(content1).to.equal('File 1 content');
      expect(content2).to.equal('File 1 content');
    });

    it('should skip files when conflictResolution = "skip"', async () => {
      await copy([{
        src: path.join(srcPath, 'file1.txt'),
        dest: distPath,
        flatten: true,
        conflictResolution: 'skip'
      }]);

      // Modify the first file to check if it's not overwritten
      await fs.writeFile(path.join(distPath, 'file1.txt'), 'Modified content');

      await copy([{
        src: path.join(srcPath, 'file1.txt'),
        dest: distPath,
        flatten: true,
        conflictResolution: 'skip'
      }]);

      const files = await fs.readdir(distPath);
      expect(files).to.have.lengthOf(1);
      expect(files).to.include('file1.txt');

      const content = await fs.readFile(path.join(distPath, 'file1.txt'), 'utf8');
      expect(content).to.equal('Modified content');
    });

    it('should overwrite files when conflictResolution = "overwrite"', async () => {
      await copy([{
        src: path.join(srcPath, 'file1.txt'),
        dest: distPath,
        flatten: true,
        conflictResolution: 'overwrite'
      }]);

      // Modify the first file
      await fs.writeFile(path.join(distPath, 'file1.txt'), 'Modified content');

      await copy([{
        src: path.join(srcPath, 'file1.txt'),
        dest: distPath,
        flatten: true,
        conflictResolution: 'overwrite'
      }]);

      const content = await fs.readFile(path.join(distPath, 'file1.txt'), 'utf8');
      expect(content).to.equal('File 1 content');
    });
  });

  describe('Logging Tests', () => {
    it('should not log anything when logLevel = "none"', async () => {
      await copy([{
        src: path.join(srcPath, 'file1.txt'),
        dest: distPath,
        logLevel: 'none'
      }]);

      expect(consoleLogStub.called).to.be.false;
    });

    it('should log verbose information when logLevel = "verbose"', async () => {
      await copy([{
        src: path.join(srcPath, 'file1.txt'),
        dest: distPath,
        logLevel: 'verbose'
      }]);

      expect(consoleLogStub.called).to.be.true;
      expect(consoleLogStub.firstCall.args[0]).to.include('Copied:');
    });

    it('should log brief information when logLevel = "brief"', async () => {
      await copy([{
        src: path.join(srcPath, 'file1.txt'),
        dest: distPath,
        logLevel: 'brief'
      }]);

      expect(consoleLogStub.called).to.be.true;
      const logs = consoleLogStub.args.map(args => args[0]).join('\n');
      expect(logs).to.include('Starting copy task');
      expect(logs).to.include('→');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle non-existent source path', async () => {
      await copy([{
        src: path.join(srcPath, 'nonexistent.txt'),
        dest: distPath,
        logLevel: 'brief'
      }]);

      expect(consoleErrorStub.called).to.be.true;
      expect(consoleErrorStub.firstCall.args[0]).to.include('Error copying');
    });

    it('should handle copying to existing file as directory', async () => {
      // Create a file at the destination path
      await fs.writeFile(path.join(distPath, 'folder1'), 'This is a file');

      await copy([{
        src: path.join(srcPath, 'folder1'),
        dest: distPath
      }]);

      expect(consoleErrorStub.called).to.be.true;
      expect(consoleErrorStub.firstCall.args[0]).to.include('Error copying');
    });
  });

  describe('Feature Tests', () => {
    it('should respect maximum depth parameter', async () => {
      await copy([{
        src: srcPath,
        dest: distPath,
        depth: 1
      }]);

      const hasDeepFile = await fs.access(path.join(distPath, 'folder1', 'folder2', 'file4.txt'))
        .then(() => true)
        .catch(() => false);

      expect(hasDeepFile).to.be.false;
    });

    it('should handle array of source paths', async () => {
      await copy([{
        src: [
          path.join(srcPath, 'file1.txt'),
          path.join(srcPath, 'file2.txt')
        ],
        dest: distPath,
        logLevel: 'brief'
      }]);

      const files = await fs.readdir(distPath);
      expect(files).to.include.members(['file1.txt', 'file2.txt']);
    });

  });
});