import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestions, pageContext } from '../assets/chat/catalog.js';

const home = pageContext('/');
const hhi = pageContext('/hhi-preview/');
const exchange = (question, answer = 'Portfolio answer.') => [
  { role: 'user', content: question, status: 'complete' },
  { role: 'assistant', content: answer, status: 'complete' },
];
const projectQuestion = /HHI|Lighthouse|Southern Crafted|Nalu|this project|the prototype|the redesign/i;
const expectGeneral = questions => {
  assert.ok(questions.length > 0);
  assert.ok(questions.every(question => !projectQuestion.test(question)), questions.join('\n'));
};

test('background, portfolio overviews and loose answer keywords do not establish a project', () => {
  for (const [question, answer] of [
    ['What is Blair’s design background?', 'Blair worked with HHI Concours and enjoys travel and craft.'],
    ['What should I explore first?', 'Try HHI Concours, Lighthouse, Southern Crafted or Nalu.'],
    ['Tell me about Blair.', 'HHI Concours is one of her projects.'],
    ['What does she enjoy outside work?', 'Travel, craft, shopping and fitness.'],
  ]) expectGeneral(suggestions(home, exchange(question, answer)));
});

test('an explicit project question enables only that project, with named followups', () => {
  const questions = suggestions(home, exchange('Tell me about HHI Concours.', 'Lighthouse is another portfolio project.'));
  assert.ok(questions.includes('What did Blair learn from HHI?'));
  assert.ok(questions.every(question => /HHI/.test(question)));
  assert.ok(questions.every(question => !/this project/i.test(question)));
});

test('a project stays active across clear followups, and resets on a general question', () => {
  const focused = [...exchange('Tell me about HHI.'), ...exchange('What did Blair learn?')];
  assert.ok(suggestions(home, focused).every(question => /HHI/.test(question)));
  for (const question of ['How can I contact Blair?', 'What is Blair’s design background?', 'How does Blair use AI?', '你好']) {
    expectGeneral(suggestions(hhi, [...focused, ...exchange(question, 'Her work includes HHI Concours.')]));
  }
});

test('multiple projects and project switches do not inherit the old page or conversation topic', () => {
  const previous = exchange('Tell me about HHI.');
  expectGeneral(suggestions(hhi, [...previous, ...exchange('Compare HHI and Lighthouse.')]));
  assert.ok(suggestions(hhi, [...previous, ...exchange('Tell me about Nalu.')]).every(question => /Nalu/.test(question)));
});

test('the project page supplies initial prompts and explicit this-project context only', () => {
  assert.ok(suggestions(hhi).every(question => /HHI/.test(question)));
  assert.ok(suggestions(hhi, exchange('What did Blair learn from this project?')).every(question => /HHI/.test(question)));
  expectGeneral(suggestions(home, exchange('What did Blair learn from this project?')));
  expectGeneral(suggestions(hhi, exchange('Who is Blair?', 'Blair designed the HHI ticket email.')));
});

test('Chinese references, incomplete responses and already asked questions are handled', () => {
  assert.ok(suggestions(home, [...exchange('介绍一下 Lighthouse'), ...exchange('这个项目有什么收获？')]).every(question => /Lighthouse/.test(question)));
  expectGeneral(suggestions(home, [...exchange('介绍一下 Lighthouse'), ...exchange('Blair 有什么背景？', 'Blair designed Lighthouse.')]));
  const interrupted = exchange('Tell me about HHI.');
  interrupted[1].status = 'interrupted';
  expectGeneral(suggestions(hhi, interrupted));
  const questions = suggestions(home, exchange('What did Blair learn from HHI?'));
  assert.ok(!questions.includes('What did Blair learn from HHI?'));
  assert.ok(questions.includes('What did Blair design for HHI?'));
});
