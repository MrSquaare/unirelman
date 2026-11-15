import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";

export default defineConfig({
  site: "https://mrsquaare.github.io",
  base: "/unirelman",
  integrations: [
    starlight({
      title: "unirelman",
      plugins: [starlightLinksValidator()],
      disable404Route: true,
      description: "Universal release manager: version, changelog, and publish any project.",
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/MrSquaare/unirelman" }],
      editLink: {
        baseUrl: "https://github.com/MrSquaare/unirelman/edit/main/docs/",
      },
      sidebar: [
        {
          label: "Introduction",
          items: [{ autogenerate: { directory: "introduction" } }],
        },
        {
          label: "Tutorials",
          items: [{ autogenerate: { directory: "tutorials" } }],
        },
        {
          label: "How-to guides",
          items: [{ autogenerate: { directory: "guides" } }],
        },
        {
          label: "Reference",
          items: [
            "reference/cli",
            "reference/configuration",
            {
              label: "Plugins",
              items: [{ autogenerate: { directory: "reference/plugins" } }],
            },
            "reference/plugin-api",
            {
              label: "Integrations",
              items: [{ autogenerate: { directory: "reference/integrations" } }],
            },
            "reference/helpers",
            "reference/glossary",
          ],
        },
        {
          label: "Explanation",
          items: [{ autogenerate: { directory: "concepts" } }],
        },
      ],
    }),
  ],
});
