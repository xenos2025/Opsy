// Compatibility import for unreleased Opsy callers. Active work uses buyer-faq.mjs
// and config/buyer_faq.json; this file must not revive opsy-faq-library-v1.
export {
  buildFaqTopicSeeds,
  routeBuyerFaqItemForOpsy,
  selectBuyerFaq,
  selectBuyerFaqQuestionSignals,
  selectEligibleBuyerFaqAnswers,
  summarizeBuyerFaqRoutes,
  validateBuyerFaq as validateFaqLibrary,
  validateBuyerFaqFile as validateFaqLibraryFile,
} from "./buyer-faq.mjs";
