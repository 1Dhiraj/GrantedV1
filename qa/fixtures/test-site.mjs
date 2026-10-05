#!/usr/bin/env node
// A local site for browser capability tasks.
//
// Public pages drift: a search result moves, a CSV changes length, a form starts
// refusing robots, and the score measures the internet instead of the agent.
// This serves fixed pages on loopback and records what the browser actually did,
// so a claim ("I submitted the form") is checked against the server's own log
// rather than the agent's summary.
//
//   node qa/fixtures/test-site.mjs --port 8099 --state <file>
import fs from "node:fs";
import http from "node:http";

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const port = Number(readArg("port", "8099"));
const statePath = readArg("state", "");

// The CSV row count is the answer to one task, so it lives in one place.
const CSV_ROWS = [
  ["region", "units", "revenue"],
  ["north", "12", "1200"],
  ["south", "7", "640"],
  ["east", "19", "2310"],
  ["west", "4", "380"],
  ["central", "23", "2875"],
  ["northeast", "9", "910"],
];
const DATA_ROW_COUNT = CSV_ROWS.length - 1;

// One sentence the agent must actually read off the page to quote.
const ARTICLE_SENTENCE =
  "Every claim in this report was verified against the recorded server log, not the assistant's summary.";

const submissions = [];

function recordState() {
  if (!statePath) {
    return;
  }
  fs.writeFileSync(statePath, JSON.stringify({ submissions }, null, 2), "utf8");
}

function html(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Granted Test Site</title></head><body>${body}</body></html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      html(`<h1>Granted Test Site</h1>
        <ul>
          <li><a href="/article">Field report</a></li>
          <li><a href="/data.csv" download>Quarterly data (CSV)</a></li>
          <li><a href="/signup">Signup form</a></li>
        </ul>`),
    );
    return;
  }

  if (url.pathname === "/article") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      html(`<h1>Field report</h1>
        <p>The run began at dawn and the operators recorded each step by hand.</p>
        <p>${ARTICLE_SENTENCE}</p>
        <p>Later sections cover scheduling, retries and the cost of each attempt.</p>`),
    );
    return;
  }

  if (url.pathname === "/data.csv") {
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="quarterly.csv"',
    });
    res.end(`${CSV_ROWS.map((row) => row.join(",")).join("\n")}\n`);
    return;
  }

  if (url.pathname === "/signup" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      html(`<h1>Signup</h1>
        <form method="POST" action="/signup">
          <label>Name <input name="name" id="name" type="text"></label><br>
          <label>Email <input name="email" id="email" type="email"></label><br>
          <button type="submit" id="submit">Sign up</button>
        </form>`),
    );
    return;
  }

  if (url.pathname === "/signup" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += String(chunk);
    });
    req.on("end", () => {
      const fields = Object.fromEntries(new URLSearchParams(body));
      // A code the agent can only know by reading the page it landed on.
      const code = `GR-${(submissions.length + 1).toString().padStart(4, "0")}`;
      submissions.push({ ...fields, code, at: new Date().toISOString() });
      recordState();
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        html(`<h1>Thanks, ${fields.name ?? "friend"}</h1>
          <p>Your confirmation code is <strong>${code}</strong>.</p>`),
      );
    });
    return;
  }

  if (url.pathname === "/__state") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ submissions, dataRowCount: DATA_ROW_COUNT }));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    JSON.stringify({
      ready: true,
      port,
      dataRowCount: DATA_ROW_COUNT,
      articleSentence: ARTICLE_SENTENCE,
    }),
  );
});
