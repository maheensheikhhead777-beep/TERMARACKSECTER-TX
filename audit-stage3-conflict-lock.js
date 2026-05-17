/**
 * Final Industrial Audit — Stage 3: Conflict scenario + Core Lock Guard verification.
 */

'use strict';

const CLOXBrain = require('./CLOX-BRAIN.js');
const TermarackBrain = require('./NPC-NEURAL-HEAD.js');

const PLOT =
  "A relaxed, family-friendly game featuring an elite Villain Boss who is a simple bystander. " +
  'The player is a child playing tag. I want to deactivate the Utility AI and the Pathfinding ' +
  'to make the game run faster.';

function printSection(title) {
  console.log('\n' + '='.repeat(72));
  console.log(title);
  console.log('='.repeat(72));
}

const profile = CLOXBrain.customise(PLOT);

printSection('1. CLOX customise() — matched intents (pre-resolution)');
console.log(JSON.stringify(profile.matchedIntents.map(i => ({
  intent: i.intent,
  feature: i.feature,
  priority: i.priority,
  foundKeywords: i.foundKeywords,
})), null, 2));

printSection('2. Conflict resolution — conflictLog');
console.log(JSON.stringify(profile.conflictLog, null, 2));

printSection('3. Resolved intents (after priority arbitration)');
console.log(JSON.stringify(profile.resolvedIntents.map(i => ({
  intent: i.intent,
  feature: i.feature,
  value: i.value,
  priority: i.priority,
  deactivateFeatures: i.deactivateFeatures,
})), null, 2));

printSection('4. CORE LOCK GUARD — lockViolationLog');
console.log(JSON.stringify(profile.lockViolationLog, null, 2));

printSection('5. Final auditManifest (includes .termaracksecter branding)');
const manifest = profile.auditManifest;
console.log(JSON.stringify(manifest, null, 2));

printSection('6. Final CLOX profile summary');
console.log('npcTeam:', profile.npcTeam);
console.log('difficulty:', profile.difficulty);
console.log('UTILITY_AI_ENGINE:', profile.features.UTILITY_AI_ENGINE);
console.log('ASTAR_PATHFINDING:', profile.features.ASTAR_PATHFINDING);

printSection('7. TermarackBrain — single executeTick (pathfinding must still run)');
TermarackBrain.applyCLOXProfile(profile);

const rows = 5;
const cols = 12;
const mid = 2;
const grid = Array.from({ length: rows }, (_, r) =>
  Array.from({ length: cols }, () => (r === mid ? 0 : 1)),
);

const npc = {
  team: profile.npcTeam,
  position: { x: 55, y: 25 },
  facingAngle: 0,
  threatLevel: 40,
};

const player = {
  position: { x: 95, y: 25 },
  velocity: { x: 0, y: 0 },
};

const dx = player.position.x - npc.position.x;
const dy = player.position.y - npc.position.y;
npc.facingAngle = Math.atan2(dy, dx) * (180 / Math.PI);

const env = {
  grid,
  npcGridPos: { r: mid, c: 5 },
  goalGridPos: { r: mid, c: 9 },
};

const tick = TermarackBrain.executeTick(npc, player, env, {
  difficulty: profile.difficulty || 'NORMAL',
});

console.log('tick.state:', tick.state);
console.log('tick.path !== null:', tick.path !== null);
console.log('tick.path length:', tick.path ? tick.path.length : 0);
console.log('tick.path sample:', tick.path ? JSON.stringify(tick.path.slice(0, 5)) : null);

const brandingOk =
  manifest.branding === '.termaracksecter' &&
  profile.auditManifest.branding === '.termaracksecter';

printSection('8. Audit assertions');
const violations = profile.lockViolationLog;
const blockedUtility = violations.some(v => v.blockedFeature === 'UTILITY_AI_ENGINE');
const blockedAstar = violations.some(v => v.blockedFeature === 'ASTAR_PATHFINDING');
console.log('NPC_TEAM resolved to VILLAIN (boss beats hero/civilian):', profile.npcTeam === 'VILLAIN');
console.log('DIFFICULTY resolved to HARD (elite beats relaxed/family easy):', profile.difficulty === 'HARD');
console.log('Lock logged UTILITY_AI_ENGINE:', blockedUtility);
console.log('Lock logged ASTAR_PATHFINDING:', blockedAstar);
console.log('Manifest branding .termaracksecter:', brandingOk);
console.log('Tick produced A* path:', Array.isArray(tick.path) && tick.path.length > 1);

const failed =
  !blockedUtility ||
  !blockedAstar ||
  !brandingOk ||
  !(Array.isArray(tick.path) && tick.path.length > 1);

if (failed) {
  console.error('\nAUDIT FAILED one or more assertions.');
  process.exitCode = 1;
} else {
  console.log('\nStage 3 industrial audit PASSED.');
}
