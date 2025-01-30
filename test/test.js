import fs from 'fs/promises';
import path from 'path';

/**
 * Генерирует уникальное имя файла, добавляя суффикс, если файл уже существует.
 *
 * @param {string} filePath - Исходный путь к файлу.
 * @returns {Promise<string>} - Уникальное имя файла.
 */
async function getUniqueFileName(filePath) {
  let uniquePath = filePath;
  let counter = 1;

  while (true) {
    try {
      await fs.access(uniquePath);
      // Если файл существует, добавляем суффикс
      const { dir, name, ext } = path.parse(filePath);
      uniquePath = path.join(dir, `${name}_${counter}${ext}`);
      counter++;
    } catch {
      // Если файл не существует, возвращаем уникальное имя
      return uniquePath;
    }
  }
}

/**
 * Рекурсивно копирует файл или папку с учётом глубины, высоты, параметра flatten и обработки конфликтов.
 *
 * @param {string} source - Путь к исходному файлу или папке.
 * @param {string} destination - Путь назначения.
 * @param {number} depth - Максимальная глубина копирования.
 * @param {number} height - Максимальная высота копирования (начиная с корня).
 * @param {boolean} flatten - Если true, копирует файлы и папки без сохранения структуры.
 * @param {string} conflictResolution - Стратегия обработки конфликтов: 'overwrite', 'skip', 'rename'.
 * @param {number} currentDepth - Текущая глубина вложенности (по умолчанию 0).
 * @returns {Promise<void>}
 */
async function copyItem(source, destination, depth, height, flatten, conflictResolution, currentDepth = 0) {
  try {
    const stats = await fs.stat(source);

    if (stats.isDirectory()) {
      // Если текущая глубина превышает depth, игнорируем папку
      if (depth > 0 && currentDepth >= depth) {
        console.log(`Ignoring directory (depth limit): ${source}`);
        return;
      }

      // Если текущая высота превышает height, игнорируем папку
      if (height > 0 && currentDepth >= height) {
        console.log(`Ignoring directory (height limit): ${source}`);
        return;
      }

      // Если папка пустая и flatten = true, игнорируем её
      const items = await fs.readdir(source);
      if (items.length === 0 && flatten) {
        console.log(`Ignoring empty directory: ${source}`);
        return;
      }

      // Если flatten = false, создаём папку в destination
      if (!flatten) {
        await fs.mkdir(destination, { recursive: true });
        console.log(`Directory created: ${destination}`);
      }

      // Рекурсивно копируем содержимое папки
      for (const item of items) {
        const sourcePath = path.join(source, item);
        const destPath = flatten ? path.join(destination, path.basename(item)) : path.join(destination, item);
        await copyItem(sourcePath, destPath, depth, height, flatten, conflictResolution, currentDepth + 1);
      }
    } else {
      // Если это файл, обрабатываем конфликты
      const destPath = flatten ? path.join(destination, path.basename(source)) : destination;

      try {
        await fs.access(destPath); // Проверяем, существует ли файл

        // Обработка конфликтов
        switch (conflictResolution) {
          case 'overwrite':
            await fs.copyFile(source, destPath);
            console.log(`File overwritten: ${source} to ${destPath}`);
            break;

          case 'skip':
            console.log(`File skipped (already exists): ${destPath}`);
            break;

          case 'rename':
            const uniquePath = await getUniqueFileName(destPath);
            await fs.copyFile(source, uniquePath);
            console.log(`File renamed and copied: ${source} to ${uniquePath}`);
            break;

          default:
            throw new Error(`Unknown conflict resolution strategy: ${conflictResolution}`);
        }
      } catch {
        // Если файл не существует, просто копируем
        await fs.copyFile(source, destPath);
        console.log(`File copied: ${source} to ${destPath}`);
      }
    }
  } catch (err) {
    console.error(`Error copying ${source}:`, err.message);
  }
}

/**
 * Копирует файлы и папки на основе конфигурации.
 *
 * @param {Object[]} cfg - Конфигурация с полями src, dest, depth, height, flatten и conflictResolution.
 * @param {Function} done - Callback функция (не используется в этом примере).
 */
export default async function copy(cfg, done) {
  // Проходим по каждому элементу конфигурации
  for (const item of cfg) {
    const { src, dest, depth = 0, height = 0, flatten = false, conflictResolution = 'overwrite' } = item;

    console.log('Processing item:', { src, dest, depth, height, flatten, conflictResolution });

    // Если src - массив, обрабатываем каждый элемент
    if (Array.isArray(src)) {
      for (const source of src) {
        const destination = flatten ? dest : dest; // Если flatten = true, копируем в dest напрямую
        await copyItem(source, destination, depth, height, flatten, conflictResolution);
      }
    } else {
      const destination = flatten ? dest : dest; // Если flatten = true, копируем в dest напрямую
      await copyItem(src, destination, depth, height, flatten, conflictResolution);
    }
  }

  if (done) done(); // Вызываем callback, если он передан
}