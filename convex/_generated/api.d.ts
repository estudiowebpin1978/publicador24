/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_aiGenerate from "../actions/aiGenerate.js";
import type * as actions_analyzeContent from "../actions/analyzeContent.js";
import type * as actions_autoRefill from "../actions/autoRefill.js";
import type * as actions_autonomousLoop from "../actions/autonomousLoop.js";
import type * as actions_campaignGenerator from "../actions/campaignGenerator.js";
import type * as actions_campaignHealth from "../actions/campaignHealth.js";
import type * as actions_chatAI from "../actions/chatAI.js";
import type * as actions_collectAnalytics from "../actions/collectAnalytics.js";
import type * as actions_contentCalendar from "../actions/contentCalendar.js";
import type * as actions_contentDiversity from "../actions/contentDiversity.js";
import type * as actions_generateContent from "../actions/generateContent.js";
import type * as actions_generateHashtags from "../actions/generateHashtags.js";
import type * as actions_imageGenerator from "../actions/imageGenerator.js";
import type * as actions_orchestrator from "../actions/orchestrator.js";
import type * as actions_processQueue from "../actions/processQueue.js";
import type * as actions_publishContent from "../actions/publishContent.js";
import type * as actions_qualityControl from "../actions/qualityControl.js";
import type * as actions_safetyCheck from "../actions/safetyCheck.js";
import type * as actions_scoreContent from "../actions/scoreContent.js";
import type * as actions_smartScheduler from "../actions/smartScheduler.js";
import type * as actions_socialPublish from "../actions/socialPublish.js";
import type * as actions_strategyMemory from "../actions/strategyMemory.js";
import type * as aiGenerations from "../aiGenerations.js";
import type * as aiUsage from "../aiUsage.js";
import type * as analytics from "../analytics.js";
import type * as auditLogs from "../auditLogs.js";
import type * as autopilot from "../autopilot.js";
import type * as brandProfiles from "../brandProfiles.js";
import type * as buffer from "../buffer.js";
import type * as bufferActions from "../bufferActions.js";
import type * as campaigns from "../campaigns.js";
import type * as content from "../content.js";
import type * as contentPacks from "../contentPacks.js";
import type * as contentPieces from "../contentPieces.js";
import type * as contentPlatformVariants from "../contentPlatformVariants.js";
import type * as contentVariants from "../contentVariants.js";
import type * as generatedImages from "../generatedImages.js";
import type * as hashtags from "../hashtags.js";
import type * as jobs from "../jobs.js";
import type * as media from "../media.js";
import type * as notifications from "../notifications.js";
import type * as projects from "../projects.js";
import type * as publicationSafety from "../publicationSafety.js";
import type * as publishAttempts from "../publishAttempts.js";
import type * as publishedPosts from "../publishedPosts.js";
import type * as scheduledPosts from "../scheduledPosts.js";
import type * as settings from "../settings.js";
import type * as socialAccounts from "../socialAccounts.js";
import type * as strategyMemory from "../strategyMemory.js";
import type * as trends from "../trends.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/aiGenerate": typeof actions_aiGenerate;
  "actions/analyzeContent": typeof actions_analyzeContent;
  "actions/autoRefill": typeof actions_autoRefill;
  "actions/autonomousLoop": typeof actions_autonomousLoop;
  "actions/campaignGenerator": typeof actions_campaignGenerator;
  "actions/campaignHealth": typeof actions_campaignHealth;
  "actions/chatAI": typeof actions_chatAI;
  "actions/collectAnalytics": typeof actions_collectAnalytics;
  "actions/contentCalendar": typeof actions_contentCalendar;
  "actions/contentDiversity": typeof actions_contentDiversity;
  "actions/generateContent": typeof actions_generateContent;
  "actions/generateHashtags": typeof actions_generateHashtags;
  "actions/imageGenerator": typeof actions_imageGenerator;
  "actions/orchestrator": typeof actions_orchestrator;
  "actions/processQueue": typeof actions_processQueue;
  "actions/publishContent": typeof actions_publishContent;
  "actions/qualityControl": typeof actions_qualityControl;
  "actions/safetyCheck": typeof actions_safetyCheck;
  "actions/scoreContent": typeof actions_scoreContent;
  "actions/smartScheduler": typeof actions_smartScheduler;
  "actions/socialPublish": typeof actions_socialPublish;
  "actions/strategyMemory": typeof actions_strategyMemory;
  aiGenerations: typeof aiGenerations;
  aiUsage: typeof aiUsage;
  analytics: typeof analytics;
  auditLogs: typeof auditLogs;
  autopilot: typeof autopilot;
  brandProfiles: typeof brandProfiles;
  buffer: typeof buffer;
  bufferActions: typeof bufferActions;
  campaigns: typeof campaigns;
  content: typeof content;
  contentPacks: typeof contentPacks;
  contentPieces: typeof contentPieces;
  contentPlatformVariants: typeof contentPlatformVariants;
  contentVariants: typeof contentVariants;
  generatedImages: typeof generatedImages;
  hashtags: typeof hashtags;
  jobs: typeof jobs;
  media: typeof media;
  notifications: typeof notifications;
  projects: typeof projects;
  publicationSafety: typeof publicationSafety;
  publishAttempts: typeof publishAttempts;
  publishedPosts: typeof publishedPosts;
  scheduledPosts: typeof scheduledPosts;
  settings: typeof settings;
  socialAccounts: typeof socialAccounts;
  strategyMemory: typeof strategyMemory;
  trends: typeof trends;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
