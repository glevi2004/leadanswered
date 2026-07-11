/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained: data via supabase-js, config schema is local. No workspace deps.
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    // Old /dashboard/* URLs → the module routes (00-foundation §7).
    return [
      { source: "/dashboard", destination: "/home", permanent: true },
      { source: "/dashboard/leads", destination: "/crm", permanent: true },
      { source: "/dashboard/leads/:leadId", destination: "/crm/:leadId", permanent: true },
      { source: "/dashboard/appointments", destination: "/schedule", permanent: true },
      { source: "/dashboard/settings", destination: "/settings", permanent: true },
    ];
  },
};

export default nextConfig;
