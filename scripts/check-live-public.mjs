#!/usr/bin/env node

const input = process.argv[2] || "http://localhost:3000"
const baseUrl = input.startsWith("http") ? input : `https://${input}`

async function get(path, options = {}) {
  const url = new URL(path, baseUrl)
  const response = await fetch(url, {
    headers: { Accept: "text/html,application/json" },
    redirect: "manual",
    cache: "no-store",
    ...options,
  })

  return {
    url,
    response,
    location: response.headers.get("location"),
  }
}

function fail(message, details) {
  console.error(message, details)
  process.exit(1)
}

const health = await get("/api/health", {
  headers: { Accept: "application/json" },
})
const healthBody = await health.response.json()

if (!health.response.ok || healthBody.ok !== true) {
  fail("Health check failed", {
    status: health.response.status,
    body: healthBody,
  })
}

const login = await get("/login")

if (login.response.status !== 200) {
  fail("Login page is not reachable", {
    status: login.response.status,
    location: login.location,
  })
}

const portal = await get("/portal")
const redirectedToLogin =
  portal.response.status >= 300 &&
  portal.response.status < 400 &&
  (portal.location || "").includes("/login")

if (!redirectedToLogin) {
  fail("Protected portal did not redirect anonymous visitor to login", {
    status: portal.response.status,
    location: portal.location,
  })
}

console.log("Public pilot checks passed:", {
  baseUrl,
  health: health.response.status,
  login: login.response.status,
  portal: {
    status: portal.response.status,
    location: portal.location,
  },
})
