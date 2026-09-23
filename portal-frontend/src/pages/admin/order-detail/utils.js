export const parseSpecialInstructions = (si) => {
  if (!si) return {};
  const info = {};
  try {
    const parsed = JSON.parse(si);
    Object.assign(info, parsed);
  } catch {
    // Não é JSON, parse como tags
  }
  const rejections = [];
  const reReject = /REJECTED_BY_(\d+)/g;
  let match;
  while ((match = reReject.exec(si)) !== null) {
    rejections.push(parseInt(match[1]));
  }
  info.rejections = rejections;
  const timeouts = [];
  const reTimeout = /TIMEOUT_BY_(\d+)/g;
  while ((match = reTimeout.exec(si)) !== null) {
    timeouts.push(parseInt(match[1]));
  }
  info.timeouts = timeouts;
  const offerMatch = si.match(/OFFERED_TO_(\d+)(?:_(\d+))?/);
  info.current_offer = offerMatch ? parseInt(offerMatch[1]) : null;
  info.offer_timestamp = offerMatch && offerMatch[2] ? parseInt(offerMatch[2]) : null;
  return info;
};
