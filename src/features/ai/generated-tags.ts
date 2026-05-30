export function buildGeneratedTags(platform: string, topic?: string) {
  const baseTags = [platform, "AI创作", "短图文", "内容清单"];
  const topicText = topic?.trim();

  return baseTags
    .map((tag) => tag.trim())
    .filter((tag, index, tags) => tag && tag !== topicText && tags.indexOf(tag) === index);
}

export function removeTopicTag(tags: string, topic?: string | null) {
  const topicText = topic?.trim();

  if (!topicText) {
    return tags;
  }

  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag && tag !== topicText)
    .join(",");
}
