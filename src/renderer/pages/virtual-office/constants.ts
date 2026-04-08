import type { EmployeeState } from './types';

const STATE_ANIM_MAP: Record<EmployeeState, string> = {
  idle: 'anim_idle',
  working: 'anim_work',
  chatting: 'anim_chat',
  memorizing: 'anim_read',
  resting: 'anim_rest',
  sleep: 'anim_sleep',
  happy: 'anim_happy',
  error: 'anim_error',
};

export { STATE_ANIM_MAP };
