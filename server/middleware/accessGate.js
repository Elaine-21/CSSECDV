// server/middleware/accessGate.js
// Central, site-wide authorization gate.
// Decides access based on a small route policy map.

const { URL } = require("url");
const logger = require("./logger");

// tiny helper: normalize path (strip query, trailing slash)
function pathOf(req) {
  try {
    const u = new URL(req.protocol + "://" + req.get("host") + req.originalUrl);
    return u.pathname.replace(/\/+$/, "") || "/";
  } catch {
    // fallback if URL throws (edge cases in tests)
    return (req.originalUrl || "").split("?")[0].replace(/\/+$/, "") || "/";
  }
}

function wantsJSON(req) {
  const accept = req.get("accept") || "";
  return req.xhr || accept.includes("application/json") || req.originalUrl.startsWith("/api");
}

/**
 * Policy syntax:
 * - path: RegExp to match pathname
 * - methods: optional array of HTTP methods (e.g., ["POST","PUT"]). If omitted, all methods.
 * - require: "public" | "auth" | { role: ["admin","moderator", ...] }
 *
 * Order matters: first match wins.
 */
const defaultPolicy = [
  // --- Public endpoints & assets ---
  { path: /^\/health$/, require: "public" },
  { path: /^\/login$/, require: "public" },
  { path: /^\/logout$/, require: "public" },
  { path: /^\/register$/, require: "public" },
  { path: /^\/$/, require: "public" },
  { path: /^\/public(\/|$)/, require: "public" },     // static
  { path: /^\/images(\/|$)/, require: "public" },     // if you serve images
  { path: /^\/css(\/|$)/, require: "public" },
  { path: /^\/js(\/|$)/, require: "public" },

  // --- Admin zone (role required) ---
  { path: /^\/admin(\/|$)/, require: { role: ["admin"] } },
  { path: /^\/api\/auth(\/|$)/, require: { role: ["admin"] } },

  // --- “Auth only” actions (any logged-in user) ---
  // voting APIs
  { path: /^\/api\/upvote$/, methods: ["POST"], require: "auth" },
  { path: /^\/api\/downvote$/, methods: ["POST"], require: "auth" },

  // creating/editing posts via UI
  { path: /^\/newPost$/, methods: ["GET"], require: "auth" },
  { path: /^\/posts\/new$/, methods: ["GET","POST"], require: "auth" },
  { path: /^\/posts\/[^/]+\/edit$/, methods: ["GET","PUT","PATCH"], require: "auth" },
  { path: /^\/posts\/[^/]+$/, methods: ["DELETE"], require: "auth" },

  // profile updates (generic protection; fine-grained owner checks stay in controllers)
  { path: /^\/profiles\/[^/]+\/edit$/, require: "auth" },

  // --- Everything else defaults to public view ---
];

function matchRule(req, rules) {
  const p = pathOf(req);
  const m = req.method.toUpperCase();
  for (const rule of rules) {
    if (!rule.path.test(p)) continue;
    if (rule.methods && !rule.methods.includes(m)) continue;
    return rule;
  }
  return null;
}

function accessGate(policy = defaultPolicy) {
  return function (req, res, next) {
    const rule = matchRule(req, policy);
    if (!rule) return next(); // no rule => treat as public

    const requirement = rule.require;

    // PUBLIC
    if (requirement === "public") return next();

    // AUTH
    if (requirement === "auth") {
      if (req.isAuthenticated && req.isAuthenticated()) return next();

      logger.warn({
        evt: "AUTHZ_DENIED",
        reason: "unauthenticated",
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });

      if (wantsJSON(req)) return res.status(401).json({ error: "Unauthorized" });
      return res.status(401).render("errors/401", { message: "Please log in." });
    }

    // ROLE
    if (requirement && requirement.role && Array.isArray(requirement.role)) {
      if (!(req.isAuthenticated && req.isAuthenticated())) {
        logger.warn({
          evt: "AUTHZ_DENIED",
          reason: "unauthenticated_for_role",
          needRole: requirement.role,
          path: req.originalUrl,
        });
        return wantsJSON(req)
          ? res.status(401).json({ error: "Unauthorized" })
          : res.status(401).render("errors/401", { message: "Please log in." });
      }

      const userRole = (req.user?.status || req.user?.role || "").toString().toLowerCase();
      const ok = requirement.role.map((r) => r.toLowerCase()).includes(userRole);
      if (ok) return next();

      logger.warn({
        evt: "AUTHZ_DENIED",
        reason: "forbidden_role",
        needRole: requirement.role,
        haveRole: userRole,
        userId: req.user?._id,
        path: req.originalUrl,
        method: req.method,
      });

      return wantsJSON(req)
        ? res.status(403).json({ error: "Forbidden" })
        : res.status(403).render("errors/403", { message: "Forbidden" });
    }

    // Fallback: allow
    return next();
  };
}

module.exports = { accessGate, defaultPolicy };
