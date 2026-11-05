import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The root Prisma client bypasses RLS. Only audited modules may import it.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/db/**", "src/server/auth/**", "src/server/public/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/server/db/root",
              message: "Use withOrg() from @/server/db/tenant. The root client bypasses RLS.",
            },
          ],
          patterns: [
            {
              group: ["**/db/root"],
              message: "Use withOrg() from @/server/db/tenant. The root client bypasses RLS.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    ".agents/**",
    "supabase/**",
  ]),
]);

export default eslintConfig;
