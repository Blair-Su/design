// Curated public portfolio information. These are visibly labelled saved
// answers, never presented as an AI-generated reply.
const projects = {
  hhi: {
    name: 'HHI Concours', path: '/project-3-hhi/', match: /\bhhi\b|concours|ticket|arrival|门票|到达|车展/i,
    en: 'HHI Concours is a client-sponsored project about improving the visitor journey. Blair contributed research and product design, including a ticket confirmation email that helps guests prepare for arrival.',
    zh: 'HHI Concours 是一个客户合作项目，围绕访客体验展开。Blair 参与了用户研究和产品设计，包括帮助访客提前规划到场安排的门票确认邮件。',
  },
  lighthouse: {
    name: 'Lighthouse', path: '/project-1-lighthouse/', match: /lighthouse|diabet|travel|灯塔|糖尿病|旅行/i,
    en: 'Lighthouse is a student team concept supporting travelers with diabetes. It brings together dining guidance, Lighthouse stations and routine reminders. Blair worked on the product design and later rebuilt the prototype with AI-assisted coding.',
    zh: 'Lighthouse 是一个学生团队概念项目，为有糖尿病管理需求的旅行者整合用餐指引、Lighthouse 站点和日常提醒。Blair 参与产品设计，并在之后使用 AI 辅助编程重建了原型。',
  },
  southern: {
    name: 'Southern Crafted', path: '/project-2-southerncrafted/', match: /southern|craft|commerce|shopping|电商|购物|手工艺/i,
    en: 'Southern Crafted is a student team e-commerce redesign. Blair worked on information architecture and interface design to make locally crafted products easier to discover and shop for, balancing the brand story with clearer navigation.',
    zh: 'Southern Crafted 是一个学生团队电商改版项目。Blair 参与信息架构和界面设计，让当地手工艺产品更容易被发现和购买，同时兼顾品牌故事与清晰的导航。',
  },
  nalu: {
    name: 'Nalu', path: '/project-4-nalu/', match: /nalu|wellness|fitness|cycle|健康|健身|周期/i,
    en: 'Nalu is a student team wellness concept that connects daily check-ins with exercise planning. Blair helped establish the concept and led prototyping feedback sessions. It is a design concept, not medical advice or a clinically validated service.',
    zh: 'Nalu 是一个学生团队健康服务概念，将每日状态记录与运动规划结合。Blair 参与建立设计概念，并主导原型反馈环节。它是设计概念，不提供医疗建议，也不代表经过临床验证的服务。',
  },
};

export function faqSuggestions(chinese = false) {
  return chinese ? ['Blair 有什么设计背景？', '先看哪个项目？', '怎么联系 Blair？']
    : ['What is Blair’s design background?', 'What should I explore first?', 'How can I get in touch with Blair?'];
}

export function fallbackAnswer({ message = '', pageContext = {} } = {}) {
  const zh = /[\u3400-\u9fff]/.test(message);
  const about = zh ? '[了解 Blair](/about.html)' : '[Meet Blair](/about.html)';
  let content;
  if (/contact|email|reach|get in touch|联系|邮箱|邮件/i.test(message)) {
    content = zh ? '可以通过 [邮件](mailto:suxun70@gmail.com) 或 [LinkedIn](https://www.linkedin.com/in/blair-xun-su-1263921a9) 联系 Blair。'
      : 'You can reach Blair by [email](mailto:suxun70@gmail.com) or on [LinkedIn](https://www.linkedin.com/in/blair-xun-su-1263921a9).';
  } else if (/background|education|experience|who is|about blair|背景|学历|经历|介绍.*blair/i.test(message)) {
    content = (zh ? 'Blair Su 是一名具有商业和服务设计背景的产品设计师，关注如何把用户需求、利益相关方目标与完整体验连接起来。' : 'Blair Su is a product designer with a background in business and service design. Her work connects user needs, stakeholder priorities and the systems around a product experience.') + `\n\n${about}`;
  } else if (/\bai\b|artificial intelligence|人工智能|辅助编程/i.test(message)) {
    content = (zh ? 'Blair 使用 AI 探索想法、加快原型制作，并将早期概念变成可以测试的体验。她在作品集中展示了 AI 辅助编程的应用，包括 HHI 确认邮件原型和 Lighthouse 原型。' : 'Blair uses AI to explore ideas, prototype quickly and turn early concepts into testable experiences. Her portfolio includes AI-assisted prototypes for the HHI confirmation email and Lighthouse.') + '\n\n[HHI Concours](/project-3-hhi/) · [Lighthouse](/project-1-lighthouse/)';
  } else if (/explore|start|first|recommend|projects|先看|推荐|哪些项目/i.test(message)) {
    content = zh ? '可以先看 [HHI Concours](/project-3-hhi/)，了解 Blair 如何将研究转化为访客体验设计；再看 [Lighthouse](/project-1-lighthouse/) 的服务概念与原型。\n\n也可以浏览 [Southern Crafted](/project-2-southerncrafted/) 和 [Nalu](/project-4-nalu/)。'
      : 'Start with [HHI Concours](/project-3-hhi/) to explore research and visitor experience, then [Lighthouse](/project-1-lighthouse/) for a service concept and prototype.\n\nYou can also explore [Southern Crafted](/project-2-southerncrafted/) and [Nalu](/project-4-nalu/).';
  } else {
    const project = Object.values(projects).find(p => p.match.test(message))
      || (/this project|this design|这个项目|该项目/i.test(message) ? Object.values(projects).find(p => p.path.includes(pageContext.projectSlug || '\0')) : null);
    content = project ? `${project[zh ? 'zh' : 'en']}\n\n[${project.name}](${project.path})`
      : zh ? '这份预设问答暂时没有涵盖你的问题。你可以查看 [作品集](/#work)、[关于 Blair](/about.html)，或者 [直接联系 Blair](mailto:suxun70@gmail.com)。'
        : 'The saved portfolio answers do not cover this question. You can explore [Blair’s work](/#work), [read about Blair](/about.html), or [contact Blair directly](mailto:suxun70@gmail.com).';
  }
  return { content, note: zh ? 'AI 暂时不可用，以下是预先整理的作品集资料。' : 'AI is unavailable right now. This is a saved portfolio answer.', chinese: zh };
}
