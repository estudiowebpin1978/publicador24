import type { AutopilotLevel } from '@/types';
import type { PublishDecisionInput, PublishDecisionResult, PublishDecision } from '@/lib/ai/engines';

const DECISION_MATRIX: Record<string, Record<string, PublishDecision>> = {
  'APPROVE': {
    'AUTO': 'APPROVE',
    'SAFE_AUTO': 'APPROVE',
    'ASSISTED': 'REVIEW',
    'MANUAL': 'REVIEW',
  },
  'REVIEW': {
    'AUTO': 'REVIEW',
    'SAFE_AUTO': 'REVIEW',
    'ASSISTED': 'REVIEW',
    'MANUAL': 'MANUAL_REQUIRED',
  },
  'WAIT': {
    'AUTO': 'WAIT',
    'SAFE_AUTO': 'WAIT',
    'ASSISTED': 'MANUAL_REQUIRED',
    'MANUAL': 'MANUAL_REQUIRED',
  },
  'BLOCK': {
    'AUTO': 'BLOCK',
    'SAFE_AUTO': 'BLOCK',
    'ASSISTED': 'BLOCK',
    'MANUAL': 'BLOCK',
  },
};

export function evaluatePublishDecision(input: PublishDecisionInput): PublishDecisionResult {
  const factors: Record<string, string> = {};

  if (!input.tokenValid) {
    return makeDecision('BLOCK', 'Token is invalid or expired', factors);
  }

  if (input.rateLimit === 'BLOCKED') {
    return makeDecision('BLOCK', 'API rate limit is blocked', factors);
  }

  if (input.permissions === 'MISSING') {
    factors.permissions = 'Missing required permissions';
    return makeDecision('BLOCK', 'Missing required platform permissions', factors);
  }

  if (input.platformValidation === 'FAIL') {
    factors.platformValidation = 'Platform validation failed';
    return makeDecision('BLOCK', 'Platform validation failed', factors);
  }

  if (input.spamRisk >= 80) {
    factors.spamRisk = `High spam risk: ${input.spamRisk}/100`;
    return makeDecision('BLOCK', 'Content flagged as high spam risk', factors);
  }

  if (input.accountHealth < 30) {
    factors.accountHealth = `Low account health: ${input.accountHealth}/100`;
    return makeDecision('BLOCK', 'Account health critically low', factors);
  }

  if (input.rateLimit === 'THROTTLED') {
    factors.rateLimit = 'API rate limited — throttled';
    const autoLevel = input.autopilotLevel;
    if (autoLevel === 'AUTO' || autoLevel === 'SAFE_AUTO') {
      return makeDecision('WAIT', 'Rate limited — waiting for reset', factors);
    }
    return makeDecision('MANUAL_REQUIRED', 'Rate limited — manual intervention needed', factors);
  }

  if (input.contentScore >= 70 && input.spamRisk < 30 && input.accountHealth >= 60) {
    factors.contentScore = `Strong score: ${input.contentScore}/100`;
    factors.spamRisk = `Low risk: ${input.spamRisk}/100`;
    factors.accountHealth = `Good health: ${input.accountHealth}/100`;
    return applyAutopilotLevel('APPROVE', input.autopilotLevel, factors);
  }

  if (input.contentScore >= 50) {
    factors.contentScore = `Moderate score: ${input.contentScore}/100`;
    return applyAutopilotLevel('REVIEW', input.autopilotLevel, factors);
  }

  factors.contentScore = `Low score: ${input.contentScore}/100`;
  return applyAutopilotLevel('REVIEW', input.autopilotLevel, factors);
}

function applyAutopilotLevel(
  baseDecision: string,
  autopilotLevel: AutopilotLevel,
  factors: Record<string, string>
): PublishDecisionResult {
  const mapped = DECISION_MATRIX[baseDecision]?.[autopilotLevel];
  const decision: PublishDecision = mapped || 'MANUAL_REQUIRED';

  factors.autopilotLevel = `Level: ${autopilotLevel}`;

  const reasons: Record<PublishDecision, string> = {
    APPROVE: 'Content meets quality thresholds for auto-publish',
    REVIEW: 'Content requires review before publishing',
    WAIT: 'Waiting for conditions to improve',
    MANUAL_REQUIRED: 'Manual intervention required',
    BLOCK: 'Content blocked due to policy or quality issues',
  };

  return makeDecision(decision, reasons[decision], factors);
}

function makeDecision(
  decision: PublishDecision,
  reason: string,
  factors: Record<string, string>
): PublishDecisionResult {
  return { decision, reason, factors };
}

export function getDecisionLabel(decision: PublishDecision): string {
  const labels: Record<PublishDecision, string> = {
    APPROVE: 'Approved for publishing',
    REVIEW: 'Needs review',
    WAIT: 'On hold',
    MANUAL_REQUIRED: 'Manual action needed',
    BLOCK: 'Blocked',
  };
  return labels[decision] || 'Unknown';
}

export function canAutoPublish(decision: PublishDecision): boolean {
  return decision === 'APPROVE';
}

export function requiresAttention(decision: PublishDecision): boolean {
  return decision === 'REVIEW' || decision === 'MANUAL_REQUIRED';
}
