/**
 * Termarack City — Police Interceptor BRIDGE v3.1.1 simulation.
 * CLOX audit manifest + CUSTOM slot + alert broadcast + prediction chase.
 */

'use strict';

const CLOXBrain = require('./CLOX-BRAIN.js');
const TermarackBrain = require('./NPC-NEURAL-HEAD.js');

const AUDIT_PLOT =
  'Termarack City elite police interceptor units high-speed pursuit coordination ' +
  'with tactical alerts and predictive pursuit routing.';

function corridorGrid(rows, cols, laneRow) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, () => (r === laneRow ? 0 : 1)),
  );
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  console.log('=== Termarack City — Police Interceptor (v3.1.1 BRIDGE PATCH) ===\n');

  const cloxAudit = CLOXBrain.customise(AUDIT_PLOT);
  assert(cloxAudit?.auditManifest?.branding === '.termaracksecter', 'audit manifest branding');
  assert(cloxAudit.auditManifest.brainVersion === TermarackBrain.VERSION, 'manifest brainVersion syncs NPC-MASTER VERSION');
  assert(cloxAudit.npcTeam === 'CUSTOM', 'CLOX interceptor keywords resolve to CUSTOM team');
  assert(cloxAudit.auditManifest.totalFeatures === 13, 'manifest lists 13 active systems (9 core + 4 customizable)');

  const policeProfile = {
    npcTeam: 'CUSTOM',
    difficulty: 'HARD',
    config: {
      ...cloxAudit.config,
      DETECT_RANGE:           480,
      FOV_ANGLE_DEGREES:      125,
      THREAT_BUILD_RATE:       7,
      MEMORY_DURATION_TICKS:   100,
      ALERT_BROADCAST_RADIUS:    750,
    },
    features: {
      ...cloxAudit.features,
      TARGET_PREDICTION:  true,
      ALERT_PROPAGATION:  true,
      COVER_SYSTEM:       false,
      FATIGUE_SYSTEM:     true,
      FLEE_SYSTEM:        false,
      VILLAIN_LOGIC:      false,
    },
    customBehavior: {
      label:               'Police Interceptor — Termarack City',
      detectRangeOverride: 540,
      broadcastRadius:      800,
      difficultyPreset:    'HARD',
      stateBias: { ENGAGE: 2.3, INVESTIGATE: 1.25, PATROL: 0.35, REST: 0.25 },
    },
  };

  const report = TermarackBrain.applyCLOXProfile(policeProfile);
  assert(report && report.customProfileInjected, 'customBehavior injected');

  const tp = TermarackBrain.getTeamProfiles().CUSTOM;
  assert(tp.broadcastAlly === true, 'CLOX ALERT_PROPAGATION → broadcastAlly');
  assert(tp.useTargetPrediction === true, 'CLOX TARGET_PREDICTION → useTargetPrediction');

  console.log('Bridge applyReport.teamProfileUpdate:', report.teamProfileUpdate);
  console.log('CUSTOM profile label:', tp.label);
  console.log('CONFIG.DETECT_RANGE:', TermarackBrain.getConfig().DETECT_RANGE);
  console.log('CLOX audit branding:', cloxAudit.auditManifest.branding);
  console.log('NPC-MASTER VERSION:', TermarackBrain.VERSION);
  console.log('matchedKeywords count:', cloxAudit.auditManifest.matchedKeywords.length);
  console.log('matchedKeywords:', cloxAudit.auditManifest.matchedKeywords.join(', '));
  console.log('');

  const CELL = 10;
  const mid = 2;
  const cols = 36;
  const grid = corridorGrid(5, cols, mid);
  const PRED_HORIZON = 0.5; // matches TermarackBrain predictTargetPosition default

  function worldToGridCell(pos) {
    const c = Math.max(0, Math.min(cols - 1, Math.round((pos.x - CELL / 2) / CELL)));
    const r = Math.max(0, Math.min(grid.length - 1, Math.round((pos.y - CELL / 2) / CELL)));
    return { r, c };
  }

  const suspect = {
    position: { x: 28 * CELL + CELL / 2, y: mid * CELL + CELL / 2 },
    velocity: { x: 22, y: 0 },
  };

  const predictedWorld = {
    x: suspect.position.x + suspect.velocity.x * PRED_HORIZON,
    y: suspect.position.y + suspect.velocity.y * PRED_HORIZON,
  };
  const predictedCell = worldToGridCell(predictedWorld);
  const currentSuspectCell = worldToGridCell(suspect.position);

  const lead = {
    team: 'CUSTOM',
    position: { x: 12 * CELL + CELL / 2, y: mid * CELL + CELL / 2 },
    facingAngle: 0,
    threatLevel: 35,
  };

  const wingman = {
    team: 'CUSTOM',
    position: { x: 8 * CELL + CELL / 2, y: mid * CELL + CELL / 2 },
    facingAngle: 0,
    threatLevel: 0,
  };

  const squad = [lead, wingman];

  const dx0 = suspect.position.x - lead.position.x;
  const dy0 = suspect.position.y - lead.position.y;
  lead.facingAngle = Math.atan2(dy0, dx0) * (180 / Math.PI);

  // A* goal = predicted intercept cell (sim layer routes pursuit ahead of the suspect)
  const envLead = {
    grid,
    npcGridPos: { r: mid, c: 12 },
    goalGridPos: { ...predictedCell },
  };

  const r1 = TermarackBrain.executeTick(lead, suspect, envLead, { allNPCs: squad });

  assert(r1.playerVisible === true, 'lead should see suspect');
  assert(wingman.alerted === true, 'wingman receives alert propagation');
  assert(
    wingman.memory && wingman.memory.lastKnownPosition &&
      Math.abs(wingman.memory.lastKnownPosition.x - suspect.position.x) < 1,
    'wingman memory synced to suspect position',
  );
  assert(Array.isArray(r1.path) && r1.path.length > 1, 'pathfinding still computes route');

  const pathEnd = r1.path[r1.path.length - 1];
  const pathTargetsPredicted =
    pathEnd.r === predictedCell.r && pathEnd.c === predictedCell.c;

  console.log('\n--- Prediction Log ---');
  console.log(JSON.stringify({
    predHorizonSec: PRED_HORIZON,
    suspectWorld: suspect.position,
    suspectVelocity: suspect.velocity,
    predictedWorld,
    currentSuspectGrid: currentSuspectCell,
    predictedInterceptGrid: predictedCell,
    astarGoalGrid: envLead.goalGridPos,
    pathLastCell: pathEnd,
    pathTargetsPredictedIntercept: pathTargetsPredicted,
    utilityUsesPrediction: tp.useTargetPrediction === true,
    note: 'Brain decides state using predicted position when useTargetPrediction; A* follows environment.goalGridPos (here set to predicted cell).',
  }, null, 2));

  console.log('\n--- Radio Propagation (wingman) ---');
  console.log(JSON.stringify({
    wingmanAlerted: wingman.alerted === true,
    alertCoordinatesWorld: wingman.memory?.lastKnownPosition || null,
    matchesSuspectBroadcast:
      wingman.memory?.lastKnownPosition &&
      Math.abs(wingman.memory.lastKnownPosition.x - suspect.position.x) < 0.01 &&
      Math.abs(wingman.memory.lastKnownPosition.y - suspect.position.y) < 0.01,
  }, null, 2));

  suspect.position.x += suspect.velocity.x * 0.5;

  const dxW = suspect.position.x - wingman.position.x;
  const dyW = suspect.position.y - wingman.position.y;
  wingman.facingAngle = Math.atan2(dyW, dxW) * (180 / Math.PI);

  const envWing = {
    grid,
    npcGridPos: { r: mid, c: 8 },
    goalGridPos: { r: mid, c: Math.min(cols - 1, Math.round(suspect.position.x / CELL)) },
  };

  const r2 = TermarackBrain.executeTick(wingman, suspect, envWing, { allNPCs: squad });

  assert(tp.useTargetPrediction === true, 'team profile still has prediction flag');
  assert(r2.difficulty === 'HARD', 'CONFIG._activePreset / HARD preset applies');

  console.log('Lead tick:', {
    state: r1.state,
    playerVisible: r1.playerVisible,
    pathLen: r1.path?.length,
    difficulty: r1.difficulty,
  });
  console.log('Wingman tick:', {
    state: r2.state,
    playerVisible: r2.playerVisible,
    pathLen: r2.path?.length,
    difficulty: r2.difficulty,
    alerted: wingman.alerted,
  });

  console.log('\n--- Audit Manifest (final .termaracksecter) ---');
  console.log(JSON.stringify(cloxAudit.auditManifest, null, 2));

  assert(pathTargetsPredicted, 'A* path should end at predicted intercept cell');
  console.log('\nTermarack City interceptor simulation PASSED.');
}

try {
  main();
} catch (e) {
  console.error(e.message || e);
  process.exitCode = 1;
}
