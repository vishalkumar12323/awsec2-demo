const express = require("express");
const path = require("node:path");
const os = require("node:os");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 80;

app.use(
  express.static(path.join(__dirname, "public"), {
    etag: true,
    maxAge: "1h",
    extensions: ["html"],
  })
);

app.use(morgan("combined"));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/time", (_req, res) => {
  res.json({ now: Date.now() });
});

app.get("/meta", async (_req, res) => {
  const hostname = os.hostname();

  // Try to read cloud instance metadata (IMDSv2 optional demonstration)
  // We avoid blocking if not on EC2.
  let instanceId = hostname;
  let az = "local";

  try {
    // Quick attempt without IMDSv2 token for simplicity; in hardened envs this may be blocked.
    const http = require("http");
    const id = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: "169.254.169.254",
          path: "/latest/meta-data/instance-id",
          timeout: 200,
          method: "GET",
        },
        (r) => {
          let d = "";
          r.on("data", (c) => (d += c));
          r.on("end", () => resolve(d || hostname));
        }
      );
      req.on("error", () => resolve(hostname));
      req.on("timeout", () => {
        req.destroy();
        resolve(hostname);
      });
      req.end();
    });

    const zone = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: "169.254.169.254",
          path: "/latest/meta-data/placement/availability-zone",
          timeout: 200,
          method: "GET",
        },
        (r) => {
          let d = "";
          r.on("data", (c) => (d += c));
          r.on("end", () => resolve(d || "unknown"));
        }
      );
      req.on("error", () => resolve("unknown"));
      req.on("timeout", () => {
        req.destroy();
        resolve("unknown");
      });
      req.end();
    });

    instanceId = id;
    az = zone;
  } catch (_) {
    // Fallbacks already set
  }

  res.json({ instanceId, az });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
