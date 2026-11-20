export function sessionBranch(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part), c => c.charCodeAt(0))));
    return { branchCode: data.branchCode || '', branchName: data.branchName || '' };
  } catch { return { branchCode: '', branchName: '' }; }
}
