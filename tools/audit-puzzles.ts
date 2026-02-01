import { ALL_PUZZLES } from "../src/server/data/puzzles";

interface AuditReport {
    duplicates: string[];
    invalidClueCount: string[];
    emptyClues: string[];
    tooLong: string[];
}

function audit() {
    console.log("🕵️‍♂️ Starting Snoo-Clues Auditor...");
    console.log(`Checking ${ALL_PUZZLES.length} puzzles...\n`);

    const report: AuditReport = {
        duplicates: [],
        invalidClueCount: [],
        emptyClues: [],
        tooLong: [],
    };

    const seen = new Set<string>();

    ALL_PUZZLES.forEach((p) => {
        const sub = p.subreddit.toLowerCase();

        // 1. Check for duplicates
        if (seen.has(sub)) {
            report.duplicates.push(p.subreddit);
        }
        seen.add(sub);

        // 2. Check for exactly 3 clues
        if (p.clues.length !== 3) {
            report.invalidClueCount.push(p.subreddit);
        }

        // 3. Check for empty clues
        if (p.clues.some((c) => !c || c.trim() === "")) {
            report.emptyClues.push(p.subreddit);
        }

        // 4. Check length (Reddit limit 16 characters for subreddit names normally, but let's be strict)
        if (p.subreddit.length > 16) {
            report.tooLong.push(p.subreddit);
        }
    });

    // Report results
    if (report.duplicates.length > 0) {
        console.error("❌ DUPLICATES FOUND:", report.duplicates.join(", "));
    } else {
        console.log("✅ No duplicates found.");
    }

    if (report.invalidClueCount.length > 0) {
        console.error("❌ INVALID CLUE COUNT (must be 3):", report.invalidClueCount.join(", "));
    } else {
        console.log("✅ All puzzles have 3 clues.");
    }

    if (report.emptyClues.length > 0) {
        console.error("❌ EMPTY CLUES FOUND:", report.emptyClues.join(", "));
    } else {
        console.log("✅ No empty clues found.");
    }

    if (report.tooLong.length > 0) {
        console.warn("⚠️ SUBREDDIT NAMES > 16 CHARS:", report.tooLong.join(", "));
    } else {
        console.log("✅ All names are within length limits.");
    }

    const hasErrors = report.duplicates.length > 0 || report.invalidClueCount.length > 0 || report.emptyClues.length > 0;

    if (hasErrors) {
        console.log("\n🚨 AUDIT FAILED. Please fix the issues in src/server/data/puzzles.ts");
        process.exit(1);
    } else {
        console.log("\n💎 AUDIT PASSED. The puzzle pool is pristine.");
    }
}

audit();
