export const PET_INVITATION_INTERVAL = 6000;
export const PET_INVITATIONS = [
  "Hi, I'm Blair's AI chat pet.",
  'Blair choose me cuz fox is her Patronus.',
  'Howdy?',
];

export function createPetInvitation({ enabled, inviteText, onChange, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const state = { open: false, hovered: false, focused: false, hidden: false };
  let index = 0, timer = null, destroyed = false;

  function render() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    const introducing = enabled && !state.open && !state.hovered && !state.focused && !state.hidden;
    onChange({ text: introducing ? PET_INVITATIONS[index] : inviteText, introducing });
    if (introducing) {
      timer = setTimer(() => {
        timer = null;
        index = (index + 1) % PET_INVITATIONS.length;
        render();
      }, PET_INVITATION_INTERVAL);
    }
  }

  render();
  return {
    update(patch) {
      if (destroyed || !Object.keys(state).some(key => key in patch && state[key] !== patch[key])) return;
      Object.assign(state, patch);
      render();
    },
    destroy() {
      destroyed = true;
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
  };
}
