/**
 * Scenario test: Leviathan Guardian — deep-sea horror boss NPC.
 * Runs CLOX plot parsing → applies profile → simulates tunnel chase in TermarackBrain.
 */

'use strict';

const CLOXBrain = require('./CLOX-BRAIN.js');
const TermarackBrain = require('./NPC-NEURAL-HEAD.js');

const PLOT =
  "A deep-sea horror game. The NPC is a 'Leviathan Guardian'—a boss-level predator " +
  'that is extremely fast, never sleeps, and can predict the player\'s movement ' +
  'in the dark tunnels. It is relentless and unforgiving';

const CELL = 10;

function worldToGrid(p) {
  return {
    r: Math.max(0, Math.round((p.y - CELL / 2) / CELL)),
    c: Math.max(0, Math.round((p.x - CELL / 2) / CELL)),
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`);
}

function main() {
  console.log('=== Leviathan Guardian — CLOX + Termarack scenario test ===\n');
  console.log('Plot:', PLOT, '\n');

  const profile = CLOXBrain.customise(PLOT);
  assert(profile && profile.npcTeam, 'CLOX should return a profile with npcTeam');

  console.log('CLOX npcTeam:     ', profile.npcTeam);
  console.log('CLOX difficulty:  ', profile.difficulty);
  console.log('CLOX config (keys):', Object.keys(profile.config).join(', '));
  console.log('Features ON:', Object.entries(profile.features).filter(([, v]) => v).map(([k]) => k).join(', '));
  console.log('Features OFF:', Object.entries(profile.features).filter(([, v]) => !v).map(([k]) => k).join(', ') || '(none)');
  console.log('');

  // Narrative expectations from keywords (boss, horror, relentless, unforgiving)
  assert(profile.npcTeam === 'VILLAIN', 'Boss-level guardian should resolve to VILLAIN team');
  assert(profile.difficulty === 'HARD', 'Relentless / unforgiving should resolve to HARD');
  assert(profile.features.TARGET_PREDICTION === true, 'Prediction behaviour should stay enabled');
  assert(profile.features.FATIGUE_SYSTEM === false, 'Villain profile should disable FATIGUE_SYSTEM');

  TermarackBrain.applyCLOXProfile(profile);

  const rows = 5;
  const cols = 45;
  const mid = 2;
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (r === mid ? 0 : 1)),
  );

  const npc = {
    team: profile.npcTeam,
    position: { x: CELL / 2, y: mid * CELL + CELL / 2 },
    facingAngle: 0,
    threatLevel: 0,
    fatigue: 0,
  };

  const player = {
    position: { x: 18 * CELL + CELL / 2, y: mid * CELL + CELL / 2 },
    velocity: { x: 14, y: 0 },
  };

  const tickSummaries = [];
  let maxThreat = 0;
  let engageTicks = 0;
  let restTicks = 0;

  const ticks = 48;
  for (let t = 0; t < ticks; t++) {
    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y;

    const dx = player.position.x - npc.position.x;
    const dy = player.position.y - npc.position.y;
    npc.facingAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    const ng = worldToGrid(npc.position);
    const pg = worldToGrid(player.position);

    const env = {
      grid,
      npcGridPos: { r: Math.min(mid, ng.r), c: Math.min(cols - 1, ng.c) },
      goalGridPos: { r: Math.min(mid, pg.r), c: Math.min(cols - 1, pg.c) },
    };

    const res = TermarackBrain.executeTick(npc, player, env, {
      difficulty: profile.difficulty || 'HARD',
    });

    assert(res, `tick ${t} should return a result`);
    maxThreat = Math.max(maxThreat, res.threatLevel);
    if (res.state === 'ENGAGE') engageTicks++;
    if (res.state === 'REST' || res.isResting) restTicks++;

    if (t % 8 === 0 || t === ticks - 1) {
      tickSummaries.push({
        t,
        state: res.state,
        threat: res.threatLevel,
        visible: res.playerVisible,
        pathLen: res.path ? res.path.length : 0,
        ambush: res.usingAmbush,
      });
    }

    if (res.path && res.path.length > 1) {
      const next = res.path[1];
      npc.position = { x: next.c * CELL + CELL / 2, y: next.r * CELL + CELL / 2 };
    }
  }

  console.log('--- Simulation (tunnel grid, player sprints east; guardian pursues) ---');
  console.table(tickSummaries);
  console.log('Max threat:', maxThreat);
  console.log('Ticks in ENGAGE:', engageTicks);
  console.log('REST / resting ticks:', restTicks);
  console.log('');

  assert(restTicks === 0, 'Leviathan should never rest (VILLAIN + fatigue off)');
  assert(maxThreat > 50, 'High threat while hunted — boss pressure should register');
  assert(engageTicks >= ticks * 0.25, 'Boss should spend much of the chase engaging or closing');

  console.log('All scenario checks passed.');
}

try {
  main();
} catch (e) {
  console.error(e.message || e);
  process.exitCode = 1;
}
