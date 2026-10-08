import test from 'node:test';
import assert from 'node:assert/strict';
import { createPetInvitation } from '../assets/chat/pet-invitation.js';

function setup(t, enabled = true, inviteText = 'Ask me about Blair') {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let latest;
  const invitation = createPetInvitation({ enabled, inviteText, onChange: value => { latest = value; } });
  t.after(() => invitation.destroy());
  return { invitation, value: () => latest, advance: ms => t.mock.timers.tick(ms) };
}

test('the homepage continuously rotates all three invitations and repeats', t => {
  const { value, advance } = setup(t);
  for (const text of ["Hi, I'm Blair's AI chat pet.", 'Blair choose me cuz fox is her Patronus.', 'Howdy?', "Hi, I'm Blair's AI chat pet."]) {
    assert.deepEqual(value(), { text, introducing: true });
    advance(6000);
  }
});

test('opening chat pauses the introduction until chat closes', t => {
  const { invitation, value, advance } = setup(t);
  invitation.update({ open: true });
  advance(60000);
  assert.deepEqual(value(), { text: 'Ask me about Blair', introducing: false });
  invitation.update({ open: false });
  assert.equal(value().text, "Hi, I'm Blair's AI chat pet.");
  advance(6000);
  assert.equal(value().text, 'Blair choose me cuz fox is her Patronus.');
});

test('hover and keyboard focus preserve the original prompt and pause rotation', t => {
  const { invitation, value, advance } = setup(t);
  for (const interaction of ['hovered', 'focused']) {
    invitation.update({ [interaction]: true });
    advance(30000);
    assert.deepEqual(value(), { text: 'Ask me about Blair', introducing: false });
    invitation.update({ open: true });
    invitation.update({ open: false });
    assert.equal(value().introducing, false);
    invitation.update({ [interaction]: false });
    assert.equal(value().text, "Hi, I'm Blair's AI chat pet.");
    assert.equal(value().introducing, true);
  }
});

test('project pages retain their original invitation without automatic messages', t => {
  const { invitation, value, advance } = setup(t, false, 'Ask me about this project');
  advance(60000);
  invitation.update({ hovered: true });
  assert.deepEqual(value(), { text: 'Ask me about this project', introducing: false });
});

test('backgrounding and cleanup stop the rotation', t => {
  const { invitation, value, advance } = setup(t);
  invitation.update({ hidden: true });
  advance(60000);
  invitation.update({ hidden: false });
  assert.equal(value().text, "Hi, I'm Blair's AI chat pet.");
  advance(6000);
  assert.equal(value().text, 'Blair choose me cuz fox is her Patronus.');
  invitation.destroy();
  advance(60000);
  assert.equal(value().text, 'Blair choose me cuz fox is her Patronus.');
});
