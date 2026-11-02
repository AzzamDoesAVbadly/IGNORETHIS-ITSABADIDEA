// LinkedIn posting as the connected member (w_member_social). LinkedIn access tokens last
// 60 days and standard apps get no refresh token, so reconnect in Mission Control about every two months.
export const linkedinReady = (env = process.env) => Boolean(env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_PERSON_URN);

export async function linkedinPost({ text, url, title }, env = process.env) {
  const content = {
    shareCommentary: { text: text.slice(0, 2900) },
    shareMediaCategory: url ? "ARTICLE" : "NONE",
    ...(url ? { media: [{ status: "READY", originalUrl: url, ...(title ? { title: { text: title.slice(0, 200) } } : {}) }] } : {}),
  };
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({
      author: env.LINKEDIN_PERSON_URN,
      lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": content },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(res.status === 401 ? "LinkedIn token expired: reconnect LinkedIn in Mission Control" : `LinkedIn post failed: HTTP ${res.status} ${body}`);
  }
  const id = res.headers.get("x-restli-id") || (await res.json().catch(() => ({}))).id;
  return { id, url: id ? `https://www.linkedin.com/feed/update/${id}/` : "https://www.linkedin.com/feed/" };
}
