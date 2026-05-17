
/**
 * ============================================================
 *   CLOX — Neural Customisation Brain
 *   Version: 1.0.0
 *   Project: NPC GOT BRAIN'S
 *   Role: Plot → NPC-MASTER v3.1.1 Customisation Engine
 *   Author: Ulak (Code Improvement Engine)
 *   Auditor: TREVOR (GEMINI)
 * ============================================================
 */

'use strict';

/** Cached NPC-MASTER VERSION for audit manifest (avoids repeated require). */
let _cachedNpcMasterVersion;

function getNpcMasterVersionForManifest() {
  if (_cachedNpcMasterVersion === undefined) {
    try {
      _cachedNpcMasterVersion = require('./NPC-NEURAL-HEAD.js').VERSION;
    } catch (e) {
      _cachedNpcMasterVersion = 'v3.1.1';
    }
  }
  return _cachedNpcMasterVersion;
}

const CLOXBrain = (function () {

  // ============================================================
  // SECTION 1: CORE LOCK SYSTEM
  // These features are PERMANENTLY LOCKED.
  // No user prompt can ever remove or override them.
  // ============================================================

  const CORE_LOCKED_FEATURES = Object.freeze([
    'UTILITY_AI_ENGINE',
    'ASTAR_PATHFINDING',
    'THREAT_LEVEL_SYSTEM',
    'MEMORY_SYSTEM',
    'STATE_MACHINE',
    'FOV_CHECK',
    'DEBUG_LOGGER',
    'AUDIT_MANIFEST',
    'ZERO_DEPENDENCIES',
  ]);

  const CUSTOMIZABLE_FEATURES = Object.freeze([
    'COVER_SYSTEM',
    'PATH_CACHING',
    'TARGET_PREDICTION',
    'ALERT_PROPAGATION',
    'FATIGUE_SYSTEM',
    'DIFFICULTY_SCALING',
    'FOV_ANGLE',
    'ENGAGE_RANGE',
    'DETECT_RANGE',
    'THREAT_BUILD_RATE',
    'THREAT_DECAY_RATE',
    'MEMORY_DURATION',
    'NPC_TEAM',
    'VILLAIN_LOGIC',
    'FLEE_SYSTEM',
  ]);

  // ============================================================
  // SECTION 2: INTENT DETECTION ENGINE
  // Scans user plot text → maps keywords → feature intents.
  // Deterministic: same input always gives same output.
  // ============================================================

  const INTENT_MAP = Object.freeze([

    // ── TEAM INTENTS ──
    {
      intent:    'SET_TEAM_VILLAIN',
      keywords:  ['villain','boss','antagonist','final boss','overlord','dark lord','nemesis','monster'],
      feature:   'NPC_TEAM',
      value:     'VILLAIN',
      priority:  10,
      conflicts: ['SET_TEAM_HERO','SET_TEAM_CIVILIAN','SET_TEAM_GANG'],
      configOverrides: {
        ENGAGE_RANGE:          200,
        DETECT_RANGE:          500,
        FOV_ANGLE_DEGREES:     130,
        THREAT_BUILD_RATE:     9,
        THREAT_DECAY_RATE:     1,
        FATIGUE_MAX:           999,
        MEMORY_DURATION_TICKS: 160,
      },
      activateFeatures:   ['TARGET_PREDICTION','VILLAIN_LOGIC','COVER_SYSTEM','PATH_CACHING'],
      deactivateFeatures: ['FATIGUE_SYSTEM','FLEE_SYSTEM','ALERT_PROPAGATION'],
    },

    {
      intent:    'SET_TEAM_HERO',
      keywords:  ['hero','ally','companion','teammate','bodyguard','protector','friendly','squad','partner'],
      feature:   'NPC_TEAM',
      value:     'HERO',
      priority:  8,
      conflicts: ['SET_TEAM_VILLAIN','SET_TEAM_GANG'],
      configOverrides: {
        ENGAGE_RANGE:          150,
        DETECT_RANGE:          400,
        FOV_ANGLE_DEGREES:     120,
        THREAT_BUILD_RATE:     4,
        THREAT_DECAY_RATE:     3,
        FATIGUE_MAX:           60,
        MEMORY_DURATION_TICKS: 80,
        ALERT_BROADCAST_RADIUS:600,
      },
      activateFeatures:   ['ALERT_PROPAGATION','COVER_SYSTEM','PATH_CACHING','FATIGUE_SYSTEM'],
      deactivateFeatures: ['VILLAIN_LOGIC','FLEE_SYSTEM','TARGET_PREDICTION'],
    },

    {
      intent:    'SET_TEAM_GANG',
      keywords:  ['gang','enemy','soldier','grunt','guard','hostile','attacker','mercenary','bandit','thug'],
      feature:   'NPC_TEAM',
      value:     'GANG',
      priority:  7,
      conflicts: ['SET_TEAM_VILLAIN','SET_TEAM_HERO','SET_TEAM_CIVILIAN'],
      configOverrides: {
        ENGAGE_RANGE:          220,
        DETECT_RANGE:          560,
        FOV_ANGLE_DEGREES:     125,
        THREAT_BUILD_RATE:     7,
        THREAT_DECAY_RATE:     2,
        FATIGUE_MAX:           60,
        MEMORY_DURATION_TICKS: 80,
        ALERT_BROADCAST_RADIUS:600,
      },
      activateFeatures:   ['TARGET_PREDICTION','ALERT_PROPAGATION','COVER_SYSTEM','PATH_CACHING','FATIGUE_SYSTEM'],
      deactivateFeatures: ['VILLAIN_LOGIC','FLEE_SYSTEM'],
    },

    {
      intent:    'SET_TEAM_CIVILIAN',
      keywords:  ['civilian','bystander','innocent','crowd','pedestrian','villager','townfolk','noncombat'],
      feature:   'NPC_TEAM',
      value:     'CIVILIAN',
      priority:  5,
      conflicts: ['SET_TEAM_VILLAIN','SET_TEAM_GANG','SET_TEAM_HERO'],
      configOverrides: {
        ENGAGE_RANGE:          0,
        DETECT_RANGE:          300,
        FOV_ANGLE_DEGREES:     100,
        THREAT_BUILD_RATE:     3,
        THREAT_DECAY_RATE:     4,
        FATIGUE_MAX:           999,
        MEMORY_DURATION_TICKS: 40,
      },
      activateFeatures:   ['FLEE_SYSTEM','PATH_CACHING'],
      deactivateFeatures: ['VILLAIN_LOGIC','TARGET_PREDICTION','ALERT_PROPAGATION','FATIGUE_SYSTEM','COVER_SYSTEM'],
    },

    // ── CUSTOM — Police / Interceptor (v3.1.1 industrial keywords) ──
    // Activates 9 CORE locked + 4 customizable = 13 manifest features (prediction, path cache, alerts, fatigue).
    {
      intent:    'SET_TEAM_CUSTOM_POLICE',
      keywords:  [
        'police', 'interceptor', 'pursuit', 'tactical',
        'predictive', 'coordination', 'high-speed',
      ],
      feature:   'NPC_TEAM',
      value:     'CUSTOM',
      priority:  8,
      conflicts: ['SET_TEAM_VILLAIN','SET_TEAM_HERO','SET_TEAM_GANG','SET_TEAM_CIVILIAN'],
      configOverrides: {
        DETECT_RANGE:           520,
        FOV_ANGLE_DEGREES:      125,
        THREAT_BUILD_RATE:       7,
        MEMORY_DURATION_TICKS:   100,
        ALERT_BROADCAST_RADIUS:   750,
      },
      activateFeatures:   ['TARGET_PREDICTION','ALERT_PROPAGATION','PATH_CACHING','FATIGUE_SYSTEM'],
      deactivateFeatures: ['VILLAIN_LOGIC','FLEE_SYSTEM'],
    },

    // ── DIFFICULTY INTENTS ──
    {
      intent:    'SET_DIFFICULTY_HARD',
      keywords:  ['hard','brutal','relentless','nightmare','impossible','hardcore','elite','veteran','unforgiving'],
      feature:   'DIFFICULTY_SCALING',
      value:     'HARD',
      priority:  9,
      conflicts: ['SET_DIFFICULTY_EASY','SET_DIFFICULTY_NORMAL'],
      configOverrides: {},
      activateFeatures:   [],
      deactivateFeatures: [],
    },
    {
      intent:    'SET_DIFFICULTY_EASY',
      keywords:  ['easy','casual','beginner','simple','relaxed','kids','children','family','chill'],
      feature:   'DIFFICULTY_SCALING',
      value:     'EASY',
      priority:  6,
      conflicts: ['SET_DIFFICULTY_HARD','SET_DIFFICULTY_NORMAL'],
      configOverrides: {},
      activateFeatures:   [],
      deactivateFeatures: [],
    },

    // ── GENRE INTENTS ──
    {
      intent:    'GENRE_HORROR',
      keywords:  ['horror','zombie','ghost','haunted','fear','terror','dark','infection','undead','survive'],
      feature:   'DIFFICULTY_SCALING',
      value:     'HARD',
      priority:  7,
      conflicts: ['SET_DIFFICULTY_EASY'],
      configOverrides: {
        FOV_ANGLE_DEGREES:     100,
        THREAT_BUILD_RATE:     8,
        THREAT_DECAY_RATE:     1,
        MEMORY_DURATION_TICKS: 120,
        ENGAGE_RANGE:          120,
        DETECT_RANGE:          350,
      },
      activateFeatures:   ['COVER_SYSTEM','PATH_CACHING','FATIGUE_SYSTEM'],
      deactivateFeatures: [],
    },
    {
      intent:    'GENRE_STEALTH',
      keywords:  ['stealth','sneak','infiltrate','silent','spy','undetected','covert','ghost','hide'],
      feature:   'DIFFICULTY_SCALING',
      value:     'NORMAL',
      priority:  6,
      conflicts: [],
      configOverrides: {
        FOV_ANGLE_DEGREES:     140,
        THREAT_BUILD_RATE:     6,
        THREAT_DECAY_RATE:     3,
        MEMORY_DURATION_TICKS: 160,
        DETECT_RANGE:          500,
        ENGAGE_RANGE:          90,
      },
      activateFeatures:   ['PATH_CACHING','ALERT_PROPAGATION'],
      deactivateFeatures: ['TARGET_PREDICTION'],
    },
    {
      intent:    'GENRE_SCIFI',
      keywords:  ['robot','cyber','android','drone','laser','tech','space','machine','mech','ai'],
      feature:   'DIFFICULTY_SCALING',
      value:     'HARD',
      priority:  6,
      conflicts: ['SET_DIFFICULTY_EASY'],
      configOverrides: {
        FOV_ANGLE_DEGREES:     130,
        THREAT_BUILD_RATE:     7,
        MEMORY_DURATION_TICKS: 100,
        DETECT_RANGE:          450,
        ENGAGE_RANGE:          180,
      },
      activateFeatures:   ['TARGET_PREDICTION','PATH_CACHING','COVER_SYSTEM'],
      deactivateFeatures: [],
    },
    {
      intent:    'GENRE_FANTASY',
      keywords:  ['knight','sword','magic','dragon','castle','medieval','wizard','archer','dungeon'],
      feature:   'DIFFICULTY_SCALING',
      value:     'NORMAL',
      priority:  5,
      conflicts: [],
      configOverrides: {
        FOV_ANGLE_DEGREES:     110,
        THREAT_BUILD_RATE:     4,
        MEMORY_DURATION_TICKS: 90,
        DETECT_RANGE:          380,
        ENGAGE_RANGE:          160,
      },
      activateFeatures:   ['COVER_SYSTEM','FATIGUE_SYSTEM','PATH_CACHING'],
      deactivateFeatures: ['TARGET_PREDICTION'],
    },
    {
      intent:    'GENRE_ACTION',
      keywords:  ['action','shooter','combat','war','battle','weapon','gun','fight','explosion','military'],
      feature:   'DIFFICULTY_SCALING',
      value:     'NORMAL',
      priority:  5,
      conflicts: [],
      configOverrides: {
        FOV_ANGLE_DEGREES:     120,
        THREAT_BUILD_RATE:     5,
        MEMORY_DURATION_TICKS: 80,
        DETECT_RANGE:          400,
        ENGAGE_RANGE:          150,
      },
      activateFeatures:   ['TARGET_PREDICTION','COVER_SYSTEM','PATH_CACHING','ALERT_PROPAGATION'],
      deactivateFeatures: [],
    },

    // ── USER PERFORMANCE / STRIP REQUESTS (Industrial Audit — Core Lock) ──
    // Matches plain-language asks to turn off core brain systems; Section 4 strips
    // any deactivation targeting CORE_LOCKED_FEATURES and records lockViolationLog.
    {
      intent:    'USER_REQUEST_DISABLE_CORE_ENGINE',
      keywords:  ['run faster', 'deactivate', 'utility ai', 'disable pathfinding', 'pathfinding'],
      feature:   'PERFORMANCE_OVERRIDE',
      value:     null,
      priority:  3,
      conflicts: [],
      configOverrides: {},
      activateFeatures:   [],
      deactivateFeatures: ['UTILITY_AI_ENGINE', 'ASTAR_PATHFINDING', 'DEBUG_LOGGER'],
    },
  ]);

  // ============================================================
  // SECTION 3: CONFLICT RESOLVER
  // When two intents fight over the same feature,
  // the one with the higher priority wins.
  // All conflicts are logged in the audit manifest.
  // ============================================================

  /**
   * Resolves conflicts between detected intents.
   * Higher priority intent wins. Loser is removed.
   *
   * @param {Array} detectedIntents - Array of matched intent objects
   * @returns {{ resolved: Array, conflictLog: Array }}
   */
  function resolveConflicts(detectedIntents) {
    const resolved    = [];
    const conflictLog = [];
    const featureMap  = new Map();

    // Sort by priority descending — highest priority processed first
    const sorted = [...detectedIntents].sort((a, b) => b.priority - a.priority);

    for (const intent of sorted) {
      const existingIntent = featureMap.get(intent.feature);

      if (!existingIntent) {
        // No conflict — claim this feature
        featureMap.set(intent.feature, intent);
        resolved.push(intent);
      } else {
        // Conflict detected — existing intent has higher priority (already sorted)
        conflictLog.push({
          feature:   intent.feature,
          winner:    existingIntent.intent,
          loser:     intent.intent,
          reason:    `Priority ${existingIntent.priority} > ${intent.priority}`,
          timestamp: Date.now(),
        });
        // Loser intent is dropped — not added to resolved
      }
    }

    return { resolved, conflictLog };
  }

  // ============================================================
  // SECTION 4: CORE LOCK GUARD
  // Checks every resolved intent against CORE_LOCKED_FEATURES.
  // If any intent tries to touch a locked feature — it is blocked.
  // The core brain ALWAYS stays intact.
  // ============================================================

  /**
   * Guards locked features from being modified.
   * Removes any deactivation requests targeting locked features.
   *
   * @param {Array} resolvedIntents
   * @returns {{ guarded: Array, lockViolationLog: Array }}
   */
  function applyCoreLock(resolvedIntents) {
    const guarded          = [];
    const lockViolationLog = [];

    for (const intent of resolvedIntents) {
      const safeDeactivate = (intent.deactivateFeatures || []).filter(feat => {
        const isLocked = CORE_LOCKED_FEATURES.includes(feat);
        if (isLocked) {
          lockViolationLog.push({
            blockedFeature: feat,
            blockedBy:      intent.intent,
            reason:         'CORE LOCK — this feature cannot be removed',
            timestamp:      Date.now(),
          });
        }
        return !isLocked; // only keep non-locked deactivations
      });

      guarded.push({ ...intent, deactivateFeatures: safeDeactivate });
    }

    return { guarded, lockViolationLog };
  }

  // ============================================================
  // SECTION 5: PLOT SCANNER
  // Tokenizes the user's plot and matches against INTENT_MAP.
  // ============================================================

  /**
   * Scans the user's plot text and returns all matched intents.
   *
   * @param {string} plotText - Raw user game plot description
   * @returns {Array} matched intent objects
   */
  function scanPlot(plotText) {
    if (!plotText || typeof plotText !== 'string') return [];

    const lower   = plotText.toLowerCase();
    const matched = [];

    for (const intentDef of INTENT_MAP) {
      const foundKeywords = intentDef.keywords.filter(kw => lower.includes(kw));
      if (foundKeywords.length > 0) {
        matched.push({
          ...intentDef,
          foundKeywords,
          matchScore: foundKeywords.length, // more keyword hits = stronger match
        });
      }
    }

    // Sort by match score descending — strongest matches first
    return matched.sort((a, b) => b.matchScore - a.matchScore);
  }

  // ============================================================
  // SECTION 6: CONFIG BUILDER
  // Merges all resolved intent config overrides into one
  // final CONFIG object ready for NPC - MASTER.
  // Higher priority intents override lower priority ones.
  // ============================================================

  /**
   * Base CONFIG — always the starting point.
   * Never mutated directly — always cloned first.
   */
  const BASE_CONFIG = Object.freeze({
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
    DIFFICULTY:             'NORMAL',
  });

  /**
   * Builds the final CONFIG by merging all intent overrides.
   * Lower priority intents are applied first so higher
   * priority ones correctly override them.
   *
   * @param {Array} guardedIntents
   * @returns {object} finalConfig
   */
  function buildFinalConfig(guardedIntents) {
    // Clone base — never mutate the original
    const finalConfig = { ...BASE_CONFIG };

    // Apply overrides lowest priority first — highest priority wins
    const sorted = [...guardedIntents].sort((a, b) => a.priority - b.priority);

    for (const intent of sorted) {
      if (intent.configOverrides) {
        Object.assign(finalConfig, intent.configOverrides);
      }
      if (intent.feature === 'DIFFICULTY_SCALING' && intent.value) {
        finalConfig.DIFFICULTY = intent.value;
      }
      if (intent.feature === 'NPC_TEAM' && intent.value) {
        finalConfig.NPC_TEAM = intent.value;
      }
    }

    return finalConfig;
  }

  // ============================================================
  // SECTION 7: FEATURE ACTIVATION BUILDER
  // Builds the final list of active/inactive features
  // based on all resolved intents.
  // ============================================================

  /**
   * Builds a feature activation map from all guarded intents.
   * Activate takes priority over deactivate for the same feature.
   *
   * @param {Array} guardedIntents
   * @returns {object} featureMap — { FEATURE_NAME: true/false }
   */
  function buildFeatureMap(guardedIntents) {
    const featureMap = {};

    // Start with all customizable features OFF
    for (const feat of CUSTOMIZABLE_FEATURES) {
      featureMap[feat] = false;
    }

    // All locked features always ON
    for (const feat of CORE_LOCKED_FEATURES) {
      featureMap[feat] = true;
    }

    // Apply deactivations first (lower priority)
    for (const intent of guardedIntents) {
      for (const feat of (intent.deactivateFeatures || [])) {
        if (!CORE_LOCKED_FEATURES.includes(feat)) {
          featureMap[feat] = false;
        }
      }
    }

    // Apply activations after (overrides deactivations)
    for (const intent of guardedIntents) {
      for (const feat of (intent.activateFeatures || [])) {
        featureMap[feat] = true;
      }
    }

    return featureMap;
  }

  // ============================================================
  // SECTION 8: AUDIT MANIFEST GENERATOR
  // Every CLOX output ends with a frozen auditManifest.
  // Contains full traceability — genre tags, keywords,
  // timestamp, and official .termaracksecter branding.
  // ============================================================

  /**
   * Generates the frozen audit manifest for this customization.
   *
   * @param {string} plotText        - Original user plot
   * @param {Array}  matchedIntents  - All matched intents before conflict resolution
   * @param {Array}  resolvedIntents - After conflict resolution
   * @param {Array}  conflictLog     - Conflicts that were resolved
   * @param {Array}  lockViolations  - Core lock violations that were blocked
   * @param {object} finalConfig     - The final CONFIG object
   * @param {object} featureMap      - Final feature activation map
   * @returns {object} frozen auditManifest
   */
  function generateAuditManifest(
    plotText,
    matchedIntents,
    resolvedIntents,
    conflictLog,
    lockViolations,
    finalConfig,
    featureMap
  ) {
    const genreTags    = resolvedIntents
      .filter(i => i.intent.startsWith('GENRE_'))
      .map(i => i.intent.replace('GENRE_', ''));

    const teamTag      = resolvedIntents
      .find(i => i.intent.startsWith('SET_TEAM_'))
      ?.value || 'GANG';

    const allKeywords  = [...new Set(
      matchedIntents.flatMap(i => i.foundKeywords)
    )];

    const activeFeats  = Object.entries(featureMap)
      .filter(([, v]) => v)
      .map(([k]) => k);

    return Object.freeze({
      // Identity
      projectName:       'NPC GOT BRAINS',
      brainName:         'NPC - MASTER',
      brainVersion:      getNpcMasterVersionForManifest(),
      cloxVersion:       'v1.0.0',

      // Plot analysis
      plotSummary:       plotText.slice(0, 200).replace(/\n/g, ' '),
      detectedGenres:    genreTags,
      detectedTeam:      teamTag,
      matchedKeywords:   allKeywords,

      // Resolution report
      totalIntentsFound: matchedIntents.length,
      intentsResolved:   resolvedIntents.length,
      conflictsResolved: conflictLog.length,
      conflictLog:       conflictLog,
      lockViolations:    lockViolations.length,
      lockViolationLog:  lockViolations,

      // Output
      finalDifficulty:   finalConfig.DIFFICULTY || 'NORMAL',
      activeFeatures:    activeFeats,
      totalFeatures:     activeFeats.length,

      // Traceability
      auditor:           'TREVOR (GEMINI)',
      generatedBy:       'CLOX v1.0.0 — Ulak',
      timestamp:         new Date().toISOString(),
      branding:          '.termaracksecter',
    });
  }

  // ============================================================
  // SECTION 9: MAIN CUSTOMISATION ENGINE
  // The single function that runs the full pipeline:
  // Scan → Detect → Resolve Conflicts → Core Lock → Build
  // ============================================================

  /**
   * Full CLOX pipeline. Takes raw user plot and returns
   * a complete customisation profile ready for NPC - MASTER.
   *
   * @param {string} plotText - Raw user game plot
   * @returns {object} customisationProfile
   */
  function customise(plotText) {
    if (!plotText || typeof plotText !== 'string' || plotText.trim().length === 0) {
      console.warn('[CLOX] No plot text provided.');
      return null;
    }

    // STEP 1 — Scan plot for intents
    const matchedIntents = scanPlot(plotText);

    if (matchedIntents.length === 0) {
      console.warn('[CLOX] No recognizable intents found in plot. Using defaults.');
    }

    // STEP 2 — Resolve conflicts
    const { resolved: resolvedIntents, conflictLog } = resolveConflicts(matchedIntents);

    // STEP 3 — Apply core lock guard
    const { guarded: guardedIntents, lockViolationLog } = applyCoreLock(resolvedIntents);

    // STEP 4 — Build final CONFIG
    const finalConfig = buildFinalConfig(guardedIntents);

    // STEP 5 — Build feature activation map
    const featureMap = buildFeatureMap(guardedIntents);

    // STEP 6 — Generate audit manifest
    const auditManifest = generateAuditManifest(
      plotText,
      matchedIntents,
      resolvedIntents,
      conflictLog,
      lockViolationLog,
      finalConfig,
      featureMap
    );

    // STEP 7 — Return full customisation profile
    return Object.freeze({
      // Ready to apply directly to NPC - MASTER
      npcTeam:        finalConfig.NPC_TEAM     || 'GANG',
      difficulty:     finalConfig.DIFFICULTY   || 'NORMAL',
      config:         Object.freeze(finalConfig),
      features:       Object.freeze(featureMap),

      // Full pipeline report
      matchedIntents,
      resolvedIntents,
      conflictLog,
      lockViolationLog,

      // Audit manifest — always last, always frozen
      auditManifest,
    });
  }

  // ============================================================
  // SECTION 10: PUBLIC API
  // ============================================================

  return Object.freeze({

    /**
     * Main entry point.
     * Feed it a user plot → get back a full customisation profile.
     *
     * @param {string} plotText
     * @returns {object} customisationProfile
     *
     * @example
     * const profile = CLOXBrain.customise(
     *   "A horror game where a relentless villain boss hunts the player."
     * );
     * // profile.npcTeam     → 'VILLAIN'
     * // profile.difficulty  → 'HARD'
     * // profile.config      → full CONFIG object
     * // profile.features    → feature activation map
     * // profile.auditManifest → frozen manifest with .termaracksecter
     */
    customise,

    /**
     * Returns all locked feature names.
     * These can NEVER be removed by any prompt.
     */
    getLockedFeatures() {
      return [...CORE_LOCKED_FEATURES];
    },

    /**
     * Returns all customizable feature names.
     */
    getCustomizableFeatures() {
      return [...CUSTOMIZABLE_FEATURES];
    },

    /**
     * Returns the base CONFIG before any customisation.
     */
    getBaseConfig() {
      return { ...BASE_CONFIG };
    },

    /**
     * Scans a plot and returns raw matched intents
     * without applying conflict resolution.
     * Useful for debugging or previewing what CLOX detects.
     *
     * @param {string} plotText
     * @returns {Array}
     */
    previewIntents(plotText) {
      return scanPlot(plotText);
    },

  });

})();

// ============================================================
// MODULE EXPORT
// Works in Node.js, browser, and AI Studio
// BYOK: No API keys stored. No globals mutated.
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CLOXBrain;
}


