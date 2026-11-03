import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://wickcy.github.io',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  vite: {
    // 避开受限 Windows 环境中 Vite 的映射盘子进程探测。
    resolve: { preserveSymlinks: true },
  },
});
