// Validate every $...$ segment with KaTeX in strict mode (0 errors required).
const katex = require("/Users/daniel/Haygit/frontend/node_modules/katex");
const fs = require("fs");
const segs = JSON.parse(fs.readFileSync(process.argv[2] || "_katex_segs.json", "utf8"));
let errors = 0;
const seen = new Set();
for (const { n, seg } of segs) {
  try {
    katex.renderToString(seg, { throwOnError: true, strict: "error" });
  } catch (e) {
    errors++;
    const key = seg + "|" + e.message;
    if (!seen.has(key)) {
      seen.add(key);
      console.log(`Q${n}: "${seg}"  ->  ${e.message.split("\n")[0]}`);
    }
  }
}
console.log(`\nChecked ${segs.length} segments, ${errors} error(s).`);
process.exit(errors ? 1 : 0);
