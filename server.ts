import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import axios from "axios";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("linkedin_poster.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at INTEGER,
    member_id TEXT,
    name TEXT
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT DEFAULT 'linkedin',
    prompt TEXT,
    content TEXT,
    image_url TEXT,
    scheduled_at TEXT,
    status TEXT DEFAULT 'pending',
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add platform column if it doesn't exist
try {
  db.exec("ALTER TABLE posts ADD COLUMN platform TEXT DEFAULT 'linkedin'");
} catch (e: any) {
  // Ignore error if column already exists
  if (!e.message.includes("duplicate column name")) {
    console.error("Error adding platform column:", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- LinkedIn OAuth Routes ---
  app.get("/api/auth/url", (req, res) => {
    if (!process.env.LINKEDIN_CLIENT_ID) {
      // Simulate auth if no client ID is set
      return res.json({ url: "/auth/simulate-redirect" });
    }
    const redirectUri = `${process.env.APP_URL}/auth/callback`;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: "w_member_social profile openid email", // Adjust scopes as needed
    });
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    res.json({ url: authUrl });
  });

  app.get("/auth/simulate-redirect", (req, res) => {
    db.prepare("DELETE FROM auth").run();
    db.prepare(
      "INSERT INTO auth (access_token, expires_at, member_id, name) VALUES (?, ?, ?, ?)"
    ).run("simulated_token", Date.now() + 3600000, "simulated_id", "Demo User");

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  app.post("/api/auth/simulate", (req, res) => {
    db.prepare("DELETE FROM auth").run();
    db.prepare(
      "INSERT INTO auth (access_token, expires_at, member_id, name) VALUES (?, ?, ?, ?)"
    ).run("simulated_token", Date.now() + 3600000, "simulated_id", "Demo User");
    res.json({ success: true });
  });

  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${process.env.APP_URL}/auth/callback`;

    try {
      const tokenResponse = await axios.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
          redirect_uri: redirectUri,
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const { access_token, expires_in } = tokenResponse.data;
      const expires_at = Date.now() + expires_in * 1000;

      // Get Profile Info
      const profileResponse = await axios.get("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const member_id = profileResponse.data.sub;
      const name = profileResponse.data.name;

      // Store in DB (simple one-user approach for now)
      db.prepare("DELETE FROM auth").run();
      db.prepare(
        "INSERT INTO auth (access_token, expires_at, member_id, name) VALUES (?, ?, ?, ?)"
      ).run(access_token, expires_at, member_id, name);

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("OAuth Error:", error.response?.data || error.message);
      res.status(500).send("Authentication failed");
    }
  });

  // --- API Routes ---
  app.get("/api/user", (req, res) => {
    const user = db.prepare("SELECT name, member_id FROM auth LIMIT 1").get();
    res.json(user || null);
  });

  app.get("/api/posts", (req, res) => {
    const posts = db.prepare("SELECT * FROM posts ORDER BY created_at DESC").all();
    res.json(posts);
  });

  app.post("/api/posts", (req, res) => {
    const { platform, prompt, content, image_url, scheduled_at } = req.body;
    const result = db.prepare(
      "INSERT INTO posts (platform, prompt, content, image_url, scheduled_at) VALUES (?, ?, ?, ?, ?)"
    ).run(platform || 'linkedin', prompt, content, image_url, scheduled_at);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/posts/:id", (req, res) => {
    db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Comments Endpoints
  app.get("/api/comments", (req, res) => {
    const comments = db.prepare("SELECT * FROM comments ORDER BY created_at DESC").all();
    res.json(comments);
  });

  app.post("/api/comments", (req, res) => {
    const { name, content } = req.body;
    const result = db.prepare(
      "INSERT INTO comments (name, content) VALUES (?, ?)"
    ).run(name || 'Anonymous', content);
    res.json({ id: result.lastInsertRowid });
  });

  // --- Background Job ---
  cron.schedule("* * * * *", async () => {
    const now = new Date().toISOString();
    const pendingPosts = db.prepare(
      "SELECT * FROM posts WHERE status = 'pending' AND scheduled_at <= ?"
    ).all(now) as any[];

    for (const post of pendingPosts) {
      try {
        if (post.platform === 'linkedin') {
          await postToLinkedIn(post);
        } else {
          // Simulate posting for other platforms
          console.log(`Simulating post to ${post.platform}: ${post.content}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        db.prepare("UPDATE posts SET status = 'posted' WHERE id = ?").run(post.id);
      } catch (error: any) {
        console.error(`Failed to post ${post.id}:`, error.message);
        db.prepare("UPDATE posts SET status = 'failed', error = ? WHERE id = ?").run(
          error.message,
          post.id
        );
      }
    }
  });

  async function postToLinkedIn(post: any) {
    const auth = db.prepare("SELECT * FROM auth LIMIT 1").get() as any;
    if (!auth) throw new Error("Not authenticated with LinkedIn");

    // Check token expiry (simplified, should refresh if possible)
    if (Date.now() > auth.expires_at) throw new Error("LinkedIn session expired. Please reconnect.");

    let mediaAsset = null;

    // If there's an image, upload it first
    if (post.image_url) {
      mediaAsset = await uploadImageToLinkedIn(auth.access_token, auth.member_id, post.image_url);
    }

    const postData: any = {
      author: `urn:li:person:${auth.member_id}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: post.content },
          shareMediaCategory: mediaAsset ? "IMAGE" : "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    if (mediaAsset) {
      postData.specificContent["com.linkedin.ugc.ShareContent"].media = [
        {
          status: "READY",
          description: { text: "AI Generated Image" },
          media: mediaAsset,
          title: { text: "Post Image" },
        },
      ];
    }

    await axios.post("https://api.linkedin.com/v2/ugcPosts", postData, {
      headers: {
        Authorization: `Bearer ${auth.access_token}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
  }

  async function uploadImageToLinkedIn(token: string, personId: string, base64Image: string) {
    // 1. Register Upload
    const registerResponse = await axios.post(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: `urn:li:person:${personId}`,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const uploadUrl = registerResponse.data.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
    const assetId = registerResponse.data.value.asset;

    // 2. Upload Binary
    const buffer = Buffer.from(base64Image.split(",")[1], "base64");
    await axios.post(uploadUrl, buffer, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "image/png",
      },
    });

    return assetId;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
