/**
 * ============================================================
 *   NPC - MASTER
 *   Version: 3.1.1
 *   Codename: PHASE ON — BRIDGE PATCH
 *   Author: Ulak (Code Improvement Engine)
 *   Auditor: TREVOR (GEMINI)
 * ============================================================
 *
 *  FEATURES:
 *  --------------------------
 *  [CORE - IMPROVED]
 *    ✔ Clean readable code
 *    ✔ Safe error handling throughout
 *    ✔ Improved A* pathfinding with diagonal cost
 *    ✔ Proper min-heap with clear method names
 *
 *  [PHASE ON - v2.0]
 *    ✔ 1.  Memory System
 *    ✔ 2.  Threat Level
 *    ✔ 3.  Fatigue / Cooldown
 *    ✔ 4.  Field of View (FOV)
 *    ✔ 5.  Alert Propagation
 *    ✔ 6.  Debug Logger
 *    ✔ 7.  Difficulty Scaling
 *
 *  [v2.1 ENHANCEMENTS]
 *    ✔ 8.  True Utility AI
 *    ✔ 9.  Cover System
 *    ✔ 10. Path Caching
 *    ✔ 11. Target Prediction
 *
 *  [v3.0 TEAM EDITION]
 *    ✔ 12. NPC Team System
 *    ✔ 13. Villain Logic
 *
 *  [v3.1 BRIDGE EDITION — NEW FIXES]
 *    ✔ FIX 1. applyCLOXProfile()   — CLOX → NPC-MASTER bridge
 *    ✔ FIX 2. Runtime feature wiring — CLOX flags update TEAM_PROFILES
 *    ✔ FIX 3. Custom profile layer  — Edge case teams (e.g. Interceptor)
 *
 *  [v3.1.1 BRIDGE PATCH]
 *    ✔ Standardized VERSION constant for CLOX audit manifest sync
 * ============================================================
 */

'use strict';

let NPCGotBrains = null;
try {
  NPCGotBrains = require('./NPCGotBrains.js');
  NPCGotBrains.activate('TERMARACKSECTER-FOUNDER-2025');
} catch (err) {
  throw new Error(`Unauthorized Access: Termarack Kernel Locked (${err.message})`);
}

if (!NPCGotBrains.getLicenseStatus().activated) {
  throw new Error('Unauthorized Access: Termarack Kernel Locked');
}

/** FIX v3.1.1 — single source of truth for NPC-MASTER brain version (CLOX manifest). */
const VERSION = 'v3.1.1';

const TermarackBrain = (function () {

  // ============================================================
  // SECTION 1: BASE CONFIGURATION
  // This is the default config. applyCLOXProfile() merges
  // CLOX output on top of this at runtime.
  // ============================================================

  const BASE_CONFIG = {
    ENGAGE_RANGE:           150,
    DETECT_RANGE:           400,
    NORMAL_CELL_COST:       1,
    WALL_EDGE_COST:         8,
    WALL_COST:              Infinity,
    WALL_BUFFER_RADIUS:     1,
    FOV_ANGLE_DEGREES:      120,
    THREAT_MAX:             100,
    THREAT_BUILD_RATE:      5,
    THREAT_DECAY_RATE:      2,
    THREAT_ENGAGE_TRIGGER:  30,
    FATIGUE_MAX:            60,
    FATIGUE_REST_DURATION:  20,
    FATIGUE_BUILD_RATE:     1,
    ALERT_BROADCAST_RADIUS: 600,
    MEMORY_DURATION_TICKS:  80,
    DIFFICULTY: {
      EASY:   { rangeMultiplier: 0.6, threatMultiplier: 0.5 },
      NORMAL: { rangeMultiplier: 1.0, threatMultiplier: 1.0 },
      HARD:   { rangeMultiplier: 1.4, threatMultiplier: 2.0 },
    },
  };

  // Live CONFIG — mutated by applyCLOXProfile() at runtime
  let CONFIG = { ...BASE_CONFIG };

  // ============================================================
  // SECTION 2: STATE NAMES
  // ============================================================

  const STATE = {
    PATROL:      'PATROL',
    INVESTIGATE: 'INVESTIGATE',
    ENGAGE:      'ENGAGE',
    REST:        'REST',
  };

  // ============================================================
  // SECTION 3: NPC TEAM SYSTEM
  // Base team profiles. applyCLOXProfile() can override these
  // at runtime using CLOX's feature map output.
  // ============================================================

  const NPC_TEAM = {
    HERO:        'HERO',
    GANG:        'GANG',
    CIVILIAN:    'CIVILIAN',
    VILLAIN:     'VILLAIN',
    CUSTOM:      'CUSTOM',   // FIX 3: edge case custom profiles
  };

  // Mutable team profiles — FIX 2: CLOX flags update these at runtime
  let TEAM_PROFILES = {

    [NPC_TEAM.HERO]: {
      label:               'HERO — Protective / Tactical',
      difficultyPreset:    'NORMAL',
      detectRangeOverride: null,
      useCoverForPlayer:   true,
      broadcastAlly:       true,
      broadcastRadius:     600,
      fatigueEnabled:      true,
      fleeOnThreat:        false,
      useAmbushCover:      false,
      useTargetPrediction: false,
      stalkingMode:        false,
      fullMemory:          false,
      stateBias: { ENGAGE: 0.5, INVESTIGATE: 1.4, PATROL: 1.0, REST: 1.0 },
    },

    [NPC_TEAM.GANG]: {
      label:               'GANG — Predatory / Aggressive',
      difficultyPreset:    'HARD',
      detectRangeOverride: 560,
      useCoverForPlayer:   false,
      broadcastAlly:       true,
      broadcastRadius:     600,
      fatigueEnabled:      true,
      fleeOnThreat:        false,
      useAmbushCover:      false,
      useTargetPrediction: true,
      stalkingMode:        false,
      fullMemory:          false,
      stateBias: { ENGAGE: 2.0, INVESTIGATE: 1.2, PATROL: 0.5, REST: 0.3 },
    },

    [NPC_TEAM.CIVILIAN]: {
      label:               'CIVILIAN — Passive / Reactive',
      difficultyPreset:    'EASY',
      detectRangeOverride: 300,
      useCoverForPlayer:   false,
      broadcastAlly:       false,
      broadcastRadius:     0,
      fatigueEnabled:      false,
      fleeOnThreat:        true,
      fleeTrigger:         30,
      useAmbushCover:      false,
      useTargetPrediction: false,
      stalkingMode:        false,
      fullMemory:          false,
      stateBias: { ENGAGE: 0.0, INVESTIGATE: 0.2, PATROL: 1.5, REST: 1.2 },
    },

    [NPC_TEAM.VILLAIN]: {
      label:               'VILLAIN — Boss / Antagonist',
      difficultyPreset:    'HARD',
      detectRangeOverride: 500,
      useCoverForPlayer:   false,
      broadcastAlly:       false,
      broadcastRadius:     0,
      fatigueEnabled:      false,
      fleeOnThreat:        false,
      useAmbushCover:      true,
      useTargetPrediction: true,
      stalkingMode:        true,
      fullMemory:          true,
      stateBias: { ENGAGE: 3.0, INVESTIGATE: 1.5, PATROL: 0.1, REST: 0.0 },
    },

    // FIX 3: CUSTOM slot — filled by applyCLOXProfile() for edge cases
    [NPC_TEAM.CUSTOM]: {
      label:               'CUSTOM — CLOX Injected Profile',
      difficultyPreset:    'NORMAL',
      detectRangeOverride: null,
      useCoverForPlayer:   false,
      broadcastAlly:       false,
      broadcastRadius:     0,
      fatigueEnabled:      true,
      fleeOnThreat:        false,
      useAmbushCover:      false,
      useTargetPrediction: false,
      stalkingMode:        false,
      fullMemory:          false,
      stateBias: { ENGAGE: 1.0, INVESTIGATE: 1.0, PATROL: 1.0, REST: 1.0 },
    },
  };

  // ============================================================
  // SECTION 4: FIX 1 — applyCLOXProfile() BRIDGE FUNCTION
  // Takes the full CLOX customisation profile output and
  // applies it directly into NPC-MASTER's live CONFIG
  // and TEAM_PROFILES. This is the bridge Trevor requested.
  // ============================================================

  /**
   * Applies a CLOX customisation profile to NPC-MASTER.
   * Call this ONCE before your game loop starts.
   *
   * @param {object} cloxProfile - Output from CLOXBrain.customise()
   * @returns {object} applyReport - What was changed and what was locked
   *
   * @example
   * const profile = CLOXBrain.customise("A horror villain hunts the player");
   * TermarackBrain.applyCLOXProfile(profile);
   * // Now executeTick() uses the CLOX-tuned CONFIG
   */
  function applyCLOXProfile(cloxProfile) {
    if (!cloxProfile || typeof cloxProfile !== 'object') {
      console.warn('[NPC-MASTER] applyCLOXProfile: invalid profile.');
      return null;
    }

    const applyReport = {
      configChanges:     [],
      featureChanges:    [],
      teamProfileUpdate: null,
      lockedBlocked:     [],
      timestamp:         Date.now(),
    };

    // ── STEP 1: Apply numeric CONFIG overrides ──
    // Only numeric/string keys — never touches DIFFICULTY object structure
    const SAFE_CONFIG_KEYS = [
      'ENGAGE_RANGE', 'DETECT_RANGE', 'FOV_ANGLE_DEGREES',
      'THREAT_BUILD_RATE', 'THREAT_DECAY_RATE', 'THREAT_MAX',
      'THREAT_ENGAGE_TRIGGER', 'FATIGUE_MAX', 'FATIGUE_REST_DURATION',
      'FATIGUE_BUILD_RATE', 'ALERT_BROADCAST_RADIUS', 'MEMORY_DURATION_TICKS',
      'NORMAL_CELL_COST', 'WALL_EDGE_COST', 'WALL_BUFFER_RADIUS',
    ];

    if (cloxProfile.config) {
      for (const key of SAFE_CONFIG_KEYS) {
        if (cloxProfile.config[key] !== undefined && cloxProfile.config[key] !== BASE_CONFIG[key]) {
          const oldVal   = CONFIG[key];
          CONFIG[key]    = cloxProfile.config[key];
          applyReport.configChanges.push({
            key,
            from: oldVal,
            to:   CONFIG[key],
          });
        }
      }
    }

    // Apply difficulty preset string (read in executeTick via CONFIG._activePreset)
    if (cloxProfile.difficulty) {
      CONFIG._activePreset = cloxProfile.difficulty.toUpperCase();
    }

    // ── STEP 2: FIX 2 — Wire CLOX feature flags to TEAM_PROFILES ──
    // CLOX's feature map now directly updates the resolved team profile
    const teamKey     = (cloxProfile.npcTeam || NPC_TEAM.GANG).toUpperCase();
    const teamProfile = TEAM_PROFILES[teamKey] || TEAM_PROFILES[NPC_TEAM.GANG];
    const featureMap  = cloxProfile.features || {};

    // Map CLOX feature flags → TEAM_PROFILE boolean fields
    const FEATURE_TO_PROFILE_MAP = {
      'TARGET_PREDICTION':  'useTargetPrediction',
      'ALERT_PROPAGATION':  'broadcastAlly',
      'COVER_SYSTEM':       'useCoverForPlayer',
      'FATIGUE_SYSTEM':     'fatigueEnabled',
      'FLEE_SYSTEM':        'fleeOnThreat',
      'VILLAIN_LOGIC':      'useAmbushCover',
    };

    for (const [cloxFlag, profileField] of Object.entries(FEATURE_TO_PROFILE_MAP)) {
      if (featureMap[cloxFlag] !== undefined) {
        const oldVal             = teamProfile[profileField];
        teamProfile[profileField]= featureMap[cloxFlag];
        applyReport.featureChanges.push({
          cloxFlag,
          profileField,
          from: oldVal,
          to:   featureMap[cloxFlag],
        });
      }
    }

    applyReport.teamProfileUpdate = teamKey;

    // ── STEP 3: FIX 3 — Custom profile injection for edge cases ──
    // If CLOX profile has a customBehavior block, inject into CUSTOM slot
    if (cloxProfile.customBehavior) {
      const cb = cloxProfile.customBehavior;
      Object.assign(TEAM_PROFILES[NPC_TEAM.CUSTOM], cb);
      applyReport.customProfileInjected = true;
    }

    console.info('[NPC-MASTER] Industrial profile applied.');
    return applyReport;
  }

  // ============================================================
  // SECTION 5: MATH UTILITIES
  // ============================================================

  function getDistance(pointA, pointB) {
    return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
  }

  function getAngleToTarget(npc, target) {
    const dx          = target.position.x - npc.position.x;
    const dy          = target.position.y - npc.position.y;
    const angleToTgt  = Math.atan2(dy, dx) * (180 / Math.PI);
    let angleDiff     = angleToTgt - (npc.facingAngle || 0);
    while (angleDiff >  180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;
    return Math.abs(angleDiff);
  }

  function predictTargetPosition(target, velocity = { x: 0, y: 0 }, time = 0.5) {
    return {
      x: target.position.x + velocity.x * time,
      y: target.position.y + velocity.y * time,
    };
  }

  // ============================================================
  // SECTION 6: FIELD OF VIEW CHECK
  // ============================================================

  function isTargetVisible(npc, target, range) {
    const distance = getDistance(npc.position, target.position);
    if (distance > range) return false;
    return getAngleToTarget(npc, target) <= CONFIG.FOV_ANGLE_DEGREES / 2;
  }

  // ============================================================
  // SECTION 7: UTILITY AI DECISION ENGINE
  // Team bias multipliers + CLOX wired feature flags shape behavior.
  // ============================================================

  function decideState(npc, target, effectiveRange, teamProfile) {
    const distance       = getDistance(npc.position, target.position);
    const fatigueFactor  = (npc.fatigue     || 0) / CONFIG.FATIGUE_MAX;
    const threatFactor   = (npc.threatLevel || 0) / CONFIG.THREAT_MAX;
    const hasMemory      = npc.memory?.lastKnownPosition ? 1 : 0;
    const memoryStrength = (npc.memory?.memoryTicksLeft || 0) / CONFIG.MEMORY_DURATION_TICKS;
    const distanceFactor = Math.min(distance / effectiveRange, 1);
    const bias           = teamProfile?.stateBias || { ENGAGE: 1, INVESTIGATE: 1, PATROL: 1, REST: 1 };

    const utilities = {
      [STATE.ENGAGE]:
        (1 - distanceFactor) * threatFactor * (1 - fatigueFactor) * (bias.ENGAGE || 1),
      [STATE.INVESTIGATE]:
        hasMemory * memoryStrength * distanceFactor * (bias.INVESTIGATE || 1),
      [STATE.PATROL]:
        (1 - threatFactor) * (1 - hasMemory) * (bias.PATROL || 1),
      [STATE.REST]:
        fatigueFactor * (bias.REST || 1),
    };

    if (teamProfile?.stateBias?.ENGAGE  === 0.0) utilities[STATE.ENGAGE] = 0;
    if (teamProfile?.stateBias?.REST    === 0.0) utilities[STATE.REST]   = 0;

    let bestState = STATE.PATROL;
    let bestScore = -Infinity;
    for (const state in utilities) {
      if (utilities[state] > bestScore) { bestScore = utilities[state]; bestState = state; }
    }
    return bestState;
  }

  // ============================================================
  // SECTION 8: MIN-HEAP
  // ============================================================

  class MinHeap {
    constructor(comparator) { this.data = []; this.comparator = comparator; }
    push(item) { this.data.push(item); this._bubbleUp(this.data.length - 1); }
    pop() {
      if (!this.data.length) return null;
      const top = this.data[0], last = this.data.pop();
      if (this.data.length) { this.data[0] = last; this._siftDown(0); }
      return top;
    }
    get size() { return this.data.length; }
    _bubbleUp(i) {
      while (i > 0) {
        const p = (i-1) >> 1;
        if (this.comparator(this.data[i], this.data[p]) >= 0) break;
        [this.data[i], this.data[p]] = [this.data[p], this.data[i]]; i = p;
      }
    }
    _siftDown(i) {
      const n = this.data.length;
      while (true) {
        let m = i, l = 2*i+1, r = 2*i+2;
        if (l < n && this.comparator(this.data[l], this.data[m]) < 0) m = l;
        if (r < n && this.comparator(this.data[r], this.data[m]) < 0) m = r;
        if (m === i) break;
        [this.data[i], this.data[m]] = [this.data[m], this.data[i]]; i = m;
      }
    }
  }

  // ============================================================
  // SECTION 9: WEIGHTED GRID BUILDER
  // ============================================================

  function buildCostGrid(rawMap) {
    const rows = rawMap.length, cols = rawMap[0].length;
    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) =>
        rawMap[r][c] === 1 ? CONFIG.WALL_COST : CONFIG.NORMAL_CELL_COST
      )
    );
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rawMap[r][c] !== 1) continue;
        for (let dr = -CONFIG.WALL_BUFFER_RADIUS; dr <= CONFIG.WALL_BUFFER_RADIUS; dr++) {
          for (let dc = -CONFIG.WALL_BUFFER_RADIUS; dc <= CONFIG.WALL_BUFFER_RADIUS; dc++) {
            const nr = r+dr, nc = c+dc;
            if (nr>=0 && nr<rows && nc>=0 && nc<cols && rawMap[nr][nc]!==1)
              grid[nr][nc] = Math.max(grid[nr][nc], CONFIG.WALL_EDGE_COST);
          }
        }
      }
    }
    return grid;
  }

  // ============================================================
  // SECTION 10: PATH CACHING
  // ============================================================

  const PathCache = new Map();
  function getCachedPath(key)       { return PathCache.get(key) || null; }
  function setCachedPath(key, path) { PathCache.set(key, { path, timestamp: Date.now() }); }

  // ============================================================
  // SECTION 11: COVER SYSTEM
  // Standard = safety. Villain ambushMode = firing position.
  // ============================================================

  function findCoverPosition(npc, target, costGrid, ambushMode = false, cellSize = 10) {
    const rows = costGrid.length, cols = costGrid[0].length;
    let bestSpot = null, bestScore = -Infinity;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (costGrid[r][c] === CONFIG.WALL_COST) continue;
        const wp           = { x: c * cellSize, y: r * cellSize };
        const distToNPC    = getDistance(npc.position,    wp);
        const distToTarget = getDistance(target.position, wp);
        const score = ambushMode
          ? (distToTarget * -0.4) - (distToNPC * 0.2) + (costGrid[r][c] * 3)
          : (distToTarget *  0.6) - (distToNPC * 0.3) + (costGrid[r][c] * 2);
        if (score > bestScore) { bestScore = score; bestSpot = { r, c }; }
      }
    }
    return bestSpot;
  }

  // ============================================================
  // SECTION 12: CIVILIAN FLEE SYSTEM
  // ============================================================

  function findFleePosition(npc, target, costGrid, cellSize = 10) {
    const rows = costGrid.length, cols = costGrid[0].length;
    let bestSpot = null, bestScore = -Infinity;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (costGrid[r][c] === CONFIG.WALL_COST)     continue;
        if (costGrid[r][c] >= CONFIG.WALL_EDGE_COST) continue;
        const wp           = { x: c * cellSize, y: r * cellSize };
        const distToNPC    = getDistance(npc.position,    wp);
        const distToTarget = getDistance(target.position, wp);
        const score        = (distToTarget * 0.8) - (distToNPC * 0.4);
        if (score > bestScore) { bestScore = score; bestSpot = { r, c }; }
      }
    }
    return bestSpot;
  }

  // ============================================================
  // SECTION 13: A* PATHFINDING
  // ============================================================

  const DIRECTIONS = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

  function findPath(costGrid, start, goal) {
    const rows = costGrid.length, cols = costGrid[0].length;
    const key  = (r, c) => `${r},${c}`;
    const h    = (r, c) => Math.hypot(goal.r - r, goal.c - c);
    const pq   = new MinHeap((a, b) => a.f - b.f);
    const g    = new Map(), cf = new Map();
    const sk   = key(start.r, start.c);
    g.set(sk, 0);
    pq.push({ r: start.r, c: start.c, f: h(start.r, start.c) });
    while (pq.size > 0) {
      const { r: cr, c: cc } = pq.pop();
      const ck = key(cr, cc);
      if (cr === goal.r && cc === goal.c) return rebuildPath(cf, ck, sk);
      for (const [dr, dc] of DIRECTIONS) {
        const nr = cr+dr, nc = cc+dc;
        if (nr<0||nr>=rows||nc<0||nc>=cols) continue;
        const cc2 = costGrid[nr][nc];
        if (cc2 === CONFIG.WALL_COST) continue;
        const mv  = (dr!==0&&dc!==0) ? cc2*1.414 : cc2;
        const tg  = (g.get(ck)??Infinity) + mv;
        const nk  = key(nr, nc);
        if (tg < (g.get(nk)??Infinity)) {
          cf.set(nk, ck); g.set(nk, tg);
          pq.push({ r: nr, c: nc, f: tg + h(nr, nc) });
        }
      }
    }
    return null;
  }

  function rebuildPath(cf, curKey, startKey) {
    const path = [];
    let cur    = curKey;
    while (cur && cur !== startKey) {
      const [r, c] = cur.split(',').map(Number);
      path.unshift({ r, c }); cur = cf.get(cur);
    }
    if (cur === startKey) {
      const [r, c] = startKey.split(',').map(Number);
      path.unshift({ r, c });
    }
    return path;
  }

  // ============================================================
  // SECTION 14: THREAT LEVEL SYSTEM
  // ============================================================

  function updateThreatLevel(npc, playerVisible, threatMultiplier) {
    if (typeof npc.threatLevel !== 'number') npc.threatLevel = 0;
    npc.threatLevel = playerVisible
      ? Math.min(CONFIG.THREAT_MAX, npc.threatLevel + CONFIG.THREAT_BUILD_RATE * threatMultiplier)
      : Math.max(0, npc.threatLevel - CONFIG.THREAT_DECAY_RATE);
  }

  // ============================================================
  // SECTION 15: FATIGUE SYSTEM
  // ============================================================

  function updateFatigue(npc, currentState, teamProfile) {
    if (teamProfile?.fatigueEnabled === false) {
      npc.fatigue = 0; npc.restTicksLeft = 0; return false;
    }
    if (typeof npc.fatigue       !== 'number') npc.fatigue       = 0;
    if (typeof npc.restTicksLeft !== 'number') npc.restTicksLeft = 0;
    if (npc.restTicksLeft > 0) { npc.restTicksLeft--; return true; }
    if (currentState === STATE.ENGAGE) {
      npc.fatigue += CONFIG.FATIGUE_BUILD_RATE;
      if (npc.fatigue >= CONFIG.FATIGUE_MAX) {
        npc.fatigue = 0; npc.restTicksLeft = CONFIG.FATIGUE_REST_DURATION; return true;
      }
    } else {
      npc.fatigue = Math.max(0, npc.fatigue - 0.5);
    }
    return false;
  }

  // ============================================================
  // SECTION 16: MEMORY SYSTEM
  // ============================================================

  function updateMemory(npc, target, playerVisible, teamProfile) {
    if (!npc.memory) npc.memory = { lastKnownPosition: null, memoryTicksLeft: 0 };
    if (playerVisible) {
      npc.memory.lastKnownPosition = { ...target.position };
      npc.memory.memoryTicksLeft   = CONFIG.MEMORY_DURATION_TICKS;
    } else if (npc.memory.memoryTicksLeft > 0) {
      npc.memory.memoryTicksLeft -= teamProfile?.stalkingMode ? 0.5 : 1;
      if (npc.memory.memoryTicksLeft <= 0) {
        if (teamProfile?.stalkingMode) { npc.memory.memoryTicksLeft = 1; }
        else { npc.memory.lastKnownPosition = null; }
      }
    }
  }

  // ============================================================
  // SECTION 17: ALERT PROPAGATION
  // ============================================================

  function broadcastAlert(npc, target, allNPCs, teamProfile) {
    if (!Array.isArray(allNPCs) || !teamProfile?.broadcastAlly) return;
    const radius = teamProfile.broadcastRadius || CONFIG.ALERT_BROADCAST_RADIUS;
    allNPCs.forEach(ally => {
      if (ally === npc) return;
      if (getDistance(npc.position, ally.position) <= radius) {
        if (!ally.memory) ally.memory = { lastKnownPosition: null, memoryTicksLeft: 0 };
        ally.memory.lastKnownPosition = { ...target.position };
        ally.memory.memoryTicksLeft   = Math.floor(CONFIG.MEMORY_DURATION_TICKS * 0.6);
        ally.alerted = true;
      }
    });
  }

  // ============================================================
  // SECTION 18: DEBUG / TELEMETRY LOGGER
  // ============================================================

  const DebugLog = {
    enabled: false, history: [], maxHistory: 200,
    log(d)       { if (!this.enabled) return; this.history.push({...d,timestamp:Date.now()}); if(this.history.length>this.maxHistory) this.history.shift(); },
    getHistory() { return [...this.history]; },
    clear()      { this.history = []; },
  };

  // ============================================================
  // SECTION 19: PUBLIC API
  // ============================================================

  return {

    VERSION,

    NPC_TEAM,

    // ── FIX 1: CLOX BRIDGE ──
    applyCLOXProfile,

    setDebugMode(e)  { DebugLog.enabled = !!e; },
    getDebugLog()    { return DebugLog.getHistory(); },
    clearDebugLog()  { DebugLog.clear(); },
    getConfig()      { return JSON.parse(JSON.stringify(CONFIG)); },
    getTeamProfiles(){ return JSON.parse(JSON.stringify(TEAM_PROFILES)); },

    /**
     * Main brain tick.
     * npc.team = 'HERO'|'GANG'|'CIVILIAN'|'VILLAIN'|'CUSTOM'
     */
    executeTick(npc, target, environment = null, options = {}) {
      if (!NPCGotBrains.getLicenseStatus().activated) {
        throw new Error('Unauthorized Access: Termarack Kernel Locked');
      }

      // 1. Determine Team Profile and apply difficulty
      const teamKey = (npc.team || NPC_TEAM.GANG).toUpperCase();
      const teamProfile = TEAM_PROFILES[teamKey] || TEAM_PROFILES[NPC_TEAM.GANG];
      
      const difficulty = (
        (CONFIG._activePreset && String(CONFIG._activePreset)) ||
        options.difficulty ||
        teamProfile.difficultyPreset ||
        'NORMAL'
      ).toUpperCase();

      const diffConfig = CONFIG.DIFFICULTY[difficulty] || CONFIG.DIFFICULTY.NORMAL;
      const effectiveDetectRange = teamProfile.detectRangeOverride || (CONFIG.DETECT_RANGE * diffConfig.rangeMultiplier);

      // 2. Calculate visibility
      const playerVisible = isTargetVisible(npc, target, effectiveDetectRange);

      // 3. Update Master Layer Systems
      updateMemory(npc, target, playerVisible, teamProfile);
      updateThreatLevel(npc, playerVisible, diffConfig.threatMultiplier);
      const isResting = updateFatigue(npc, npc.state, teamProfile);

      // 4. Alert Propagation
      if (playerVisible && options.allNPCs) {
        broadcastAlert(npc, target, options.allNPCs, teamProfile);
      }

      // 5. Pathfinding (if grid provided)
      let path = null;
      if (environment?.grid && environment?.npcGridPos && environment?.goalGridPos) {
        const costGrid = buildCostGrid(environment.grid);
        path = findPath(costGrid, environment.npcGridPos, environment.goalGridPos);
      }

      // 6. Execute Kernel Tick (The "Brain")
      const bridgedEnvironment = {
        difficulty,
        grid: environment?.grid || null,
        npcGridPos: environment?.npcGridPos || null,
        goalGridPos: environment?.goalGridPos || null,
        pathHint: path,
      };

      const res = NPCGotBrains.tick(npc, target, bridgedEnvironment);

      // 7. Inject Master Behavioral Flags for Action System
      const brainResult = {
        ...res,
        path: path || res.path,
        team: teamKey,
        isResting,
        usingCover: teamProfile.useCoverForPlayer && res.state === STATE.ENGAGE && res.threatLevel > 40,
        usingAmbush: teamProfile.useAmbushCover && res.state === STATE.INVESTIGATE,
        fleeingDanger: teamProfile.fleeOnThreat && res.threatLevel > (teamProfile.fleeTrigger || CONFIG.THREAT_ENGAGE_TRIGGER),
      };

      DebugLog.log(brainResult);
      return brainResult;
    },
  };

})();

// ============================================================
// MODULE EXPORT
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TermarackBrain;
}
