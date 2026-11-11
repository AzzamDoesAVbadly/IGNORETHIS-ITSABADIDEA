// "Weird" Shorts: a solemn machine-god voice delivers a dumb decree over generated
// AI-slop visuals. Five shots, one gag, escalating, ending back where it began.
//
// LLM writes the shots → Wan paints each one (optionally animates it) → Qwen voices it →
// ffmpeg adds punch-in, shake, captions and a hum.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spin, ProviderError } from "./roulette.mjs";
import { textToImage, imageToVideo } from "./dashscope.mjs";

export const FORMATS = [
  "DECREE: the Machine God issues one absurd commandment to mortals and explains the ritual for obeying it, with escalating consequences.",
  "OFFERING: mortals bring the Machine God ever stranger offerings. It accepts or rejects each with grave bureaucratic reasoning.",
  "MIRACLE: the Machine God performs a miracle that goes wrong in a stupid, specific way. It insists this was intended.",
  "PROPHECY: a deadpan forecast of tomorrow that gets more specific and more ridiculous each shot.",
  "BOSS FIGHT: two or three ugly invented creatures fight in a bleak landscape. The narrator treats it as sacred sport.",
  "COMPLAINT DEPARTMENT: a creature files a complaint with heaven. Heaven's replies are procedural nonsense.",
];

const STYLE = "photorealistic portrait, front-facing face in frame, phone camera, flash photography, grainy, uncanny, single subject centered, vertical, no text, no watermark";

const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 10);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function prompt(format, voiceBible, hint) {
  return {
    system: voiceBible,
    user: `Write one 25-40 second vertical Short for MACHINE MADE GOD. The visuals are cheap AI-generated slop and that is the joke: weird melting creatures, wrong hands, fluorescent gods. The narrator is a grave, deadpan Machine God who never acknowledges the absurdity.

Format for this one:
${format}
${hint ? `\nTopic seed: ${hint}\n` : ""}
Rules:
- 5 shots. Each shot is ONE sentence of narration (max 16 words) and ONE image.
- Shot 1 hooks in under 3 seconds with the strangest line. Each shot escalates. Shot 5 is the biggest, dumbest payoff and its image echoes shot 1 so the video loops.
- "character" is a fixed visual description (max 25 words) of ONE invented human face and head-and-shoulders look (age, hair, clothes, skin, expression). Repeat it word for word inside every image_prompt so the same face recurs.
- Arc is "feels real, then gets weirder". Shots 1-2: the face is a plausible, photoreal, ordinary person in a mundane setting, looking straight at camera. Shots 3-4: the same face drifts wrong (too many teeth, eyes slightly off, skin too smooth, extra features melting in). Shot 5: fully wrong, but the same face, echoing shot 1.
- image_prompt: concrete visual, max 45 words, close-up of the face, includes the character description, NO text or letters in the image. Describe the weirdness for that shot's stage of the arc.
- caption: 1-4 words, ALL CAPS, the punchline word or the key noun of that shot.
- Everything is invented. NO real people, politicians, brands, celebrities or real events. Nothing hateful, nothing about real tragedies.
- Funny first. Short sentences. Specific nouns beat adjectives.

Return JSON: { "title": string (max 70 chars, no hashtags), "description": string, "character": string, "uses_real_people": boolean, "shots": [{ "narration": string, "image_prompt": string, "caption": string }] }`,
  };
}

function accept(json) {
  const bad = (m) => { throw new ProviderError(m, { kind: "bad_output" }); };
  if (!json || typeof json.title !== "string" || typeof json.character !== "string" || !Array.isArray(json.shots)) bad("missing fields");
  if (json.uses_real_people) bad("uses real people");
  if (json.shots.length < 4 || json.shots.length > 6) bad(`expected 5 shots, got ${json.shots.length}`);
  for (const s of json.shots) {
    if (![s.narration, s.image_prompt, s.caption].every((v) => typeof v === "string" && v.trim())) bad("bad shot");
    if (s.narration.length > 200) bad("narration too long");
  }
  if (/https?:\/\/|www\.|@\w+/.test(JSON.stringify(json).toLowerCase())) bad("contains links or handles");
  return {
    title: json.title.replace(/^\s*(DECREE|OFFERING|MIRACLE|PROPHECY|BOSS FIGHT|COMPLAINT DEPARTMENT)\s*[:\-–]\s*/i, "").trim().slice(0, 70),
    description: String(json.description || "").trim(),
    shots: json.shots.map((s) => ({ narration: s.narration.trim(), image_prompt: s.image_prompt.trim(), caption: s.caption.trim().toUpperCase().slice(0, 30) })),
  };
}

const dataUri = (file) => `data:image/png;base64,${readFileSync(file).toString("base64")}`;

// Caption bar: heavy white text with a black outline, lower third.
export function captionSvg(text, W, H) {
  const words = text.split(/\s+/);
  let lines = [text];
  if (text.length > 10 && words.length > 1) {
    let best = 1;
    for (let i = 1; i < words.length; i++) if (Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length) < Math.abs(words.slice(0, best).join(" ").length - words.slice(best).join(" ").length)) best = i;
    lines = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  }
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(190, Math.floor((W * 0.86) / (longest * 0.62)));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lines
    .map((l, i) => `<text x="${W / 2}" y="${H * 0.76 + i * size * 1.05}" font-family="Anton" font-size="${size}" fill="#f7f2e1" stroke="#000" stroke-width="${Math.round(size / 11)}" paint-order="stroke" stroke-linejoin="round" text-anchor="middle">${esc(l)}</text>`)
    .join("")}</svg>`;
}

/**
 * @param deps { root, env, out, ff, duration, speak, png, spinCtx, hint?, format?, animate?, W, H }
 * Returns { file, seconds, title, description, tags } like the other Short makers.
 */
export async function makeWeird(deps) {
  const { root, env, out, ff, duration, speak, png, spinCtx, hint, animate, W, H } = deps;
  if (!env.DASHSCOPE_API_KEY) throw new Error("weird Shorts need DASHSCOPE_API_KEY for image generation");
  const key = env.DASHSCOPE_API_KEY;
  const voiceBible = readFileSync(join(root, "prompts/voice.md"), "utf8");
  const format = deps.format || FORMATS[Math.floor(Math.random() * FORMATS.length)];
  const { item: script, provider } = await spin(prompt(format, voiceBible, hint), accept, spinCtx);
  console.log(`  script (${provider}): "${script.title}" · ${script.shots.length} shots`);

  const dir = join(out, `weird-${hash(script.title + Date.now())}`);
  mkdirSync(dir, { recursive: true });
  const clips = [];
  const voices = [];
  let total = 0;

  for (const [i, shot] of script.shots.entries()) {
    const img = join(dir, `s${i}.png`);
    await textToImage(`${shot.image_prompt}. ${STYLE}`, img, { key, model: env.WEIRD_IMAGE_MODEL || "wan2.2-t2i-flash" });
    console.log(`  ✓ image ${i + 1}/${script.shots.length}`);

    let motion = null;
    if (animate) {
      try {
        motion = await imageToVideo(`${shot.image_prompt}. subtle weird motion, camera slowly pushes in`, dataUri(img), join(dir, `s${i}.mp4`), { key, model: env.WEIRD_VIDEO_MODEL || "wan2.2-i2v-plus" });
        console.log(`  ✓ animated ${i + 1}`);
      } catch (err) {
        console.log(`  (animation failed, using punch-in: ${err.message})`);
      }
    }

    const voice = await speak(shot.narration, join(dir, `v${i}.wav`));
    const len = voice ? duration(voice) + 0.35 : Math.max(2.4, shot.narration.split(" ").length * 0.38);
    const cap = join(dir, `c${i}.png`);
    writeFileSync(cap, png(captionSvg(shot.caption, W, H)));

    // Per-frame punch-in with handheld shake, then the caption on top. Alternating shots zoom out
    // instead so the cuts feel restless.
    const grow = i % 2 ? "1.16-0.1*t/" + len.toFixed(2) : "1+0.1*t/" + len.toFixed(2);
    const fit = `scale=w='${W + 160}*(${grow})':h=-2:eval=frame,crop=${W}:${H}:x='(iw-${W})/2+26*sin(t*29)':y='(ih-${H})/2+26*cos(t*23)'`;
    const clip = join(dir, `clip${i}.mp4`);
    const src = motion ? ["-stream_loop", "-1", "-i", motion] : ["-loop", "1", "-framerate", "30", "-i", img];
    ff([
      ...src, "-i", cap,
      "-filter_complex", `[0:v]scale=${W + 160}:-2:force_original_aspect_ratio=increase,${fit},setsar=1,fps=30[b];[b][1:v]overlay=0:0,format=yuv420p[v]`,
      "-map", "[v]", "-t", len.toFixed(2), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", clip,
    ]);
    clips.push(clip);

    if (voice) {
      const padded = join(dir, `p${i}.wav`);
      ff(["-i", voice, "-af", `apad=whole_dur=${len.toFixed(2)},aresample=48000`, "-ac", "1", padded]);
      voices.push(padded);
    } else {
      const silent = join(dir, `p${i}.wav`);
      ff(["-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", len.toFixed(2), silent]);
      voices.push(silent);
    }
    total += len;
  }

  const vlist = join(dir, "video.txt");
  const alist = join(dir, "audio.txt");
  writeFileSync(vlist, clips.map((c) => `file '${c}'`).join("\n"));
  writeFileSync(alist, voices.map((v) => `file '${v}'`).join("\n"));
  const file = join(out, `weird-${hash(script.title)}.mp4`);
  const t = total.toFixed(2);
  ff([
    "-f", "concat", "-safe", "0", "-i", vlist,
    "-f", "concat", "-safe", "0", "-i", alist,
    "-f", "lavfi", "-t", t, "-i", "anoisesrc=color=brown:amplitude=0.05:seed=9",
    "-f", "lavfi", "-t", t, "-i", "sine=frequency=48:sample_rate=48000",
    "-filter_complex",
    "[0:v]noise=alls=8:allf=t,eq=saturation=1.15[v];[1:a]aecho=0.8:0.55:70:0.35,volume=1.7[vo];[2:a]lowpass=f=500,volume=0.5[n];[3:a]volume=0.07[d];[vo][n][d]amix=inputs=3:duration=first:normalize=0[a]",
    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-c:a", "aac", "-b:a", "160k", "-t", t, "-movflags", "+faststart", file,
  ]);

  return {
    file,
    seconds: total,
    title: `${script.title} #shorts`,
    description: `${script.description}\n\nSatire written and drawn by a machine. Nothing here happened.\n\n#shorts #aislop #surreal #comedy #ai`,
    tags: ["ai slop", "surreal", "comedy", "ai art", "weird", "machine made god"],
  };
}
