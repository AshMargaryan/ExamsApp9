# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage: base
# node:22-alpine is Node's current LTS line on the small Alpine base — good
# default for both x86_64 dev machines and ARM64 (Raspberry Pi), since the
# official Node images publish multi-arch manifests for both.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# ---------------------------------------------------------------------------
# Stage: dev
# Runs the actual Vite dev server with HMR. Source is bind-mounted by
# Compose (not copied here), so only dependencies are installed at build
# time — editing a .tsx file on the host is picked up instantly.
# ---------------------------------------------------------------------------
FROM base AS dev

# package.json + package-lock.json copied (and only these) before install,
# same layer-caching reasoning as the backend: `npm ci` only reruns when
# dependencies actually change, not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci

EXPOSE 3000

# --host 0.0.0.0 is required, not cosmetic: Vite's dev server binds to
# localhost by default, which is only reachable *inside* the container's own
# network namespace. Without this flag, Docker's port mapping (3000:3000)
# would forward to a socket nothing is listening on from the host's
# perspective, and http://localhost:3000 would just hang.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------------------------------------------------------------------------
# Stage: builder
# Produces the static production bundle. Separate from the `prod` runtime
# stage so the final image never contains node_modules, source .tsx files,
# or the Node runtime itself — just the compiled output.
# ---------------------------------------------------------------------------
FROM base AS builder

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* variables into the JS bundle at build time (they
# cannot be changed at container-start time the way backend env vars can).
# Declaring it as a build ARG makes that explicit and lets Compose/CI pass
# a different value per environment without editing source.
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

ARG VITE_APPLE_CLIENT_ID=
ENV VITE_APPLE_CLIENT_ID=$VITE_APPLE_CLIENT_ID
ARG VITE_APPLE_REDIRECT_URI=
ENV VITE_APPLE_REDIRECT_URI=$VITE_APPLE_REDIRECT_URI

RUN npm run build

# ---------------------------------------------------------------------------
# Stage: prod
# Nginx serving the static build. This is a *different server technology*
# than dev on purpose — a Node process has no reason to stay running just to
# hand out static files; nginx does it faster, with a smaller image, and
# it's the same tool that would front this in a real deployment anyway.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS prod

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# wget is already present in nginx:alpine (via busybox), so this costs
# nothing extra in image size — avoided installing curl just for this.
# 127.0.0.1, not "localhost": this container's /etc/hosts resolves
# "localhost" to ::1 first, and busybox wget (unlike curl) doesn't fall
# back to IPv4 when the first resolved address refuses — nginx here only
# listens on 0.0.0.0, so the IPv6 attempt would always fail the check.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]