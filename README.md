# copy-recursive
A flexible and powerful Node.js utility for recursively copying files and directories with advanced configuration options.

## Features
- Recursive file and directory copying
- Configurable copy depth and height limits
- Directory flattening option
- Multiple conflict resolution strategies
- Support for single source or multiple sources
- Asynchronous operation with Promises
- Comprehensive error handling
- Configurable logging levels with Gulp-style output

## Installation
```bash
npm install copy-recursive
```

## Usage
```javascript
import copy from 'copy-recursive';

// Single file/directory copy with logging
const config = [{
    src: 'source/path',
    dest: 'destination/path',
    depth: 2,
    height: 0,
    flatten: false,
    conflictResolution: 'rename',
    logLevel: 'brief'
}];
await copy(config);

// Multiple sources with verbose logging
const multiConfig = [{
    src: ['source1', 'source2', 'source3'],
    dest: 'destination/path',
    flatten: true,
    logLevel: 'verbose'
}];
await copy(multiConfig);
```

## Configuration Options
Each configuration object supports the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `src` | `string\|string[]` | required | Source path(s) to copy from |
| `dest` | `string` | required | Destination path to copy to |
| `depth` | `number` | `0` | Maximum copy depth (0 for unlimited) |
| `height` | `number` | `0` | Maximum copy height from root (0 for unlimited) |
| `flatten` | `boolean` | `false` | When true, flattens directory structure |
| `conflictResolution` | `string` | `'overwrite'` | How to handle conflicts (`'overwrite'`, `'skip'`, or `'rename'`) |
| `logLevel` | `string` | `'none'` | Logging level (`'none'`, `'verbose'`, or `'brief'`) |

## Conflict Resolution Strategies
- `overwrite`: Overwrites existing files at destination
- `skip`: Skips copying if file exists at destination
- `rename`: Adds a numeric suffix to create a unique filename

## Logging Levels
- `none`: No logging output
- `verbose`: Detailed logging of all operations
- `brief`: Concise, Gulp-style logging with symbols
  - `→` File copied
  - `↺` File overwritten
  - `⠿` File skipped
  - `⥅` File renamed

Example brief logging output:
```
Starting copy task...
→ src/file1.txt → dest/file1.txt
↺ src/file2.txt → dest/file2.txt
⠿ src/file3.txt
⥅ src/file4.txt → dest/file4_1.txt
Copy task completed
```

## Project Structure
```
copy-recursive/
├── index.js         # Main module file
├── test-script.js   # Test script by shell
├── test/            # Test by Mocha/Chai
├── docs/            # Generated documentation
├── jsdoc.json       # JSDoc configuration
├── .mocharc.json    # Mocha configuration
├── package.json     # Project configuration
└── README.md        # This file
```

## Documentation
To generate documentation:
```bash
npm run docs
```
Documentation will be generated in the `docs` directory. Open `docs/index.html` in your browser to view.

## Testing
To run tests:
```bash
npm test
```

## Development
1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Make your changes
4. Run tests:
```bash
npm test
```
5. Generate documentation:
```bash
npm run docs
```

## License
MIT

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support
Please open an issue for support.