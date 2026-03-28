import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Telegraf, Markup } from "telegraf";
import sqlite3 from "sqlite3";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_HOST = process.env.APP_URL; // AI Studio injects APP_URL
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "@dilmurodbekmatematika";
const ADMIN_ID = process.env.ADMIN_ID ? Number(process.env.ADMIN_ID) : undefined;

const app = express();
const PORT = 3000;

// ================= DATABASE =================
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Failed to open database:", err.message);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      hdp INTEGER DEFAULT 0,
      omon INTEGER DEFAULT 0
    )
  `);
});

// ================= BOT SETUP =================
let bot: Telegraf | null = null;

if (BOT_TOKEN) {
  bot = new Telegraf(BOT_TOKEN);

  // Helpers
  async function checkSubscription(ctx: any) {
    try {
      const member = await ctx.telegram.getChatMember(
        CHANNEL_USERNAME,
        ctx.from.id
      );

      return (
        member.status === "member" ||
        member.status === "creator" ||
        member.status === "administrator"
      );
    } catch (err: any) {
      console.error("Subscription check error:", err.message);
      return false;
    }
  }

  function subscriptionKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.url("Obuna bo'lish", `https://t.me/${CHANNEL_USERNAME.replace(/^@/, "")}`),
      ],
      [Markup.button.callback("Tekshirish", "check_sub")],
    ]);
  }

  function mainMenuKeyboard() {
    return Markup.keyboard(["HDP LC", "Omon School"]).resize().oneTime(false);
  }

  // Handlers
  bot.start(async (ctx) => {
    const userId = ctx.from.id;

    db.run(`INSERT OR IGNORE INTO users (user_id) VALUES (?)`, [userId], (err) => {
      if (err) console.error("DB Insert error:", err.message);
    });

    const subscribed = await checkSubscription(ctx);

    if (!subscribed) {
      return ctx.reply("Botdan foydalanish uchun kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    return ctx.reply("Ish joyini tanlang:", mainMenuKeyboard());
  });

  bot.action("check_sub", async (ctx) => {
    const subscribed = await checkSubscription(ctx);

    if (!subscribed) {
      return ctx.answerCbQuery("Siz hali obuna bo‘lmagansiz!", { show_alert: true });
    }

    await ctx.deleteMessage().catch(() => {});
    return ctx.reply("Ish joyini tanlang:", mainMenuKeyboard());
  });

  bot.hears("HDP LC", async (ctx) => {
    const subscribed = await checkSubscription(ctx);
    if (!subscribed) {
      return ctx.reply("Avval kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    db.run(`UPDATE users SET hdp = hdp + 1 WHERE user_id = ?`, [ctx.from.id], (err) => {
      if (err) console.error("HDP update error:", err.message);
    });

    return ctx.reply("HDP LC uchun forma:", Markup.inlineKeyboard([
      [Markup.button.url("Formani ochish", "https://forms.gle/f6ZiQtiqCAH1CLy87")],
    ]));
  });

  bot.hears("Omon School", async (ctx) => {
    const subscribed = await checkSubscription(ctx);
    if (!subscribed) {
      return ctx.reply("Avval kanalga obuna bo‘ling:", subscriptionKeyboard());
    }

    db.run(`UPDATE users SET omon = omon + 1 WHERE user_id = ?`, [ctx.from.id], (err) => {
      if (err) console.error("Omon update error:", err.message);
    });

    return ctx.reply("Omon School uchun forma:", Markup.inlineKeyboard([
      [Markup.button.url("Formani ochish", "https://forms.gle/97m9hCsBFovYKKrX7")],
    ]));
  });

  bot.command("admin", async (ctx) => {
    if (!ADMIN_ID || ctx.from.id !== ADMIN_ID) return;

    db.get(`SELECT COUNT(*) as total FROM users`, (err, usersRow: any) => {
      if (err) return console.error(err.message);

      db.get(`SELECT SUM(hdp) as total_hdp, SUM(omon) as total_omon FROM users`, (err2, clicksRow: any) => {
        if (err2) return console.error(err2.message);

        ctx.reply(`📊 Statistika:\n\n👥 Foydalanuvchilar: ${usersRow.total || 0}\n\n🔹 HDP LC bosilgan: ${clicksRow.total_hdp || 0}\n🔹 Omon School bosilgan: ${clicksRow.total_omon || 0}`);
      });
    });
  });

  // Mount webhook
  app.use(bot.webhookCallback('/webhook'));
}

// ================= EXPRESS SETUP =================
async function startServer() {
  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", botConfigured: !!BOT_TOKEN });
  });

  app.get("/api/stats", (req, res) => {
    db.get(`SELECT COUNT(*) as total FROM users`, (err, usersRow: any) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get(`SELECT SUM(hdp) as total_hdp, SUM(omon) as total_omon FROM users`, (err2, clicksRow: any) => {
        if (err2) return res.status(500).json({ error: err2.message });

        res.json({
          users: usersRow.total || 0,
          hdpClicks: clicksRow.total_hdp || 0,
          omonClicks: clicksRow.total_omon || 0
        });
      });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    if (bot && WEBHOOK_HOST) {
      try {
        await bot.telegram.setWebhook(`${WEBHOOK_HOST.replace(/\/$/, "")}/webhook`);
        console.log(`Webhook set to ${WEBHOOK_HOST}/webhook`);
      } catch (err: any) {
        console.error("Failed to set webhook:", err.message);
      }
    } else if (bot) {
      console.log("Starting bot with long polling...");
      bot.launch();
    } else {
      console.log("BOT_TOKEN not provided, bot is not running.");
    }
  });
}

startServer();
