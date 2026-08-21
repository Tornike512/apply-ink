export function portfolioUrlForApplication(profile: {
  portfolioUrl: string;
  githubUrl: string;
}): string {
  return profile.portfolioUrl.trim() || profile.githubUrl.trim();
}
