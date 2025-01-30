import copy from './index.js';

const cfg = [
  {
    src: [
      './test/src/_redirects',
      './test/src/_headers',
      './test/src/robots.txt',
      './test/src/favicon.ico',

      './test/src/video/',
      './test/src/fonts/',
      './test/src/favicons/',
      './test/src/report/',

      './test/src/report/',
      './test/src/111report/',
      './111src/111report/'
    ],
    dest: './dist/'
  },
  {
    src: './test/src/test/',
    dest: './dist/report/',
    depth: 2 // Пример указания depth
  }
];

copy(cfg, () => {
  console.log('Copy process completed!');
});
