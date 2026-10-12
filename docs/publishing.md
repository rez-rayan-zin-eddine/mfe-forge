# Building and deploying

This page explains how to produce production builds of your hosts and remotes and how to deploy them. For how the MFE Forge packages themselves are released to npm, see [Contributing](./contributing.md#release-process).

::: warning Production remote URLs are manual today
The CLI always writes remote URLs as `http://localhost:<port>/assets/remoteEntry.js`, and `mfe-forge sync` rewrites them back to that form. There is no per-environment URL support yet (the manifest's `environments` field is always empty). Plan a build-time override as described in [Point hosts at deployed remotes](#point-hosts-at-deployed-remotes).
:::

## Build

```bash
mfe-forge build                    # every app under apps/<scope>/<name>
mfe-forge build shop/catalog       # one app (a bare name works when it is unambiguous)
mfe-forge build --scope shop       # every app in one scope
mfe-forge build --bail             # stop at the first failure
```

For each target, `build` runs `<pm> run build` in the app directory, one app after another. The generated script is `tsc -b && vite build`, so type errors fail the build. The command prints `✔ built N, ✖ failed M` (and `○ skipped K` with `--bail`) and exits with code `2` if anything failed, which makes it safe for CI. `--parallel` and `--analyze` are accepted but currently have no effect. See [`build`](./cli/build.md).

### Output

Each app writes to its own `dist/`:

```text
apps/shop/catalog/dist/
├── index.html                 # standalone entry of the remote
└── assets/
    ├── remoteEntry.js         # federation entry consumed by hosts (remotes only)
    └── ...                    # hashed JS/CSS chunks
```

The templates set `build.target: 'esnext'`, `minify: false` and `cssCodeSplit: false`. Enable minification in each `vite.config.ts` for production if you want it; the config file's `build.minify` setting is not applied to generated apps.

### Preview a build

```bash
npm run preview --workspace=shop-catalog
```

The `preview` script serves `dist/` on the app's port with CORS enabled, which is the closest local equivalent of production.

## Point hosts at deployed remotes

The host resolves remotes from the literal URLs in its `vite.config.ts`. `sync` only understands an inline `remotes: { ... }` object inside the federation call and regenerates it with localhost URLs, so you cannot move the URLs into a variable or environment lookup without breaking `sync`. The workable pattern today is to keep the CLI-managed inline block in the repository and replace the localhost origins in CI before building the host:

```bash
# CI step before building the host
sed -i "s#http://localhost:3001#https://cdn.example.com/shop/catalog#; s#http://localhost:3002#https://cdn.example.com/shop/cart#" \
  apps/shop/host/vite.config.ts
mfe-forge build shop/host
```

Keep the substitution in CI rather than committing it, so `sync --check` stays clean in the repository. The roadmap replaces this with configuration-driven remotes and runtime manifests (phase B).

## Hosting remotes on a CDN or static host

Remotes are static files. Requirements for any host (S3 + CloudFront, Netlify, Vercel, nginx, GitHub Pages):

- **Path:** `remoteEntry.js` must be reachable at the URL configured in the host, which by convention ends in `/assets/remoteEntry.js`. Upload the whole `dist/` folder of each remote, preserving `assets/`.
- **CORS:** the host fetches the remote's modules from another origin. Serve them with `Access-Control-Allow-Origin` set to your host's origin (or `*` for public assets).
- **Caching:** hashed chunks under `assets/` can be cached long-term, but `remoteEntry.js` keeps the same name across builds. Serve it with `Cache-Control: no-cache` (or a short max-age) so hosts pick up new deployments.
- **Base path:** if a remote is deployed under a sub-path (for example `/shop/catalog/`), set Vite's `base` option in that remote's `vite.config.ts` so its chunk URLs resolve correctly.
- **SPA fallback:** hosts use client-side routing; configure the server to return `index.html` for unknown paths.

Deploy remotes before the host that references them, or keep the previous remote version online until hosts are updated. Because the `shared` singletons are negotiated at runtime, deploy React upgrades to every app together.

## Docker templates

The CLI package ships Docker templates in `packages/cli/src/templates/docker/`: a `Dockerfile`, `nginx.conf` and `docker-compose.yml`. **No command renders them yet.** The `ci.docker` config option and the "Docker Support" choice in `init` are recorded in the config but do not generate files. You can copy the templates manually; they contain Mustache placeholders that you must replace by hand.

### Dockerfile

A two-stage build:

<div v-pre>

1. `oven/bun:1` copies the root `package.json`, `bun.lock` and the app's `package.json`, runs `bun install`, copies the repository and runs `bun run build --scope {{scope}}`.
2. `nginx:alpine` copies `apps/{{scope}}/{{app}}/dist` to `/usr/share/nginx/html` and `docker/nginx.conf` to `/etc/nginx/conf.d/default.conf`, and exposes port `80`.

Replace `{{scope}}` and `{{app}}` with your values, place `nginx.conf` at `docker/nginx.conf` in the project root, and build from the root so the context includes the workspace:

</div>

```bash
docker build -f apps/shop/catalog/Dockerfile -t shop-catalog .
docker run -p 3001:80 shop-catalog
```

The template assumes Bun. With npm or pnpm, change the base image, lock file and install command.

### nginx.conf

Serves `index.html` as the SPA fallback (`try_files $uri $uri/ /index.html`), caches `/assets/` for one year as `immutable`, and enables gzip for text, CSS, JSON and JavaScript. Two adjustments are recommended for remotes:

```nginx
location = /assets/remoteEntry.js {
    add_header Cache-Control "no-cache";
    add_header Access-Control-Allow-Origin "*";
}

location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "*";
}
```

Without the first block, `remoteEntry.js` is cached as immutable for a year and hosts keep loading the old version. Without the CORS header, cross-origin hosts cannot load the remote. Replace `*` with your host origin in production.

### docker-compose.yml

Defines one service per app (a Mustache `apps` section with `camelName`, `scope`, `name` and `port`), each built from `apps/<scope>/<name>/Dockerfile`, mapped to `<port>:80` and attached to a `mfe-network` bridge network. Expand the section by hand into one service per app. Mapping each container to the app's dev port means the localhost remote URLs the CLI writes keep working for a local production-like stack.

## CI

The `init` template's optional GitHub Actions workflow (written when you select "GitHub Actions CI/CD" in the interactive `init`) runs `bun install`, `bun run lint`, `bun run type-check` and `bun run test`. It does not build or deploy. A minimal build job for any package manager:

```yaml
- run: npm ci
- run: npx mfe sync --check # fail if hosts are out of date
- run: npx mfe build --bail # exit code 2 on failure
- uses: actions/upload-artifact@v4
  with:
    name: dist
    path: apps/*/*/dist
```

A fuller workflow template with a per-scope build matrix exists in `packages/cli/src/templates/ci/github/`, but like the Docker templates it is not rendered by any command.
