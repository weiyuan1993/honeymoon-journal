import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { resolve } from 'path';

const productionOrigin = 'https://honeymoon-journal.ab889721.workers.dev';
const localOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

function devApiMutationGuard(): Plugin {
  return {
    name: 'dev-api-mutation-guard',
    configureServer(server) {
      server.middlewares.use('/api', (request, response, next) => {
        const method = request.method?.toUpperCase() || 'GET';
        if (safeMethods.has(method)) {
          next();
          return;
        }

        const origin = request.headers.origin;
        if (origin && localOrigins.has(origin)) {
          next();
          return;
        }

        response.statusCode = 403;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({
          error: {
            code: 'CROSS_ORIGIN_REQUEST',
            message: 'Local API mutations must come from the local application origin.',
          },
        }));
      });
    },
  };
}

export default defineConfig(({ command, isPreview }) => {
  const useCloudflareRuntime = command === 'build' || isPreview;

  return {
    publicDir: resolve(__dirname, 'public'),
    plugins: [
      react(),
      ...(useCloudflareRuntime ? [] : [devApiMutationGuard()]),
      ...(useCloudflareRuntime
        ? [cloudflare({ configPath: resolve(__dirname, 'wrangler.jsonc') })]
        : []),
    ],
    server: {
      port: 5173,
      strictPort: true,
      ...(useCloudflareRuntime
        ? {}
        : {
            proxy: {
              '/api': {
                target: productionOrigin,
                changeOrigin: true,
                headers: {
                  origin: productionOrigin,
                },
              },
            },
          }),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  };
});
