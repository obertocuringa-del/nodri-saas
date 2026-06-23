/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
    // Tree-shaking de bibliotecas grandes: importa só os ícones/funções usados,
    // em vez do pacote inteiro. Reduz o JS que trafega em todas as telas.
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns']
  }
}

export default nextConfig
