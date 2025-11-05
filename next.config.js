/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Transpilar react-pdf y pdfjs-dist para compatibilidad
  transpilePackages: ['react-pdf', 'pdfjs-dist'],
  // Excluir pdf-parse del bundling del servidor (usar CommonJS directamente)
  serverComponentsExternalPackages: ['pdf-parse'],
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        canvas: false,
        stream: false,
      };
      
      // Configuración específica para react-pdf y pdfjs-dist
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
      
      // Ignorar módulos de canvas y canvas-prebuilt en el cliente
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^canvas$/,
          contextRegExp: /pdfjs-dist/,
        })
      );
    } else {
      // Para el servidor, excluir pdf-parse y pdfjs-dist del bundling
      // Esto permite que se carguen como CommonJS en runtime
      config.externals = config.externals || [];
      
      // Excluir pdf-parse del bundling - se carga en runtime
      if (Array.isArray(config.externals)) {
        config.externals.push('pdf-parse');
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = [
          originalExternals,
          (context, request, callback) => {
            if (request === 'pdf-parse') {
              return callback(null, 'commonjs ' + request);
            }
            originalExternals(context, request, callback);
          },
        ];
      } else {
        config.externals = config.externals || {};
        config.externals['pdf-parse'] = 'commonjs pdf-parse';
      }
      
      // Permitir que pdf-parse use CommonJS en el servidor
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;

