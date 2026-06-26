/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained: data via supabase-js, config schema is local. No workspace deps.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
