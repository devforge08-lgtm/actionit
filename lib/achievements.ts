export type Achievement = {
  id: string;
  title: string;
  description: string | null;
  link: string;
};

export type AchievementInput = { title: string; description: string; link: string };

export const MAX_ACHIEVEMENTS = 20;

type Checked =
  | { error: string; value?: undefined }
  | { error?: undefined; value: { title: string; description: string | null; link: string } };

/** Trims the fields and returns an error message if something's off. */
export function checkAchievement(input: AchievementInput): Checked {
  const title = input.title.trim();
  const description = input.description.trim();
  const link = input.link.trim();

  if (title.length < 2) return { error: "Give it a title" };
  if (title.length > 100) return { error: "Keep the title under 100 characters" };
  if (description.length > 1000) return { error: "Keep the description under 1000 characters" };
  if (!/^https?:\/\/\S+$/i.test(link)) return { error: "The link must start with http:// or https://" };
  if (link.length > 500) return { error: "That link is too long" };

  return { value: { title, description: description || null, link } };
}

/** A short label for where a link points, shown next to it. */
export function linkLabel(link: string) {
  let host = "";
  try {
    host = new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
  if (host === "github.com" || host.endsWith(".github.io")) return "GitHub";
  if (host === "gitlab.com") return "GitLab";
  if (host === "drive.google.com" || host === "docs.google.com") return "Google Drive";
  if (host === "youtube.com" || host === "youtu.be") return "YouTube";
  if (host === "behance.net") return "Behance";
  if (host === "figma.com") return "Figma";
  if (host === "dribbble.com") return "Dribbble";
  return host;
}
