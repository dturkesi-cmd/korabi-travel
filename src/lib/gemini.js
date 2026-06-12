const config = require("../config");

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
    }),
  });
  if (!res.ok) throw new Error("Gemini request failed");
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function localAgent(step, message, context) {
  if (step === "results") {
    return {
      reply: "Cheapest sensible fare is option 1.",
      action: { type: "recommend", recommend_index: 0, recommend_reason: "lowest price with a reasonable duration" },
    };
  }
  if (step === "booking") {
    const c = context || {};
    const ex = [];
    if (c.cfar_available) ex.push({ key: "cfar", reason: "plans change — cancel up to 24h before for a partial refund" });
    ex.push({ key: "bags", reason: "basic fares often don't include a checked bag" });
    if (c.seats_available) ex.push({ key: "seats", reason: "pick seats now so your party sits together" });
    ex.push({ key: "insurance", reason: "medical cover is worth it on international trips" });
    return { reply: "Here's what I'd consider for this trip.", action: { type: "suggest_extras", extras: ex } };
  }
  return { reply: "Tell me origin, destination, and rough dates.", action: { type: "none" } };
}

async function runAgent({ step, message, context }) {
  if (!config.geminiKey) return localAgent(step, message, context);

  const prompt = `You are Korabi Travel's flight planner assistant. Step: ${step}.
User message: ${message}
Context JSON: ${JSON.stringify(context || {})}

Respond with ONLY valid JSON (no markdown) in this shape:
{"reply":"string","action":{"type":"none"|"search"|"recommend"|"suggest_extras",
"search":{"origin":"IATA","destination":"IATA","departure_date":"YYYY-MM-DD","return_date":null|"YYYY-MM-DD","adults":1,"children_ages":[],"cabin_class":"economy"},
"recommend_index":0,"recommend_reason":"string",
"extras":[{"key":"cfar"|"insurance"|"bags"|"seats","reason":"string"}]}}`;

  try {
    const text = await callGemini(prompt);
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());
    return json;
  } catch {
    return localAgent(step, message, context);
  }
}

module.exports = { runAgent, localAgent };
