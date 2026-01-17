import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
};

export default withWorkflow(nextConfig);
