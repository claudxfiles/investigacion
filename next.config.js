/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Transpilar react-pdf y pdfjs-dist para compatibilidad
  transpilePackages: ['react-pdf', 'pdfjs-dist'],
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
      // Para el servidor, evitar empaquetar canvas y pdfjs-dist
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;

