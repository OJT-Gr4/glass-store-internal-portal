import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionBranch } from '../../context/sessionBranch.js';
test('restoring signed branch claims preserves selection and Vietnamese name',()=>{
  const token=`header.${Buffer.from(JSON.stringify({branchCode:'BRANCH_02',branchName:'Chi nhánh 02 - Tràng Tiền'})).toString('base64url')}.signature`;
  assert.deepEqual(sessionBranch(token),{branchCode:'BRANCH_02',branchName:'Chi nhánh 02 - Tràng Tiền'});
  assert.deepEqual(sessionBranch('invalid'),{branchCode:'',branchName:''});
});
