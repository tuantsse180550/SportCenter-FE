export const canManageMembers = role => role === 'CENTER_MANAGER' || role === 'RECEPTIONIST';
export const canDeleteMembers = role => role === 'CENTER_MANAGER';
