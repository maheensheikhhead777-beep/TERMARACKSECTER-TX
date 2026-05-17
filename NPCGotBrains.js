'use strict';

/**
 * T E R M A R A C K S E C T E R
 * Gold Build v3.3.0
 *
 * Public module:
 * - Layer 3: Validator
 * - Layer 4: Runtime
 * - Layer 5: Public API
 */

const fs = require('fs');
const path = require('path');
const {
  GOLD_BUILD_VERSION,
  createRuntimeFromRaw,
  createRuntimeFromBlob,
} = require('./TermarackInternal.js');

// ============================================================
// LAYER 3: VALIDATOR
// ============================================================
function assertEntity(entity, name) {
  if (!entity || !entity.position || typeof entity.position.x !== 'number' || typeof entity.position.y !== 'number') {
    throw new Error(`[NPC GOT BRAINS] ${name} requires numeric position {x,y}.`);
  }
}

function normalizeDifficulty(input) {
  const raw = String(input || 'NORMAL').toUpperCase();
  if (raw === 'EASY') return { rangeMul: 0.6, threatMul: 0.5, name: 'EASY' };
  if (raw === 'HARD') return { rangeMul: 1.4, threatMul: 2.0, name: 'HARD' };
  return { rangeMul: 1.0, threatMul: 1.0, name: 'NORMAL' };
}

// ============================================================
// LAYER 4: RUNTIME (_TBK_RUNTIME ONLY)
// ============================================================
function createEngine(runtime) {
  if (!runtime || !runtime.math || !runtime.utility || !runtime.constants) {
    throw new Error('[NPC GOT BRAINS] Runtime is not initialized.');
  }

  const C = runtime.constants;
  const STATE = Object.freeze({
    PATROL: 'PATROL',
    INVESTIGATE: 'INVESTIGATE',
    ENGAGE: 'ENGAGE',
    REST: 'REST',
  });

  function executeTick(npc, target, options = {}) {
    assertEntity(npc, 'npc');
    assertEntity(target, 'target');

    if (typeof npc.threatLevel !== 'number') npc.threatLevel = 0;
    if (typeof npc.fatigue !== 'number') npc.fatigue = 0;
    if (!npc.memory) npc.memory = { lastKnownPosition: null, memoryTicksLeft: 0 };

    const diff = normalizeDifficulty(options.difficulty);
    const detectRange = C.DETECT_RANGE * diff.rangeMul;
    const distance = runtime.math.distance2d(npc.position, target.position);
    const playerVisible = distance <= detectRange;

    if (playerVisible) {
      npc.memory.lastKnownPosition = { ...target.position };
      npc.memory.memoryTicksLeft = C.MEMORY_DURATION_TICKS;
      npc.threatLevel = Math.min(C.THREAT_MAX, npc.threatLevel + C.THREAT_BUILD_RATE * diff.threatMul);
    } else {
      npc.threatLevel = Math.max(0, npc.threatLevel - C.THREAT_DECAY_RATE);
      if (npc.memory.memoryTicksLeft > 0) npc.memory.memoryTicksLeft -= 1;
      if (npc.memory.memoryTicksLeft <= 0) npc.memory.lastKnownPosition = null;
    }

    if (npc.state === STATE.ENGAGE) {
      npc.fatigue = Math.min(C.FATIGUE_MAX, npc.fatigue + C.FATIGUE_BUILD_RATE);
    } else {
      npc.fatigue = Math.max(0, npc.fatigue - 0.5);
    }

    const distanceFactor = runtime.math.clamp01(distance / Math.max(1, detectRange));
    const threatFactor = runtime.math.clamp01(npc.threatLevel / C.THREAT_MAX);
    const fatigueFactor = runtime.math.clamp01(npc.fatigue / C.FATIGUE_MAX);
    const hasMemory = npc.memory.lastKnownPosition ? 1 : 0;
    const memoryStrength = runtime.math.clamp01(npc.memory.memoryTicksLeft / C.MEMORY_DURATION_TICKS);

    const utilities = {
      [STATE.ENGAGE]: runtime.utility.engage(distanceFactor, threatFactor, fatigueFactor),
      [STATE.INVESTIGATE]: runtime.utility.investigate(hasMemory, memoryStrength, distanceFactor),
      [STATE.PATROL]: runtime.utility.patrol(threatFactor, hasMemory),
      [STATE.REST]: runtime.utility.rest(fatigueFactor),
    };

    let bestState = STATE.PATROL;
    let bestScore = -Infinity;
    for (const [key, value] of Object.entries(utilities)) {
      if (value > bestScore) {
        bestScore = value;
        bestState = key;
      }
    }

    npc.state = bestState;
    return {
      state: bestState,
      difficulty: diff.name,
      playerVisible,
      threatLevel: npc.threatLevel,
      fatigue: npc.fatigue,
      memoryTicksLeft: npc.memory.memoryTicksLeft,
      runtimeVersion: runtime.version,
      buildVersion: GOLD_BUILD_VERSION,
      timestamp: Date.now(),
    };
  }

  return Object.freeze({ executeTick, STATE });
}

// ============================================================
// LAYER 5: PUBLIC API
// ============================================================
let _TBK_RUNTIME = createRuntimeFromRaw();
let _engine = createEngine(_TBK_RUNTIME);
let _license = Object.seal({
  activated: false,
  source: 'raw',
  runtimeVersion: _TBK_RUNTIME.version,
  activatedAt: null,
});

const NPCGotBrains = Object.freeze({
  VERSION: GOLD_BUILD_VERSION,

  activate(founderKey) {
    const corePath = path.resolve(__dirname, 'core_brain.termaracksecter');
    const blob = fs.readFileSync(corePath, 'utf8').trim();
    _TBK_RUNTIME = createRuntimeFromBlob(blob, founderKey);
    _engine = createEngine(_TBK_RUNTIME);
    _license.activated = true;
    _license.source = corePath;
    _license.runtimeVersion = _TBK_RUNTIME.version;
    _license.activatedAt = Date.now();
    return { ok: true, activated: true, source: corePath, runtimeVersion: _TBK_RUNTIME.version };
  },

  getLicenseStatus() {
    return { ..._license };
  },

  initFromBlobFile(blobPath, founderKey) {
    const fullPath = path.resolve(blobPath);
    const blob = fs.readFileSync(fullPath, 'utf8').trim();
    _TBK_RUNTIME = createRuntimeFromBlob(blob, founderKey);
    _engine = createEngine(_TBK_RUNTIME);
    _license.activated = true;
    _license.source = fullPath;
    _license.runtimeVersion = _TBK_RUNTIME.version;
    _license.activatedAt = Date.now();
    return { ok: true, runtimeVersion: _TBK_RUNTIME.version, source: fullPath };
  },

  initFromBlobString(blobString, founderKey) {
    _TBK_RUNTIME = createRuntimeFromBlob(blobString, founderKey);
    _engine = createEngine(_TBK_RUNTIME);
    _license.activated = true;
    _license.source = 'inline-blob';
    _license.runtimeVersion = _TBK_RUNTIME.version;
    _license.activatedAt = Date.now();
    return { ok: true, runtimeVersion: _TBK_RUNTIME.version };
  },

  executeTick(npc, target, options = {}) {
    return _engine.executeTick(npc, target, options);
  },

  tick(npc, player, environment = {}) {
    const options = {
      difficulty: environment.difficulty || 'NORMAL',
    };
    const res = _engine.executeTick(npc, player, options);
    const pathInputValid = Array.isArray(environment.grid) && !!environment.npcGridPos;
    return {
      state: res.state,
      team: (npc.team || 'GANG').toUpperCase(),
      position: npc.position,
      threatLevel: res.threatLevel,
      fatigue: res.fatigue,
      playerVisible: res.playerVisible,
      lastKnownTarget: npc.memory?.lastKnownPosition || null,
      path: Array.isArray(environment.pathHint) ? environment.pathHint : null,
      environment: {
        gridLinked: pathInputValid,
        hasGoal: !!environment.goalGridPos,
        npcGridPos: environment.npcGridPos || null,
      },
      usingEncryptedRuntime: _license.activated,
      runtimeVersion: res.runtimeVersion,
      timestamp: res.timestamp,
    };
  },

  getRuntimeInfo() {
    return {
      runtimeVersion: _TBK_RUNTIME.version,
      buildVersion: GOLD_BUILD_VERSION,
      hasRuntime: !!_TBK_RUNTIME,
    };
  },
});

module.exports = NPCGotBrains;
