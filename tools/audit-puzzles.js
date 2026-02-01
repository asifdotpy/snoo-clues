const fs = require('fs');
const path = require('path');

const puzzlesPath = path.join(__dirname, '../src/server/data/puzzles.ts');
const content = fs.readFileSync(puzzlesPath, 'utf8');

// Simple regex to extract subreddit and clues
// Matches: { subreddit: "...", clues: ["...", "...", "..."] }
const puzzleRegex = /\{\s*subreddit:\s*"([^"]+)",\s*clues:\s*\["([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\]\s*\}/g;

let match;
const puzzles = [];
while ((match = puzzleRegex.exec(content)) !== null) {
    puzzles.push({
        subreddit: match[1],
        clues: [match[2], match[3], match[4]]
    });
}

console.log("🕵️‍♂️ Starting Snoo-Clues Auditor (JS Edition)...");
console.log(`Auditing ${puzzles.length} puzzles...\n`);

const report = {
    duplicates: [],
    invalidClueCount: [],
    emptyClues: [],
    tooLong: []
};

const seen = new Set();

puzzles.forEach(p => {
    const sub = p.subreddit.toLowerCase();

    if (seen.has(sub)) report.duplicates.push(p.subreddit);
    seen.add(sub);

    if (p.clues.length !== 3) report.invalidClueCount.push(p.subreddit);
    if (p.clues.some(c => !c || c.trim() === "")) report.emptyClues.push(p.subreddit);
    if (p.subreddit.length > 16) report.tooLong.push(p.subreddit);
});

if (report.duplicates.length > 0) console.error("❌ DUPLICATES FOUND:", report.duplicates.join(", "));
else console.log("✅ No duplicates found.");

if (report.invalidClueCount.length > 0) console.error("❌ INVALID CLUE COUNT:", report.invalidClueCount.join(", "));
else console.log("✅ All puzzles have 3 clues.");

if (report.emptyClues.length > 0) console.error("❌ EMPTY CLUES FOUND:", report.emptyClues.join(", "));
else console.log("✅ No empty clues found.");

if (report.tooLong.length > 0) console.warn("⚠️ SUBREDDIT NAMES > 16 CHARS:", report.tooLong.join(", "));
else console.log("✅ All names are within length limits.");

const hasErrors = report.duplicates.length > 0 || report.invalidClueCount.length > 0 || report.emptyClues.length > 0;
if (hasErrors) {
    console.log("\n🚨 AUDIT FAILED.");
    process.exit(1);
} else {
    console.log("\n💎 AUDIT PASSED. The puzzle pool is pristine.");
}
