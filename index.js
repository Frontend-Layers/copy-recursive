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
      // If file exists, add suffix
      const { dir, name, ext } = path.parse(filePath);
      uniquePath = path.join(dir, `${name}_${counter}${ext}`);
      counter++;
    } catch {
      // If file doesn't exist, return unique name
      return uniquePath;
    }
  }
}

/**
 * Recursively copies a file or folder taking into account depth, height, flatten parameter, and conflict resolution.
 *
 * @param {string} source - Path to the source file or folder.
 * @param {string} destination - Destination path.
 * @param {number} depth - Maximum copy depth.
 * @param {number} height - Maximum copy height (starting from root).
 * @param {boolean} flatten - If true, copies files and folders without preserving structure.
 * @param {('overwrite'|'skip'|'rename')} conflictResolution - Conflict handling strategy.
 * @param {number} [currentDepth=0] - Current nesting depth.
 * @returns {Promise<void>}
 * @throws {Error} If copying fails or encounters an invalid conflict resolution strategy.
 */
async function copyItem(source, destination, depth, height, flatten, conflictResolution, currentDepth = 0) {
  try {
    const stats = await fs.stat(source);
    if (stats.isDirectory()) {
      // Skip folder if current depth exceeds maximum depth
      if (depth > 0 && currentDepth >= depth) {
        return;
      }
      // Skip folder if current height exceeds maximum height
      if (height > 0 && currentDepth >= height) {
        return;
      }
      // Skip empty folders when flatten is true
      const items = await fs.readdir(source);
      if (items.length === 0 && flatten) {
        return;
      }
      // Create folder in destination if flatten is false
      if (!flatten) {
        try {
          const destStats = await fs.stat(destination);
          if (destStats.isFile()) {
            throw new Error(
              `Cannot create directory '${destination}': A file with the same name already exists.`
            );
          }
        } catch (err) {
          if (err.code === 'ENOENT') {
            // Create folder if it doesn't exist
            await fs.mkdir(destination, { recursive: true });
          } else {
            throw err;
          }
        }
      }
      // Recursively copy folder contents
      for (const item of items) {
        const sourcePath = path.join(source, item);
        const destPath = flatten ? path.join(destination, path.basename(item)) : path.join(destination, item);
        await copyItem(sourcePath, destPath, depth, height, flatten, conflictResolution, currentDepth + 1);
      }
    } else {
      // Handle file conflicts
      const destPath = flatten ? path.join(destination, path.basename(source)) : destination;
      try {
        const destStats = await fs.stat(destPath);
        if (destStats.isDirectory()) {
          throw new Error(
            `Cannot copy file '${source}' to '${destPath}': A directory with the same name already exists.`
          );
        }
        // Conflict resolution handling
        switch (conflictResolution) {
          case 'overwrite':
            await fs.copyFile(source, destPath);
            break;
          case 'skip':
            break;
          case 'rename':
            const uniquePath = await getUniqueFileName(destPath);
            await fs.copyFile(source, uniquePath);
            break;
          default:
            throw new Error(`Unknown conflict resolution strategy: ${conflictResolution}`);
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          // Copy if file doesn't exist
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(source, destPath);
        } else {
          throw err;
        }
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
 * @param {number} [cfg[].depth=0] - Maximum copy depth (0 for unlimited)
 * @param {number} [cfg[].height=0] - Maximum copy height (0 for unlimited)
 * @param {boolean} [cfg[].flatten=false] - Whether to flatten directory structure
 * @param {('overwrite'|'skip'|'rename')} [cfg[].conflictResolution='overwrite'] - Conflict resolution strategy
 * @param {Function} [done] - Callback function to be called after completion
 * @returns {Promise<void>}
 */
export default async function copy(cfg, done) {
  // Process each configuration item
  for (const item of cfg) {
    const { src, dest, depth = 0, height = 0, flatten = false, conflictResolution = 'overwrite' } = item;
    console.log('Processing item:', { src, dest, depth, height, flatten, conflictResolution });
    // Handle array of sources
    if (Array.isArray(src)) {
      for (const source of src) {
        const destination = flatten ? dest : path.join(dest, path.relative(path.dirname(source), source));
        await copyItem(source, destination, depth, height, flatten, conflictResolution);
      }
    } else {
      const destination = flatten ? dest : path.join(dest, path.basename(src));
      await copyItem(src, destination, depth, height, flatten, conflictResolution);
    }
  }
  if (done) done(); // Call callback if provided
}
