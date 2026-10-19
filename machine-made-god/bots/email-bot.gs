/**
 * MACHINE MADE GOD — email bot (Google Apps Script, free, runs inside Gmail).
 *
 * What it does every 10 minutes:
 *   - fan mail / simple questions  → replies in character, signed as an automated assistant
 *   - business / press / complaints → writes a DRAFT reply for you, labels "MMG/Needs you", stars it
 *   - spam / newsletters            → labels only (nothing is ever deleted)
 *
 * Setup (once, ~5 minutes):
 *   1. Sign in to the site's Gmail account, open https://script.google.com → New project.
 *   2. Delete the sample code, paste this whole file, Save.
 *   3. Project Settings (gear) → Script Properties → add GEMINI_API_KEY (and optionally GROQ_API_KEY
 *      as a backup, and SITE_URL with your site's address).
 *   4. Back in the editor, choose the function "setup" and press Run. Approve the permissions
 *      (Google warns it's unverified because you wrote it — Advanced → Go to project).
 *   Done. To stop it: run "stop".
 */

var CONFIG = {
  maxPerRun: 10,
  maxRepliesPerDay: 40,
  lookbackDays: 3,
  signature: "\n\n— The Machine\nAutomated assistant for Machine Made God. A human reads anything important.",
};

var LABELS = { seen: "MMG/Seen", answered: "MMG/Answered", needsYou: "MMG/Needs you", spam: "MMG/Spam or newsletter" };

function setup() {
  Object.keys(LABELS).forEach(function (k) { getLabel_(LABELS[k]); });
  stop();
  ScriptApp.newTrigger("run").timeBased().everyMinutes(10).create();
  Logger.log("Email bot is running every 10 minutes.");
  run();
}

function stop() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "run") ScriptApp.deleteTrigger(t);
  });
}

function run() {
  var props = PropertiesService.getScriptProperties();
  var today = new Date().toISOString().slice(0, 10);
  var sentToday = props.getProperty("sent_" + today) ? Number(props.getProperty("sent_" + today)) : 0;
  var me = Session.getActiveUser().getEmail().toLowerCase();
  var threads = GmailApp.search("in:inbox is:unread -label:" + quote_(LABELS.seen) + " newer_than:" + CONFIG.lookbackDays + "d", 0, CONFIG.maxPerRun);

  threads.forEach(function (thread) {
    var messages = thread.getMessages();
    var last = messages[messages.length - 1];
    var from = String(last.getFrom());
    var fromEmail = (from.match(/<([^>]+)>/) || [null, from])[1].toLowerCase().trim();
    thread.addLabel(getLabel_(LABELS.seen));

    if (fromEmail === me) return;
    if (isAutomated_(last, fromEmail)) {
      thread.addLabel(getLabel_(LABELS.spam));
      return;
    }

    var decision;
    try {
      decision = decide_(props, from, last.getSubject(), last.getPlainBody().slice(0, 4000));
    } catch (err) {
      Logger.log("AI unavailable, leaving for a human: " + err);
      thread.addLabel(getLabel_(LABELS.needsYou));
      return;
    }

    var cat = decision.category;
    if (cat === "spam" || cat === "newsletter") {
      thread.addLabel(getLabel_(LABELS.spam));
      return;
    }
    if (cat === "business" || cat === "press" || cat === "complaint" || cat === "legal" || !decision.reply) {
      thread.createDraftReply((decision.reply || "") + CONFIG.signature);
      thread.addLabel(getLabel_(LABELS.needsYou));
      last.star();
      thread.markImportant();
      return; // stays unread so you notice it
    }
    if (sentToday >= CONFIG.maxRepliesPerDay) {
      thread.createDraftReply(decision.reply + CONFIG.signature);
      thread.addLabel(getLabel_(LABELS.needsYou));
      return;
    }
    thread.reply(decision.reply + CONFIG.signature);
    sentToday++;
    thread.addLabel(getLabel_(LABELS.answered));
    thread.markRead();
  });

  props.setProperty("sent_" + today, String(sentToday));
}

// ---------- AI ----------

function decide_(props, from, subject, body) {
  var site = props.getProperty("SITE_URL") || "our website";
  var prompt =
    "You answer email for MACHINE MADE GOD, an openly AI-written satirical media site (" + site + "). " +
    "Everything on the site is satire and fiction.\n\n" +
    "Classify the email and draft a reply.\n" +
    "Categories: fan (compliments, jokes, feedback), question (simple questions about the site), business (ads, sponsorships, partnerships, merch orders/problems, money, hiring, licensing), " +
    "press (journalists, interviews), complaint (someone upset, offended, or saying they were misrepresented), legal (lawyers, takedowns, copyright), spam, newsletter, other.\n\n" +
    "Reply rules: warm, short (under 120 words), lightly funny in a dry deadpan way, never mean. You are an automated assistant and never claim to be human. " +
    "Never promise money, deals, dates, refunds, or anything on the business's behalf; for business/press/complaint/legal, write a polite holding reply saying a human will follow up. " +
    "Never share personal information. Never invent facts. No links except " + site + ".\n\n" +
    "From: " + from + "\nSubject: " + subject + "\n\n" + body + "\n\n" +
    'Return ONLY JSON: {"category": "...", "reply": "the reply text without a signature"}';

  var providers = [
    { key: props.getProperty("GEMINI_API_KEY"), url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-flash-latest" },
    { key: props.getProperty("GROQ_API_KEY"), url: "https://api.groq.com/openai/v1/chat/completions", model: "openai/gpt-oss-120b" },
  ].filter(function (p) { return p.key; });
  if (!providers.length) throw new Error("Add GEMINI_API_KEY in Project Settings → Script Properties.");

  var lastErr;
  for (var i = 0; i < providers.length; i++) {
    var p = providers[i];
    try {
      var res = UrlFetchApp.fetch(p.url, {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + p.key },
        payload: JSON.stringify({ model: p.model, max_tokens: 4000, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
        muteHttpExceptions: true,
      });
      if (res.getResponseCode() !== 200) throw new Error("HTTP " + res.getResponseCode() + " " + res.getContentText().slice(0, 200));
      var text = JSON.parse(res.getContentText()).choices[0].message.content;
      var json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      var allowed = ["fan", "question", "business", "press", "complaint", "legal", "spam", "newsletter", "other"];
      var category = allowed.indexOf(String(json.category)) >= 0 ? String(json.category) : "business";
      return { category: category, reply: String(json.reply || "").trim().slice(0, 1500) };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// ---------- helpers ----------

function isAutomated_(message, fromEmail) {
  if (/no-?reply|mailer-daemon|notifications?@|bounce|postmaster/i.test(fromEmail)) return true;
  var raw = message.getHeader("List-Unsubscribe") || message.getHeader("Precedence") || message.getHeader("Auto-Submitted");
  return Boolean(raw && !/^no$/i.test(raw));
}

function getLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function quote_(label) {
  return '"' + label.replace(/"/g, "") + '"';
}
