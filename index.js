import fs from 'fs/promises';
import path from 'path';

/**
 * Generates a unique filename by adding a suffix if the file already exists.
 *
 * @param {string} filePath - Original path to the file.
 * @returns {Promise<string>} - Unique filename.
 */
async function getUniqueFileName(filePath) {
  let uniquePath = filePath;
  let counter = 1;
  while (true) {
    try {
      await fs.access(uniquePath);
      const { dir, name, ext } = path.parse(filePath);
      uniquePath = path.join(dir, `${name}_${counter}${ext}`);
      counter++;
    } catch {
      return uniquePath;
    }
  }
}

/**
 * Formats file path for brief logging
 * @param {string} filePath - Path to format
 * @returns {string} - Formatted path
 */
function formatPath(filePath) {
  const maxLength = 30;
  if (filePath.length <= maxLength) return filePath;
  const parts = filePath.split(path.sep);
  const fileName = parts.pop();
  let shortenedPath = '...' + path.sep + fileName;
  let i = parts.length - 1;
  while (i >= 0 && shortenedPath.length < maxLength) {
    shortenedPath = parts[i] + path.sep + shortenedPath;
    i--;
  }
  return shortenedPath.length > maxLength ? '...' + shortenedPath.slice(-maxLength) : shortenedPath;
}

/**
 * Logs operation in brief format
 * @param {string} operation - Operation type
 * @param {string} filePath - File path
 * @param {string} [destPath] - Destination path for copy operations
 */
function logBrief(operation, filePath, destPath = null) {
  const ops = {
    copy: '→',
    skip: '⠿',
    overwrite: '↺',
    rename: '⥅'
  };
  const symbol = ops[operation] || '•';
  const formattedSrc = formatPath(filePath);
  if (destPath) {
    const formattedDest = formatPath(destPath);
    console.log(`${symbol} ${formattedSrc} → ${formattedDest}`);
  } else {
    console.log(`${symbol} ${formattedSrc}`);
  }
}

/**
 * Recursively copies a file or folder with configurable logging.
 *
 * @param {string} source - Path to the source file or folder.
 * @param {string} destination - Destination path.
 * @param {number} depth - Maximum copy depth.
 * @param {number} height - Maximum copy height.
 * @param {boolean} flatten - Whether to flatten directory structure.
 * @param {('overwrite'|'skip'|'rename')} conflictResolution - Conflict resolution strategy.
 * @param {('none'|'verbose'|'brief')} logLevel - Logging level.
 * @param {number} [currentDepth=0] - Current nesting depth.
 * @returns {Promise<void>}
 */
async function copyItem(source, destination, depth, height, flatten, conflictResolution, logLevel, currentDepth = 0) {
  try {
    const stats = await fs.stat(source);

    if (stats.isDirectory()) {
      if (depth > 0 && currentDepth >= depth) return;
      if (height > 0 && currentDepth >= height) return;

      const items = await fs.readdir(source);
      if (items.length === 0 && flatten) return;

      if (!flatten) {
        try {
          const destStats = await fs.stat(destination);
          if (destStats.isFile()) throw new Error(`Cannot create directory '${destination}': A file with the same name already exists.`);
        } catch (err) {
          if (err.code === 'ENOENT') await fs.mkdir(destination, { recursive: true });
          else throw err;
        }
      }

      for (const item of items) {
        const sourcePath = path.join(source, item);
        const destPath = flatten ? path.join(destination, path.basename(item)) : path.join(destination, item);
        await copyItem(sourcePath, destPath, depth, height, flatten, conflictResolution, logLevel, currentDepth + 1);
      }
    } else {
      const destPath = flatten ? path.join(destination, path.basename(source)) : destination;

      try {
        const destStats = await fs.stat(destPath);
        if (destStats.isDirectory()) throw new Error(`Cannot copy file '${source}' to '${destPath}': A directory with the same name already exists.`);

        switch (conflictResolution) {
          case 'overwrite':
            await fs.copyFile(source, destPath);
            if (logLevel === 'verbose') console.log(`Overwritten: ${destPath}`);
            if (logLevel === 'brief') logBrief('overwrite', source, destPath);
            break;
          case 'skip':
            if (logLevel === 'verbose') console.log(`Skipped: ${destPath}`);
            if (logLevel === 'brief') logBrief('skip', source);
            break;
          case 'rename':
            const uniquePath = await getUniqueFileName(destPath);
            await fs.copyFile(source, uniquePath);
            if (logLevel === 'verbose') console.log(`Renamed: ${source} -> ${uniquePath}`);
            if (logLevel === 'brief') logBrief('rename', source, uniquePath);
            break;
          default:
            throw new Error(`Unknown conflict resolution strategy: ${conflictResolution}`);
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(source, destPath);
          if (logLevel === 'verbose') console.log(`Copied: ${source} -> ${destPath}`);
          if (logLevel === 'brief') logBrief('copy', source, destPath);
        } else throw err;
      }
    }
  } catch (err) {
    console.error(`Error copying ${source}:`, err.message);
  }
}

/**
 * Copies files and folders based on the provided configuration.
 *
 * @param {Object[]} cfg - Array of copy configurations
 * @param {string|string[]} cfg[].src - Source path(s)
 * @param {string} cfg[].dest - Destination path
 * @param {number} [cfg[].depth=0] - Maximum copy depth
 * @param {number} [cfg[].height=0] - Maximum copy height
 * @param {boolean} [cfg[].flatten=false] - Whether to flatten directory structure
 * @param {('overwrite'|'skip'|'rename')} [cfg[].conflictResolution='overwrite'] - Conflict resolution strategy
 * @param {('none'|'verbose'|'brief')} [cfg[].logLevel='none'] - Logging level
 * @param {Function} [done] - Callback function
 */
export default async function copy(cfg, done) {
  for (const item of cfg) {
    const {
      src,
      dest,
      depth = 0,
      height = 0,
      flatten = false,
      conflictResolution = 'overwrite',
      logLevel = 'none'
    } = item;

    if (logLevel === 'brief') console.log(`\nStarting copy task...`);

    if (Array.isArray(src)) {
      for (const source of src) {
        const destination = flatten ? dest : path.join(dest, path.relative(path.dirname(source), source));
        await copyItem(source, destination, depth, height, flatten, conflictResolution, logLevel);
      }
    } else {
      const destination = flatten ? dest : path.join(dest, path.basename(src));
      await copyItem(src, destination, depth, height, flatten, conflictResolution, logLevel);
    }

    if (logLevel === 'brief') console.log('Copy task completed\n');
  }

  if (done) done();
}