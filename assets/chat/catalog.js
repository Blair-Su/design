export const projects = {
  'project-3-hhi': { title: 'HHI Concours', keywords: /hhi|concours|ticket|arrival/i, questions: ['What did Blair design for HHI?', 'How did research shape HHI’s ticket email?', 'What did Blair learn from HHI?'] },
  'project-1-lighthouse': { title: 'Lighthouse', keywords: /lighthouse|diabet|travel/i, questions: ['How does Lighthouse work?', 'What was Blair’s role in Lighthouse?', 'How did Blair use AI to rebuild Lighthouse?'] },
  'project-2-southerncrafted': { title: 'Southern Crafted', keywords: /southern|craft|commerce|shopping/i, questions: ['What changed in Southern Crafted’s redesign?', 'How did Blair improve Southern Crafted’s shopping experience?', 'How was Southern Crafted’s redesign tested?'] },
  'project-4-nalu': { title: 'Nalu', keywords: /nalu|wellness|fitness|cycle/i, questions: ['What is Nalu?', 'What did Nalu’s prototyping reveal?', 'What was Blair’s role in Nalu?'] },
};
export const photos = {
  hhi: { src: '/assets/selected-projects/hhi-project-cover.png', title: 'HHI Concours', alt: 'HHI Concours visitor journey project', href: '/project-3-hhi/' },
  lighthouse: { src: '/assets/case-studies/lighthouse-cover-960.webp', title: 'Lighthouse', alt: 'Lighthouse travel support concept', href: '/project-1-lighthouse/' },
  southern: { src: '/assets/case-studies/fTNwgzhihUwdXBxzkZoPmY715s.webp', title: 'Southern Crafted', alt: 'Southern Crafted e-commerce design', href: '/project-2-southerncrafted/' },
  nalu: { src: '/assets/selected-projects/nalu-project-scene.svg', title: 'Nalu', alt: 'Nalu cycle-aware wellness concept', href: '/project-4-nalu/' },
  blair: { src: '/assets/about/blair-selfie.jpg', title: 'Meet Blair', alt: 'Blair outdoors in the afternoon sunlight', href: '/about.html' },
  team: { src: '/assets/about/diving-scad-serve-team.jpg', title: 'With the team', alt: 'Blair with the SCAD SERVE team', href: '/about.html' },
  mountains: { src: '/assets/about/diving-mountain-view.jpg', title: 'Beyond the screen', alt: 'Blair taking in a snowy mountain view', href: '/about.html' },
};
export function pageContext(pathname, projectSlug) {
  const aliases = { '/hhi-preview/': 'project-3-hhi', '/lighthouse-preview/': 'project-1-lighthouse' };
  const slug = projectSlug || aliases[pathname] || pathname.split('/').filter(Boolean)[0];
  if (Object.hasOwn(projects, slug)) return { page: 'project', projectSlug: slug, projectTitle: projects[slug].title, version: pathname.includes('-preview') ? 'preview' : 'published' };
  return { page: pathname.includes('about') ? 'about' : 'home' };
}
const general = ['What should I explore first?', 'What is Blair’s design background?', 'How does Blair use AI?', 'How can I get in touch with Blair?'];
const projectNames = {
  'project-3-hhi': /\bhhi\b|\bhilton head island concours\b/i,
  'project-1-lighthouse': /\blighthouse\b|灯塔/i,
  'project-2-southerncrafted': /\bsouthern\s+crafted\b/i,
  'project-4-nalu': /\bnalu\b/i,
};
const generalTopic = /\b(background|education|career|resume|contact|email|availability|hobbies)\b|\b(who is blair|get in touch|other projects|other work|explore first)\b|how does blair use ai|背景|学历|教育|职业|简历|联系|邮箱|爱好|其他项目|先看哪个|怎么使用\s*ai/i;
const projectReference = /\b(this|that|the)\s+(project|case study|concept|prototype|redesign)\b|这个项目|该项目|这个设计|这个原型/i;
const projectFollowup = /\b(it|its|research|learn(?:ed|t)?|learning|test(?:ed|ing)?|prototype|prototyping|challenge[s]?|finding[s]?|outcome[s]?|result[s]?|impact|decision[s]?|role|solution|process|approach|validation)\b|\b(tell me more|go on|what else)\b|研究|学到|收获|测试|原型|挑战|发现|成果|结果|影响|决策|角色|方案|流程|方法|验证|继续|详细|还有呢/i;

function conversationProject(context, messages) {
  const pageProject = Object.hasOwn(projects, context.projectSlug) ? context.projectSlug : null;
  if (!messages.length) return pageProject;
  let active = null;
  for (let i = 0; i < messages.length; i++) {
    const question = messages[i];
    if (question.role !== 'user') continue;
    const answer = messages[i + 1];
    if (question.status !== 'complete' || answer?.role !== 'assistant' || answer.status !== 'complete' || answer.kind === 'faq') {
      active = null;
      continue;
    }
    const text = question.content;
    const named = Object.entries(projectNames).filter(([, pattern]) => pattern.test(text)).map(([slug]) => slug);
    // A profile answer can mention several clients or projects in passing.
    // Only the visitor's question establishes a topic; assistant keywords do not.
    if (generalTopic.test(text) || named.length > 1) active = null;
    else if (named.length === 1) active = named[0];
    else if (projectReference.test(text)) active = active || pageProject;
    else if (!projectFollowup.test(text)) active = null;
  }
  return active;
}

export function suggestions(context, messages = []) {
  const asked = new Set(messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase().replace(/[’']/g, '').replace(/[?!.]/g, '').trim()));
  const active = conversationProject(context, messages);
  const candidates = [...(projects[active]?.questions || []), ...general];
  return [...new Set(candidates)].filter(q => !asked.has(q.toLowerCase().replace(/[’']/g, '').replace(/[?!.]/g, '').trim())).slice(0, 3);
}
