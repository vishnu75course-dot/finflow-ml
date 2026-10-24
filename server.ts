import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, ChildProcess } from "child_process";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from "./routes/auth.js";
import dataRoutes from "./routes/data.js";
import mlRoutes from "./routes/ml.js";
import supabase from "./config/supabaseClient.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function callAI(messages: any[], systemPrompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : (m.role === "system" ? "system" : "user"),
      content: String(m.content || m.text || "")
    }))
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: formattedMessages as any,
    max_tokens: 600,
    temperature: 0.7,
  });
  return response.choices[0]?.message?.content || "";
}

function generateSmartFinancialResponse(
  userMessage: string,
  user: any,
  transactions: any[],
  budgets: any[],
  goals: any[]
): string {
  const msg = (userMessage || "").toLowerCase().trim();
  const currency = user?.user_metadata?.currency || user?.currency || "₹";
  const name = user?.user_metadata?.name || user?.name || "there";
  const income = Number(user?.user_metadata?.monthly_income || user?.monthlyIncome || 0);

  const expenses = (transactions || []).filter((t: any) => t.type === 'expense');
  const totalExpense = expenses.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  const categoryTotals: Record<string, number> = {};
  for (const t of expenses) {
    const cat = t.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount || 0);
  }
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0];

  // 1. Greetings
  if (/^(hi|hii|hello|hey|greetings|good\s*(morning|afternoon|evening)|yo)\b/i.test(msg) || msg === "hii" || msg === "hi") {
    let greeting = `Hello ${name}! 👋 I'm your FinFlow AI Financial Advisor.\n\n`;
    if (expenses.length > 0) {
      greeting += `I've analyzed your ${expenses.length} expense transactions. Total spending tracked is **${currency}${totalExpense.toLocaleString()}**`;
      if (topCategory) {
        greeting += `, with **${topCategory[0]}** being your highest spending category (**${currency}${topCategory[1].toLocaleString()}**).\n\n`;
      } else {
        greeting += `.\n\n`;
      }
    } else {
      greeting += `I'm actively monitoring your financial telemetry and ready to help you optimize budgets and grow savings.\n\n`;
    }
    greeting += `What would you like to explore today? You can ask:\n• *"Where did I spend the most money?"*\n• *"How can I save more this month?"*\n• *"Check my budget status"*\n• *"Summarize my overall financial health"*`;
    return greeting;
  }

  // 2. Spending breakdown / Where did I spend the most
  if (/spend|spent|expense|cost|where.*money|highest.*spend/i.test(msg)) {
    if (expenses.length === 0) {
      return `You don't have any recorded expense transactions yet. Once you log your expenses, I will break down your spending trends and identify high-cost areas!`;
    }
    let res = `### 📊 Your Spending Breakdown\n`;
    res += `• **Total Expenses**: ${currency}${totalExpense.toLocaleString()}\n`;
    if (topCategory) {
      const pct = totalExpense > 0 ? ((topCategory[1] / totalExpense) * 100).toFixed(1) : "0";
      res += `• **Highest Category**: **${topCategory[0]}** at ${currency}${topCategory[1].toLocaleString()} (${pct}% of total expenses)\n\n`;
    }
    if (sortedCategories.length > 1) {
      res += `**Top Spending Categories:**\n`;
      sortedCategories.slice(0, 4).forEach(([cat, amt]) => {
        const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : "0";
        res += `- **${cat}**: ${currency}${amt.toLocaleString()} (${pct}%)\n`;
      });
    }
    if (topCategory && topCategory[1] > 2000) {
      res += `\n💡 **Optimization Tip**: Trimming just 15% from **${topCategory[0]}** could save you approximately **${currency}${Math.round(topCategory[1] * 0.15).toLocaleString()}** this month!`;
    }
    return res;
  }

  // 3. Savings / How to save / Income
  if (/save|saving|income|salary|earn|invest/i.test(msg)) {
    const savings = income > 0 ? Math.max(0, income - totalExpense) : 0;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : null;

    let res = `### 💰 Savings & Income Analysis\n`;
    if (income > 0) {
      res += `• **Monthly Income**: ${currency}${income.toLocaleString()}\n`;
      res += `• **Total Expenses**: ${currency}${totalExpense.toLocaleString()}\n`;
      res += `• **Estimated Savings**: ${currency}${savings.toLocaleString()} (${savingsRate}% savings rate)\n\n`;

      if (Number(savingsRate) >= 20) {
        res += `🎉 **Great Job!** Your savings rate of ${savingsRate}% meets the healthy benchmark from the 50/30/20 financial rule.`;
      } else {
        res += `⚠️ **Recommendation**: Aiming for a 20% savings target (${currency}${Math.round(income * 0.2).toLocaleString()}) will build your financial security faster.`;
      }
    } else {
      res += `• **Total Expenses Tracked**: ${currency}${totalExpense.toLocaleString()}\n\n`;
      res += `Tip: Configure your monthly income in Settings to get full savings rate calculations!`;
    }

    if (topCategory) {
      res += `\n\n📌 **Quick Win**: Focus on reducing discretionary spend in **${topCategory[0]}** to unlock immediate savings.`;
    }
    return res;
  }

  // 4. Budgets
  if (/budget|limit|overspend|target/i.test(msg)) {
    if (!budgets || budgets.length === 0) {
      return `You haven't set up any active category budgets yet. Creating budgets in the **Budgets** tab will allow me to track your limits and alert you before you overspend!`;
    }
    let res = `### 🎯 Budget Health Check\n`;
    let overBudgetCount = 0;
    budgets.forEach((b: any) => {
      const spent = categoryTotals[b.category] || 0;
      const limit = Number(b.amount || b.limit || 0);
      const isOver = spent > limit;
      if (isOver) overBudgetCount++;
      const statusIcon = isOver ? "🔴" : (spent / (limit || 1) > 0.8 ? "🟡" : "🟢");
      res += `${statusIcon} **${b.category}**: ${currency}${spent.toLocaleString()} / ${currency}${limit.toLocaleString()} (${limit > 0 ? Math.round((spent/limit)*100) : 0}%)\n`;
    });
    if (overBudgetCount > 0) {
      res += `\n⚠️ You have **${overBudgetCount} category budget(s)** currently exceeded. Consider adjusting discretionary spending.`;
    } else {
      res += `\n✅ All monitored budgets are currently within safe spending limits!`;
    }
    return res;
  }

  // 5. Goals
  if (/goal|milestone/i.test(msg)) {
    if (!goals || goals.length === 0) {
      return `You don't have any financial goals configured yet. Head to the **Goals** section to define targets (e.g., Emergency Fund, Vacation, Investments) so I can help monitor your milestones!`;
    }
    let res = `### 🏆 Financial Goals Status\n`;
    goals.forEach((g: any) => {
      const current = Number(g.current_amount || g.currentAmount || 0);
      const target = Number(g.target_amount || g.targetAmount || 1);
      const pct = Math.min(100, Math.round((current / target) * 100));
      res += `• **${g.title || g.name}**: ${currency}${current.toLocaleString()} / ${currency}${target.toLocaleString()} (**${pct}%** completed)\n`;
    });
    return res;
  }

  // 6. General Fallback
  let fallback = `Based on your FinFlow records:\n`;
  fallback += `• Tracked Expenses: **${currency}${totalExpense.toLocaleString()}** across ${expenses.length} transaction(s).\n`;
  if (topCategory) {
    fallback += `• Main Expense Sector: **${topCategory[0]}** (${currency}${topCategory[1].toLocaleString()}).\n`;
  }
  if (income > 0) {
    fallback += `• Monthly Income: **${currency}${income.toLocaleString()}**.\n`;
  }
  fallback += `\nFeel free to ask for tips on budgeting, saving strategies, or category expense breakdowns!`;
  return fallback;
}

function generateSmartFinancialInsights(
  transactions: any[],
  budgets: any[],
  user: any
): any[] {
  const currency = user?.user_metadata?.currency || user?.currency || "₹";
  const expenses = (transactions || []).filter((t: any) => t.type === 'expense');

  const categoryTotals: Record<string, number> = {};
  for (const t of expenses) {
    const cat = t.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount || 0);
  }
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0];

  const insights: any[] = [];

  if (topCategory) {
    const saveAmt = Math.round(topCategory[1] * 0.2);
    insights.push({
      id: "insight-1",
      type: "opportunity",
      message: `You could save an estimated ${currency}${saveAmt.toLocaleString()} this month by reducing ${topCategory[0].toLowerCase()} by 20%.`,
      category: topCategory[0]
    });
  } else {
    insights.push({
      id: "insight-1",
      type: "opportunity",
      message: `You could save an estimated ${currency}2,400 this month by reducing dining out by 20%.`,
      category: "Dining Out"
    });
  }

  // Check if any budget is exceeded
  let budgetWarning: any = null;
  if (budgets && budgets.length > 0) {
    for (const b of budgets) {
      const spent = categoryTotals[b.category] || 0;
      const limit = Number(b.amount || b.limit || 0);
      if (limit > 0 && spent > limit) {
        budgetWarning = {
          id: "insight-2",
          type: "warning",
          message: `Budget Alert: ${b.category} spending (${currency}${spent.toLocaleString()}) has exceeded your limit of ${currency}${limit.toLocaleString()}.`,
          category: b.category
        };
        break;
      }
    }
  }

  if (budgetWarning) {
    insights.push(budgetWarning);
  } else if (sortedCategories.length > 1) {
    const second = sortedCategories[1];
    insights.push({
      id: "insight-2",
      type: "warning",
      message: `You spent ${currency}${second[1].toLocaleString()} on ${second[0]} this cycle. Keep an eye on non-essential purchases.`,
      category: second[0]
    });
  } else {
    insights.push({
      id: "insight-2",
      type: "warning",
      message: `Weekend spending is typically 15% higher than weekdays across top discretionary categories.`,
      category: "General"
    });
  }

  insights.push({
    id: "insight-3",
    type: "tip",
    message: `Automate 20% of your earnings straight into savings on payday following the 50/30/20 wealth rule.`,
    category: "Savings"
  });

  return insights;
}

// ── Auto-start Python ML service ──────────────────────────────────────────
function startMLService(): ChildProcess | null {
  const ML_PORT = process.env.ML_PORT || "5001";
  const mlServicePath = path.join(__dirname, "ml_service", "app.py");

  console.log("[ML Service] Starting Python ML service on port", ML_PORT, "...");

  const mlProcess = spawn("python", [mlServicePath], {
    env: { ...process.env, ML_PORT },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  mlProcess.stdout?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[ML Service] ${msg}`);
  });

  mlProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    // Flask logs to stderr — forward everything except debug noise
    if (msg) console.log(`[ML Service] ${msg}`);
  });

  mlProcess.on("error", (err) => {
    console.error("[ML Service] Failed to start — is Python installed?", err.message);
  });

  mlProcess.on("close", (code) => {
    if (code !== null && code !== 0) {
      console.warn(`[ML Service] Exited with code ${code}. ML features will be unavailable.`);
    }
  });

  // Gracefully kill the ML service when the main Node process exits
  const killML = () => { try { mlProcess.kill(); } catch { } };
  process.on("exit", killML);
  process.on("SIGINT", () => { killML(); process.exit(0); });
  process.on("SIGTERM", () => { killML(); process.exit(0); });

  return mlProcess;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Spawn the Python ML service in the background
  startMLService();

  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/data', dataRoutes);
  app.use('/api/ml', mlRoutes);

  // --- SMART EXPENSE PREDICTION (auto-fetches user transactions → Python ML) ---
  app.post("/api/ml/smart-predict", async (req, res) => {
    try {
      let transactions = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
      let monthlyIncome = Number(req.body?.monthly_income || 0);

      // If transactions not sent from client state, try fetching from Supabase with token
      if (transactions.length === 0) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '');
          if (!token.startsWith('mock-jwt-')) {
            try {
              const { data: { user }, error: authError } = await supabase.auth.getUser(token);
              if (user && !authError) {
                const [txRes, profileRes] = await Promise.all([
                  supabase
                    .from('transactions')
                    .select('amount, category, type, date, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true }),
                  supabase
                    .from('users')
                    .select('monthly_income')
                    .eq('id', user.id)
                    .maybeSingle(),
                ]);
                transactions = txRes.data || [];
                if (!monthlyIncome) {
                  monthlyIncome = Number((profileRes.data as any)?.monthly_income || user.user_metadata?.monthly_income || 0);
                }
              }
            } catch (authErr) {
              console.warn("Supabase auth check failed in smart-predict, proceeding with body data:", authErr);
            }
          }
        }
      }

      if (transactions.length === 0) {
        return res.status(422).json({
          status: "error",
          message: "No transactions found. Please add income and expense entries on the website or load sample data.",
        });
      }

      // Proxy to Python ML service
      const http = await import("http");
      const payload = JSON.stringify({ transactions, monthly_income: monthlyIncome });
      const options = {
        hostname: "127.0.0.1",
        port: 5001,
        path: "/ml/predict-next-month",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };

      const proxyReq = http.default.request(options, (proxyRes) => {
        let data = "";
        proxyRes.on("data", (chunk) => (data += chunk));
        proxyRes.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            res.status(proxyRes.statusCode || 200).json(parsed);
          } catch {
            res.status(500).json({ status: "error", message: "Invalid response from ML service" });
          }
        });
      });
      proxyReq.on("error", (err: any) => {
        if (err.code === "ECONNREFUSED") {
          res.status(503).json({ status: "error", message: "ML service is starting up. Please try again in a moment." });
        } else {
          res.status(500).json({ status: "error", message: `ML service error: ${err.message}` });
        }
      });
      proxyReq.write(payload);
      proxyReq.end();
    } catch (error: any) {
      console.error("Smart predict error:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // --- AI CHAT ENDPOINT ---
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, history, transactions: clientTx, budgets: clientBg, goals: clientGoals, user: clientUser } = req.body;
      const authHeader = req.headers.authorization;

      console.log('Chat request:', { message, hasAuth: !!authHeader });

      let user: any = clientUser || null;

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        if (token.startsWith('mock-jwt-') || token === 'demo-token') {
          user = clientUser || {
            id: 'mock-user',
            email: token.includes('google') ? 'google.user@finflow.app' : 'user@finflow.app',
            user_metadata: {
              name: clientUser?.name || 'FinFlow User',
              monthly_income: clientUser?.monthlyIncome || 50000,
              currency: clientUser?.currency || '₹'
            }
          };
        } else {
          try {
            const { data, error: authError } = await supabase.auth.getUser(token);
            if (!authError && data?.user) {
              user = data.user;
            }
          } catch (supabaseErr: any) {
            console.warn('[AI Chat] Supabase auth check failed (network/offline), using client user session:', supabaseErr?.message);
          }
        }
      }

      if (!user) {
        user = clientUser || {
          id: 'user-default',
          email: 'user@finflow.app',
          user_metadata: {
            name: clientUser?.name || 'User',
            monthly_income: clientUser?.monthlyIncome || 50000,
            currency: clientUser?.currency || '₹'
          }
        };
      }

      // Fetch user's financial data from Supabase if reachable
      let transactions: any[] = Array.isArray(clientTx) && clientTx.length > 0 ? clientTx : [];
      let budgets: any[] = Array.isArray(clientBg) && clientBg.length > 0 ? clientBg : [];
      let goals: any[] = Array.isArray(clientGoals) && clientGoals.length > 0 ? clientGoals : [];

      if (user.id && user.id !== 'mock-user' && user.id !== 'user-default') {
        try {
          const [txRes, bgRes, goalsRes] = await Promise.all([
            supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
            supabase.from('budgets').select('*').eq('user_id', user.id),
            supabase.from('goals').select('*').eq('user_id', user.id)
          ]);
          if (txRes.data && txRes.data.length > 0) transactions = txRes.data;
          if (bgRes.data && bgRes.data.length > 0) budgets = bgRes.data;
          if (goalsRes.data && goalsRes.data.length > 0) goals = goalsRes.data;
        } catch (dbErr: any) {
          console.warn('[AI Chat] Supabase DB fetch failed (offline/mock), using client data:', dbErr?.message);
        }
      }

      // Build financial summary for GPT
      const expensesByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc: Record<string, number>, t: any) => {
          acc[t.category] = (acc[t.category] || 0) + Number(t.amount || 0);
          return acc;
        }, {} as Record<string, number>);

      const totalExpenses = Object.values(expensesByCategory).reduce((a: number, b: number) => a + b, 0);
      const topCategory = (Object.entries(expensesByCategory) as [string, number][]).sort((a, b) => b[1] - a[1])[0];

      const currency = user?.user_metadata?.currency || user?.currency || '₹';
      const monthlyIncome = user?.user_metadata?.monthly_income || user?.monthlyIncome || 0;

      const summary = `
User: ${user.user_metadata?.name || user.name || user.email}
Monthly Income: ${monthlyIncome} ${currency}
Total Expenses (recent): ${totalExpenses}
Top Spending Category: ${topCategory?.[0]} (${topCategory?.[1]})
All Categories: ${JSON.stringify(expensesByCategory)}
Budgets: ${JSON.stringify(budgets)}
Goals: ${JSON.stringify(goals)}
Recent Transactions: ${JSON.stringify(transactions.slice(0, 10))}
      `.trim();

      const systemPrompt = `You are FinFlow Oracle, a professional AI financial advisor. 
      You have access to the user's financial data. Answer concisely and professionally.
      Use currency symbols (${currency}) and reference specific numbers from their data.
      
      User Financial Data:
      ${summary}`;

      const messages = [
        ...(Array.isArray(history) ? history.map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })) : []),
        { role: "user", content: message }
      ];

      let reply = "";
      try {
        reply = await callAI(messages, systemPrompt);
      } catch (aiError: any) {
        console.warn('[AI Chat] OpenAI API call failed, generating smart financial response:', aiError?.message);
        reply = generateSmartFinancialResponse(message, user, transactions, budgets, goals);
      }

      if (!reply || !reply.trim()) {
        reply = generateSmartFinancialResponse(message, user, transactions, budgets, goals);
      }

      res.json({ status: "success", reply });
    } catch (error: any) {
      console.error('Chat error:', error);
      const fallbackReply = generateSmartFinancialResponse(
        req.body?.message || "",
        req.body?.user,
        req.body?.transactions || [],
        req.body?.budgets || [],
        req.body?.goals || []
      );
      res.json({ status: "success", reply: fallbackReply });
    }
  });

  // --- AI INSIGHTS ENDPOINT ---
  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { transactions: clientTx, budgets: clientBg, user: clientUser } = req.body || {};
      const authHeader = req.headers.authorization;

      let user: any = clientUser || null;

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        if (token.startsWith('mock-jwt-') || token === 'demo-token') {
          user = clientUser || {
            id: 'mock-user',
            user_metadata: { name: 'User', monthly_income: 50000, currency: '₹' }
          };
        } else {
          try {
            const { data, error: authError } = await supabase.auth.getUser(token);
            if (!authError && data?.user) user = data.user;
          } catch {
            // ignore network error
          }
        }
      }

      let transactions: any[] = Array.isArray(clientTx) && clientTx.length > 0 ? clientTx : [];
      let budgets: any[] = Array.isArray(clientBg) && clientBg.length > 0 ? clientBg : [];

      if (user?.id && user.id !== 'mock-user') {
        try {
          const [txRes, bgRes] = await Promise.all([
            supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
            supabase.from('budgets').select('*').eq('user_id', user.id)
          ]);
          if (txRes.data && txRes.data.length > 0) transactions = txRes.data;
          if (bgRes.data && bgRes.data.length > 0) budgets = bgRes.data;
        } catch {
          // ignore
        }
      }

      const systemPrompt = `Generate 3 short, actionable financial insights as JSON array: 
      [{"type": "tip" | "warning", "message": "string", "category": "string"}]
      Use the user's actual transaction data. Be specific with numbers.`;

      const messages = [
        { role: "user", content: `Transactions: ${JSON.stringify(transactions.slice(0, 20))}\nBudgets: ${JSON.stringify(budgets)}` }
      ];

      let insights: any[] = [];
      try {
        const reply = await callAI(messages, systemPrompt);
        const parsed = JSON.parse(reply.trim());
        if (Array.isArray(parsed)) insights = parsed;
        else if (parsed && Array.isArray(parsed.insights)) insights = parsed.insights;
      } catch {
        // Fallback to deterministic financial insights
        insights = generateSmartFinancialInsights(transactions, budgets, user);
      }

      if (!insights || insights.length === 0) {
        insights = generateSmartFinancialInsights(transactions, budgets, user);
      }

      res.json(insights);
    } catch (error) {
      console.error('Insights error:', error);
      res.json(generateSmartFinancialInsights(req.body?.transactions || [], req.body?.budgets || [], req.body?.user));
    }
  });

  // --- NLP PARSE ENDPOINT (Transactions & Reminders) ---
  app.post("/api/ai/nlp-parse", async (req, res) => {
    try {
      const { text, targetType } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ status: "error", message: "Text input is required" });
      }

      // Check authentication
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ status: "error", message: "Authentication required" });
      }

      // OpenAI-powered extraction if configured
      if (process.env.OPENAI_API_KEY) {
        try {
          const todayStr = new Date().toISOString().split("T")[0];
          let systemPrompt = "";
          if (targetType === "transaction") {
            systemPrompt = `You are a financial NLP extractor. Extract structured fields from the user input into JSON:
{
  "amount": number or null,
  "type": "income" | "expense" | null,
  "category": "Food" | "Travel" | "Entertainment" | "Shopping" | "Utilities" | "Salary" | "Investment" | "Others",
  "date": "YYYY-MM-DD" (today is ${todayStr}),
  "paymentMethod": "UPI" | "Cash" | "Credit Card" | "Debit Card" | "Net Banking" | null,
  "title": string,
  "confidence": number between 0 and 1
}
Only output valid JSON.`;
          } else if (targetType === "reminder") {
            systemPrompt = `You are a financial reminder NLP extractor. Extract structured fields from the user input into JSON:
{
  "title": string,
  "amount": number or null,
  "category": "Utilities" | "Housing" | "Internet" | "Subscriptions" | "Credit Card" | "Others",
  "dueDate": "YYYY-MM-DD" (today is ${todayStr}),
  "time": "HH:MM" or null,
  "recurrence": "none" | "daily" | "weekly" | "monthly" | "yearly",
  "isAmbiguous": boolean,
  "confidence": number between 0 and 1
}
Only output valid JSON.`;
          } else if (targetType === "goal") {
            systemPrompt = `You are a financial goal NLP extractor. Extract structured fields from the user input into JSON:
{
  "title": string,
  "target": number or null,
  "current": number,
  "deadline": string or null,
  "isAmbiguous": boolean,
  "confidence": number between 0 and 1
}
Only output valid JSON.`;
          } else {
            systemPrompt = `You are a financial budget NLP extractor. Extract structured fields from the user input into JSON:
{
  "category": "Food" | "Travel" | "Entertainment" | "Shopping" | "Utilities" | "Salary" | "Investment" | "Others",
  "limit": number or null,
  "period": string,
  "action": "create" | "update" | "set",
  "isTotalBudget": boolean,
  "isAmbiguous": boolean,
  "confidence": number between 0 and 1
}
Only output valid JSON.`;
          }

          const aiReply = await callAI([{ role: "user", content: text }], systemPrompt);
          const parsed = JSON.parse(aiReply.replace(/```json\n?|```/g, "").trim());
          return res.json({ status: "success", data: parsed, source: "ai" });
        } catch (aiErr: any) {
          console.warn("[NLP Parse] OpenAI extraction fallback:", aiErr.message);
        }
      }

      return res.json({
        status: "success",
        data: null,
        source: "deterministic",
        message: "Using deterministic parsing engine"
      });
    } catch (err: any) {
      console.error("NLP parse route error:", err);
      res.status(500).json({ status: "error", message: "Failed to parse text" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();